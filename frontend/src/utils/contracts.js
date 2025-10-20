import { ethers } from "ethers";
import MedicalRecordABI from "../abis/MedicalRecord.json";
import EncryptedMedicalRecordABI from '../abis/EncryptedMedicalRecord.json';
import KeyRegistryABI from '../abis/KeyRegistry.json';
import KeyRecoveryABI from '../abis/KeyRecovery.json';
import { encryptMedicalRecord, decryptMedicalRecord } from './encryption';

// 컨트랙트 주소 - 배포 후 업데이트 필요
const MEDICAL_RECORD_ADDRESS = process.env.REACT_APP_MEDICAL_RECORD_CONTRACT_ADDRESS;
const ENCRYPTED_MEDICAL_RECORD_ADDRESS = process.env.REACT_APP_ENCRYPTED_MEDICAL_RECORD_ADDRESS;
const KEY_REGISTRY_ADDRESS = process.env.REACT_APP_KEY_REGISTRY_CONTRACT_ADDRESS;
const KEY_RECOVERY_ADDRESS = process.env.REACT_APP_KEY_RECOVERY_CONTRACT_ADDRESS;

// 디버깅: 환경 변수 확인
console.log('🔧 환경 변수 확인:');
console.log('KEY_REGISTRY_ADDRESS:', KEY_REGISTRY_ADDRESS);
console.log('ENCRYPTED_MEDICAL_RECORD_ADDRESS:', ENCRYPTED_MEDICAL_RECORD_ADDRESS);
console.log('KEY_RECOVERY_ADDRESS:', KEY_RECOVERY_ADDRESS);

let provider;
let signer;
let medicalRecordContract;

// 컨트랙트 초기화
export const initializeContracts = async () => {
    try {
        console.log("🚀 컨트랙트 초기화 시작");

        if (typeof window.ethereum === "undefined") {
            console.error("❌ MetaMask가 설치되어 있지 않습니다.");
            throw new Error("MetaMask가 설치되어 있지 않습니다.");
        }

        // 계정 연결 요청
        await window.ethereum.request({ method: "eth_requestAccounts" });

        console.log("🔌 Provider 생성 중...");
        // 네트워크 설정을 명시적으로 지정하여 ENS 에러 방지
        provider = new ethers.providers.Web3Provider(window.ethereum, {
            chainId: 31337,
            name: 'localhost',
            ensAddress: null // ENS 비활성화
        });

        // 네트워크 강제 새로고침
        await provider.send("eth_requestAccounts", []);

        console.log("✍️ Signer 생성 중...");
        signer = provider.getSigner();

        const signerAddress = await signer.getAddress();
        console.log("👤 연결된 계정:", signerAddress);

        const network = await provider.getNetwork();
        console.log("🌐 네트워크:", network);

        // 하드햇 네트워크가 아니면 경고
        if (network.chainId !== 31337) {
            console.warn("⚠️ 하드햇 네트워크가 아닙니다! 체인ID:", network.chainId);
            alert(
                "MetaMask를 Hardhat 네트워크(localhost:8545, 체인ID: 31337)로 변경해주세요!"
            );
            return false;
        }

        if (!MEDICAL_RECORD_ADDRESS || !ENCRYPTED_MEDICAL_RECORD_ADDRESS) {
            console.error("❌ 컨트랙트 주소가 설정되지 않았습니다.");
            return false;
        }

        console.log("📋 컨트랙트 생성 중...");
        console.log("📋 의료기록 컨트랙트 주소:", MEDICAL_RECORD_ADDRESS);
        console.log("📋 암호화 의료기록 컨트랙트 주소:", ENCRYPTED_MEDICAL_RECORD_ADDRESS);

        medicalRecordContract = new ethers.Contract(
            MEDICAL_RECORD_ADDRESS,
            MedicalRecordABI.abi,
            signer
        );

        // 컨트랙트 코드 존재 여부 확인
        const code = await provider.getCode(MEDICAL_RECORD_ADDRESS);
        if (code === "0x") {
            console.error("❌ 컨트랙트가 배포되지 않았습니다.");
            return false;
        }

        console.log("✅ 컨트랙트 초기화 완료");
        return true;
    } catch (error) {
        console.error("❌ 컨트랙트 초기화 중 오류:", error);
        return false;
    }
};

