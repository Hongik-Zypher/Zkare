const { groth16 } = require("snarkjs");
const fs = require("fs");
const path = require("path");
const ethers = require("ethers");
const Web3 = require("web3");

// 경로 설정
const CIRCUIT_PATH = path.join(__dirname, "../../circuits/medical_record_proof");
const WASM_FILE = `${CIRCUIT_PATH}/medical_record_proof.wasm`;
const ZKEY_FILE = `${CIRCUIT_PATH}/medical_record_proof_final.zkey`;

// 혈액형 관련 기능 추가
const medicalRecordService = require('./medicalRecordService');
const snarkjs = require('snarkjs');

/**
 * ZK 증명 생성 서비스
 * 환자의 승인 상태와 의료 기록에 대한 ZK 증명을 생성
 */
class ZkProofService {
  /**
   * 생성자
   * @param {object} config - 설정 객체
   * @param {string} config.providerUrl - 이더리움 프로바이더 URL
   * @param {string} config.verifierContractAddress - 검증자 컨트랙트 주소
   * @param {object} config.verifierABI - 검증자 컨트랙트 ABI
   * @param {string} [config.wasmFile] - 웜 파일 경로 (선택적)
   * @param {string} [config.zkeyFile] - zkey 파일 경로 (선택적)
   */
  constructor(config) {
    this.web3 = new Web3(config.providerUrl);
    // ethers v6 프로바이더 초기화
    this.provider = new ethers.JsonRpcProvider(config.providerUrl);
    this.verifierContract = new ethers.Contract(
      config.verifierContractAddress, 
      config.verifierABI, 
      this.provider
    );
    
    // 회로 파일 경로 설정
    this.wasmFile = config.wasmFile || WASM_FILE;
    this.zkeyFile = config.zkeyFile || ZKEY_FILE;
  }

  /**
   * 증명 입력값 가져오기
   * @param {string} patientAddress - 환자 이더리움 주소
   * @param {string} requestId - 요청 ID
   * @returns {Promise<object>} 증명 입력값
   */
  async getProofInputs(patientAddress, requestId) {
    try {
      // 컨트랙트에서 승인 상태 확인
      const [isApproved, approvalTimestamp] = await this.verifierContract.getApprovalStatus(
        patientAddress,
        requestId
      );
      
      // 요청 정보 가져오기
      const requestInfo = await this.verifierContract.getRequestDetails(requestId);
      const recordHash = requestInfo.recordHash;
      const requesterAddress = requestInfo.requester;
      
      // 난수 생성 (nullifier 용)
      const randomSecret = ethers.randomBytes(32);
      const nullifierHash = this.web3.utils.soliditySha3(
        { t: 'address', v: patientAddress },
        { t: 'bytes32', v: requestId },
        { t: 'bytes32', v: '0x' + Buffer.from(randomSecret).toString('hex') }
      );
      
      // 입력값 구성
      return {
        recordHash,
        patientAddress,
        requesterAddress,
        approvalTimestamp: approvalTimestamp.toString(),
        isApproved: isApproved ? "1" : "0",
        requestId,
        randomSecret: '0x' + Buffer.from(randomSecret).toString('hex'),
        nullifierHash
      };
    } catch (error) {
      console.error("증명 입력값 가져오기 실패:", error);
      throw new Error(`증명 입력값 가져오기 실패: ${error.message}`);
    }
  }

  /**
   * 증명 생성
   * @param {object} inputs - 증명 입력값
   * @returns {Promise<object>} 생성된 증명 데이터
   */
  async generateProof(inputs) {
    try {
      // 서킷 입력값 형식 변환
      const circuitInputs = {
        recordHash: this.web3.utils.hexToNumberString(inputs.recordHash),
        patientAddress: this.web3.utils.hexToNumberString(inputs.patientAddress),
        requesterAddress: this.web3.utils.hexToNumberString(inputs.requesterAddress),
        requestId: this.web3.utils.hexToNumberString(inputs.requestId),
        approvalTimestamp: inputs.approvalTimestamp,
        isApproved: inputs.isApproved,
        randomSecret: this.web3.utils.hexToNumberString(inputs.randomSecret)
      };

      // SNARKJS로 증명 생성
      const { proof, publicSignals } = await groth16.fullProve(
        circuitInputs, 
        this.wasmFile, 
        this.zkeyFile
      );
      
      // 증명 검증 (확인 용도)
      const vKey = JSON.parse(fs.readFileSync(`${CIRCUIT_PATH}/verification_key.json`));
      const isValid = await groth16.verify(vKey, publicSignals, proof);
      
      if (!isValid) {
        throw new Error("생성된 증명이 유효하지 않습니다");
      }
      
      return {
        proof,
        publicSignals,
        recordHash: inputs.recordHash,
        approvalTimestamp: inputs.approvalTimestamp,
        isApproved: inputs.isApproved === "1",
        nullifierHash: inputs.nullifierHash,
        patientAddress: inputs.patientAddress,
        requesterAddress: inputs.requesterAddress
      };
    } catch (error) {
      console.error("증명 생성 실패:", error);
      throw new Error(`증명 생성 실패: ${error.message}`);
    }
  }

