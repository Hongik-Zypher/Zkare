import { ethers } from "ethers";
import * as snarkjs from "snarkjs";

// ABI 파일 가져오기
const MedicalDataVerifierABI = require("../abis/MedicalDataVerifier.json");
const ZkareABI = require("../abis/Zkare.json");

// 배포 정보 가져오기
let deploymentInfo;
try {
  deploymentInfo = require("../deployments/latest.json");
} catch (error) {
  console.warn("배포 정보 파일을 찾을 수 없습니다.");
  deploymentInfo = {};
}

// 환경 변수 또는 배포 정보에서 주소 가져오기
const MEDICAL_DATA_VERIFIER_ADDRESS =
  process.env.REACT_APP_MEDICAL_DATA_VERIFIER_ADDRESS ||
  (deploymentInfo.contracts && deploymentInfo.contracts.medicalDataVerifier
    ? deploymentInfo.contracts.medicalDataVerifier.address
    : "");

const ZKARE_ADDRESS =
  process.env.REACT_APP_ZKARE_CONTRACT_ADDRESS ||
  (deploymentInfo.contracts && deploymentInfo.contracts.zkare
    ? deploymentInfo.contracts.zkare.address
    : "");

// API URL 설정
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5001/api";

// 서킷 관련 파일 경로
const BLOOD_TYPE_WASM_PATH = "/circuits/blood_type_proof.wasm";
const BLOOD_TYPE_ZKEY_PATH = "/circuits/blood_type_proof_final.zkey";

// 공급자, 서명자, 컨트랙트 인스턴스 초기화
let provider;
let signer;
let medicalDataVerifierContract;
let zkareContract;

/**
 * 메타마스크 연결 및 컨트랙트 초기화
 */
export const initVerificationService = async () => {
  if (window.ethereum) {
    try {
      // 사용자 계정 요청
      await window.ethereum.request({ method: "eth_requestAccounts" });

      // 이더리움 공급자 및 서명자 설정 (ethers v6)
      provider = new ethers.BrowserProvider(window.ethereum);
      signer = await provider.getSigner();

      // 컨트랙트 인스턴스 생성
      medicalDataVerifierContract = new ethers.Contract(
        MEDICAL_DATA_VERIFIER_ADDRESS,
        MedicalDataVerifierABI.abi,
        signer
      );

      zkareContract = new ethers.Contract(ZKARE_ADDRESS, ZkareABI.abi, signer);

      console.log("의료 데이터 검증 서비스 초기화 완료");
      return true;
    } catch (error) {
      console.error("의료 데이터 검증 서비스 초기화 오류:", error);
      return false;
    }
  } else {
    console.error("MetaMask가 설치되어 있지 않습니다");
    return false;
  }
};

/**
 * 현재 연결된 계정 주소 가져오기
 */
export const getCurrentAccount = async () => {
  if (!provider) await initVerificationService();
  return await signer.getAddress();
};

/**
 * 현재 계정이 의사인지 확인
 */
export const isDoctor = async () => {
  try {
    if (!zkareContract) await initVerificationService();
    const account = await getCurrentAccount();

    try {
      // 컨트랙트의 isDoctor 함수 호출
      const result = await zkareContract.isDoctor(account);
      console.log(`의사 상태 확인 결과: ${result}`);
      return result;
    } catch (error) {
      console.error("의사 확인 함수 호출 오류:", error);

      // 컨트랙트에서 오류 발생 시 백업 방법 시도
      try {
        // 관리자 확인
        const admin = await zkareContract.admin();
        if (admin && account.toLowerCase() === admin.toLowerCase()) {
          console.log("관리자 계정이므로 의사로 간주합니다.");
          return true;
        }
      } catch (adminError) {
        console.error("관리자 확인 오류:", adminError);
      }

      // 모든 방법이 실패하면 false 반환
      return false;
    }
  } catch (error) {
    console.error("의사 확인 최종 오류:", error);
    return false;
  }
};

/**
 * MetaMask가 설치되어 있는지 확인
 * @returns {Promise<boolean>} MetaMask 설치 여부
 */
export const detectMetaMask = async () => {
  return window.ethereum !== undefined;
};

/**
 * 의료 데이터 등록 (의사만 가능)
 * @param {string} patientAddress 환자 주소
 * @param {string} dataType 데이터 타입 (예: "bloodType")
 * @param {number} value 데이터 값
 */
