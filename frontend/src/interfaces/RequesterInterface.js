const ethers = require("ethers");
const axios = require("axios");

/**
 * 보험사/연구자용 인터페이스 클래스
 * 의료 기록 접근 요청 및 증명 생성을 위한 기능 제공
 */
class RequesterInterface {
  /**
   * 요청자 인터페이스 생성자
   * @param {Provider} provider - Web3 제공자
   * @param {string} zkareContractAddress - Zkare 메인 컨트랙트 주소
   * @param {object} zkareABI - Zkare 컨트랙트 ABI
   * @param {string} verifierContractAddress - 검증자 컨트랙트 주소
   * @param {object} verifierABI - 검증자 컨트랙트 ABI
   * @param {string} zkProofServerUrl - ZK 증명 생성 서버 URL
   */
  constructor(provider, zkareContractAddress, zkareABI, verifierContractAddress, verifierABI, zkProofServerUrl) {
    this.provider = provider;
    this.zkareContract = new ethers.Contract(zkareContractAddress, zkareABI, provider);
    this.verifierContract = new ethers.Contract(verifierContractAddress, verifierABI, provider);
    this.zkProofServerUrl = zkProofServerUrl || "http://localhost:3000";
  }
  
  /**
   * 의료 기록 접근 요청
   * @param {string} patientAddress - 환자 이더리움 주소
   * @param {string} recordHash - 의료 기록 해시
   * @param {Signer} signer - 서명자 (요청자 지갑)
   * @returns {Promise<object>} 요청 결과
   */
  async requestAccess(patientAddress, recordHash, signer) {
    const contractWithSigner = this.verifierContract.connect(signer);
    
    const tx = await contractWithSigner.requestAccess(patientAddress, recordHash);
    const receipt = await tx.wait();
    
    // 이벤트에서 요청 ID 추출 (ethers v6 이벤트 처리)
    const event = receipt.logs
      .filter(log => {
        try {
          return this.verifierContract.interface.parseLog(log)?.name === "AccessRequested";
        } catch (e) {
          return false;
        }
      })
      .map(log => this.verifierContract.interface.parseLog(log))[0];

    const requestId = event.args.requestId;
    
    return {
      success: true,
      requestId,
      txHash: receipt.hash // v6에서는 transactionHash 대신 hash
    };
  }
  
  /**
   * 승인 상태 확인
   * @param {string} patientAddress - 환자 이더리움 주소
   * @param {string} requestId - 요청 ID
   * @returns {Promise<object>} 승인 상태 정보
   */
  async checkApprovalStatus(patientAddress, requestId) {
    const [isApproved, approvalTime] = await this.verifierContract.getApprovalStatus(
      patientAddress, 
      requestId
    );
    
    return {
      isApproved,
      approvalTime: Number(approvalTime) // v6에서는 BigInt를 Number로 변환
    };
  }
  
