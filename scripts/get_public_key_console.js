/**
 * 브라우저 콘솔에서 실행할 스크립트
 * 
 * 프론트엔드 페이지의 브라우저 콘솔에서 다음을 실행하세요:
 */

// 1. encryption.js를 import (프론트엔드가 실행 중이어야 함)
// 또는 직접 키 생성 함수 실행

async function generateMasterPublicKey() {
  try {
    // RSA-OAEP 키 쌍 생성
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    );

    // 공개키를 내보내기
    const publicKeyBuffer = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
    
    // Base64 인코딩
    const base64 = btoa(String.fromCharCode.apply(null, new Uint8Array(publicKeyBuffer)));
    
    // PEM 형식으로 변환
    const publicKeyPEM = `-----BEGIN PUBLIC KEY-----\n${base64.match(/.{1,64}/g).join("\n")}\n-----END PUBLIC KEY-----`;

    console.log("✅ 공개키 생성 완료!");
    console.log("\n📋 공개키 (PEM 형식):");
    console.log(publicKeyPEM);
    console.log("\n📋 frontend/.env에 추가할 내용:");
    console.log(`REACT_APP_MASTER_PUBLIC_KEY="${publicKeyPEM.replace(/\n/g, '\\n')}"`);
    
    // 클립보드에 복사 (가능한 경우)
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(publicKeyPEM);
      console.log("\n✅ 공개키가 클립보드에 복사되었습니다!");
    }
    
    return publicKeyPEM;
  } catch (error) {
    console.error("❌ 키 생성 오류:", error);
    throw error;
  }
}

// 실행
generateMasterPublicKey();

