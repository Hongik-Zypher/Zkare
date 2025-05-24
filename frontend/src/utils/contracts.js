import { ethers } from "ethers";
import MedicalRecordABI from "../abis/MedicalRecord.json";
import AccessControlABI from "../abis/AccessControl.json";

// 컨트랙트 주소 하드코딩
const MEDICAL_RECORD_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const ACCESS_CONTROL_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

let provider;
let signer;
let medicalRecordContract;
let accessControlContract;

// 컨트랙트 초기화
export const initializeContracts = async () => {
  try {
    if (typeof window.ethereum === "undefined") {
      throw new Error("MetaMask가 설치되어 있지 않습니다.");
    }

    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();

    medicalRecordContract = new ethers.Contract(
      MEDICAL_RECORD_ADDRESS,
      MedicalRecordABI.abi,
      signer
    );

    accessControlContract = new ethers.Contract(
      ACCESS_CONTROL_ADDRESS,
      AccessControlABI.abi,
      signer
    );

    return {
      provider,
      signer,
      medicalRecordContract,
      accessControlContract,
    };
  } catch (error) {
    console.error("컨트랙트 초기화 중 오류:", error);
    throw new Error(`컨트랙트 초기화 실패: ${error.message}`);
  }
};

// 지갑 연결
export const connectWallet = async () => {
  try {
    if (!provider) {
      await initializeContracts();
    }

    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    return accounts[0];
  } catch (error) {
    console.error("지갑 연결 중 오류:", error);
    throw new Error(`지갑 연결 실패: ${error.message}`);
  }
};

// 의사 여부 확인
export const isDoctor = async (address) => {
  try {
    if (!medicalRecordContract) {
      await initializeContracts();
    }
    return await medicalRecordContract.isDoctor(address);
  } catch (error) {
    console.error("의사 확인 중 오류:", error);
    throw new Error(`의사 확인 실패: ${error.message}`);
  }
};

// 의사 추가
export const addDoctor = async (doctorAddress) => {
  try {
    if (!medicalRecordContract) {
      const { medicalRecordContract: contract } = await initializeContracts();
      medicalRecordContract = contract;
    }

    const tx = await medicalRecordContract.addDoctor(doctorAddress);
    await tx.wait();
    return tx;
  } catch (error) {
    console.error("의사 추가 중 오류 발생:", error);
    throw new Error("의사 추가에 실패했습니다.");
  }
};

// 의료 기록 추가
export const addMedicalRecord = async (patientAddress, recordData) => {
  try {
    if (!medicalRecordContract) {
      await initializeContracts();
    }

    // IPFS에 데이터 업로드
    const response = await fetch("http://localhost:5001/api/ipfs/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(recordData),
    });

    if (!response.ok) {
      throw new Error("IPFS 업로드 실패");
    }

    const { cid, signature } = await response.json();

    // 컨트랙트에 기록 추가
    const tx = await medicalRecordContract.addRecord(patientAddress, cid);
    await tx.wait();

    return {
      transactionHash: tx.hash,
      cid,
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
      const { medicalRecordContract: contract } = await initializeContracts();
      medicalRecordContract = contract;
    }

    return await medicalRecordContract.getMedicalRecord(
      patientAddress,
      recordId
    );
  } catch (error) {
    console.error("의료 기록 조회 중 오류 발생:", error);
    throw new Error("의료 기록 조회에 실패했습니다.");
  }
};

// 서명 검증 함수
export const verifySignature = async (cid, signature, hospital) => {
  try {
    if (!medicalRecordContract) {
      await initializeContracts();
    }

    // CID를 해시로 변환
    const messageHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(cid));

    // 서명 검증
    const isValid = await medicalRecordContract.verifySignature(
      messageHash,
      signature,
      hospital
    );

    return isValid;
  } catch (error) {
    console.error("서명 검증 중 오류 발생:", error);
    throw new Error("서명 검증에 실패했습니다.");
  }
};

// 접근 요청 함수
export const requestAccess = async (patientAddress, recordId) => {
  try {
    if (!accessControlContract) {
      await initializeContracts();
    }

    const tx = await accessControlContract.requestAccess(
      patientAddress,
      recordId
    );
    await tx.wait();

    // 접근 요청 이벤트 구독
    const filter = accessControlContract.filters.AccessRequested(
      null,
      patientAddress,
      recordId
    );
    const events = await accessControlContract.queryFilter(filter);
    const requestId = events[0].args.requestId;

    return {
      transactionHash: tx.hash,
      requestId: requestId.toString(),
    };
  } catch (error) {
    console.error("접근 요청 중 오류 발생:", error);
    throw new Error("접근 요청에 실패했습니다.");
  }
};

// 접근 권한 부여 함수
export const grantAccess = async (
  patientAddress,
  recordId,
  duration,
  requestId
) => {
  try {
    if (!accessControlContract) {
      await initializeContracts();
    }

    const tx = await accessControlContract.grantAccess(
      patientAddress,
      recordId,
      duration,
      requestId
    );
    await tx.wait();

    return {
      transactionHash: tx.hash,
      expiresAt: Math.floor(Date.now() / 1000) + duration,
    };
  } catch (error) {
    console.error("접근 권한 부여 중 오류 발생:", error);
    throw new Error("접근 권한 부여에 실패했습니다.");
  }
};

// 접근 권한 확인 함수
export const hasAccess = async (patientAddress, recordId) => {
  try {
    if (!accessControlContract) {
      await initializeContracts();
    }

    const access = await accessControlContract.hasAccess(
      patientAddress,
      recordId
    );

    return {
      hasAccess: access.hasAccess,
      expiresAt: access.expiresAt.toNumber(),
    };
  } catch (error) {
    console.error("접근 권한 확인 중 오류 발생:", error);
    throw new Error("접근 권한 확인에 실패했습니다.");
  }
};

// 접근 요청 목록 조회 함수
export const getAccessRequests = async (patientAddress) => {
  try {
    if (!accessControlContract) {
      await initializeContracts();
    }

    const filter = accessControlContract.filters.AccessRequested(
      null,
      patientAddress,
      null
    );
    const events = await accessControlContract.queryFilter(filter);

    return events.map((event) => ({
      requestId: event.args.requestId.toString(),
      requester: event.args.requester,
      recordId: event.args.recordId.toString(),
      timestamp: event.args.timestamp.toNumber(),
    }));
  } catch (error) {
    console.error("접근 요청 목록 조회 중 오류 발생:", error);
    throw new Error("접근 요청 목록 조회에 실패했습니다.");
  }
};

// 접근 권한 취소 함수
export const revokeAccess = async (patientAddress, recordId) => {
  try {
    if (!accessControlContract) {
      await initializeContracts();
    }

    const tx = await accessControlContract.revokeAccess(
      patientAddress,
      recordId
    );
    await tx.wait();

    return {
      transactionHash: tx.hash,
    };
  } catch (error) {
    console.error("접근 권한 취소 중 오류 발생:", error);
    throw new Error("접근 권한 취소에 실패했습니다.");
  }
};
