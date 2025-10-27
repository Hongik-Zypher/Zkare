// Shamir's Secret Sharing - 완전 구현
// Lagrange 보간법 기반 (t, n) threshold 방식

/**
 * 유한체 연산 (Galois Field GF(2^8))
 * 바이트 단위 연산을 위해 GF(256) 사용
 */

// GF(2^8) 로그 테이블
const GF256_EXP = new Array(256);
const GF256_LOG = new Array(256);

// 생성 다항식: x^8 + x^4 + x^3 + x + 1 (0x11d)
const initGF256 = () => {
    let x = 1;
    for (let i = 0; i < 256; i++) {
        GF256_EXP[i] = x;
        GF256_LOG[x] = i;
        x <<= 1;
        if (x & 0x100) {
            x ^= 0x11d;
        }
    }
    // 특별 케이스: log(0)는 정의되지 않음
    GF256_LOG[0] = 0;
};

// 초기화
initGF256();

// GF(2^8) 곱셈
const gfMul = (a, b) => {
    if (a === 0 || b === 0) return 0;
    return GF256_EXP[(GF256_LOG[a] + GF256_LOG[b]) % 255];
};

// GF(2^8) 나눗셈
const gfDiv = (a, b) => {
    if (b === 0) throw new Error('Division by zero');
    if (a === 0) return 0;
    return GF256_EXP[(GF256_LOG[a] + 255 - GF256_LOG[b]) % 255];
};

/**
 * Lagrange 보간법으로 y절편(비밀) 계산
 * @param {Array} shares - [[x1, y1], [x2, y2], ...] 형태의 조각들
 * @returns {number} 복구된 비밀 (y절편)
 */
const lagrangeInterpolate = (shares) => {
    let secret = 0;
    const k = shares.length;
    
    for (let i = 0; i < k; i++) {
        const [xi, yi] = shares[i];
        let numerator = 1;
        let denominator = 1;
        
        for (let j = 0; j < k; j++) {
            if (i === j) continue;
            const [xj] = shares[j];
            
            // numerator *= (0 - xj)
            numerator = gfMul(numerator, xj);
            
            // denominator *= (xi - xj)
            denominator = gfMul(denominator, xi ^ xj);
        }
        
        // basis = yi * numerator / denominator
        const basis = gfMul(yi, gfDiv(numerator, denominator));
        
        // secret += basis
        secret ^= basis;
    }
    
    return secret;
};

/**
 * 랜덤 다항식 계수 생성
 * P(x) = a0 + a1*x + a2*x^2 + ... + a(t-1)*x^(t-1)
 * 여기서 a0 = secret
 */
const generatePolynomial = (secret, threshold) => {
    const coefficients = [secret];
    
    // 랜덤 계수 생성 (threshold - 1개)
    for (let i = 1; i < threshold; i++) {
        const randomByte = new Uint8Array(1);
        window.crypto.getRandomValues(randomByte);
        coefficients.push(randomByte[0]);
    }
    
    return coefficients;
};

/**
 * 다항식 평가: P(x) 계산
 */
const evaluatePolynomial = (coefficients, x) => {
    let result = 0;
    let xPower = 1; // x^0
    
    for (let i = 0; i < coefficients.length; i++) {
        result ^= gfMul(coefficients[i], xPower);
        xPower = gfMul(xPower, x);
    }
    
    return result;
};

/**
 * 바이트 배열을 Hex 문자열로 변환
 */
const bytesToHex = (bytes) => {
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
};

/**
 * Hex 문자열을 바이트 배열로 변환
 */
const hexToBytes = (hex) => {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
};

/**
 * 문자열을 바이트 배열로
 */
const stringToBytes = (str) => {
    return Array.from(new TextEncoder().encode(str));
};

/**
 * 바이트 배열을 문자열로
 */
const bytesToString = (bytes) => {
    return new TextDecoder().decode(new Uint8Array(bytes));
};

/**
 * 조각을 인코딩 (x좌표 + y좌표)
 */
const encodeShare = (x, yBytes) => {
    // 형식: "x좌표(2자리 hex):y좌표들(hex)"
    return x.toString(16).padStart(2, '0') + ':' + bytesToHex(yBytes);
};

/**
 * 조각을 디코딩
 */
const decodeShare = (share) => {
    const [xHex, yHex] = share.split(':');
    const x = parseInt(xHex, 16);
    const yBytes = hexToBytes(yHex);
    return { x, yBytes };
};