// 지갑 연결
export const connectWallet = async () => {
  try {
    // 강제로 재초기화
    await initializeContracts();

    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    return accounts[0];
  } catch (error) {
    console.error("지갑 연결 중 오류:", error);
    throw new Error(`지갑 연결 실패: ${error.message}`);
  }
};

// 현재 연결된 계정 주소 가져오기
export const getCurrentAccount = async () => {
  try {
    if (!signer) {
      await initializeContracts();
    }
    return await signer.getAddress();
  } catch (error) {
    console.error("현재 계정 조회 중 오류:", error);
    throw new Error(`현재 계정 조회 실패: ${error.message}`);
  }
};

// 의사 여부 확인 - KeyRegistry 컨트랙트 사용 (JsonRpcProvider로 ENS 우회)
export const isDoctor = async (address) => {
    try {
        console.log('🔍 의사 권한 확인 시작:', address);
        
        if (!KEY_REGISTRY_ADDRESS) {
            console.error('❌ KeyRegistry 주소가 설정되지 않았습니다.');
            return false;
        }
        
        // JsonRpcProvider 직접 사용 - ENS 완전 우회
        const jsonRpcProvider = new ethers.providers.JsonRpcProvider('http://localhost:8545', {
            name: 'localhost',
            chainId: 31337
        });
        const contract = new ethers.Contract(
            KEY_REGISTRY_ADDRESS,
            KeyRegistryABI.abi,
            jsonRpcProvider
        );
        
        const doctorStatus = await contract.isDoctor(address);
        console.log('👨‍⚕️ 의사 여부:', doctorStatus);
        
        return doctorStatus;
    } catch (error) {
        console.error('❌ 의사 권한 확인 중 오류:', error);
        return false;
    }
};

// 의사 추가 (Owner만 가능)
export const addDoctor = async (doctorAddress) => {
    try {
        const contract = await getEncryptedMedicalRecordContract();
        if (!contract) {
            throw new Error("Contract not initialized");
        }
        
        const tx = await contract.addDoctor(doctorAddress);
        await tx.wait();
        
        console.log('의사 추가 완료:', doctorAddress);
        return true;
    } catch (error) {
        console.error("의사 추가 중 오류:", error);
        throw error;
    }
};

// 의사 제거 (Owner만 가능)
export const removeDoctor = async (doctorAddress) => {
  try {
    if (!medicalRecordContract) {
      await initializeContracts();
    }

    const tx = await medicalRecordContract.removeDoctor(doctorAddress);
    await tx.wait();
    return tx;
  } catch (error) {
    console.error("의사 제거 중 오류 발생:", error);
    throw new Error("의사 제거에 실패했습니다.");
  }
};

// 의료 기록 추가 (의사만 가능)
export const addMedicalRecord = async (patientAddress, recordData) => {
  try {
    if (!medicalRecordContract) {
      await initializeContracts();
    }

    // 데이터를 문자열로 변환
    const data = JSON.stringify(recordData);

    // 서명 생성
    const signature = await signer.signMessage(data);
    const hospitalAddress = await signer.getAddress();

    // 컨트랙트에 기록 추가
    const tx = await medicalRecordContract.addMedicalRecord(
      patientAddress,
      data,
      signature,
      hospitalAddress
    );
    await tx.wait();

    return {
      transactionHash: tx.hash,
      data,
      signature,
    };
  } catch (error) {
    console.error("의료 기록 추가 중 오류 발생:", error);
    throw new Error("의료 기록 추가에 실패했습니다.");
  }
};

// 의료 기록 조회
export const getMedicalRecord = async (patientAddress, recordId) => {
  try {
    if (!medicalRecordContract) {
      await initializeContracts();
    }

    const record = await medicalRecordContract.getMedicalRecord(
      patientAddress,
      recordId
    );

    return {
      data: record.data,
      signature: record.signature,
      hospital: record.hospital,
      timestamp: record.timestamp.toString(),
    };
  } catch (error) {
    console.error("의료 기록 조회 중 오류 발생:", error);

    // 권한 관련 에러 확인
    if (
      error.message &&
      error.message.includes("Only the patient or a doctor")
    ) {
      throw new Error("permission_denied");
    }

    // 다른 에러는 일반적인 조회 실패로 처리
    throw new Error("record_not_found");
  }
};

