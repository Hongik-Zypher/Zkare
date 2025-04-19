import { ethers } from 'ethers';

// ABI 파일 가져오기 (직접 abis 폴더에서 가져오도록 변경)
const ZkareABI = require('../abis/Zkare.json');
const MedicalDataVerifierABI = require('../abis/MedicalDataVerifier.json');
const MedicalRecordVerifierABI = require('../abis/MedicalRecordVerifier.json');
const Groth16VerifierABI = require('../abis/Groth16Verifier.json');
const MedicalRecordViewerABI = require('../abis/MedicalRecordViewer.json');

// 기본 배포 정보 (선택적으로 import, 파일이 없을 수 있음)
let latestDeployment = null;
try {
  latestDeployment = require('../deployments/latest.json');
} catch (error) {
  console.warn('배포 정보 파일을 찾을 수 없습니다. 환경변수를 사용합니다.');
}

/**
 * 컨트랙트 주소를 가져오는 함수
 * 우선순위: 
 * 1. 환경변수
 * 2. 배포 정보 파일
 * 
 * @returns 컨트랙트 주소 객체
 */
export function getContractAddresses() {
  // 환경 변수에서 주소 가져오기 (React에서 환경 변수는 REACT_APP_ 접두사 필요)
  const fromEnv = {
    zkare: process.env.REACT_APP_ZKARE_CONTRACT_ADDRESS,
    medicalDataVerifier: process.env.REACT_APP_MEDICAL_DATA_VERIFIER_ADDRESS,
    medicalRecordVerifier: process.env.REACT_APP_MEDICAL_RECORD_VERIFIER_ADDRESS,
    groth16Verifier: process.env.REACT_APP_GROTH16_VERIFIER_ADDRESS,
    medicalRecordViewer: process.env.REACT_APP_MEDICAL_RECORD_VIEWER_ADDRESS
  };

  // 배포 정보 파일에서 주소 가져오기
  const fromDeployment = latestDeployment ? {
    zkare: latestDeployment.contracts?.zkare?.address,
    medicalDataVerifier: latestDeployment.contracts?.medicalDataVerifier?.address,
    medicalRecordVerifier: latestDeployment.contracts?.medicalRecordVerifier?.address,
    groth16Verifier: latestDeployment.contracts?.groth16Verifier?.address,
    medicalRecordViewer: latestDeployment.contracts?.medicalRecordViewer?.address
  } : {};

  // 두 소스를 병합하여 최종 주소 결정
  const addresses = {
    zkare: fromEnv.zkare || fromDeployment.zkare,
    medicalDataVerifier: fromEnv.medicalDataVerifier || fromDeployment.medicalDataVerifier,
    medicalRecordVerifier: fromEnv.medicalRecordVerifier || fromDeployment.medicalRecordVerifier,
    groth16Verifier: fromEnv.groth16Verifier || fromDeployment.groth16Verifier,
    medicalRecordViewer: fromEnv.medicalRecordViewer || fromDeployment.medicalRecordViewer
  };

  // 주소 확인 및 경고
  Object.entries(addresses).forEach(([key, value]) => {
    if (!value) {
      console.warn(`경고: ${key} 컨트랙트 주소를 찾을 수 없습니다.`);
    }
  });

  return addresses;
}

/**
 * 컨트랙트 인스턴스 생성 함수 (ethers v6)
 * 
 * @param {ethers.Provider} provider 이더리움 프로바이더
 * @param {ethers.Signer} signer (선택사항) 트랜잭션 서명자
 * @returns 컨트랙트 인스턴스 객체
 */
export async function createContractInstances(provider, signer = null) {
  const addresses = getContractAddresses();
  const signerOrProvider = signer || provider;
  
  return {
    zkare: new ethers.Contract(addresses.zkare, ZkareABI.abi, signerOrProvider),
    medicalDataVerifier: new ethers.Contract(addresses.medicalDataVerifier, MedicalDataVerifierABI.abi, signerOrProvider),
    medicalRecordVerifier: new ethers.Contract(addresses.medicalRecordVerifier, MedicalRecordVerifierABI.abi, signerOrProvider),
    groth16Verifier: new ethers.Contract(addresses.groth16Verifier, Groth16VerifierABI.abi, signerOrProvider),
    medicalRecordViewer: new ethers.Contract(addresses.medicalRecordViewer, MedicalRecordViewerABI.abi, signerOrProvider)
  };
}

/**
 * 메타마스크에 연결하고 컨트랙트 인스턴스 생성
 * 
 * @returns {Object} 컨트랙트 인스턴스와 사용자 정보
 */
export async function connectToBlockchain() {
  if (!window.ethereum) {
    throw new Error('MetaMask가 설치되어 있지 않습니다.');
  }
  
  try {
    // 사용자 계정 요청
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    
    // 이더리움 공급자 및 서명자 설정 (ethers v6)
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const userAddress = await signer.getAddress();
    
    // 컨트랙트 인스턴스 생성
    const contracts = await createContractInstances(provider, signer);
    
    return {
      provider,
      signer,
      userAddress,
      ...contracts
    };
  } catch (error) {
    console.error('블록체인 연결 오류:', error);
    throw error;
  }
}

/**
 * 배포 네트워크 정보 가져오기
 * 
 * @returns 배포 네트워크 정보
 */
export function getDeploymentInfo() {
  if (!latestDeployment) return { network: null, timestamp: null };
  
  return {
    network: latestDeployment.network,
    timestamp: latestDeployment.timestamp
  };
} 