export const registerPatientData = async (patientAddress, dataType, value) => {
  if (!medicalDataVerifierContract) await initVerificationService();

  try {
    const tx = await medicalDataVerifierContract.registerPatientData(
      patientAddress,
      dataType,
      value
    );

    await tx.wait();
    console.log(
      `환자 데이터 등록 완료: ${patientAddress}, ${dataType}=${value}`
    );

    return {
      success: true,
      message: "환자 데이터가 성공적으로 등록되었습니다.",
    };
  } catch (error) {
    console.error("환자 데이터 등록 오류:", error);
    return {
      success: false,
      message: `오류: ${error.message}`,
    };
  }
};

/**
 * 환자 데이터 조회 (환자 본인 또는 의사만 가능)
 * @param {string} patientAddress 환자 주소
 * @param {string} dataType 데이터 타입 (예: "bloodType")
 */
export const getPatientData = async (patientAddress, dataType) => {
  if (!medicalDataVerifierContract) await initVerificationService();

  try {
    const value = await medicalDataVerifierContract.getPatientData(
      patientAddress,
      dataType
    );

    return {
      success: true,
      value: Number(value),
      message: "환자 데이터 조회 성공",
    };
  } catch (error) {
    console.error("환자 데이터 조회 오류:", error);
    return {
      success: false,
      message: `오류: ${error.message}`,
    };
  }
};

/**
 * 의료 데이터 검증 요청
 * @param {string} patientAddress 환자 주소
 * @param {string} verificationType 검증 유형 (예: "bloodType")
 * @param {number} guessedValue 추측 값
 * @returns {Object} 요청 결과
 */
export const requestVerification = async (
  patientAddress,
  verificationType,
  guessedValue
) => {
  if (!medicalDataVerifierContract) await initVerificationService();

  try {
    const tx = await medicalDataVerifierContract.requestVerification(
      patientAddress,
      verificationType,
      guessedValue
    );

    const receipt = await tx.wait();

    // VerificationRequested 이벤트에서 requestId 추출 (ethers v6)
    const event = receipt.logs.find(
      (log) => log.fragment && log.fragment.name === "VerificationRequested"
    );
    const requestId = event ? event.args.requestId.toString() : "0";

    console.log(
      `검증 요청 완료: ${patientAddress}, ${verificationType}, ID=${requestId}`
    );

    return {
      success: true,
      requestId,
      message:
        "검증 요청이 성공적으로 전송되었습니다. 환자의 승인을 기다리세요.",
    };
  } catch (error) {
    console.error("검증 요청 오류:", error);
    return {
      success: false,
      message: `오류: ${error.message}`,
    };
  }
};

/**
 * 내 계정에 대한 대기 중인 검증 요청 목록 조회
 */
export const getMyPendingRequests = async () => {
  if (!medicalDataVerifierContract) await initVerificationService();

  try {
    const myAddress = await getCurrentAccount();
    let pendingCount = 0;

    try {
      pendingCount = await medicalDataVerifierContract.getPendingRequestCount(
        myAddress
      );
    } catch (countError) {
      console.error("요청 카운트 조회 오류:", countError);
      // 오류 시 빈 배열 반환
      return {
        success: true, // UI를 위해 success true 처리
        requests: [],
        message: "대기 중인 요청이 없습니다.",
      };
    }

    const requests = [];

    // 모든 요청 ID를 확인하여 대기 중인 것만 필터링
    let validRequestCount = 0;
    let i = 0;
    while (validRequestCount < Number(pendingCount) && i < 100) {
      // 최대 100개까지만 검사
      try {
        const details = await medicalDataVerifierContract.getRequestDetails(
          myAddress,
          i
        );
        if (details && details.isPending) {
          requests.push({
            requestId: i,
            requester: details.requester,
            verificationType: details.verificationType,
            requestedValue: Number(details.requestedValue),
            isPending: details.isPending,
            isApproved: details.isApproved,
          });
          validRequestCount++;
        }
      } catch (e) {
        // 해당 ID의 요청이 없으면 무시
      }
      i++;
    }

    return {
      success: true,
      requests,
      message:
        requests.length > 0
          ? `${requests.length}개의 대기 중인 요청이 있습니다.`
          : "대기 중인 요청이 없습니다.",
    };
  } catch (error) {
    console.error("요청 목록 조회 오류:", error);
    // 오류 발생시에도 UI를 위해 빈 배열 반환
    return {
      success: true, // 오류가 있어도 UI에 실패 메시지 표시하지 않고 빈 목록 표시
      requests: [],
      message: "요청 목록을 불러올 수 없습니다.",
    };
  }
};