// 환자의 기록 수 조회
export const getRecordCount = async (patientAddress) => {
  try {
    if (!medicalRecordContract) {
      await initializeContracts();
    }

    const count = await medicalRecordContract.getRecordCount(patientAddress);
    return count.toNumber();
  } catch (error) {
    console.error("기록 수 조회 중 오류 발생:", error);
    return 0;
  }
};

// 환자의 모든 의료 기록 조회
export const getAllMedicalRecords = async (patientAddress) => {
  try {
    const recordCount = await getRecordCount(patientAddress);
    const records = [];

    for (let i = 0; i < recordCount; i++) {
      try {
        const record = await getMedicalRecord(patientAddress, i);
        records.push({
          id: i,
          ...record,
          parsedData: JSON.parse(record.data),
        });
      } catch (error) {
        console.error(`기록 ${i} 조회 중 오류:`, error);
        // 권한 에러가 발생하면 상위로 전파
        if (error.message === "permission_denied") {
          throw error;
        }
      }
    }

    return records;
  } catch (error) {
    console.error("모든 의료 기록 조회 중 오류:", error);
    // 권한 에러는 그대로 전파
    if (error.message === "permission_denied") {
      throw error;
    }
    // 다른 에러는 빈 배열 반환
    return [];
  }
};

// 네트워크 정보 가져오기
export const getNetworkInfo = async () => {
  try {
    if (!provider) {
      await initializeContracts();
    }
    return await provider.getNetwork();
  } catch (error) {
    console.error("네트워크 정보 조회 중 오류:", error);
    return null;
  }
};

// 암호화된 의료기록 컨트랙트 가져오기
export const getEncryptedMedicalRecordContract = async () => {
    try {
        console.log('🔍 암호화 의료기록 컨트랙트 초기화 시작');
        
        if (!window.ethereum) {
            console.error('❌ MetaMask가 설치되어 있지 않습니다.');
            throw new Error("MetaMask가 설치되어 있지 않습니다.");
        }

        if (!ENCRYPTED_MEDICAL_RECORD_ADDRESS) {
            console.error('❌ 암호화 의료기록 컨트랙트 주소가 설정되지 않았습니다.');
            throw new Error("컨트랙트 주소가 설정되지 않았습니다.");
        }

        console.log('📋 컨트랙트 주소:', ENCRYPTED_MEDICAL_RECORD_ADDRESS);
        
        // 네트워크 설정을 명시적으로 지정하여 ENS 에러 방지
        const provider = new ethers.providers.Web3Provider(window.ethereum, {
            chainId: 31337,
            name: 'localhost',
            ensAddress: null // ENS 비활성화
        });
        const signer = provider.getSigner();
        
        const contract = new ethers.Contract(
            ENCRYPTED_MEDICAL_RECORD_ADDRESS,
            EncryptedMedicalRecordABI.abi,
            signer
        );

        console.log('✅ 암호화 의료기록 컨트랙트 초기화 완료');
        return contract;
    } catch (error) {
        console.error('❌ 암호화 의료기록 컨트랙트 초기화 오류:', error);
        return null;
    }
};

export const getContractOwner = async () => {
    try {
        const contract = await getEncryptedMedicalRecordContract();
        if (!contract) {
            throw new Error("Contract not initialized");
        }
        const owner = await contract.owner();
        return owner;
    } catch (error) {
        console.error("오너 주소 조회 중 오류:", error);
        throw error;
    }
};

export const isOwner = async (address) => {
    try {
        console.log('isOwner 함수 호출됨, 주소:', address);
        const contract = await getEncryptedMedicalRecordContract();
        console.log('컨트랙트 가져오기 성공:', contract ? 'Yes' : 'No');
        
        if (!contract) {
            console.error('컨트랙트가 초기화되지 않음');
            return false;
        }

        // owner 함수가 있는지 확인
        console.log('컨트랙트 메서드:', Object.keys(contract));
        
        const owner = await contract.owner();
        console.log('컨트랙트 오너 주소:', owner);
        console.log('현재 연결된 주소:', address);
        
        const isOwnerAccount = owner.toLowerCase() === address.toLowerCase();
        console.log('오너 계정 여부:', isOwnerAccount);
        
        return isOwnerAccount;
    } catch (error) {
        console.error('오너 확인 중 상세 오류:', error);
        return false;
    }
};

