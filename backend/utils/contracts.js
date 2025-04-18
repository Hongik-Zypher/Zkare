const fs = require('fs');
const path = require('path');
// 루트 디렉토리의 .env 파일 로드
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { ethers } = require('ethers');

// 컨트랙트 ABI 파일들
const zkareABI = require('../abis/Zkare.json');
const medicalDataVerifierABI = require('../abis/MedicalDataVerifier.json');
const medicalRecordVerifierABI = require('../abis/MedicalRecordVerifier.json');
const groth16VerifierABI = require('../abis/Groth16Verifier.json');
const medicalRecordViewerABI = require('../abis/MedicalRecordViewer.json');

// 배포 정보 파일 경로
const DEPLOYMENT_PATH = path.join(__dirname, '../../backend/deployments/latest.json');

// 컨트랙트 주소 불러오기 (우선순위: .env 파일 -> 배포 정보 파일)
function getContractAddresses() {
  let addresses = {
    zkare: process.env.ZKARE_CONTRACT_ADDRESS,
    medicalDataVerifier: process.env.MEDICAL_DATA_VERIFIER_ADDRESS,
    medicalRecordVerifier: process.env.MEDICAL_RECORD_VERIFIER_ADDRESS,
    groth16Verifier: process.env.GROTH16_VERIFIER_ADDRESS,
    medicalRecordViewer: process.env.MEDICAL_RECORD_VIEWER_ADDRESS
  };

  // .env 파일에 주소가 없으면 배포 정보 파일에서 가져옴
  if (!addresses.zkare || !addresses.medicalDataVerifier ||
      !addresses.medicalRecordVerifier || !addresses.groth16Verifier ||
      !addresses.medicalRecordViewer) {
    try {
      if (fs.existsSync(DEPLOYMENT_PATH)) {
        const deploymentInfo = JSON.parse(fs.readFileSync(DEPLOYMENT_PATH, 'utf8'));
        
        // 배포 정보에서 주소 가져오기
        addresses = {
          zkare: addresses.zkare || (deploymentInfo.contracts.zkare ? deploymentInfo.contracts.zkare.address : null),
          medicalDataVerifier: addresses.medicalDataVerifier || 
                              (deploymentInfo.contracts.medicalDataVerifier ? 
                                deploymentInfo.contracts.medicalDataVerifier.address : null),
          medicalRecordVerifier: addresses.medicalRecordVerifier || 
                                (deploymentInfo.contracts.medicalRecordVerifier ? 
                                  deploymentInfo.contracts.medicalRecordVerifier.address : null),
          groth16Verifier: addresses.groth16Verifier || 
                          (deploymentInfo.contracts.groth16Verifier ? 
                            deploymentInfo.contracts.groth16Verifier.address : null),
          medicalRecordViewer: addresses.medicalRecordViewer || 
                              (deploymentInfo.contracts.medicalRecordViewer ? 
                                deploymentInfo.contracts.medicalRecordViewer.address : null)
        };
      }
    } catch (error) {
      console.error('배포 정보 파일을 로드하는 중 오류 발생:', error);
    }
  }

  // 주소가 유효한지 확인
  Object.entries(addresses).forEach(([key, value]) => {
    if (!value) {
      console.warn(`경고: ${key} 컨트랙트 주소를 찾을 수 없습니다.`);
    }
  });

  return addresses;
}

// 컨트랙트 인스턴스 생성
function createContractInstances(provider) {
  const addresses = getContractAddresses();
  
  return {
    zkare: new ethers.Contract(addresses.zkare, zkareABI, provider),
    medicalDataVerifier: new ethers.Contract(addresses.medicalDataVerifier, medicalDataVerifierABI, provider),
    medicalRecordVerifier: new ethers.Contract(addresses.medicalRecordVerifier, medicalRecordVerifierABI, provider),
    groth16Verifier: new ethers.Contract(addresses.groth16Verifier, groth16VerifierABI, provider),
    medicalRecordViewer: new ethers.Contract(addresses.medicalRecordViewer, medicalRecordViewerABI, provider)
  };
}

module.exports = {
  getContractAddresses,
  createContractInstances
}; 