  /**
   * 전체 증명 생성 프로세스
   * @param {string} patientAddress - 환자 이더리움 주소
   * @param {string} requestId - 요청 ID
   * @param {string} requesterAddress - 요청자 이더리움 주소
   * @returns {Promise<object>} 생성된 증명 데이터
   */
  async createProof(patientAddress, requestId, requesterAddress) {
    try {
      // 1. 입력값 가져오기
      const inputs = await this.getProofInputs(patientAddress, requestId);
      
      // 요청자 주소가 맞는지 확인
      if (inputs.requesterAddress.toLowerCase() !== requesterAddress.toLowerCase()) {
        throw new Error("요청자 주소가 일치하지 않습니다");
      }
      
      // 2. 증명 생성
      const proofData = await this.generateProof(inputs);
      
      return proofData;
    } catch (error) {
      console.error("증명 생성 프로세스 실패:", error);
      throw error;
    }
  }

  /**
   * 증명이 이미 사용되었는지 상태를 확인합니다
   * @param {string} nullifierHash - 확인할 nullifier 해시
   * @returns {boolean} - 증명 사용 여부
   */
  async verifyProofStatus(nullifierHash) {
    try {
      // 컨트랙트에서 해당 nullifier 사용 여부 조회
      const isNullifierUsed = await this.verifierContract.isNullifierUsed(nullifierHash);
      return isNullifierUsed;
    } catch (error) {
      console.error('증명 상태 확인 오류:', error);
      throw new Error('증명 상태 확인 중 오류가 발생했습니다: ' + error.message);
    }
  }

  /**
   * 증명을 오프체인에서 검증합니다
   * @param {Object} proof - 증명 객체
   * @param {Array} publicSignals - 공개 신호 배열
   * @returns {boolean} - 검증 결과
   */
  async validateProof(proof, publicSignals) {
    try {
      // verification_key.json 파일 경로
      const vKeyPath = path.join(path.dirname(this.zkeyFile), 'verification_key.json');
      
      // 검증 키 파일이 존재하는지 확인
      if (!fs.existsSync(vKeyPath)) {
        throw new Error('검증 키 파일을 찾을 수 없습니다');
      }
      
      // 검증 키 파일 로드
      const vKeyJson = JSON.parse(fs.readFileSync(vKeyPath, 'utf8'));
      
      // 증명 검증
      const isValid = await groth16.verify(vKeyJson, publicSignals, proof);
      return isValid;
    } catch (error) {
      console.error('증명 검증 오류:', error);
      throw new Error('증명 검증 중 오류가 발생했습니다: ' + error.message);
    }
  }

  /**
   * 증명을 오프체인에서 검증합니다
   * @param {object} proof - 증명 객체
   * @param {object} publicInputs - 공개 입력값
   * @returns {object} - 검증 결과
   */
  async verifyProofOnchain(proof, publicInputs) {
    try {
      console.warn('경고: verifyProofOnchain은 더 이상 사용되지 않습니다. prepareProofTransaction을 사용하세요.');
      // 트랜잭션 데이터만 준비하고 실제 실행은 하지 않음
      const txData = await this.prepareProofTransaction(proof, publicInputs);
      
      return {
        success: false,
        verified: false,
        transactionData: txData,
        message: '이 메서드는 더 이상 사용되지 않습니다. 사용자 지갑으로 서명이 필요합니다.'
      };
    } catch (error) {
      console.error('온체인 증명 검증 오류:', error);
      throw error;
    }
  }