/**
 * 검증 요청에 응답 (승인 또는 거부)
 * @param {number} requestId 요청 ID
 * @param {boolean} approved 승인 여부
 */
export const respondToVerification = async (requestId, approved) => {
  if (!medicalDataVerifierContract) await initVerificationService();

  try {
    const tx = await medicalDataVerifierContract.respondToVerification(
      requestId,
      approved
    );
    await tx.wait();

    console.log(`검증 요청 응답 완료: ID=${requestId}, 승인=${approved}`);

    return {
      success: true,
      message: approved ? "요청을 승인했습니다." : "요청을 거부했습니다.",
    };
  } catch (error) {
    console.error("요청 응답 오류:", error);
    return {
      success: false,
      message: `오류: ${error.message}`,
    };
  }
};

/**
 * 혈액형 증명 생성
 * @param {number} actualBloodTypeCode 실제 혈액형 코드
 * @param {number} targetBloodTypeCode 요청자가 추측한 혈액형 코드
 */
export const generateBloodTypeProof = async (
  actualBloodTypeCode,
  targetBloodTypeCode
) => {
  try {
    // 증명 생성을 위한 입력값
    const input = {
      actualBloodTypeCode,
      targetBloodTypeCode,
    };

    console.log("혈액형 증명 생성 입력값:", input);
    console.log("증명 생성 요청 데이터:", input);

    // snarkjs를 사용하여 ZK 증명 생성
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      input,
      BLOOD_TYPE_WASM_PATH,
      BLOOD_TYPE_ZKEY_PATH
    );

    console.log("증명 생성 완료:", publicSignals);
    console.log("증명 결과 해석: [0]번 인덱스 = 일치 여부 (1:일치, 0:불일치)");
    console.log("증명 결과 해석: [1]번 인덱스 = 요청자 지정 혈액형 코드");

    // 결과값 해석
    const isMatch = publicSignals[0] === "1";
    const targetBloodType = parseInt(publicSignals[1]);
    console.log(
      `결과: 일치 여부 = ${
        isMatch ? "일치" : "불일치"
      }, 요청 혈액형 = ${targetBloodType}`
    );

    // 증명 데이터 반환
    return {
      success: true,
      message: "혈액형 증명이 성공적으로 생성되었습니다.",
      proofData: {
        proof,
        publicSignals,
        isMatch: publicSignals[0] === "1",
        actualBloodTypeCode,
        targetBloodTypeCode,
      },
    };
  } catch (error) {
    console.error("증명 생성 오류:", error);
    return {
      success: false,
      message: `증명 생성 중 오류가 발생했습니다: ${error.message}`,
    };
  }
};

/**
 * ZK 증명 데이터를 컨트랙트에서 사용할 형식으로 변환
 * @param {Object} proof ZK 증명 데이터
 */
const prepareProofForContract = (proof) => {
  const a = [proof.proof.pi_a[0], proof.proof.pi_a[1]];

  const b = [
    [proof.proof.pi_b[0][0], proof.proof.pi_b[0][1]],
    [proof.proof.pi_b[1][0], proof.proof.pi_b[1][1]],
  ];

  const c = [proof.proof.pi_c[0], proof.proof.pi_c[1]];

  return { a, b, c };
};

/**
 * 승인된 요청에 대해 ZK 증명 제출
 * @param {string} patientAddress 환자 주소
 * @param {number} requestId 요청 ID
 * @param {Object} proofData ZK 증명 데이터
 */
export const submitProof = async (patientAddress, requestId, proofData) => {
  if (!medicalDataVerifierContract) await initVerificationService();

  try {
    // 증명 데이터 준비
    const { a, b, c } = prepareProofForContract(proofData);
    const input = proofData.publicSignals.map((signal) => signal.toString());

    // 컨트랙트에 증명 제출
    const tx = await medicalDataVerifierContract.submitProof(
      patientAddress,
      requestId,
      a,
      b,
      c,
      input
    );

    const receipt = await tx.wait();

    // 이벤트에서 결과 추출 (ethers v6)
    const event = receipt.logs.find(
      (log) => log.fragment && log.fragment.name === "VerificationResult"
    );
    const isValid = event ? event.args.isValid : false;

    console.log(`증명 제출 완료: 유효=${isValid}`);

    return {
      success: true,
      isValid,
      message: isValid
        ? "증명이 유효합니다. 검증이 성공적으로 완료되었습니다."
        : "증명이 유효하지 않습니다. 검증에 실패했습니다.",
    };
  } catch (error) {
    console.error("증명 제출 오류:", error);
    return {
      success: false,
      message: `오류: ${error.message}`,
    };
  }
};

