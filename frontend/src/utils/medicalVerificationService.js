import { 
  initializeContracts, 
  getContracts, 
  getCurrentAccount, 
  detectMetaMask 
} from './contracts';

import { 
  isDoctor, 
  isPatient,
  registerDoctor, 
  registerPatient,
  getAllDoctors,
  getAllPatients,
  getDoctorsList,
  getPatientsList
} from './userService';

import {
  registerPatientData,
  getPatientData,
  generateBloodTypeProof,
  verifyBloodTypeProof,
  requestVerification,
  getMyPendingRequests,
  respondToVerification,
  submitProof,
  verifyBloodType
} from './medicalService';

// 이전 버전과의 호환성을 위해 모든 함수 재노출
export {
  // 컨트랙트 관련 함수
  initializeContracts as initVerificationService,
  getContracts,
  getCurrentAccount,
  detectMetaMask,
  
  // 사용자 관련 함수
  isDoctor,
  isPatient,
  registerDoctor,
  registerPatient,
  getAllDoctors,
  getAllPatients,
  getDoctorsList,
  getPatientsList,
  
  // 의료 데이터 관련 함수
  registerPatientData,
  getPatientData,
  generateBloodTypeProof,
  verifyBloodTypeProof,
  requestVerification,
  getMyPendingRequests,
  respondToVerification,
  submitProof,
  verifyBloodType
}; 