// KeyRegistry 컨트랙트 가져오기
export const getKeyRegistryContract = async () => {
    try {
        if (!KEY_REGISTRY_ADDRESS) {
            throw new Error("KeyRegistry 컨트랙트 주소가 설정되지 않았습니다.");
        }

        // JsonRpcProvider 사용 - ENS 완전 우회
        const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = web3Provider.getSigner();
        
        return new ethers.Contract(
            KEY_REGISTRY_ADDRESS,
            KeyRegistryABI.abi,
            signer
        );
    } catch (error) {
        console.error('❌ KeyRegistry 컨트랙트 초기화 오류:', error);
        throw error;
    }
};

// KeyRecovery 컨트랙트 가져오기
export const getKeyRecoveryContract = async () => {
    try {
        if (!KEY_RECOVERY_ADDRESS) {
            throw new Error("KeyRecovery 컨트랙트 주소가 설정되지 않았습니다.");
        }

        // JsonRpcProvider 사용 - ENS 완전 우회
        const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = web3Provider.getSigner();
        
        return new ethers.Contract(
            KEY_RECOVERY_ADDRESS,
            KeyRecoveryABI.abi,
            signer
        );
    } catch (error) {
        console.error('❌ KeyRecovery 컨트랙트 초기화 오류:', error);
        throw error;
    }
};

// 보호자 설정
export const setGuardians = async (guardianAddresses, guardianNames, guardianContacts) => {
    try {
        const contract = await getKeyRecoveryContract();
        const tx = await contract.setGuardians(guardianAddresses, guardianNames, guardianContacts);
        const receipt = await tx.wait();
        console.log('✅ 보호자 설정 완료:', receipt);
        return receipt;
    } catch (error) {
        console.error('❌ 보호자 설정 오류:', error);
        throw error;
    }
};

// 복구 요청
export const requestRecovery = async () => {
    try {
        const contract = await getKeyRecoveryContract();
        const tx = await contract.requestRecovery();
        const receipt = await tx.wait();
        
        // 이벤트에서 requestId 추출
        const event = receipt.events?.find(e => e.event === 'RecoveryRequested');
        const requestId = event?.args?.requestId;
        
        console.log('✅ 복구 요청 완료:', { receipt, requestId });
        return { receipt, requestId };
    } catch (error) {
        console.error('❌ 복구 요청 오류:', error);
        throw error;
    }
};

// 보호자 승인
export const approveRecovery = async (requestId) => {
    try {
        const contract = await getKeyRecoveryContract();
        const tx = await contract.approveRecovery(requestId);
        const receipt = await tx.wait();
        console.log('✅ 복구 승인 완료:', receipt);
        return receipt;
    } catch (error) {
        console.error('❌ 복구 승인 오류:', error);
        throw error;
    }
};

// 보호자 거부
export const rejectRecovery = async (requestId) => {
    try {
        const contract = await getKeyRecoveryContract();
        const tx = await contract.rejectRecovery(requestId);
        const receipt = await tx.wait();
        console.log('✅ 복구 거부 완료:', receipt);
        return receipt;
    } catch (error) {
        console.error('❌ 복구 거부 오류:', error);
        throw error;
    }
};

// 복구 완료 (새 키로 업데이트)
export const completeRecovery = async (requestId, newPublicKey) => {
    try {
        const contract = await getKeyRecoveryContract();
        const tx = await contract.completeRecovery(requestId, newPublicKey);
        const receipt = await tx.wait();
        console.log('✅ 복구 완료:', receipt);
        return receipt;
    } catch (error) {
        console.error('❌ 복구 완료 오류:', error);
        throw error;
    }
};

// 복구 요청 취소
export const cancelRecovery = async (requestId) => {
    try {
        const contract = await getKeyRecoveryContract();
        const tx = await contract.cancelRecovery(requestId);
        const receipt = await tx.wait();
        console.log('✅ 복구 취소 완료:', receipt);
        return receipt;
    } catch (error) {
        console.error('❌ 복구 취소 오류:', error);
        throw error;
    }
};

// 복구 요청 상태 조회
export const getRecoveryStatus = async (requestId) => {
    try {
        const contract = await getKeyRecoveryContract();
        const status = await contract.getRecoveryStatus(requestId);
        return {
            user: status.user,
            timestamp: status.timestamp.toNumber(),
            expiryTime: status.expiryTime.toNumber(),
            approvalCount: status.approvalCount.toNumber(),
            isCompleted: status.isCompleted,
            isCancelled: status.isCancelled
        };
    } catch (error) {
        console.error('❌ 복구 상태 조회 오류:', error);
        throw error;
    }
};

