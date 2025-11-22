/**
 * ============================================================================
 * 하이브리드 암호화 시스템 (Hybrid Encryption System)
 * ============================================================================
 *
 * @fileoverview
 * RSA-OAEP 2048-bit + AES-256-GCM 하이브리드 암호화 구현.
 * 의료 기록 암호화 및 키 관리를 위한 고급 암호화 시스템.
 *
 * @description
 * **하이브리드 암호화 구조:**
 * 1. 대칭키(AES) 생성 - 빠른 대용량 데이터 암호화
 * 2. AES로 의료 기록 암호화
 * 3. RSA로 AES 키 암호화 - 안전한 키 전달
 * 4. 암호화된 데이터 + 암호화된 AES 키 저장
 *
 * **사용 알고리즘:**
 * - **RSA-OAEP 2048-bit**: 비대칭 암호화 (키 암호화용)
 *   - OAEP padding: Optimal Asymmetric Encryption Padding
 *   - SHA-256 해시 함수 사용
 * - **AES-256-GCM**: 대칭 암호화 (데이터 암호화용)
 *   - GCM: Galois/Counter Mode (인증 암호화)
 *   - 256-bit 키 (32 bytes)
 *   - 96-bit IV (12 bytes)
 *
 * **보안 특성:**
 * - 🔐 기밀성: RSA-OAEP + AES-256-GCM
 * - ✅ 무결성: GCM의 인증 태그
 * - 🔑 키 관리: RSA 공개키로 안전한 키 전달
 * - 👥 다중 수신자: 여러 공개키로 동일 AES 키 암호화 가능
 *
 * **용도:**
 * - 의사와 환자 모두 의료 기록 열람 가능
 * - 각자의 개인키로 AES 키 복호화
 * - 복호화된 AES 키로 의료 기록 복호화
 *
 * @references
 * - FIPS 197: AES (Advanced Encryption Standard)
 * - RFC 8017: PKCS #1 - RSA Cryptography Specifications
 * - NIST SP 800-38D: GCM (Galois/Counter Mode)
 *
 * @author Zkare Team
 * @version 1.0.0
 * @date 2025-10-27
 * @license MIT
 */

import { ethers } from "ethers";

// ============================================================================
// 유틸리티 함수 (Utility Functions)
// ============================================================================

/**
 * ArrayBuffer를 16진수 문자열로 변환
 *
 * @param {ArrayBuffer} buffer - 변환할 버퍼
 * @returns {string} 16진수 문자열 (0x 접두사 포함)
 */
const bufferToHex = (buffer) => {
  return ethers.utils.hexlify(new Uint8Array(buffer));
};

/**
 * 16진수 문자열을 Uint8Array로 변환
 *
 * @param {string} hex - 16진수 문자열 (0x 접두사 있어도 됨)
 * @returns {Uint8Array} 바이트 배열
 */
const hexToBuffer = (hex) => {
  return ethers.utils.arrayify(hex);
};

// 개인키로부터 공개키 추출
function getPublicKeyFromPrivateKey(privateKeyHex) {
  try {
    const wallet = new ethers.Wallet(privateKeyHex);
    return wallet.publicKey;
  } catch (error) {
    console.error("Invalid private key:", error);
    throw new Error("Invalid private key format");
  }
}

// MetaMask로부터 공개키 가져오기
export async function getPublicKeyFromMetaMask(address) {
  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum, {
      chainId: 31337,
      name: "localhost",
      ensAddress: null, // ENS 비활성화
    });
    const signer = provider.getSigner();
    const currentAddress = await signer.getAddress();

    // 현재 연결된 계정의 공개키 반환
    if (currentAddress.toLowerCase() === address.toLowerCase()) {
      const wallet = new ethers.Wallet(await signer.getAddress());
      return wallet.publicKey;
    }
    return false;
  } catch (error) {
    console.error("Error checking address:", error);
    return false;
  }
}

/**
 * ArrayBuffer를 Base64 문자열로 변환
 *
 * @param {ArrayBuffer|Uint8Array} buffer - 변환할 버퍼
 * @returns {string} Base64 인코딩된 문자열
 *
 * @example
 * const buffer = new Uint8Array([72, 101, 108, 108, 111]);
 * bufferToBase64(buffer);  // "SGVsbG8="
 */