/**
 * 혈액형 검증 전체 플로우
 * @param {string} patientAddress 환자 주소
 * @param {number} guessedBloodType 추측하는 혈액형 코드
 */
export const verifyBloodType = async (patientAddress, guessedBloodType) => {
  try {
    // 1. 검증 요청
    const requestResult = await requestVerification(
      patientAddress,
      "bloodType",
      guessedBloodType
    );
    if (!requestResult.success) return requestResult;

    // 이 함수는 요청만 하고 여기서 끝남
    // 실제 증명과 제출은 요청 승인 후 별도로 처리
    return requestResult;
  } catch (error) {
    console.error("혈액형 검증 오류:", error);
    return {
      success: false,
      message: `오류: ${error.message}`,
    };
  }
};

/**
 * 알레르기 검증 - 편의를 위한 특정 함수 (예시)
 */
export const verifyAllergy = async (patientAddress, allergyType, proof) => {
  // 공개 입력값 준비 (알레르기 서킷의 경우)
  const input = [allergyType];

  return await verifyMedicalData("allergy", patientAddress, proof, input);
};

/**
 * 의료 데이터 검증 제출 함수
 * @param {string} dataType 데이터 타입 (예: "bloodType", "allergy")
 * @param {string} patientAddress 환자 주소
 * @param {Object} proof 제로지식증명 정보
 * @param {Array} publicInput 공개 입력값
 */
export const verifyMedicalData = async (
  dataType,
  patientAddress,
  proof,
  publicInput
) => {
  if (!medicalDataVerifierContract) await initVerificationService();

  try {
    // 증명 데이터 준비
    const { a, b, c } = prepareProofForContract(proof);

    // 컨트랙트 호출 시 사용할 검증 타입에 따른 분기 처리
    let tx;
    if (dataType === "bloodType") {
      console.log(
        "컨트랙트 함수 호출: verifyBloodType, 입력값:",
        patientAddress,
        publicInput[0],
        a,
        b,
        c
      );
      tx = await medicalDataVerifierContract.verifyBloodType(
        patientAddress,
        publicInput[0], // guessedBloodType 값을 직접 전달
        a,
        b,
        c
      );
    } else if (dataType === "allergy") {
      tx = await medicalDataVerifierContract.verifyAllergyProof(
        patientAddress,
        a,
        b,
        c,
        publicInput
      );
    } else {
      throw new Error(`지원하지 않는 데이터 타입: ${dataType}`);
    }

    console.log("트랜잭션 전송됨:", tx.hash);

    // 트랜잭션이 마이닝될 때까지 대기
    const receipt = await tx.wait();
    console.log("트랜잭션 마이닝 완료:", receipt);

    // 이벤트 확인 (BloodTypeVerified 이벤트도 확인)
    let isValid = false;
    let eventFound = false;

    // 모든 이벤트 출력 (디버깅용)
    console.log("수신된 이벤트 로그:", receipt.logs);

    // BloodTypeVerified 이벤트 확인
    const bloodTypeEvent = receipt.logs.find(
      (log) => log.fragment && log.fragment.name === "BloodTypeVerified"
    );

    if (bloodTypeEvent) {
      eventFound = true;
      isValid = bloodTypeEvent.args.isMatch;
      console.log("BloodTypeVerified 이벤트 발견:", bloodTypeEvent.args);
    } else {
      // VerificationResult 이벤트 확인 (대체 이벤트)
      const verificationEvent = receipt.logs.find(
        (log) => log.fragment && log.fragment.name === "VerificationResult"
      );

      if (verificationEvent) {
        eventFound = true;
        isValid = verificationEvent.args.isValid;
        console.log("VerificationResult 이벤트 발견:", verificationEvent.args);
      }
    }

    // 이벤트를 찾지 못한 경우 경고 로그 출력
    if (!eventFound) {
      console.warn(
        "이벤트를 찾을 수 없습니다. 트랜잭션은 성공했지만 결과를 확인할 수 없습니다."
      );
    }

    return {
      success: true,
      isValid,
      txHash: tx.hash,
      message: isValid
        ? "증명이 유효합니다. 검증이 성공적으로 완료되었습니다."
        : "증명이 유효하지 않습니다. 검증에 실패했습니다.",
    };
  } catch (error) {
    console.error(`${dataType} 검증 오류:`, error);
    return {
      success: false,
      message: `온체인 검증 오류: ${error.message}`,
    };
  }
};