  /**
   * 증명 검증을 위한 트랜잭션 데이터 준비
   * @param {Object} proof - 증명 객체
   * @param {Object} publicInputs - 공개 입력값
   * @returns {Promise<object>} - 트랜잭션 데이터
   */
  async prepareProofTransaction(proof, publicInputs) {
    try {
      // Groth16 증명 형식으로 변환
      const a = [proof.pi_a[0], proof.pi_a[1]];
      const b = [
        [proof.pi_b[0][1], proof.pi_b[0][0]],
        [proof.pi_b[1][1], proof.pi_b[1][0]]
      ];
      const c = [proof.pi_c[0], proof.pi_c[1]];
      
      // 컨트랙트 인터페이스에서 함수 호출 데이터 인코딩
      const contractInterface = this.verifierContract.interface;
      const data = contractInterface.encodeFunctionData("verifyProof", [
        a, b, c,
        [
          publicInputs.recordHash,
          publicInputs.patientAddress,
          publicInputs.requesterAddress,
          publicInputs.nullifierHash
        ]
      ]);
      
      return {
        to: this.verifierContract.address,
        data: data,
        gasEstimate: "300000" // 기본 가스 예상치
      };
    } catch (error) {
      console.error('트랜잭션 데이터 준비 오류:', error);
      throw new Error('트랜잭션 데이터 준비 중 오류가 발생했습니다: ' + error.message);
    }
  }
  
  /**
   * 서명된 트랜잭션 제출
   * @param {string} signedTx - 서명된 트랜잭션 데이터
   * @returns {Promise<object>} - 트랜잭션 결과
   */
  async submitSignedTransaction(signedTx) {
    try {
      // 서명된 트랜잭션 제출
      const txResponse = await this.provider.broadcastTransaction(signedTx);
      const receipt = await txResponse.wait();
      
      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (error) {
      console.error('서명된 트랜잭션 제출 오류:', error);
      throw new Error('서명된 트랜잭션 제출 중 오류가 발생했습니다: ' + error.message);
    }
  }

  /**
   * 서명자 설정
   * @param {Signer} signer - 이더리움 트랜잭션 서명자
   */
  setSigner(signer) {
    this.signer = signer;
  }

  /**
   * snarkjs 형식의 증명을 솔리디티 컨트랙트 호출 형식으로 변환합니다
   * @param {Object} proof - snarkjs로부터 생성된 증명
   * @returns {Array} - 솔리디티 컨트랙트 호출을 위한 형식으로 변환된 증명
   */
  formatProofForSolidity(proof) {
    return [
      proof.pi_a[0], proof.pi_a[1],
      [proof.pi_b[0][1], proof.pi_b[0][0]],
      [proof.pi_b[1][1], proof.pi_b[1][0]],
      proof.pi_c[0], proof.pi_c[1]
    ];
  }

  /**
   * 혈액형 증명 생성
   * 사용자의 실제 혈액형과 확인하고자 하는 혈액형이 일치하는지 ZK 증명
   * @param {string} patientAddress - 환자 이더리움 주소
   * @param {number} actualBloodTypeCode - 실제 혈액형 코드 (1: A, 2: B, 3: AB, 4: O)
   * @param {number} targetBloodTypeCode - 비교할 혈액형 코드 (1: A, 2: B, 3: AB, 4: O)
   * @returns {Promise<Object>} - 증명 데이터 (증명, 공개 입력값, 일치 여부)
   */
  async generateBloodTypeProof(patientAddress, actualBloodTypeCode, targetBloodTypeCode) {
    try {
      console.log(`[ZkProofService] 혈액형 증명 생성 시작 - 환자: ${patientAddress}, 실제: ${actualBloodTypeCode}, 대상: ${targetBloodTypeCode}`);
      
      // 혈액형 코드 범위 검증 (1-4)
      if (actualBloodTypeCode < 1 || actualBloodTypeCode > 4 || targetBloodTypeCode < 1 || targetBloodTypeCode > 4) {
        const error = new Error('혈액형 코드는 1에서 4 사이의 값이어야 합니다. (1: A형, 2: B형, 3: AB형, 4: O형)');
        console.error(`[ZkProofService] ${error.message}`);
        throw error;
      }

      // 회로 경로 설정
      const circuitDir = path.join(__dirname, '../../circuits/build/blood_type');
      // 수정된 WASM 파일 경로 - js 디렉토리 추가
      const wasmFile = path.join(circuitDir, 'blood_type_proof_js/blood_type_proof.wasm');
      const zkeyFile = path.join(circuitDir, 'blood_type_proof_final.zkey');

      console.log(`[ZkProofService] 회로 파일 확인 중: ${wasmFile}`);
      
      // 파일 존재 여부 확인
      if (!fs.existsSync(wasmFile)) {
        const error = new Error(`WASM 파일을 찾을 수 없습니다: ${wasmFile}`);
        console.error(`[ZkProofService] ${error.message}`);
        throw error;
      }
      
      if (!fs.existsSync(zkeyFile)) {
        const error = new Error(`Zkey 파일을 찾을 수 없습니다: ${zkeyFile}`);
        console.error(`[ZkProofService] ${error.message}`);
        throw error;
      }

      // 서킷 입력값 구성
      const input = {
        actualBloodTypeCode: parseInt(actualBloodTypeCode),
        targetBloodTypeCode: parseInt(targetBloodTypeCode)
      };
      
      console.log(`[ZkProofService] 증명 생성 중... 입력값:`, input);

      try {
        // 증명 생성
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
          input,
          wasmFile,
          zkeyFile
        );
        
        // isMatch 신호는 publicSignals[0]에 있음
        const isMatch = publicSignals[0] === '1';
        
        console.log(`[ZkProofService] 증명 생성 완료! isMatch: ${isMatch}`);
        console.log(`[ZkProofService] 공개 신호:`, publicSignals);

        return {
          proof,
          publicSignals,
          isMatch
        };
      } catch (proofError) {
        console.error(`[ZkProofService] 증명 생성 중 오류 발생:`, proofError);
        throw new Error(`증명 생성 실패: ${proofError.message}`);
      }
    } catch (error) {
      console.error(`[ZkProofService] 혈액형 증명 생성 오류:`, error);
      throw new Error(`혈액형 증명 생성 실패: ${error.message}`);
    }
  }