const bufferToBase64 = (buffer) => {
  const uint8Array =
    buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  // 큰 버퍼의 경우 청크 단위로 처리하여 스택 오버플로우 방지
  // String.fromCharCode.apply는 최대 약 65,536개의 인자를 받을 수 있음
  const maxChunkSize = 32768; // 안전한 청크 크기

  if (uint8Array.length > maxChunkSize) {
    let binary = "";
    const chunkSize = 16384; // 16KB 청크

    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(
        i,
        Math.min(i + chunkSize, uint8Array.length)
      );
      // Array.from을 사용하여 일반 배열로 변환 후 apply 사용
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }

    return btoa(binary);
  } else {
    // 작은 버퍼는 apply를 사용하여 스택 오버플로우 방지
    return btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));
  }
};

/**
 * Base64 문자열을 Uint8Array로 변환
 *
 * @param {string} base64 - Base64 인코딩된 문자열
 * @returns {Uint8Array} 바이트 배열
 *
 * @example
 * base64ToBuffer("SGVsbG8=");  // Uint8Array [72, 101, 108, 108, 111]
 */
const base64ToBuffer = (base64) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

/**
 * RSA 공개키를 PEM 형식으로 변환
 *
 * @description
 * DER 형식의 공개키를 PEM(Privacy-Enhanced Mail) 형식으로 변환.
 * PEM은 Base64로 인코딩하고 헤더/푸터를 추가하며, 64자마다 줄바꿈.
 *
 * @param {ArrayBuffer} publicKeyBuffer - DER 형식의 공개키
 * @returns {string} PEM 형식의 공개키
 *
 * @example
 * // 출력:
 * // -----BEGIN PUBLIC KEY-----
 * // MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
 * // -----END PUBLIC KEY-----
 */
const formatPublicKeyToPEM = (publicKeyBuffer) => {
  const base64 = bufferToBase64(publicKeyBuffer);
  return `-----BEGIN PUBLIC KEY-----\n${base64
    .match(/.{1,64}/g)
    .join("\n")}\n-----END PUBLIC KEY-----`;
};

/**
 * PEM 형식의 공개키를 버퍼로 변환
 *
 * @description
 * PEM 형식에서 헤더/푸터와 공백을 제거하고 Base64 디코딩하여
 * DER 형식의 바이너리 데이터로 변환.
 *
 * @param {string} pem - PEM 형식의 공개키
 * @returns {Uint8Array} DER 형식의 공개키 바이트 배열
 */
const pemToBuffer = (pem) => {
  const base64 = pem
    .replace("-----BEGIN PUBLIC KEY-----", "")
    .replace("-----END PUBLIC KEY-----", "")
    .replace(/\s/g, ""); // 모든 공백 제거
  return base64ToBuffer(base64);
};

// ============================================================================
// RSA 키 쌍 생성 (RSA Key Pair Generation)
// ============================================================================

/**
 * RSA-OAEP 2048-bit 키 쌍 생성
 *
 * @description
 * Web Crypto API를 사용하여 RSA-OAEP 키 쌍을 생성.
 * 의료 데이터 암호화용 AES 키를 안전하게 교환하기 위해 사용.
 *
 * **RSA-OAEP 파라미터:**
 * - 키 길이: 2048 bits (256 bytes)
 * - 공개 지수: 65537 (0x010001, 일반적인 값)
 * - 해시 함수: SHA-256
 * - Padding: OAEP (Optimal Asymmetric Encryption Padding)
 *
 * **보안 고려사항:**
 * - 2048-bit는 2030년까지 안전한 것으로 권장됨 (NIST)
 * - OAEP padding으로 선택 평문 공격(CPA) 방어
 *
 * @async
 * @returns {Promise<{publicKey: string, privateKey: string}>}
 *   - publicKey: PEM 형식 공개키 (블록체인 및 타인에게 공개)
 *   - privateKey: Base64 형식 개인키 (사용자만 보관, 절대 공유 안됨)
 * @throws {Error} 키 생성 실패 시
 *
 * @example
 * const keyPair = await generateKeyPair();
 * console.log(keyPair.publicKey);   // -----BEGIN PUBLIC KEY-----...
 * console.log(keyPair.privateKey);  // Base64 문자열
 *
 * // 공개키는 블록체인에 등록
 * await keyRegistryContract.registerKey(keyPair.publicKey);
 *
 * // 개인키는 안전하게 보관 (로컬 스토리지 또는 파일 다운로드)
 * localStorage.setItem('privateKey', keyPair.privateKey);
 *
 * @security
 * - ⚠️ 개인키는 절대 서버에 전송하지 않음
 * - ⚠️ 개인키 분실 시 데이터 복구 불가
 * - ✅ 키 복구 시스템(SSS)으로 안전하게 백업
 */