/**
 * 실제 Shamir's Secret Sharing - 비밀 분할
 * @param {string} secret - 분할할 비밀
 * @param {number} totalShares - 총 조각 개수 (n)
 * @param {number} threshold - 복구에 필요한 최소 조각 개수 (t)
 * @returns {Array<string>} 인코딩된 조각들
 */
export const splitSecret = (secret, totalShares = 3, threshold = 2) => {
    try {
        console.log('🔐 [SSS] Shamir\'s Secret Sharing - 비밀 분할 시작');
        console.log(`   총 조각: ${totalShares}, 필요 조각: ${threshold}`);
        
        if (threshold > totalShares) {
            throw new Error('threshold는 totalShares보다 클 수 없습니다');
        }
        
        if (threshold < 2) {
            throw new Error('threshold는 최소 2 이상이어야 합니다');
        }
        
        if (totalShares > 255) {
            throw new Error('totalShares는 최대 255까지 가능합니다');
        }
        
        const secretBytes = stringToBytes(secret);
        const shares = [];
        
        // 각 바이트마다 독립적으로 SSS 적용
        for (let byteIndex = 0; byteIndex < secretBytes.length; byteIndex++) {
            const secretByte = secretBytes[byteIndex];
            
            // (threshold - 1)차 다항식 생성
            const polynomial = generatePolynomial(secretByte, threshold);
            
            // n개의 조각 생성
            for (let shareIndex = 0; shareIndex < totalShares; shareIndex++) {
                // x좌표: 1부터 시작 (0은 비밀이므로 사용 안함)
                const x = shareIndex + 1;
                
                // P(x) 계산
                const y = evaluatePolynomial(polynomial, x);
                
                if (byteIndex === 0) {
                    // 첫 바이트일 때 share 배열 초기화
                    shares[shareIndex] = { x, yBytes: [] };
                }
                
                shares[shareIndex].yBytes.push(y);
            }
        }
        
        // 조각들을 문자열로 인코딩
        const encodedShares = shares.map(share => encodeShare(share.x, share.yBytes));
        
        console.log('✅ [SSS] Lagrange 보간법 기반 비밀 분할 완료');
        console.log(`   비밀 길이: ${secretBytes.length} bytes`);
        console.log(`   생성된 조각: ${encodedShares.length}개`);
        
        return encodedShares;
    } catch (error) {
        console.error('❌ [SSS] 비밀 분할 오류:', error);
        throw new Error('비밀 분할에 실패했습니다: ' + error.message);
    }
};

/**
 * 실제 Shamir's Secret Sharing - 비밀 복구
 * @param {Array<string>} encodedShares - 인코딩된 조각들 (최소 threshold 개)
 * @returns {string} 복구된 비밀
 */
export const combineShares = (encodedShares) => {
    try {
        console.log('🔓 [SSS] Shamir\'s Secret Sharing - 비밀 복구 시작');
        console.log(`   사용된 조각: ${encodedShares.length}개`);
        
        if (encodedShares.length < 2) {
            throw new Error('최소 2개의 조각이 필요합니다');
        }
        
        // 조각들 디코딩
        const shares = encodedShares.map(decodeShare);
        
        // 모든 조각의 길이가 같은지 확인
        const secretLength = shares[0].yBytes.length;
        for (let i = 1; i < shares.length; i++) {
            if (shares[i].yBytes.length !== secretLength) {
                throw new Error('조각들의 길이가 일치하지 않습니다');
            }
        }
        
        const secretBytes = [];
        
        // 각 바이트 위치마다 Lagrange 보간법 적용
        for (let byteIndex = 0; byteIndex < secretLength; byteIndex++) {
            // 현재 바이트 위치의 (x, y) 쌍들
            const points = shares.map(share => [share.x, share.yBytes[byteIndex]]);
            
            // Lagrange 보간법으로 P(0) = secret 복구
            const secretByte = lagrangeInterpolate(points);
            secretBytes.push(secretByte);
        }
        
        const secret = bytesToString(secretBytes);
        
        console.log('✅ [SSS] Lagrange 보간법으로 비밀 복구 완료');
        console.log(`   복구된 비밀 길이: ${secretBytes.length} bytes`);
        
        return secret;
    } catch (error) {
        console.error('❌ [SSS] 비밀 복구 오류:', error);
        throw new Error('비밀 복구에 실패했습니다: ' + error.message);
    }
};