/**
 * 의사로 등록하기
 */
export const registerDoctor = async (doctorAddress) => {
  if (!zkareContract) await initVerificationService();

  try {
    // 관리자만 의사 등록 가능 (현실에서는 관리자 권한 검증 필요)
    const tx = await zkareContract.addDoctor(
      doctorAddress || (await getCurrentAccount())
    );
    await tx.wait();

    console.log(
      `의사 등록 완료: ${doctorAddress || (await getCurrentAccount())}`
    );

    return {
      success: true,
      message: "의사로 성공적으로 등록되었습니다.",
    };
  } catch (error) {
    console.error("의사 등록 오류:", error);
    return {
      success: false,
      message: `오류: ${error.message}`,
    };
  }
};

/**
 * 환자로 등록하기
 * @param {string} patientAddress 환자 주소 (미지정 시 현재 계정)
 * @returns {Promise<Object>} 등록 결과
 */
export const registerPatient = async (patientAddress) => {
  if (!zkareContract) await initVerificationService();

  try {
    // 주소가 지정되지 않은 경우 현재 계정 사용
    let account = patientAddress;
    if (!account) {
      account = await getCurrentAccount();
    }

    // 이미 환자로 등록되어 있는지 확인
    let isAlreadyPatient = false;
    try {
      // isPatient 함수가 존재하는지 확인
      if (typeof zkareContract.isPatient === "function") {
        isAlreadyPatient = await zkareContract.isPatient(account);
      } else {
        // 대체 로직: 해당 주소의 레코드 수로 환자 여부 추정
        const recordCount = await zkareContract.getRecordCount(account);
        isAlreadyPatient = recordCount > 0;
        console.log(`환자 확인 대체 방법 사용: 레코드 수 = ${recordCount}`);
      }
    } catch (checkError) {
      console.warn("환자 상태 확인 오류, 진행 계속:", checkError);
      // 오류 발생 시 계속 진행 (환자가 아닌 것으로 간주)
    }

    if (isAlreadyPatient) {
      console.log(`이미 환자로 등록된 계정입니다: ${account}`);
      return {
        success: true,
        message: "이미 환자로 등록되어 있습니다.",
      };
    }

    // 실제 컨트랙트 호출하여 환자 등록
    let tx;
    try {
      if (account === (await getCurrentAccount())) {
        // 자신을 등록하는 경우
        // registerPatient 함수가 있는지 확인
        if (typeof zkareContract.registerPatient === "function") {
          tx = await zkareContract.registerPatient();
        } else {
          // 대체 방법: 의료 기록 저장 없이는 환자 등록 불가
          return {
            success: false,
            message:
              "환자 등록 함수가 컨트랙트에 없습니다. 컨트랙트 버전을 확인해주세요.",
          };
        }

        await tx.wait();
        console.log(`환자 등록 완료: ${account}`);
      } else {
        // 다른 주소를 등록하는 경우 (의사가 환자를 등록하는 경우)
        return {
          success: false,
          message:
            "다른 주소를 환자로 등록하려면 의료 기록 등록 등을 통해 간접적으로 등록해야 합니다.",
        };
      }
    } catch (registerError) {
      console.error("환자 등록 트랜잭션 오류:", registerError);
      return {
        success: false,
        message: `환자 등록 중 오류가 발생했습니다: ${registerError.message}`,
      };
    }

    return {
      success: true,
      message: "환자로 성공적으로 등록되었습니다.",
    };
  } catch (error) {
    console.error("환자 등록 오류:", error);
    return {
      success: false,
      message: `오류: ${error.message}`,
    };
  }
};

/**
 * 등록된 의사 목록 가져오기
 * @returns {Promise<Object>} 의사 목록과 결과 상태
 */