export const generateKeyPair = async () => {
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
    const publicKeyBuffer = await window.crypto.subtle.exportKey(
      "spki",
      keyPair.publicKey
    );
    const publicKeyPEM = formatPublicKeyToPEM(publicKeyBuffer);

    // 개인키를 내보내기 (Base64로 저장)
    const privateKeyBuffer = await window.crypto.subtle.exportKey(
      "pkcs8",
      keyPair.privateKey
    );
    const privateKeyBase64 = bufferToBase64(privateKeyBuffer);

    return {
      publicKey: publicKeyPEM,
      privateKey: privateKeyBase64,
    };
  } catch (error) {
    console.error("키 쌍 생성 중 오류:", error);
    throw error;
  }
};

// AES 키 생성
const generateAESKey = async () => {
  return await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
};

// 공개키로 데이터 암호화 (PEM 형식 지원)
const encryptWithPublicKey = async (data, publicKeyPEM) => {
  try {
    // PEM 형식의 공개키를 버퍼로 변환
    const publicKeyBuffer = pemToBuffer(publicKeyPEM);
    const publicKey = await window.crypto.subtle.importKey(
      "spki",
      publicKeyBuffer,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      false,
      ["encrypt"]
    );

    // 데이터 암호화
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: "RSA-OAEP",
      },
      publicKey,
      data
    );

    return bufferToBase64(encryptedBuffer);
  } catch (error) {
    console.error("공개키 암호화 중 오류:", error);
    throw error;
  }
};

// 개인키로 데이터 복호화 (Base64 형식 지원)
const decryptWithPrivateKey = async (encryptedData, privateKeyBase64) => {
  try {
    // Base64 개인키를 버퍼로 변환
    const privateKeyBuffer = base64ToBuffer(privateKeyBase64);
    const privateKey = await window.crypto.subtle.importKey(
      "pkcs8",
      privateKeyBuffer,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      false,
      ["decrypt"]
    );

    // 데이터 복호화 (Base64 형식)
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "RSA-OAEP",
      },
      privateKey,
      base64ToBuffer(encryptedData)
    );

    return new Uint8Array(decryptedBuffer);
  } catch (error) {
    console.error("개인키 복호화 중 오류:", error);
    throw error;
  }
};

// ============================================================================
// 의료 기록 암호화/복호화 (Medical Record Encryption/Decryption)
// ============================================================================

