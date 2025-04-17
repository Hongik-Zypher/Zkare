import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// 기본 Axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

// API 서비스 객체
const medicalAPI = {
  // ===== 혈액형 증명 관련 =====
  /**
   * 혈액형 증명 생성
   * @param {string} patientAddress - 환자 주소
   * @param {number} actualBloodTypeCode - 실제 혈액형 코드 (1: A형, 2: B형, 3: AB형, 4: O형)
   * @param {number} targetBloodTypeCode - 검증 대상 혈액형 코드
   * @returns {Promise<Object>} 생성된 증명 데이터
   */
  generateBloodTypeProof: async (patientAddress, actualBloodTypeCode, targetBloodTypeCode) => {
    try {
      const response = await api.post('/proofs/blood-type/generate', {
        patientAddress,
        actualBloodTypeCode,
        targetBloodTypeCode
      });
      return response.data;
    } catch (error) {
      console.error('혈액형 증명 생성 오류:', error);
      throw error;
    }
  },

  /**
   * 혈액형 증명 검증
   * @param {Object} proof - 증명 객체
   * @param {Array} publicSignals - 공개 신호 배열
   * @returns {Promise<Object>} 검증 결과
   */
  verifyBloodTypeProof: async (proof, publicSignals) => {
    try {
      const response = await api.post('/proofs/blood-type/verify', {
        proof,
        publicSignals
      });
      return response.data;
    } catch (error) {
      console.error('혈액형 증명 검증 오류:', error);
      throw error;
    }
  },

  // ===== 의료 정보 접근 요청 관련 =====
  /**
   * 접근 요청 생성
   * @param {Object} requestData - 요청 데이터
   * @param {string} requestData.requesterAddress - 요청자 주소
   * @param {string} requestData.patientAddress - 환자 주소
   * @param {string} requestData.recordType - 요청 기록 유형
   * @param {string} requestData.reason - 요청 사유
   * @returns {Promise<Object>} 생성된 요청 데이터
   */
  createRequest: async (requestData) => {
    try {
      const response = await api.post('/requests', requestData);
      return response.data;
    } catch (error) {
      console.error('요청 생성 오류:', error);
      throw error;
    }
  },

  /**
   * 환자별 접근 요청 목록 조회
   * @param {string} patientAddress - 환자 주소
   * @returns {Promise<Array>} 요청 목록
   */
  getPatientRequests: async (patientAddress) => {
    try {
      const response = await api.get(`/requests/patient?patientAddress=${patientAddress}`);
      return response.data;
    } catch (error) {
      console.error('환자 요청 목록 조회 오류:', error);
      throw error;
    }
  },

  /**
   * 요청자별 접근 요청 목록 조회
   * @param {string} requesterAddress - 요청자 주소
   * @returns {Promise<Array>} 요청 목록
   */
  getRequesterRequests: async (requesterAddress) => {
    try {
      const response = await api.get(`/requests/requester?requesterAddress=${requesterAddress}`);
      return response.data;
    } catch (error) {
      console.error('요청자 요청 목록 조회 오류:', error);
      throw error;
    }
  },

  /**
   * 요청 승인
   * @param {string} requestId - 요청 ID
   * @param {string} patientAddress - 환자 주소
   * @param {boolean} generateProof - ZK 증명 생성 여부
   * @returns {Promise<Object>} 승인 결과
   */
  approveRequest: async (requestId, patientAddress, generateProof = false) => {
    try {
      const response = await api.post(`/requests/${requestId}/approve`, {
        patientAddress,
        generateProof
      });
      return response.data;
    } catch (error) {
      console.error('요청 승인 오류:', error);
      throw error;
    }
  },

  /**
   * 요청 거부
   * @param {string} requestId - 요청 ID
   * @param {string} patientAddress - 환자 주소
   * @returns {Promise<Object>} 거부 결과
   */
  denyRequest: async (requestId, patientAddress) => {
    try {
      const response = await api.post(`/requests/${requestId}/deny`, {
        patientAddress
      });
      return response.data;
    } catch (error) {
      console.error('요청 거부 오류:', error);
      throw error;
    }
  },

  /**
   * 요청 상세 조회
   * @param {string} requestId - 요청 ID
   * @returns {Promise<Object>} 요청 상세 정보
   */
  getRequestById: async (requestId) => {
    try {
      const response = await api.get(`/requests/${requestId}`);
      return response.data;
    } catch (error) {
      console.error('요청 상세 조회 오류:', error);
      throw error;
    }
  }
};

export default medicalAPI; 