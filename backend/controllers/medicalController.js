const { JsonRpcProvider, Wallet, Contract } = require("ethers");
const config = require("../config");

class MedicalController {
  constructor() {
    // 컨트랙트 초기화
    const provider = new JsonRpcProvider(config.RPC_URL);
    const privateKey = config.PRIVATE_KEY.startsWith("0x")
      ? config.PRIVATE_KEY
      : `0x${config.PRIVATE_KEY}`;
    const wallet = new Wallet(privateKey, provider);
    this.contract = new Contract(
      config.CONTRACT_ADDRESS,
      require("../abis/MedicalRecord.json").abi,
      wallet
    );
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

      // IPFS에 데이터 업로드
      const response = await fetch("http://localhost:3001/api/ipfs/upload", {
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

      // 스마트 컨트랙트에 기록 추가
      const tx = await this.contract.addRecord(patientAddress, cid);
      await tx.wait();

      res.json({
        success: true,
        data: {
          transactionHash: tx.hash,
          cid,
          signature,
        },
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

      // 스마트 컨트랙트에서 기록 조회
      const record = await this.contract.getRecord(
        patientAddress,
        parseInt(recordId)
      );

      if (!record || !record.cid) {
        return res.status(404).json({
          success: false,
          message: "의료 기록을 찾을 수 없습니다.",
        });
      }

      // IPFS에서 데이터 조회
      const response = await fetch(
        `http://localhost:3001/api/ipfs/${record.cid}`
      );
      if (!response.ok) {
        throw new Error("IPFS 데이터 조회 실패");
      }

      const recordData = await response.json();

      res.json({
        success: true,
        data: {
          ...recordData,
          cid: record.cid,
          timestamp: record.timestamp.toNumber(),
        },
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

      const tx = await this.contract.addDoctor(doctorAddress);
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

      const isDoctor = await this.contract.isDoctor(address);

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

module.exports = new MedicalController();