/**
 * 의료 기록 하이브리드 암호화
 *
 * @description
 * 의료 기록을 의사와 환자 모두가 볼 수 있도록 하이브리드 방식으로 암호화.
 *
 * **암호화 과정:**
 * 1. AES-256 대칭키 생성 (랜덤)
 * 2. IV (Initialization Vector) 생성 (12 bytes, 랜덤)
 * 3. 의료 기록을 JSON 문자열로 변환
 * 4. AES-GCM으로 의료 기록 암호화
 * 5. AES 키를 의사의 RSA 공개키로 암호화
 * 6. 동일한 AES 키를 환자의 RSA 공개키로 암호화
 * 7. 암호화된 기록 + 2개의 암호화된 AES 키 + IV 반환
 *
 * **다중 수신자 암호화:**
 * - 동일한 AES 키를 여러 RSA 공개키로 암호화
 * - 의사와 환자 각자의 개인키로 AES 키 복호화 가능
 * - 복호화된 AES 키로 의료 기록 접근
 *
 * **보안 특성:**
 * - 기밀성: 의사와 환자만 열람 가능
 * - 무결성: GCM의 인증 태그로 변조 검증
 * - 효율성: AES로 대용량 데이터 빠르게 암호화
 * - 안전성: RSA-OAEP로 키 안전하게 전달
 *
 * @async
 * @param {Object} record - 암호화할 의료 기록 객체
 * @param {string} record.symptoms - 증상
 * @param {string} record.diagnosis - 진단
 * @param {string} record.treatment - 치료 방법
 * @param {string} record.prescription - 처방
 * @param {string} record.notes - 기타 메모
 * @param {string} doctorPublicKey - 의사의 RSA 공개키 (PEM 형식)
 * @param {string} patientPublicKey - 환자의 RSA 공개키 (PEM 형식)
 * @returns {Promise<{
 *   encryptedRecord: string,
 *   encryptedAESKeyForDoctor: string,
 *   encryptedAESKeyForPatient: string,
 *   iv: string
 * }>}
 *   - encryptedRecord: Base64 인코딩된 암호화 기록
 *   - encryptedAESKeyForDoctor: 의사용 암호화된 AES 키 (Base64)
 *   - encryptedAESKeyForPatient: 환자용 암호화된 AES 키 (Base64)
 *   - iv: Base64 인코딩된 초기화 벡터
 * @throws {Error} 공개키 없음, 암호화 실패
 *
 * @example
 * const record = {
 *   symptoms: "두통, 발열",
 *   diagnosis: "감기",
 *   treatment: "충분한 휴식",
 *   prescription: "해열제, 진통제",
 *   notes: "3일 후 재방문"
 * };
 *
 * const doctorPublicKey = "-----BEGIN PUBLIC KEY-----...";
 * const patientPublicKey = "-----BEGIN PUBLIC KEY-----...";
 *
 * const encrypted = await encryptMedicalRecord(
 *   record,
 *   doctorPublicKey,
 *   patientPublicKey
 * );
 *
 * // IPFS에 업로드
 * const ipfsHash = await uploadToIPFS(encrypted.encryptedRecord);
 *
 * // 블록체인에 저장
 * await medicalRecordContract.createRecord(
 *   patientAddress,
 *   ipfsHash,
 *   encrypted.encryptedAESKeyForDoctor,
 *   encrypted.encryptedAESKeyForPatient,
 *   encrypted.iv
 * );
 *
 * @security
 * - 🔐 AES-256-GCM: 256-bit 키, 인증 암호화
 * - 🔑 RSA-OAEP 2048-bit: OAEP padding으로 CPA 방어
 * - 🎲 암호학적 안전 난수: Web Crypto API
 * - ✅ 무결성 보장: GCM 인증 태그 포함
 */
export const encryptMedicalRecord = async (
  record,
  doctorPublicKey,
  patientPublicKey
) => {
  try {
    console.log("🔐 [암호화] 시작 →", Object.keys(record));

    if (!doctorPublicKey || !patientPublicKey) {
      throw new Error("공개키를 찾을 수 없습니다.");
    }

    // AES 키 생성
    const aesKey = await generateAESKey();

    // IV 생성
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // 의료 기록 AES 암호화
    const encodedRecord = new TextEncoder().encode(JSON.stringify(record));
    const encryptedRecord = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      aesKey,
      encodedRecord
    );

    // AES 키를 내보내기
    const rawKey = await window.crypto.subtle.exportKey("raw", aesKey);

    // AES 키를 의사와 환자의 공개키로 암호화
    const encryptedKeyForDoctor = await encryptWithPublicKey(
      rawKey,
      doctorPublicKey
    );
    const encryptedKeyForPatient = await encryptWithPublicKey(
      rawKey,
      patientPublicKey
    );

    const result = {
      encryptedRecord: bufferToBase64(encryptedRecord),
      encryptedAESKeyForDoctor: encryptedKeyForDoctor,
      encryptedAESKeyForPatient: encryptedKeyForPatient,
      iv: bufferToBase64(iv),
    };

    console.log(
      "✅ [암호화] 완료 → 데이터 크기:",
      result.encryptedRecord.length
    );

    return result;
  } catch (error) {
    console.error("의료 기록 암호화 중 오류:", error);
    throw error;
  }
};

