import { ethers } from 'ethers';

// ABI 가져오기
import zkareAbi from '../abis/Zkare.sol/Zkare.json';
import groth16VerifierAbi from '../abis/Groth16Verifier.sol/Groth16Verifier.json';

// 배포 정보 가져오기
let deploymentInfo;
try {
  deploymentInfo = require('../deployments/latest.json');
} catch (error) {
  console.warn('배포 정보 파일을 찾을 수 없습니다.');
  deploymentInfo = { contracts: {} };
}

// 컨트랙트 주소 설정
const ZKARE_ADDRESS = process.env.REACT_APP_ZKARE_CONTRACT_ADDRESS || 
  (deploymentInfo.contracts?.zkare?.address || '');
  
const GROTH16_VERIFIER_ADDRESS = process.env.REACT_APP_GROTH16_VERIFIER_ADDRESS || 
  (deploymentInfo.contracts?.groth16Verifier?.address || '');

// 컨트랙트 인스턴스
let zkareContract = null;
let groth16VerifierContract = null;
let provider = null;
let signer = null;

/**
 * 메타마스크 연결 및 컨트랙트 초기화
 */
export const initializeContracts = async () => {
  if (window.ethereum) {
    try {
      // 사용자 계정 요청
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // 이더리움 프로바이더 및 서명자 설정
      provider = new ethers.BrowserProvider(window.ethereum);
      signer = await provider.getSigner();
      
      // 컨트랙트 인스턴스 생성
      zkareContract = new ethers.Contract(ZKARE_ADDRESS, zkareAbi.abi, signer);
      
      if (GROTH16_VERIFIER_ADDRESS && GROTH16_VERIFIER_ADDRESS !== '') {
        groth16VerifierContract = new ethers.Contract(GROTH16_VERIFIER_ADDRESS, groth16VerifierAbi.abi, signer);
        
        // Zkare가 검증자 컨트랙트를 직접 사용할 수 있도록 설정
        try {
          // 컨트랙트에 검증자가 이미 설정되어 있는지 확인
          const currentVerifier = await zkareContract.verifierContract();
          const zeroAddress = '0x0000000000000000000000000000000000000000';
          
          // 검증자가 설정되어 있지 않으면 설정
          if (currentVerifier === zeroAddress) {
            const tx = await zkareContract.setVerifierContract(GROTH16_VERIFIER_ADDRESS);
            await tx.wait();
            console.log('Zkare 컨트랙트에 검증자 설정 완료');
          }
        } catch (e) {
          console.warn('검증자 설정 중 오류 발생:', e);
        }
      }
      
      console.log('컨트랙트 초기화 완료');
      return { success: true };
    } catch (error) {
      console.error('컨트랙트 초기화 오류:', error);
      return { success: false, error };
    }
  } else {
    console.error('MetaMask가 설치되어 있지 않습니다');
    return { success: false, error: new Error('MetaMask가 설치되어 있지 않습니다') };
  }
};

/**
 * 컨트랙트 인스턴스를 반환합니다
 */
export const getContracts = async () => {
  if (!zkareContract) {
    await initializeContracts();
  }
  
  return {
    zkareContract,
    groth16VerifierContract,
    provider,
    signer
  };
};

/**
 * 현재 연결된 계정 주소 가져오기
 */
export const getCurrentAccount = async () => {
  if (!provider) {
    await initializeContracts();
  }
  if (!signer) {
    throw new Error('MetaMask에 연결되지 않았습니다');
  }
  return await signer.getAddress();
};

/**
 * MetaMask가 설치되어 있는지 확인
 */
export const detectMetaMask = () => {
  return window.ethereum !== undefined;
};

export default {
  initializeContracts,
  getContracts,
  getCurrentAccount,
  detectMetaMask,
  ZKARE_ADDRESS,
  GROTH16_VERIFIER_ADDRESS
}; 