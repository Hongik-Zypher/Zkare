import { ethers } from "ethers";
import MedicalRecordABI from "../abis/MedicalRecord.json";

// 컨트랙트 주소 - 배포 후 업데이트 필요
const MEDICAL_RECORD_ADDRESS =
  process.env.REACT_APP_CONTRACT_ADDRESS ||
  "0x5FbDB2315678afecb367f032d93F642f64180aa3";

let provider;
let signer;
let medicalRecordContract;

// 컨트랙트 초기화
export const initializeContracts = async () => {
  try {
    console.log("🚀 컨트랙트 초기화 시작");

    if (typeof window.ethereum === "undefined") {
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
    }

    console.log("📋 컨트랙트 생성 중...");
    console.log("📋 컨트랙트 주소:", MEDICAL_RECORD_ADDRESS);

    medicalRecordContract = new ethers.Contract(
      MEDICAL_RECORD_ADDRESS,
      MedicalRecordABI.abi,
      signer
    );

    console.log("✅ 컨트랙트 초기화 완료");

    return {
      provider,
      signer,
      medicalRecordContract,
    };
  } catch (error) {
    console.error("❌ 컨트랙트 초기화 중 오류:", error);
    throw new Error(`컨트랙트 초기화 실패: ${error.message}`);
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
    console.log("🔍 의사 확인 시작:", address);

    // 1. 컨트랙트 재초기화
    if (!medicalRecordContract) {
      console.log("🔄 컨트랙트 초기화 중...");
      await initializeContracts();
    }

    // 2. 네트워크 확인
    const network = await provider.getNetwork();
    if (network.chainId !== 31337) {
      console.error("❌ 잘못된 네트워크:", network.chainId);
      return false;
    }

    // 3. 컨트랙트 존재 확인
    const code = await provider.getCode(MEDICAL_RECORD_ADDRESS);
    if (code === "0x") {
      console.error(
        "❌ 컨트랙트가 배포되지 않았습니다:",
        MEDICAL_RECORD_ADDRESS
      );
      return false;
    }

    console.log("📞 isDoctor 호출 중...");
    console.log("📞 컨트랙트 주소:", MEDICAL_RECORD_ADDRESS);
    console.log("📞 확인할 주소:", address);

    // 4. 여러 방법으로 호출 시도
    let result;

    // 방법 1: 일반 호출
    try {
      result = await medicalRecordContract.isDoctor(address);
      console.log("✅ isDoctor 결과 (방법1):", result);
      return result;
    } catch (err1) {
      console.log("❌ 방법1 실패:", err1.message);

      // 방법 2: callStatic 사용
      try {
        result = await medicalRecordContract.callStatic.isDoctor(address);
        console.log("✅ isDoctor 결과 (방법2):", result);
        return result;
      } catch (err2) {
        console.log("❌ 방법2 실패:", err2.message);

        // 방법 3: provider.call 직접 사용
        try {
          const iface = new ethers.utils.Interface(MedicalRecordABI.abi);
          const data = iface.encodeFunctionData("isDoctor", [address]);
          const response = await provider.call({
            to: MEDICAL_RECORD_ADDRESS,
            data: data,
          });
          result = iface.decodeFunctionResult("isDoctor", response)[0];
          console.log("✅ isDoctor 결과 (방법3):", result);
          return result;
        } catch (err3) {
          console.log("❌ 방법3 실패:", err3.message);
          throw err3;
        }
      }
    }
  } catch (error) {
    console.error("❌ 의사 확인 중 최종 오류:", error);
    console.error("❌ 오류 상세:", error.message);
    console.error("❌ 오류 코드:", error.code);

    // 기본값으로 Owner인지 확인
    try {
      console.log("🔄 Owner 확인으로 폴백...");
      const owner = await medicalRecordContract.owner();
      const isOwner = address.toLowerCase() === owner.toLowerCase();
      console.log("👑 Owner:", owner);
      console.log("👑 Owner 여부:", isOwner);
      return isOwner; // Owner라면 의사로 간주
    } catch (ownerError) {
      console.error("❌ Owner 확인도 실패:", ownerError);
      return false;
    }
  }
};

// 의사 추가 (Owner만 가능)
export const addDoctor = async (doctorAddress) => {
  try {
    if (!medicalRecordContract) {
      await initializeContracts();
    }

    const tx = await medicalRecordContract.addDoctor(doctorAddress);
    await tx.wait();
    return tx;
  } catch (error) {
    console.error("의사 추가 중 오류 발생:", error);
    throw new Error("의사 추가에 실패했습니다.");
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

export { MEDICAL_RECORD_ADDRESS };