/**
 * 의료 기록 하이브리드 복호화
 *
 * @description
 * 하이브리드 방식으로 암호화된 의료 기록을 복호화.
 * 의사와 환자가 각자의 개인키로 복호화 가능.
 *
 * **복호화 과정:**
 * 1. 역할에 따라 적절한 암호화된 AES 키 선택
 *    - 의사: encryptedAESKeyForDoctor
 *    - 환자: encryptedAESKeyForPatient
 * 2. 개인키(RSA)로 AES 키 복호화
 * 3. 복호화된 AES 키를 Web Crypto API로 import
 * 4. AES-GCM으로 의료 기록 복호화
 * 5. JSON 파싱하여 원래 객체 반환
 *
 * **보안 검증:**
 * - GCM 인증 태그 자동 검증
 * - 데이터 변조 시 복호화 실패
 * - 잘못된 개인키 사용 시 복호화 실패
 *
 * @async
 * @param {Object} encryptedData - 암호화된 의료 기록 데이터
 * @param {string} encryptedData.encryptedRecord - Base64 암호화된 기록
 * @param {string} encryptedData.encryptedAESKeyForDoctor - 의사용 암호화된 AES 키
 * @param {string} encryptedData.encryptedAESKeyForPatient - 환자용 암호화된 AES 키
 * @param {string} encryptedData.iv - Base64 인코딩된 IV
 * @param {string} privateKey - RSA 개인키 (Base64 형식)
 * @param {boolean} isDoctor - true면 의사, false면 환자
 * @returns {Promise<Object>} 복호화된 의료 기록 객체
 * @throws {Error} 잘못된 개인키, 데이터 변조, 복호화 실패
 *
 * @example
 * // 환자가 자신의 의료 기록 열람
 * const encryptedData = {
 *   encryptedRecord: "base64...",
 *   encryptedAESKeyForDoctor: "base64...",
 *   encryptedAESKeyForPatient: "base64...",
 *   iv: "base64..."
 * };
 *
 * const patientPrivateKey = localStorage.getItem('privateKey');
 * const record = await decryptMedicalRecord(
 *   encryptedData,
 *   patientPrivateKey,
 *   false  // isDoctor = false
 * );
 *
 * console.log(record);
 * // {
 * //   symptoms: "두통, 발열",
 * //   diagnosis: "감기",
 * //   treatment: "충분한 휴식",
 * //   prescription: "해열제, 진통제",
 * //   notes: "3일 후 재방문"
 * // }
 *
 * @example
 * // 의사가 환자의 의료 기록 열람
 * const doctorPrivateKey = localStorage.getItem('doctorPrivateKey');
 * const record = await decryptMedicalRecord(
 *   encryptedData,
 *   doctorPrivateKey,
 *   true  // isDoctor = true
 * );
 *
 * @security
 * - ✅ 인증 암호화: GCM 태그로 무결성 검증
 * - ✅ 접근 제어: 의사/환자만 복호화 가능
 * - ❌ 제3자 차단: 개인키 없으면 복호화 불가
 * - ⚠️ 개인키 관리: 절대 유출되지 않도록 주의
 */
export const decryptMedicalRecord = async (
  encryptedData,
  privateKey,
  isDoctor
) => {
  try {
    console.log("🔓 [복호화] 시작 →", isDoctor ? "의사" : "환자");

    const {
      encryptedRecord,
      encryptedAESKeyForDoctor,
      encryptedAESKeyForPatient,
      iv,
    } = encryptedData;

    // 적절한 암호화된 AES 키 선택
    const encryptedAESKey = isDoctor
      ? encryptedAESKeyForDoctor
      : encryptedAESKeyForPatient;

    // AES 키 복호화
    const aesKeyBuffer = await decryptWithPrivateKey(
      encryptedAESKey,
      privateKey
    );

    const aesKey = await window.crypto.subtle.importKey(
      "raw",
      aesKeyBuffer,
      {
        name: "AES-GCM",
        length: 256,
      },
      false,
      ["decrypt"]
    );

    // 의료 기록 복호화
    const decryptedRecord = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: base64ToBuffer(iv),
      },
      aesKey,
      base64ToBuffer(encryptedRecord)
    );

    const result = JSON.parse(new TextDecoder().decode(decryptedRecord));
    console.log("✅ [복호화] 완료 →", Object.keys(result));

    return result;
  } catch (error) {
    console.error("❌ [복호화] 실패:", error.message);
    throw error;
  }
};

