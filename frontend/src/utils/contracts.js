import { ethers } from "ethers";
import MedicalRecordABI from "../abis/MedicalRecord.json";
import EncryptedMedicalRecordABI from '../abis/EncryptedMedicalRecord.json';
import { encryptMedicalRecord, decryptMedicalRecord } from './encryption';

// 컨트랙트 주소 - 배포 후 업데이트 필요
const MEDICAL_RECORD_ADDRESS = process.env.REACT_APP_MEDICAL_RECORD_CONTRACT_ADDRESS;
const ENCRYPTED_MEDICAL_RECORD_ADDRESS = process.env.REACT_APP_ENCRYPTED_MEDICAL_RECORD_ADDRESS;

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
        provider = new ethers.providers.Web3Provider(window.ethereum, "any");

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

// 의사 여부 확인 - 여러 방법으로 시도
export const isDoctor = async (address) => {
    try {
        console.log('🔍 의사 권한 확인 시작:', address);
        
        const contract = await getEncryptedMedicalRecordContract();
        console.log('📋 컨트랙트 상태:', contract ? '초기화됨' : '초기화되지 않음');
        
        if (!contract) {
            console.error('❌ 컨트랙트가 초기화되지 않았습니다.');
            return false;
        }

        // 의사 확인 함수가 있는지 확인
        console.log('📋 컨트랙트 메서드:', Object.keys(contract));
        
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
        
        const provider = new ethers.providers.Web3Provider(window.ethereum);
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

export { MEDICAL_RECORD_ADDRESS };
