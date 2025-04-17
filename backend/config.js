const path = require('path');
// 루트 디렉토리의 .env 파일 경로 지정
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// 경고 함수
const logEnvWarning = (varName, defaultValue) => {
  if (process.env.NODE_ENV !== 'production' && process.env.DEBUG) {
    console.warn(`경고: ${varName} 환경 변수가 설정되지 않아 기본값 "${defaultValue}"를 사용합니다.`);
  }
};

// 개발 환경에서 사용할 기본 컨트랙트 주소
const DEV_CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

// CONTRACT_ADDRESS 검증
if (!process.env.CONTRACT_ADDRESS && process.env.NODE_ENV !== 'production') {
  logEnvWarning('CONTRACT_ADDRESS', DEV_CONTRACT_ADDRESS);
}

module.exports = {
  PORT: process.env.PORT || '5001',
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // 블록체인 관련 설정
  RPC_URL: process.env.RPC_URL || 'http://localhost:8545',
  CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS || DEV_CONTRACT_ADDRESS,
  
  // 스마트 컨트랙트 주소
  ZKARE_CONTRACT_ADDRESS: process.env.ZKARE_CONTRACT_ADDRESS,
  GROTH16_VERIFIER_ADDRESS: process.env.GROTH16_VERIFIER_ADDRESS,
  MEDICAL_DATA_VERIFIER_ADDRESS: process.env.MEDICAL_DATA_VERIFIER_ADDRESS,
  MEDICAL_RECORD_VERIFIER_ADDRESS: process.env.MEDICAL_RECORD_VERIFIER_ADDRESS,
  STORAGE_CONTRACT_ADDRESS: process.env.STORAGE_CONTRACT_ADDRESS,
  VIEWER_CONTRACT_ADDRESS: process.env.VIEWER_CONTRACT_ADDRESS,
  
  // ZK 프루프 관련 설정
  CIRCUIT_PATH: process.env.CIRCUIT_PATH || '../circuits',
  
  // 데이터베이스 설정 (나중에 필요한 경우)
  DB_URI: process.env.DB_URI || 'mongodb://localhost:27017/zkare',
  
  // JWT 설정 (나중에 인증 기능이 필요한 경우)
  JWT_SECRET: process.env.JWT_SECRET || 'zkare-secret-key',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '30d'
}; 