// 암호화/복호화 테스트 함수
export const testEncryptionDecryption = async () => {
  try {
    console.log("🧪 암호화/복호화 테스트 시작...");

    // 1. RSA 키 쌍 생성
    console.log("1️⃣ RSA 키 쌍 생성 중...");
    const keyPair1 = await generateKeyPair();
    const keyPair2 = await generateKeyPair();

    console.log("✅ 키 쌍 생성 완료");
    console.log(
      "의사 공개키 (일부):",
      keyPair1.publicKey.substring(0, 100) + "..."
    );
    console.log(
      "환자 공개키 (일부):",
      keyPair2.publicKey.substring(0, 100) + "..."
    );

    // 2. 테스트 의료 기록 생성
    const testRecord = {
      symptoms: "두통, 발열",
      diagnosis: "감기",
      treatment: "충분한 휴식",
      prescription: "해열제, 진통제",
      notes: "3일 후 재방문",
      date: new Date().toISOString(),
      testData: "이것은 실제 암호화 테스트입니다 - " + Math.random(),
    };

    console.log("2️⃣ 테스트 의료 기록:", testRecord);

    // 3. 의료 기록 암호화
    console.log("3️⃣ 의료 기록 암호화 중...");
    const encryptedData = await encryptMedicalRecord(
      testRecord,
      keyPair1.publicKey, // 의사 공개키
      keyPair2.publicKey // 환자 공개키
    );

    console.log("✅ 암호화 완료");
    console.log("암호화된 데이터 구조:", {
      encryptedRecord: encryptedData.encryptedRecord.substring(0, 50) + "...",
      encryptedAESKeyForDoctor:
        encryptedData.encryptedAESKeyForDoctor.substring(0, 50) + "...",
      encryptedAESKeyForPatient:
        encryptedData.encryptedAESKeyForPatient.substring(0, 50) + "...",
      iv: encryptedData.iv,
    });

    // 4. 의사 개인키로 복호화 테스트
    console.log("4️⃣ 의사 개인키로 복호화 테스트...");
    const decryptedByDoctor = await decryptMedicalRecord(
      encryptedData,
      keyPair1.privateKey, // 의사 개인키
      true // isDoctor = true
    );

    console.log("✅ 의사 복호화 완료:", decryptedByDoctor);

    // 5. 환자 개인키로 복호화 테스트
    console.log("5️⃣ 환자 개인키로 복호화 테스트...");
    const decryptedByPatient = await decryptMedicalRecord(
      encryptedData,
      keyPair2.privateKey, // 환자 개인키
      false // isDoctor = false
    );

    console.log("✅ 환자 복호화 완료:", decryptedByPatient);

    // 6. 데이터 무결성 검증
    console.log("6️⃣ 데이터 무결성 검증...");
    const isIntegrityValid =
      JSON.stringify(testRecord) === JSON.stringify(decryptedByDoctor) &&
      JSON.stringify(testRecord) === JSON.stringify(decryptedByPatient);

    if (isIntegrityValid) {
      console.log("✅ 데이터 무결성 검증 성공!");
      console.log("원본 데이터와 복호화된 데이터가 완전히 일치합니다.");
    } else {
      console.error("❌ 데이터 무결성 검증 실패!");
      console.log("원본:", testRecord);
      console.log("의사 복호화:", decryptedByDoctor);
      console.log("환자 복호화:", decryptedByPatient);
    }

    // 7. 잘못된 키로 복호화 시도 (실패해야 함)
    console.log("7️⃣ 잘못된 키로 복호화 시도 (실패 테스트)...");
    try {
      const wrongKeyPair = await generateKeyPair();
      await decryptMedicalRecord(
        encryptedData,
        wrongKeyPair.privateKey, // 잘못된 개인키
        true
      );
      console.error("❌ 보안 문제: 잘못된 키로 복호화가 성공했습니다!");
    } catch (error) {
      console.log("✅ 보안 검증 성공: 잘못된 키로는 복호화할 수 없습니다.");
    }

    console.log("🎉 모든 암호화/복호화 테스트 완료!");
    return {
      success: true,
      integrityValid: isIntegrityValid,
      originalData: testRecord,
      encryptedData: encryptedData,
      decryptedByDoctor: decryptedByDoctor,
      decryptedByPatient: decryptedByPatient,
    };
  } catch (error) {
    console.error("❌ 암호화/복호화 테스트 실패:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};
