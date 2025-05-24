const zkProofService = require("../services/zkProofService");
const medicalRecordService = require("../services/medicalRecordService");
const config = require("../config");
const MedicalRecordService = require("../services/MedicalRecordService");
const { ethers } = require("ethers");

// 설정 확인
let zkService;
try {
  zkService = new zkProofService({
    providerUrl: config.RPC_URL,
    verifierContractAddress: config.CONTRACT_ADDRESS,
    verifierABI: require("../constants/verifierABI.json"),
    config,
  });
  console.log("MedicalController에서 ZkProofService 초기화 성공");
} catch (error) {
  console.error("MedicalController에서 ZkProofService 초기화 실패:", error);
}

class MedicalController {
  constructor() {
    this.medicalRecordService = new MedicalRecordService();
  }

  // 의료 기록 추가
  async addMedicalRecord(req, res) {
    try {
      const { patientAddress, recordData } = req.body;

      if (!patientAddress || !recordData) {
        return res.status(400).json({
          success: false,
          message: "환자 주소와 의료 기록 데이터가 필요합니다.",
        });
      }

      // 의료 기록 추가 (서명 및 IPFS 업로드 포함)
      const result = await this.medicalRecordService.addMedicalRecord(
        patientAddress,
        recordData
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("의료 기록 추가 중 오류:", error);
      res.status(500).json({
        success: false,
        message: "의료 기록 추가 중 오류가 발생했습니다.",
        error: error.message,
      });
    }
  }

  // 의료 기록 조회
  async getMedicalRecord(req, res) {
    try {
      const { patientAddress, recordId } = req.params;

      if (!patientAddress || recordId === undefined) {
        return res.status(400).json({
          success: false,
          message: "환자 주소와 기록 ID가 필요합니다.",
        });
      }

      // 의료 기록 조회 (IPFS에서 데이터 조회 포함)
      const record = await this.medicalRecordService.getMedicalRecord(
        patientAddress,
        parseInt(recordId)
      );

      res.json({
        success: true,
        data: record,
      });
    } catch (error) {
      console.error("의료 기록 조회 중 오류:", error);
      res.status(500).json({
        success: false,
        message: "의료 기록 조회 중 오류가 발생했습니다.",
        error: error.message,
      });
    }
  }

  // 의사 추가
  async addDoctor(req, res) {
    try {
      const { doctorAddress } = req.body;

      if (!doctorAddress) {
        return res.status(400).json({
          success: false,
          message: "의사 주소가 필요합니다.",
        });
      }

      const tx = await this.medicalRecordService.contract.addDoctor(
        doctorAddress
      );
      await tx.wait();

      res.json({
        success: true,
        message: "의사가 성공적으로 추가되었습니다.",
        transactionHash: tx.hash,
      });
    } catch (error) {
      console.error("의사 추가 중 오류:", error);
      res.status(500).json({
        success: false,
        message: "의사 추가 중 오류가 발생했습니다.",
        error: error.message,
      });
    }
  }

  // 의사 여부 확인
  async isDoctor(req, res) {
    try {
      const { address } = req.params;

      if (!address) {
        return res.status(400).json({
          success: false,
          message: "주소가 필요합니다.",
        });
      }

      const isDoctor = await this.medicalRecordService.contract.isDoctor(
        address
      );

      res.json({
        success: true,
        isDoctor,
      });
    } catch (error) {
      console.error("의사 여부 확인 중 오류:", error);
      res.status(500).json({
        success: false,
        message: "의사 여부 확인 중 오류가 발생했습니다.",
        error: error.message,
      });
    }
  }
}

module.exports = MedicalController;

/**
 * 혈액형 증명 생성 컨트롤러
 * @param {Object} req - 요청 객체
 * @param {Object} res - 응답 객체
 */
exports.generateBloodTypeProof = async (req, res) => {
  try {
    // ZkProofService 인스턴스 확인
    if (!zkService) {
      return res.status(500).json({
        success: false,
        message: "ZK 증명 서비스가 초기화되지 않았습니다.",
      });
    }

    const { patientAddress, targetBloodType } = req.body;

    if (!patientAddress || !targetBloodType) {
      return res.status(400).json({
        success: false,
        message: "환자 주소와 검증할 혈액형이 필요합니다.",
      });
    }

    // 혈액형 코드 변환
    const bloodTypeCode =
      medicalRecordService.getBloodTypeCode(targetBloodType);
    if (bloodTypeCode === 0) {
      return res.status(400).json({
        success: false,
        message: "유효하지 않은 혈액형입니다. A, B, AB, O 중 하나여야 합니다.",
      });
    }

    // 혈액형 증명 생성
    const proofData = await zkService.generateBloodTypeProof(
      patientAddress,
      bloodTypeCode
    );

    res.status(200).json({
      success: true,
      proofData,
    });
  } catch (error) {
    console.error("혈액형 증명 생성 오류:", error);
    res.status(500).json({
      success: false,
      message: "혈액형 증명 생성 중 오류가 발생했습니다.",
      error: error.message,
    });
  }
};

/**
 * 혈액형 증명 검증 컨트롤러
 * @param {Object} req - 요청 객체
 * @param {Object} res - 응답 객체
 */
exports.verifyBloodTypeProof = async (req, res) => {
  try {
    // ZkProofService 인스턴스 확인
    if (!zkService) {
      return res.status(500).json({
        success: false,
        message: "ZK 증명 서비스가 초기화되지 않았습니다.",
      });
    }

    const { proof, publicInputs } = req.body;

    if (!proof || !publicInputs) {
      return res.status(400).json({
        success: false,
        message: "proof와 publicInputs가 모두 필요합니다.",
      });
    }

    // 혈액형 증명 검증
    const isValid = await zkService.verifyBloodTypeProof(proof, publicInputs);

    res.status(200).json({
      success: true,
      isValid,
      bloodType: medicalRecordService.getBloodTypeFromCode(
        publicInputs.targetBloodTypeCode
      ),
    });
  } catch (error) {
    console.error("혈액형 증명 검증 오류:", error);
    res.status(500).json({
      success: false,
      message: "혈액형 증명 검증 중 오류가 발생했습니다.",
      error: error.message,
    });
  }
};
