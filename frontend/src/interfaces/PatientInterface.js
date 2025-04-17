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
}

module.exports = PatientInterface; 