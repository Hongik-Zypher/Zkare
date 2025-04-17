import { ethers } from 'ethers';
import ZkareABI from '../contracts/Zkare.json';
import BloodTypeVerifierABI from '../contracts/BloodTypeVerifier.json';

// 컨트랙트 주소 설정 (배포 후 업데이트 필요)
const ZKARE_CONTRACT_ADDRESS = '0x...'; // Zkare 컨트랙트 주소
const BLOOD_TYPE_VERIFIER_ADDRESS = '0x...'; // BloodTypeVerifier 컨트랙트 주소

// 공급자와 서명자 초기화
let provider;
let signer;
let zkareContract;
let bloodTypeVerifierContract;

// 메타마스크 연결 및 컨트랙트 초기화
export const initContracts = async () => {
  if (window.ethereum) {
    try {
      // 사용자 계정 요청
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // 이더리움 공급자 및 서명자 설정
      provider = new ethers.providers.Web3Provider(window.ethereum);
      signer = provider.getSigner();
      
      // 컨트랙트 인스턴스 생성
      zkareContract = new ethers.Contract(
        ZKARE_CONTRACT_ADDRESS,
        ZkareABI.abi,
        signer
      );
      
      bloodTypeVerifierContract = new ethers.Contract(
        BLOOD_TYPE_VERIFIER_ADDRESS,
        BloodTypeVerifierABI.abi,
        signer
      );
      
      console.log('컨트랙트 초기화 완료');
      return true;
    } catch (error) {
      console.error('컨트랙트 초기화 오류:', error);
      return false;
    }
  } else {
    console.error('MetaMask가 설치되어 있지 않습니다');
    return false;
  }
};

// 현재 연결된 계정 주소 가져오기
export const getCurrentAccount = async () => {
  if (!provider) await initContracts();
  return await signer.getAddress();
};

// 의사만 환자 혈액형 등록
export const registerBloodType = async (patientAddress, bloodTypeCode) => {
  if (!bloodTypeVerifierContract) await initContracts();
  
  try {
    const tx = await bloodTypeVerifierContract.registerBloodType(
      patientAddress,
      bloodTypeCode
    );
    
    await tx.wait();
    console.log('혈액형 등록 완료:', patientAddress, bloodTypeCode);
    return { success: true, message: '혈액형 등록 완료' };
  } catch (error) {
    console.error('혈액형 등록 오류:', error);
    return { success: false, message: `오류: ${error.message}` };
  }
};

// 간단한 혈액형 확인 (Yes/No)
export const checkBloodType = async (patientAddress, guessedBloodType) => {
  if (!bloodTypeVerifierContract) await initContracts();
  
  try {
    const isMatch = await bloodTypeVerifierContract.checkBloodType(
      patientAddress,
      guessedBloodType
    );
    
    return {
      success: true,
      isMatch,
      message: isMatch ? '맞습니다! 혈액형이 일치합니다.' : '아니오, 혈액형이 일치하지 않습니다.'
    };
  } catch (error) {
    console.error('혈액형 확인 오류:', error);
    return { success: false, message: `오류: ${error.message}` };
  }
};

// 영지식 증명을 사용한 혈액형 검증
export const verifyBloodTypeWithProof = async (patientAddress, guessedBloodType, proof) => {
  if (!bloodTypeVerifierContract) await initContracts();
  
  try {
    // 증명 데이터 변환
    const a = [
      ethers.BigNumber.from(proof.proof.pi_a[0]),
      ethers.BigNumber.from(proof.proof.pi_a[1])
    ];
    
    const b = [
      [
        ethers.BigNumber.from(proof.proof.pi_b[0][0]),
        ethers.BigNumber.from(proof.proof.pi_b[0][1])
      ],
      [
        ethers.BigNumber.from(proof.proof.pi_b[1][0]),
        ethers.BigNumber.from(proof.proof.pi_b[1][1])
      ]
    ];
    
    const c = [
      ethers.BigNumber.from(proof.proof.pi_c[0]),
      ethers.BigNumber.from(proof.proof.pi_c[1])
    ];
    
    const tx = await bloodTypeVerifierContract.verifyBloodType(
      patientAddress,
      guessedBloodType,
      a,
      b,
      c
    );
    
    const receipt = await tx.wait();
    
    // 이벤트에서 결과 추출
    const event = receipt.events.find(e => e.event === 'BloodTypeVerified');
    const isMatch = event.args.isMatch;
    
    return {
      success: true,
      isMatch,
      message: isMatch ? '맞습니다! 혈액형이 일치합니다.' : '아니오, 혈액형이 일치하지 않습니다.'
    };
  } catch (error) {
    console.error('혈액형 검증 오류:', error);
    return { success: false, message: `오류: ${error.message}` };
  }
}; 