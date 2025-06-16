import { ethers } from 'ethers';

// 버퍼를 16진수 문자열로 변환
const bufferToHex = (buffer) => {
    return ethers.utils.hexlify(new Uint8Array(buffer));
};

// 16진수 문자열을 버퍼로 변환
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
        const provider = new ethers.providers.Web3Provider(window.ethereum);
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

// 버퍼를 Base64로 변환
const bufferToBase64 = (buffer) => {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
};

// Base64를 버퍼로 변환
const base64ToBuffer = (base64) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

// 공개키를 PEM 형식으로 변환
const formatPublicKeyToPEM = (publicKeyBuffer) => {
    const base64 = bufferToBase64(publicKeyBuffer);
    return `-----BEGIN PUBLIC KEY-----\n${base64.match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----`;
};

// PEM 형식의 공개키를 버퍼로 변환
const pemToBuffer = (pem) => {
    const base64 = pem
        .replace('-----BEGIN PUBLIC KEY-----', '')
        .replace('-----END PUBLIC KEY-----', '')
        .replace(/\s/g, '');
    return base64ToBuffer(base64);
};

// RSA 키 쌍 생성
export const generateKeyPair = async () => {
    try {
        // RSA-OAEP 키 쌍 생성
        const keyPair = await window.crypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: "SHA-256"
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
            privateKey: privateKeyBase64
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
            length: 256
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
                hash: "SHA-256"
            },
            false,
            ["encrypt"]
        );

        // 데이터 암호화
        const encryptedBuffer = await window.crypto.subtle.encrypt(
            {
                name: "RSA-OAEP"
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
                hash: "SHA-256"
            },
            false,
            ["decrypt"]
        );

        // 데이터 복호화 (Base64 형식)
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            {
                name: "RSA-OAEP"
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

// 의료 기록 암호화
export const encryptMedicalRecord = async (record, doctorPublicKey, patientPublicKey) => {
    try {
        console.log('🔐 [암호화] 시작 →', Object.keys(record));
        
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
                iv: iv
            },
            aesKey,
            encodedRecord
        );

        // AES 키를 내보내기
        const rawKey = await window.crypto.subtle.exportKey("raw", aesKey);

        // AES 키를 의사와 환자의 공개키로 암호화
        const encryptedKeyForDoctor = await encryptWithPublicKey(rawKey, doctorPublicKey);
        const encryptedKeyForPatient = await encryptWithPublicKey(rawKey, patientPublicKey);

        const result = {
            encryptedRecord: bufferToBase64(encryptedRecord),
            encryptedAESKeyForDoctor: encryptedKeyForDoctor,
            encryptedAESKeyForPatient: encryptedKeyForPatient,
            iv: bufferToBase64(iv)
        };
        
        console.log('✅ [암호화] 완료 → 데이터 크기:', result.encryptedRecord.length);

        return result;
    } catch (error) {
        console.error("의료 기록 암호화 중 오류:", error);
        throw error;
    }
};

// 의료 기록 복호화
export const decryptMedicalRecord = async (encryptedData, privateKey, isDoctor) => {
    try {
        console.log('🔓 [복호화] 시작 →', isDoctor ? '의사' : '환자');
        
        const {
            encryptedRecord,
            encryptedAESKeyForDoctor,
            encryptedAESKeyForPatient,
            iv
        } = encryptedData;

        // 적절한 암호화된 AES 키 선택
        const encryptedAESKey = isDoctor ? encryptedAESKeyForDoctor : encryptedAESKeyForPatient;

        // AES 키 복호화
        const aesKeyBuffer = await decryptWithPrivateKey(encryptedAESKey, privateKey);
        
        const aesKey = await window.crypto.subtle.importKey(
            "raw",
            aesKeyBuffer,
            {
                name: "AES-GCM",
                length: 256
            },
            false,
            ["decrypt"]
        );

        // 의료 기록 복호화
        const decryptedRecord = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: base64ToBuffer(iv)
            },
            aesKey,
            base64ToBuffer(encryptedRecord)
        );

        const result = JSON.parse(new TextDecoder().decode(decryptedRecord));
        console.log('✅ [복호화] 완료 →', Object.keys(result));
        
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
        console.log("의사 공개키 (일부):", keyPair1.publicKey.substring(0, 100) + "...");
        console.log("환자 공개키 (일부):", keyPair2.publicKey.substring(0, 100) + "...");
        
        // 2. 테스트 의료 기록 생성
        const testRecord = {
            symptoms: "두통, 발열",
            diagnosis: "감기",
            treatment: "충분한 휴식",
            prescription: "해열제, 진통제",
            notes: "3일 후 재방문",
            date: new Date().toISOString(),
            testData: "이것은 실제 암호화 테스트입니다 - " + Math.random()
        };
        
        console.log("2️⃣ 테스트 의료 기록:", testRecord);
        
        // 3. 의료 기록 암호화
        console.log("3️⃣ 의료 기록 암호화 중...");
        const encryptedData = await encryptMedicalRecord(
            testRecord, 
            keyPair1.publicKey, // 의사 공개키
            keyPair2.publicKey  // 환자 공개키
        );
        
        console.log("✅ 암호화 완료");
        console.log("암호화된 데이터 구조:", {
            encryptedRecord: encryptedData.encryptedRecord.substring(0, 50) + "...",
            encryptedAESKeyForDoctor: encryptedData.encryptedAESKeyForDoctor.substring(0, 50) + "...",
            encryptedAESKeyForPatient: encryptedData.encryptedAESKeyForPatient.substring(0, 50) + "...",
            iv: encryptedData.iv
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
        const isIntegrityValid = JSON.stringify(testRecord) === JSON.stringify(decryptedByDoctor) && 
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
            decryptedByPatient: decryptedByPatient
        };
        
    } catch (error) {
        console.error("❌ 암호화/복호화 테스트 실패:", error);
        return {
            success: false,
            error: error.message
        };
    }
}; 