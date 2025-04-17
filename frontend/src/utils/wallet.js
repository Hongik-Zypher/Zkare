import { ethers } from 'ethers';

/**
 * 지갑 연결 함수
 * @returns {Promise<Object>} 연결된 계정과 서명자
 */
export async function connectWallet() {
  if (window.ethereum) {
    try {
      // 사용자에게 지갑 연결 요청
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      // ethers v6에서는 BrowserProvider 사용
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      return { accounts, signer };
    } catch (error) {
      console.error("지갑 연결 오류:", error);
      throw error;
    }
  } else {
    throw new Error("이더리움 지갑이 필요합니다.");
  }
}

/**
 * ZK 증명 검증 함수
 * @param {Object} proof - ZK 증명 객체
 * @param {Object} publicInputs - 공개 입력값
 * @returns {Promise<Object>} 검증 결과
 */
export async function verifyProof(proof, publicInputs) {
  try {
    // 1. 지갑 연결
    const { signer } = await connectWallet();
    
    // 2. 백엔드에서 트랜잭션 데이터 가져오기
    const response = await fetch('/api/proofs/prepare-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proof, publicInputs })
    });
    
    const { transactionData } = await response.json();
    
    // 3. 사용자 지갑으로 트랜잭션 서명
    const tx = {
      to: transactionData.to,
      data: transactionData.data,
      // ethers v6에서는 hexlify 대신 parseUnits 사용
      gasLimit: ethers.parseUnits("300000", "wei")
    };
    
    // 사용자에게 트랜잭션 서명 요청 (MetaMask 팝업 표시)
    const txResponse = await signer.sendTransaction(tx);
    
    // 4. 트랜잭션 확인 대기
    const receipt = await txResponse.wait();
    
    return {
      success: true,
      transactionHash: receipt.hash // v6에서는 transactionHash 대신 hash 사용
    };
  } catch (error) {
    console.error("증명 검증 오류:", error);
    return {
      success: false,
      error: error.message
    };
  }
} 