export const getDoctorsList = async () => {
  if (!zkareContract) await initVerificationService();

  try {
    let doctors = [];

    try {
      // getAllDoctors 함수가 존재하는지 확인
      if (typeof zkareContract.getAllDoctors === "function") {
        // 컨트랙트의 getAllDoctors 함수 호출
        const doctorAddresses = await zkareContract.getAllDoctors();

        // 의사 정보 구성 (활성 상태 확인)
        if (Array.isArray(doctorAddresses) && doctorAddresses.length > 0) {
          doctors = await Promise.all(
            doctorAddresses.map(async (address) => {
              let isActive = true;
              try {
                // isDoctor 함수가 있으면 호출
                if (typeof zkareContract.isDoctor === "function") {
                  isActive = await zkareContract.isDoctor(address);
                }
              } catch (statusError) {
                console.warn("의사 상태 확인 오류:", statusError);
              }

              return {
                address,
                isActive,
              };
            })
          );

          // 활성 상태인 의사만 필터링
          doctors = doctors.filter((doctor) => doctor.isActive);
        }
      } else {
        // 대체 방법: 관리자 계정 가져오기
        try {
          const admin = await zkareContract.admin();
          if (admin) {
            doctors = [{ address: admin, isActive: true }];
          }
        } catch (adminError) {
          console.warn("관리자 조회 오류:", adminError);
        }
      }
    } catch (contractError) {
      console.error("의사 목록 조회 오류:", contractError);

      // 오류 발생 시 관리자 계정만 가져오기 시도
      try {
        const admin = await zkareContract.admin();
        if (admin) {
          doctors = [{ address: admin, isActive: true }];
        }
      } catch (adminError) {
        console.error("관리자 조회 오류:", adminError);
      }
    }

    return {
      success: true,
      doctors,
      message: `${doctors.length}명의 의사가 검색되었습니다.`,
    };
  } catch (error) {
    console.error("의사 목록 최종 조회 오류:", error);
    return {
      success: false,
      doctors: [],
      message: `오류: ${error.message}`,
    };
  }
};

/**
 * 등록된 환자 목록 가져오기
 * @returns {Promise<Object>} 환자 목록과 결과 상태
 */
export const getPatientsList = async () => {
  if (!zkareContract) await initVerificationService();
  if (!medicalDataVerifierContract) await initVerificationService();

  try {
    let patients = [];

    try {
      // getAllPatients 함수가 존재하는지 확인
      if (typeof zkareContract.getAllPatients === "function") {
        // 컨트랙트의 getAllPatients 함수 호출
        const patientAddresses = await zkareContract.getAllPatients();

        // 환자 정보 구성 - 레코드 수와 혈액형 포함
        if (Array.isArray(patientAddresses) && patientAddresses.length > 0) {
          patients = await Promise.all(
            patientAddresses.map(async (address) => {
              let recordCount = 0;
              let bloodType = 0;

              try {
                // 환자의 레코드 수 조회
                if (typeof zkareContract.getRecordCount === "function") {
                  const count = await zkareContract.getRecordCount(address);
                  recordCount = Number(count);
                }

                // 환자의 혈액형 정보 조회
                try {
                  const bloodTypeResult =
                    await medicalDataVerifierContract.getPatientData(
                      address,
                      "bloodType"
                    );
                  bloodType = Number(bloodTypeResult);
                } catch (bloodTypeError) {
                  console.log("혈액형 정보 없음:", address);
                  // 혈액형 정보가 없는 경우 무시
                }
              } catch (countError) {
                console.warn("환자 데이터 조회 오류:", countError);
              }

              return {
                address,
                recordCount,
                bloodType,
              };
            })
          );
        }
      } else {
        // 대체 방법: 이벤트 로그를 사용해 환자 추정하려면 여기에 코드 추가
        console.log(
          "getAllPatients 함수를 찾을 수 없어 환자 목록을 가져올 수 없습니다."
        );
      }
    } catch (contractError) {
      console.error("환자 목록 조회 오류:", contractError);
    }

    return {
      success: true,
      patients,
      message:
        patients.length > 0
          ? `${patients.length}명의 환자가 검색되었습니다.`
          : "등록된 환자가 없습니다.",
    };
  } catch (error) {
    console.error("환자 목록 최종 조회 오류:", error);
    return {
      success: false,
      patients: [],
      message: `오류: ${error.message}`,
    };
  }
};

// 다른 검증 유형에 대한 함수들 추가
