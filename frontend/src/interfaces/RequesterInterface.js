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
   * 전체 프로세스 실행 (요청 -> 승인 확인 -> 증명 검증)
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
      console.log("환자 승인 및 증명 생성 대기 중...");
      
      return new Promise((resolve, reject) => {
        let isResolved = false;
        
        const checkApprovalAndProof = async () => {
          if (isResolved) return;
          
          try {
            // 2.1 컨트랙트에서 승인 상태 확인
            const status = await this.checkApprovalStatus(patientAddress, requestId);
            
            if (status.isApproved) {
              console.log("승인 확인됨. 증명 검증 확인 중...");
              
              try {
                // 2.2 이벤트 로그에서 환자가 생성한 증명이 있는지 확인
                const proofEvents = await this.checkProofEvents(patientAddress, requesterAddress);
                
                if (proofEvents && proofEvents.length > 0) {
                  isResolved = true;
                  console.log("환자가 생성한 증명 확인됨");
                  
                  // 3. 증명 검증
                  resolve({
                    success: true,
                    requestId,
                    message: "환자가 증명을 생성하여 검증이 완료되었습니다.",
                    events: proofEvents
                  });
                } else {
                  // 아직 증명이 생성되지 않음, 다시 체크
                  console.log("아직 증명이 생성되지 않음, 계속 대기 중...");
                  setTimeout(checkApprovalAndProof, pollInterval);
                }
              } catch (error) {
                console.error("증명 확인 오류:", error);
                setTimeout(checkApprovalAndProof, pollInterval);
              }
            } else {
              // 아직 승인되지 않음, 다시 체크
              setTimeout(checkApprovalAndProof, pollInterval);
            }
          } catch (error) {
            isResolved = true;
            reject(error);
          }
        };
        
        // 첫 번째 확인 시작
        checkApprovalAndProof();
        
        // 타임아웃 설정
        setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            reject(new Error("승인 및 증명 대기 타임아웃"));
          }
        }, timeout);
      });
    } catch (error) {
      console.error("접근 처리 오류:", error);
      throw error;
    }
  }
  
  /**
   * 환자가 생성한 증명 이벤트 확인
   * @param {string} patientAddress - 환자 이더리움 주소
   * @param {string} requesterAddress - 요청자 이더리움 주소
   * @returns {Promise<Array>} 증명 이벤트 목록
   */
  async checkProofEvents(patientAddress, requesterAddress) {
    try {
      // VerificationResult 이벤트 필터 생성
      const filter = {
        address: this.verifierContract.target,
        topics: [
          ethers.id("VerificationResult(address,address,string,bool)"),
          ethers.zeroPadValue(ethers.getAddress(requesterAddress), 32),
          ethers.zeroPadValue(ethers.getAddress(patientAddress), 32)
        ]
      };
      
      // 최근 이벤트 조회 (최근 1000 블록)
      const currentBlock = await this.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 1000);
      
      const logs = await this.provider.getLogs({
        ...filter,
        fromBlock
      });
      
      // 이벤트 파싱
      return logs.map(log => {
        const parsedLog = this.verifierContract.interface.parseLog({
          topics: log.topics,
          data: log.data
        });
        
        if (!parsedLog) return null;
        
        return {
          requester: parsedLog.args[0],
          patient: parsedLog.args[1],
          verificationType: parsedLog.args[2],
          isValid: parsedLog.args[3],
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash
        };
      }).filter(event => event !== null);
    } catch (error) {
      console.error("증명 이벤트 확인 오류:", error);
      return [];
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

  /**
   * 요청자의 대기 중인 요청 목록 조회
   * @param {string} requesterAddress - 요청자 이더리움 주소
   * @returns {Promise<Array>} 대기 중인 요청 목록
   */
  async getPendingRequests(requesterAddress) {
    try {
      // ethers.js v6에서 이벤트 필터링 방식이 변경됨
      // AccessRequested 이벤트 로그 필터링
      const filter = {
        address: this.verifierContract.target,
        topics: [
          ethers.id("AccessRequested(address,address,bytes32,bytes32)"),
          ethers.zeroPadValue(ethers.getAddress(requesterAddress), 32)
        ]
      };
      const logs = await this.provider.getLogs(filter);
      
      // 각 요청 상태 확인
      const pendingRequests = [];
      for (const log of logs) {
        const parsedLog = this.verifierContract.interface.parseLog({
          topics: log.topics,
          data: log.data
        });
        
        if (!parsedLog) continue;
        
        const requestId = parsedLog.args[3]; // requestId는 네 번째 인수
        const patientAddress = parsedLog.args[1]; // patient는 두 번째 인수
        const recordHash = parsedLog.args[2]; // recordHash는 세 번째 인수
        
        try {
          // 요청 상태 확인
          const [isApproved, approvalTime] = await this.verifierContract.getApprovalStatus(
            patientAddress, 
            requestId
          );
          
          if (!isApproved) {
            // 요청 상세 정보 조회
            const request = await this.verifierContract.getRequestDetails(requestId);
            if (request && request.pendingApproval) {
              pendingRequests.push({
                requestId,
                patientAddress,
                recordHash,
                requestTime: Number(request.requestTime)
              });
            }
          }
        } catch (err) {
          console.error('요청 상세 정보 조회 오류:', err);
        }
      }
      
      return pendingRequests;
    } catch (error) {
      console.error('대기 중인 요청 조회 오류:', error);
      return [];
    }
  }
}

module.exports = RequesterInterface; 