/**
 * RSA 개인키를 AES-256으로 암호화 (Web Crypto API 사용)
 */
export const encryptPrivateKey = async (privateKey) => {
    try {
        console.log('🔒 [AES] 개인키 암호화 시작');
        
        // 랜덤 AES 키 생성 (256비트 = 32바이트)
        const aesKeyBytes = new Uint8Array(32);
        window.crypto.getRandomValues(aesKeyBytes);
        const aesKey = bytesToHex(aesKeyBytes);
        
        // IV 생성 (128비트 = 16바이트)
        const ivBytes = new Uint8Array(16);
        window.crypto.getRandomValues(ivBytes);
        const iv = bytesToHex(ivBytes);
        
        // Web Crypto API로 암호화
        const encoder = new TextEncoder();
        const data = encoder.encode(privateKey);
        
        const key = await window.crypto.subtle.importKey(
            'raw',
            aesKeyBytes,
            { name: 'AES-GCM' },
            false,
            ['encrypt']
        );
        
        const encrypted = await window.crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: ivBytes
            },
            key,
            data
        );
        
        const encryptedArray = Array.from(new Uint8Array(encrypted));
        const encryptedPrivateKey = bytesToHex(encryptedArray);
        
        console.log('✅ [AES] 개인키 암호화 완료');
        console.log(`   AES 키 길이: ${aesKey.length / 2} bytes`);
        
        return {
            encryptedPrivateKey,
            aesKey,
            iv
        };
    } catch (error) {
        console.error('❌ [AES] 개인키 암호화 오류:', error);
        throw new Error('개인키 암호화에 실패했습니다: ' + error.message);
    }
};

/**
 * AES로 암호화된 RSA 개인키 복호화
 */
export const decryptPrivateKey = async (encryptedPrivateKey, aesKey, iv) => {
    try {
        console.log('🔓 [AES] 개인키 복호화 시작');
        
        const encryptedBytes = hexToBytes(encryptedPrivateKey);
        const aesKeyBytes = hexToBytes(aesKey);
        const ivBytes = hexToBytes(iv);
        
        const key = await window.crypto.subtle.importKey(
            'raw',
            new Uint8Array(aesKeyBytes),
            { name: 'AES-GCM' },
            false,
            ['decrypt']
        );
        
        const decrypted = await window.crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: new Uint8Array(ivBytes)
            },
            key,
            new Uint8Array(encryptedBytes)
        );
        
        const decoder = new TextDecoder();
        const privateKey = decoder.decode(decrypted);
        
        console.log('✅ [AES] 개인키 복호화 완료');
        
        return privateKey;
    } catch (error) {
        console.error('❌ [AES] 개인키 복호화 오류:', error);
        throw new Error('개인키 복호화에 실패했습니다: ' + error.message);
    }
};

/**
 * 전체 흐름: 개인키 암호화 + SSS 분할
 */
export const encryptAndSplitKey = async (privateKey, totalShares = 3, threshold = 2) => {
    try {
        console.log('🚀 [전체 흐름] 개인키 암호화 + SSS 분할 시작');
        console.log(`   SSS 설정: ${threshold}-of-${totalShares} threshold`);
        
        // 1. AES로 개인키 암호화
        const { encryptedPrivateKey, aesKey, iv } = await encryptPrivateKey(privateKey);
        
        // 2. AES 키를 실제 SSS(Lagrange 보간법)로 분할
        const shares = splitSecret(aesKey, totalShares, threshold);
        
        console.log('✅ [전체 흐름] 완료');
        console.log(`   암호화된 개인키: ${encryptedPrivateKey.length / 2} bytes`);
        console.log(`   SSS 조각: ${shares.length}개`);
        console.log(`   각 조각 크기: ${shares[0].length} chars`);
        
        return {
            encryptedPrivateKey,
            iv,
            shares
        };
    } catch (error) {
        console.error('❌ [전체 흐름] 오류:', error);
        throw error;
    }
};

/**
 * 전체 흐름: SSS 조각 복구 + 개인키 복호화
 */