// 보호자 목록 조회
export const getGuardians = async (userAddress) => {
    try {
        const contract = await getKeyRecoveryContract();
        const guardians = await contract.getGuardians(userAddress);
        return {
            addresses: guardians.addresses,
            names: guardians.names,
            contacts: guardians.contacts,
            isActive: guardians.isActive
        };
    } catch (error) {
        console.error('❌ 보호자 목록 조회 오류:', error);
        throw error;
    }
};

// 활성 복구 요청 조회
export const getActiveRecoveryRequest = async (userAddress) => {
    try {
        const contract = await getKeyRecoveryContract();
        const requestId = await contract.getActiveRecoveryRequest(userAddress);
        return requestId;
    } catch (error) {
        console.error('❌ 활성 복구 요청 조회 오류:', error);
        throw error;
    }
};

// 보호자 설정 여부 확인
export const hasGuardians = async (userAddress) => {
    try {
        const contract = await getKeyRecoveryContract();
        const hasGuardiansSet = await contract.hasGuardians(userAddress);
        return hasGuardiansSet;
    } catch (error) {
        console.error('❌ 보호자 설정 여부 확인 오류:', error);
        throw error;
    }
};

// 복구 가능 여부 확인
export const canCompleteRecovery = async (requestId) => {
    try {
        const contract = await getKeyRecoveryContract();
        const canComplete = await contract.canCompleteRecovery(requestId);
        return canComplete;
    } catch (error) {
        console.error('❌ 복구 가능 여부 확인 오류:', error);
        throw error;
    }
};

// 공개키 등록 여부 확인
export const isPublicKeyRegistered = async (userAddress) => {
    try {
        if (!KEY_REGISTRY_ADDRESS) {
            console.error('❌ KeyRegistry 주소가 설정되지 않았습니다.');
            return false;
        }
        
        // JsonRpcProvider 직접 사용 - ENS 완전 우회
        const jsonRpcProvider = new ethers.providers.JsonRpcProvider('http://localhost:8545', {
            name: 'localhost',
            chainId: 31337
        });
        const contract = new ethers.Contract(
            KEY_REGISTRY_ADDRESS,
            KeyRegistryABI.abi,
            jsonRpcProvider
        );
        
        const isRegistered = await contract.isPublicKeyRegistered(userAddress);
        console.log(`🔍 공개키 등록 여부 (${userAddress.substring(0, 10)}...):`, isRegistered);
        return isRegistered;
    } catch (error) {
        console.error('❌ 공개키 등록 여부 확인 오류:', error);
        return false;
    }
};

// 공개키 가져오기 - ENS 에러 방지
export const getPublicKey = async (userAddress) => {
    try {
        if (!KEY_REGISTRY_ADDRESS) {
            console.error('❌ KeyRegistry 주소가 설정되지 않았습니다.');
            throw new Error('KeyRegistry 주소가 설정되지 않았습니다.');
        }
        
        // JsonRpcProvider 직접 사용 - ENS 완전 우회
        const jsonRpcProvider = new ethers.providers.JsonRpcProvider('http://localhost:8545', {
            name: 'localhost',
            chainId: 31337
        });
        const contract = new ethers.Contract(
            KEY_REGISTRY_ADDRESS,
            KeyRegistryABI.abi,
            jsonRpcProvider
        );
        
        const publicKeyData = await contract.getPublicKey(userAddress);
        console.log(`🔑 공개키 가져오기 성공 (${userAddress.substring(0, 10)}...)`);
        return publicKeyData;
    } catch (error) {
        console.error('❌ 공개키 가져오기 오류:', error);
        throw error;
    }
};

// 보호자의 응답 상태 조회
export const getGuardianResponse = async (requestId, guardianAddress) => {
    try {
        const contract = await getKeyRecoveryContract();
        const response = await contract.getGuardianResponse(requestId, guardianAddress);
        return {
            hasApproved: response.hasApproved,
            hasRejected: response.hasRejected
        };
    } catch (error) {
        console.error('❌ 보호자 응답 상태 조회 오류:', error);
        throw error;
    }
};

export { MEDICAL_RECORD_ADDRESS, KEY_REGISTRY_ADDRESS, KEY_RECOVERY_ADDRESS };
