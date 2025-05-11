const ethers = require("ethers");

/**
 * 환자용 인터페이스 클래스
 * 환자가 의료 기록 접근 요청을 관리하기 위한 기능 제공
 */
class PatientInterface {
  /**
   * 환자 인터페이스 생성자
   * @param {Provider} provider - Web3 제공자 (예: window.ethereum)
   * @param {string} verifierContractAddress - 검증자 컨트랙트 주소
   * @param {object} verifierABI - 검증자 컨트랙트 ABI
   */
  constructor(provider, verifierContractAddress, verifierABI) {
    this.provider = provider;
    this.verifierContract = new ethers.Contract(
      verifierContractAddress,
      verifierABI,
      provider
    );
  }
  
  /**
   * 환자가 현재 대기 중인 접근 요청 목록 조회
   * @param {string} patientAddress - 환자 이더리움 주소
   * @returns {Promise<Array>} 대기 중인 요청 목록
   */
  async getPendingRequests(patientAddress) {
    try {
      // ethers.js v6에서 이벤트 필터링 방식이 변경됨
      // AccessRequested 이벤트 로그 필터링
      const filter = {
        address: this.verifierContract.target,
        topics: [
          ethers.id("AccessRequested(address,address,bytes32,bytes32)"),
          null,
          ethers.zeroPadValue(ethers.getAddress(patientAddress), 32)
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
        const requester = parsedLog.args[0]; // requester는 첫 번째 인수
        const recordHash = parsedLog.args[2]; // recordHash는 세 번째 인수
        
        try {
          // 요청 상태 확인
          const request = await this.verifierContract.getRequestDetails(requestId);
          if (request && request.pendingApproval) {
            pendingRequests.push({
              requestId,
              requester,
              recordHash,
              requestTime: Number(request.requestTime)
            });
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
  
  /**
   * 접근 요청 승인
   * @param {string} requestId - 요청 ID
   * @param {Signer} signer - 서명자 (환자 지갑)
   * @returns {Promise<object>} 트랜잭션 결과
   */
  async approveAccess(requestId, signer) {
    const contractWithSigner = this.verifierContract.connect(signer);
    
    const tx = await contractWithSigner.approveAccess(requestId);
    const receipt = await tx.wait();
    
    // 승인 후 자동으로 ZK 증명 생성 및 제출
    try {
      const patientAddress = await signer.getAddress();
      const requestDetails = await this.verifierContract.getRequestDetails(requestId);
      
      // 요청 정보가 유효한지 확인
      if (requestDetails && requestDetails.requester) {
        // 증명 생성 및 제출
        await this.generateAndSubmitProof(
          requestId,
          patientAddress, 
          requestDetails.requester,
          requestDetails.recordHash,
          signer
        );
      }
    } catch (proofError) {
      console.error("증명 생성 및 제출 오류 (승인 후):", proofError);
      // 승인은 성공했으므로 오류를 무시하고 성공 반환
    }
    
    return {
      success: true,
      txHash: receipt.transactionHash
    };
  }
  
  /**
   * 접근 요청 거부
   * @param {string} requestId - 요청 ID
   * @param {Signer} signer - 서명자 (환자 지갑)
   * @returns {Promise<object>} 트랜잭션 결과
   */
  async denyAccess(requestId, signer) {
    const contractWithSigner = this.verifierContract.connect(signer);
    
    const tx = await contractWithSigner.denyAccess(requestId);
    const receipt = await tx.wait();
    
    return {
      success: true,
      txHash: receipt.transactionHash
    };
  }
  
  /**
   * 승인 완료된 요청 목록 조회
   * @param {string} patientAddress - 환자 이더리움 주소
   * @returns {Promise<Array>} 승인된 요청 목록
   */
  async getApprovedRequests(patientAddress) {
    try {
      // ethers.js v6에서 이벤트 필터링 방식이 변경됨
      // AccessApproved 이벤트 로그 필터링
      const filter = {
        address: this.verifierContract.target,
        topics: [
          ethers.id("AccessApproved(address,bytes32,uint256)"),
          ethers.zeroPadValue(ethers.getAddress(patientAddress), 32)
        ]
      };
      const logs = await this.provider.getLogs(filter);
      
      const approvedRequests = [];
      for (const log of logs) {
        const parsedLog = this.verifierContract.interface.parseLog({
          topics: log.topics,
          data: log.data
        });
        
        if (!parsedLog) continue;
        
        const requestId = parsedLog.args[1]; // requestId는 두 번째 인수
        const approvalTime = Number(parsedLog.args[2]); // approvalTime은 세 번째 인수
        
        try {
          // 요청 상세 정보 조회
          const request = await this.verifierContract.getRequestDetails(requestId);
          if (request) {
            approvedRequests.push({
              requestId,
              requester: request.requester,
              recordHash: request.recordHash,
              approvalTime
            });
          }
        } catch (err) {
          console.error('요청 상세 정보 조회 오류:', err);
        }
      }
      
      return approvedRequests;
    } catch (error) {
      console.error('승인된 요청 조회 오류:', error);
      return [];
    }
  }

  /**
   * 증명 생성 및 제출
   * @param {string} requestId - 요청 ID
   * @param {string} patientAddress - 환자 주소
   * @param {string} requesterAddress - 요청자 주소
   * @param {string} recordHash - 기록 해시
   * @param {Signer} signer - 서명자 (환자 지갑)
   * @returns {Promise<object>} 트랜잭션 결과
   */
  async generateAndSubmitProof(requestId, patientAddress, requesterAddress, recordHash, signer) {
    try {
      // 1. 환자 데이터 가져오기
      const patientData = await this.getPatientData(patientAddress);
      
      // 2. 증명 생성에 필요한 입력값 구성
      const inputs = {
        requestId,
        patientAddress,
        requesterAddress,
        recordHash,
        patientData
      };
      
      // 3. ZK 증명 생성 (백엔드 API 호출)
      const proofData = await this.requestZkProof(inputs);
      
      // 4. 증명 제출
      return await this.submitProof(patientAddress, requestId, proofData, signer);
    } catch (error) {
      console.error("증명 생성 및 제출 오류:", error);
      throw error;
    }
  }

  /**
   * 환자 데이터 가져오기
   * @param {string} patientAddress - 환자 주소
   * @returns {Promise<object>} 환자 데이터
   */
  async getPatientData(patientAddress) {
    try {
      // 혈액형 데이터 가져오기
      const bloodTypeCode = await this.verifierContract.getPatientData(patientAddress, "bloodType");
      
      // 필요한 다른 데이터도 가져올 수 있음
      return {
        bloodTypeCode: Number(bloodTypeCode)
        // 필요한 다른 데이터 추가
      };
    } catch (error) {
      console.error("환자 데이터 가져오기 오류:", error);
      throw error;
    }
  }

  /**
   * ZK 증명 생성 요청 (백엔드 API 호출)
   * @param {object} inputs - 증명 입력값
   * @returns {Promise<object>} 생성된 증명 데이터
   */
  async requestZkProof(inputs) {
    try {
      // 백엔드에 증명 생성 요청 (실제 구현에서는 fetch나 axios 사용)
      const response = await fetch("/api/proofs/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(inputs)
      });
      
      if (!response.ok) {
        throw new Error("증명 생성 요청 실패");
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || "증명 생성 실패");
      }
      
      return data.proofData;
    } catch (error) {
      console.error("증명 생성 요청 오류:", error);
      throw error;
    }
  }

  /**
   * 생성된 증명 제출
   * @param {string} patientAddress - 환자 주소
   * @param {string} requestId - 요청 ID
   * @param {object} proofData - 증명 데이터
   * @param {Signer} signer - 서명자 (환자 지갑)
   * @returns {Promise<object>} 트랜잭션 결과
   */
  async submitProof(patientAddress, requestId, proofData, signer) {
    try {
      const contractWithSigner = this.verifierContract.connect(signer);
      
      // 증명 데이터 준비
      const { proof, publicSignals } = proofData;
      
      // 컨트랙트에 맞게 변환
      const a = [proof.pi_a[0], proof.pi_a[1]];
      const b = [
        [proof.pi_b[0][0], proof.pi_b[0][1]],
        [proof.pi_b[1][0], proof.pi_b[1][1]]
      ];
      const c = [proof.pi_c[0], proof.pi_c[1]];
      
      // 증명 제출
      const tx = await contractWithSigner.submitProof(
        patientAddress,
        requestId,
        a,
        b,
        c,
        publicSignals
      );
      
      const receipt = await tx.wait();
      
      // 결과 이벤트 확인
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "VerificationResult"
      );
      
      const isValid = event ? event.args.isValid : false;
      
      return {
        success: true,
        txHash: receipt.transactionHash,
        isValid
      };
    } catch (error) {
      console.error("증명 제출 오류:", error);
      throw error;
    }
  }
}

module.exports = PatientInterface; 