export const combineAndDecryptKey = async (encryptedPrivateKey, iv, shares) => {
    try {
        console.log('🚀 [전체 흐름] SSS 조각 복구 + 개인키 복호화 시작');
        
        // 1. 실제 SSS(Lagrange 보간법)로 AES 키 복구
        const aesKey = combineShares(shares);
        
        // 2. AES 키로 개인키 복호화
        const privateKey = await decryptPrivateKey(encryptedPrivateKey, aesKey, iv);
        
        console.log('✅ [전체 흐름] 완료');
        console.log(`   복구된 개인키 길이: ${privateKey.length} chars`);
        
        return privateKey;
    } catch (error) {
        console.error('❌ [전체 흐름] 오류:', error);
        throw error;
    }
};

/**
 * RSA 공개키로 조각 암호화 (보호자에게 전달용)
 */
export const encryptShareForGuardian = async (share, guardianPublicKey) => {
    try {
        console.log('🔐 보호자용 조각 암호화 시작');
        
        // PEM 형식에서 헤더/푸터 제거
        const pemHeader = '-----BEGIN PUBLIC KEY-----';
        const pemFooter = '-----END PUBLIC KEY-----';
        const pemContents = guardianPublicKey
            .replace(pemHeader, '')
            .replace(pemFooter, '')
            .replace(/\s/g, '');
        
        // Base64 디코딩
        const binaryDer = atob(pemContents);
        const binaryDerArray = new Uint8Array(binaryDer.length);
        for (let i = 0; i < binaryDer.length; i++) {
            binaryDerArray[i] = binaryDer.charCodeAt(i);
        }
        
        // RSA 공개키 import
        const publicKeyObj = await window.crypto.subtle.importKey(
            'spki',
            binaryDerArray.buffer,
            {
                name: 'RSA-OAEP',
                hash: 'SHA-256'
            },
            false,
            ['encrypt']
        );
        
        // 조각을 RSA로 암호화
        const encoder = new TextEncoder();
        const data = encoder.encode(share);
        
        const encrypted = await window.crypto.subtle.encrypt(
            { name: 'RSA-OAEP' },
            publicKeyObj,
            data
        );
        
        // Base64로 인코딩
        const encryptedArray = new Uint8Array(encrypted);
        const encryptedBinary = String.fromCharCode.apply(null, encryptedArray);
        const encryptedBase64 = btoa(encryptedBinary);
        
        console.log('✅ 보호자용 조각 암호화 완료');
        return encryptedBase64;
        
    } catch (error) {
        console.error('❌ 보호자용 조각 암호화 오류:', error);
        throw new Error('조각 암호화에 실패했습니다: ' + error.message);
    }
};

/**
 * RSA 개인키로 조각 복호화 (보호자가 자신의 조각 복호화)
 */
export const decryptShareWithPrivateKey = async (encryptedShare, guardianPrivateKey) => {
    try {
        console.log('🔓 조각 복호화 시작');
        
        // PEM 형식에서 헤더/푸터 제거
        const pemHeader = '-----BEGIN PRIVATE KEY-----';
        const pemFooter = '-----END PRIVATE KEY-----';
        const pemContents = guardianPrivateKey
            .replace(pemHeader, '')
            .replace(pemFooter, '')
            .replace(/\s/g, '');
        
        // Base64 디코딩
        const binaryDer = atob(pemContents);
        const binaryDerArray = new Uint8Array(binaryDer.length);
        for (let i = 0; i < binaryDer.length; i++) {
            binaryDerArray[i] = binaryDer.charCodeAt(i);
        }
        
        // RSA 개인키 import
        const privateKeyObj = await window.crypto.subtle.importKey(
            'pkcs8',
            binaryDerArray.buffer,
            {
                name: 'RSA-OAEP',
                hash: 'SHA-256'
            },
            false,
            ['decrypt']
        );
        
        // Base64 디코딩
        const encryptedBinary = atob(encryptedShare);
        const encryptedArray = new Uint8Array(encryptedBinary.length);
        for (let i = 0; i < encryptedBinary.length; i++) {
            encryptedArray[i] = encryptedBinary.charCodeAt(i);
        }
        
        // RSA로 복호화
        const decrypted = await window.crypto.subtle.decrypt(
            { name: 'RSA-OAEP' },
            privateKeyObj,
            encryptedArray.buffer
        );
        
        // 복호화된 조각
        const decoder = new TextDecoder();
        const share = decoder.decode(decrypted);
        
        console.log('✅ 조각 복호화 완료');
        return share;
        
    } catch (error) {
        console.error('❌ 조각 복호화 오류:', error);
        throw new Error('조각 복호화에 실패했습니다: ' + error.message);
    }
};