  /**
   * 혈액형 증명 검증
   * @param {Object} proof - 증명 객체
   * @param {Array} publicSignals - 공개 신호 배열
   * @returns {Promise<boolean>} - 검증 결과
   */
  async verifyBloodTypeProof(proof, publicSignals) {
    try {
      console.log(`[ZkProofService] 혈액형 증명 검증 시작`);
      console.log(`[ZkProofService] 받은 증명 데이터:`, JSON.stringify(proof, null, 2));
      console.log(`[ZkProofService] 받은 공개 신호:`, publicSignals);
      
      // 검증 키 파일 경로
      const verificationKeyPath = path.join(__dirname, '../../circuits/build/blood_type/blood_type_proof_verification_key.json');

      console.log(`[ZkProofService] 검증 키 파일 확인 중: ${verificationKeyPath}`);
      
      // 파일 존재 여부 확인
      if (!fs.existsSync(verificationKeyPath)) {
        const error = new Error(`검증 키 파일을 찾을 수 없습니다: ${verificationKeyPath}`);
        console.error(`[ZkProofService] ${error.message}`);
        throw error;
      }

      try {
        // 검증 키 읽기
        const verificationKey = JSON.parse(fs.readFileSync(verificationKeyPath, 'utf8'));
        
        console.log(`[ZkProofService] 증명 검증 중...`);
        
        // 증명 데이터 구조 안전하게 처리
        let verifyProof = proof;
        // 증명이 snarkjs 형식인 경우 (pi_a, pi_b, pi_c 포함)
        if (proof.pi_a && proof.pi_b && proof.pi_c) {
          console.log('[ZkProofService] snarkjs 형식의 증명 감지됨');
          verifyProof = {
            pi_a: proof.pi_a,
            pi_b: proof.pi_b,
            pi_c: proof.pi_c
          };
        }
        
        // 증명 검증
        const isValid = await snarkjs.groth16.verify(verificationKey, publicSignals, verifyProof);
        
        console.log(`[ZkProofService] 증명 검증 결과: ${isValid ? '유효함' : '유효하지 않음'}`);
        
        return isValid;
      } catch (verifyError) {
        console.error(`[ZkProofService] 검증 과정 중 오류 발생:`, verifyError);
        throw new Error(`증명 검증 과정 실패: ${verifyError.message}`);
      }
    } catch (error) {
      console.error(`[ZkProofService] 혈액형 증명 검증 오류:`, error);
      throw new Error(`혈액형 증명 검증 실패: ${error.message}`);
    }
  }

  /**
   * 환자의 의료 기록 가져오기 (데모용)
   * @param {string} patientAddress - 환자 이더리움 주소
   * @returns {Promise<Array>} 의료 기록 배열
   */
  async fetchPatientMedicalRecords(patientAddress) {
    // 실제 구현에서는 데이터베이스 또는 IPFS에서 가져옴
    // 여기서는 예시 데이터 사용
    return [
      {
        patient_id: patientAddress,
        record_id: "record_1",
        timestamp: new Date().toISOString(),
        data: [
          {
            header_id: 1001, // 혈액형
            name: "혈액형",
            value: "A",
            unit: "",
            timestamp: new Date().toISOString()
          }
        ],
        hash: "0x1234...",
        signature: "0x5678..."
      }
    ];
  }
}

module.exports = ZkProofService; 