  /**
   * ZK 증명 생성 요청 (오프체인 서버에 요청)
   * @param {string} patientAddress - 환자 이더리움 주소
   * @param {string} requestId - 요청 ID
   * @param {string} requesterAddress - 요청자 이더리움 주소
   * @returns {Promise<object>} 생성된 증명 데이터
   */
  async requestZkProof(patientAddress, requestId, requesterAddress) {
    try {
      const response = await axios.post(`${this.zkProofServerUrl}/api/generate-proof`, {
        patient: patientAddress,
        requestId,
        requester: requesterAddress
      });
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || "ZK 증명 생성 실패");
      }
    } catch (error) {
      console.error("ZK 증명 요청 실패:", error);
      throw error;
    }
  }
  
  /**
   * 증명 제출
   * @param {object} proofData - 증명 데이터
   * @param {Signer} signer - 서명자 (요청자 지갑)
   * @returns {Promise<object>} 제출 결과
   */
  async submitProof(proofData, signer) {
    try {
      // 웹3 유틸리티 함수 대신 프론트엔드에서 제공하는 verifyProof 함수 사용
      // 이 클래스에서는 검증 데이터만 준비하고 실제 서명은 외부에서 처리
      
      // 증명 데이터 준비
      const publicInputs = {
        recordHash: proofData.recordHash,
        patientAddress: proofData.patientAddress,
        requesterAddress: proofData.requesterAddress,
        nullifierHash: proofData.nullifierHash
      };
      
      return {
        proof: proofData.proof,
        publicInputs,
        // 실제 트랜잭션 제출은 외부 함수(wallet.js의 verifyProof)에서 처리
        prepare: true
      };
    } catch (error) {
      console.error("증명 준비 실패:", error);
      throw error;
    }
  }
  
  /**
   * 전체 프로세스 실행 (요청 -> 승인 확인 -> 증명 생성 -> 제출)
   * @param {string} patientAddress - 환자 이더리움 주소
   * @param {string} recordHash - 의료 기록 해시
   * @param {Signer} signer - 서명자 (요청자 지갑)
   * @param {object} options - 옵션 (타임아웃, 폴링 간격 등)
   * @returns {Promise<object>} 프로세스 결과
   */
  async completeAccessProcess(patientAddress, recordHash, signer, options = {}) {
    const requesterAddress = await signer.getAddress();
    const pollInterval = options.pollInterval || 5000; // 5초
    const timeout = options.timeout || 30 * 60 * 1000; // 30분
    
    try {
      // 1. 접근 요청
      console.log("의료 기록 접근 요청 중...");
      const { requestId } = await this.requestAccess(patientAddress, recordHash, signer);
      console.log(`요청 ID: ${requestId} 생성됨`);
      
      // 2. 승인 대기 (폴링)
      console.log("환자 승인 대기 중...");
      
      return new Promise((resolve, reject) => {
        let isResolved = false;
        
        const checkApproval = async () => {
          if (isResolved) return;
          
          try {
            const status = await this.checkApprovalStatus(patientAddress, requestId);
            
            if (status.isApproved) {
              isResolved = true;
              console.log("승인 완료! ZK 증명 생성 중...");
              
              try {
                // 3. ZK 증명 생성
                const proofData = await this.requestZkProof(patientAddress, requestId, requesterAddress);
                console.log("ZK 증명 생성 완료");
                
                // 4. 증명 제출
                const preparedData = await this.submitProof(proofData, signer);
                console.log("증명 제출 데이터 준비 완료");
                
                // 참고: 실제 트랜잭션 제출은 외부에서 wallet.js를 사용해야 함
                // 여기서는 외부에서 처리해야 함을 알려주기만 함
                resolve({
                  success: true,
                  requestId,
                  proof: preparedData.proof,
                  publicInputs: preparedData.publicInputs,
                  preparationComplete: true
                });
              } catch (error) {
                reject(error);
              }
            } else {
              // 아직 승인되지 않음, 다시 체크
              setTimeout(checkApproval, pollInterval);
            }
          } catch (error) {
            isResolved = true;
            reject(error);
          }
        };
        
        // 첫 번째 확인 시작
        checkApproval();
        
        // 타임아웃 설정
        setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            reject(new Error("승인 대기 타임아웃"));
          }
        }, timeout);
      });
    } catch (error) {
      console.error("접근 프로세스 실패:", error);
      throw error;
    }
  }
  
  /**
   * 검증된 증명 조회
   * @param {string} requesterAddress - 요청자 이더리움 주소
   * @returns {Promise<Array>} 검증된 증명 목록
   */
  async getVerifiedProofs(requesterAddress) {
    try {
      const response = await axios.get(`${this.zkProofServerUrl}/api/proofs?requesterAddress=${requesterAddress}`);
      return response.data.data;
    } catch (error) {
      console.error("증명 목록 조회 실패:", error);
      throw error;
    }
  }
}

module.exports = RequesterInterface; 