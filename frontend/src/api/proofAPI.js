import axios from 'axios';

// API 기본 URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// axios 인스턴스 생성
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 응답 인터셉터 추가
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API 오류:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

/**
 * ZK 증명 API 클래스
 */
class ProofAPI {
  /**
   * ZK 증명 생성 요청
   * @param {string} patientAddress - 환자 이더리움 주소
   * @param {string} requestId - 요청 ID
   * @param {string} requesterAddress - 요청자 이더리움 주소
   * @returns {Promise<object>} - 생성된 증명 데이터
   */
  async generateProof(patientAddress, requestId, requesterAddress) {
    try {
      const response = await api.post('/proofs', {
        patientAddress,
        requestId,
        requesterAddress
      });
      
      return response.data;
    } catch (error) {
      console.error('증명 생성 API 오류:', error);
      throw error;
    }
  }
  
  /**
   * 증명 상태 확인
   * @param {string} nullifierHash - 확인할 nullifier 해시
   * @returns {Promise<object>} - 증명 상태 정보
   */
  async verifyProofStatus(nullifierHash) {
    try {
      const response = await api.get(`/proofs/status/${nullifierHash}`);
      return response.data;
    } catch (error) {
      console.error('증명 상태 확인 API 오류:', error);
      throw error;
    }
  }
  
  /**
   * 증명 오프체인 검증
   * @param {object} proof - 증명 객체
   * @param {array} publicSignals - 공개 신호 배열
   * @returns {Promise<object>} - 검증 결과
   */
  async validateProof(proof, publicSignals) {
    try {
      const response = await api.post('/proofs/validate', {
        proof,
        publicSignals
      });
      
      return response.data;
    } catch (error) {
      console.error('증명 검증 API 오류:', error);
      throw error;
    }
  }
  
  /**
   * 증명 온체인 검증
   * @param {object} proof - 증명 객체
   * @param {object} publicInputs - 공개 입력값
   * @returns {Promise<object>} - 검증 결과
   */
  async verifyProof(proof, publicInputs) {
    try {
      const response = await api.post('/proofs/verify', {
        proof,
        publicInputs
      });
      
      return response.data;
    } catch (error) {
      console.error('온체인 증명 검증 API 오류:', error);
      throw error;
    }
  }
  
  /**
   * ID로 증명 조회
   * @param {string} proofId - 증명 ID
   * @returns {Promise<object>} - 증명 데이터
   */
  async getProofById(proofId) {
    try {
      const response = await api.get(`/proofs/${proofId}`);
      return response.data;
    } catch (error) {
      console.error('증명 조회 API 오류:', error);
      throw error;
    }
  }
  
  /**
   * 모든 증명 조회
   * @param {object} filters - 필터링 옵션
   * @returns {Promise<object>} - 증명 목록
   */
  async getAllProofs(filters = {}) {
    try {
      const response = await api.get('/proofs', { params: filters });
      return response.data;
    } catch (error) {
      console.error('증명 목록 조회 API 오류:', error);
      throw error;
    }
  }
}

export default new ProofAPI(); 