/**
 * ============================================================================
 * Shamir's Secret Sharing (SSS) - 완전 구현
 * ============================================================================
 * 
 * @fileoverview
 * Adi Shamir(1979)의 Secret Sharing 알고리즘을 JavaScript로 순수 구현.
 * 의료 데이터 보안을 위한 키 복구 시스템에서 사용.
 * 
 * @description
 * **핵심 원리:**
 * - (t, n)-threshold 방식: n개 조각 생성, t개로 복구 가능
 * - Information-theoretically secure: t-1개로는 어떠한 정보도 얻을 수 없음
 * - Lagrange 보간법: 다항식의 점들로부터 y절편(비밀) 복구
 * 
 * **암호학적 기반:**
 * - Galois Field GF(256) 연산 (바이트 단위 처리)
 * - 생성 다항식: x^8 + x^4 + x^3 + x + 1 (0x11d, AES와 동일)
 * - 로그/지수 테이블을 이용한 곱셈/나눗셈 최적화
 * 
 * **보안 특성:**
 * - Perfect Security: 임계값 미만으로는 완벽히 안전
 * - No Single Point of Failure: 일부 조각 분실해도 복구 가능
 * - Flexible Threshold: 보안 수준에 따라 임계값 조정 가능
 * 
 * **구현 방식:**
 * - secrets.js-grempe 라이브러리가 설치되어 있지만 사용하지 않음
 * - 암호학 원리를 완전히 이해하고 커스터마이징하기 위해 직접 구현
 * - 표준 SSS 알고리즘 및 기존 라이브러리 구현 참고
 * 
 * @references
 * - Shamir, A. (1979). "How to share a secret", Communications of the ACM
 * - secrets.js-grempe: https://github.com/grempe/secrets.js
 * - FIPS 197 (AES): GF(256) 연산 표준
 * 
 * @security
 * - 🔒 정보 이론적 안전성 (Information-Theoretic Security)
 * - 🔑 최소 임계값(t): 2개 (보통 2-of-3 사용)
 * - 📊 최대 조각 수(n): 255개 (GF(256) 제약)
 * - 🎲 암호학적 안전 난수 생성 (Web Crypto API)
 * 
 * @author Zkare Team
 * @version 1.0.0
 * @date 2025-10-27
 * @license MIT
 */

// ============================================================================
// GF(256) 갈루아 필드 연산
// ============================================================================

/**
 * Galois Field GF(2^8) 로그/지수 테이블
 * 
 * @description
 * GF(256)에서 곱셈과 나눗셈을 효율적으로 수행하기 위한 lookup 테이블.
 * - GF256_EXP[i]: 생성원(generator) α의 i제곱
 * - GF256_LOG[x]: x를 α^k로 표현했을 때의 k 값
 * 
 * **수학적 배경:**
 * GF(256)은 x^8 + x^4 + x^3 + x + 1을 기약 다항식으로 하는 유한체.
 * 모든 0이 아닌 원소는 α^0, α^1, ..., α^254로 표현 가능.
 * 
 * **곱셈 최적화:**
 * a * b = α^(log_α(a) + log_α(b)) = EXP[LOG[a] + LOG[b] mod 255]
 * 
 * @type {Array<number>}
 */
const GF256_EXP = new Array(256);
const GF256_LOG = new Array(256);

/**
 * GF(256) 로그/지수 테이블 초기화
 * 
 * @description
 * 생성 다항식 x^8 + x^4 + x^3 + x + 1 (0x11d)를 사용하여
 * GF(256)의 모든 원소에 대한 로그/지수 테이블을 생성.
 * 
 * **알고리즘:**
 * 1. α = 0x02 (생성원, generator)로 시작
 * 2. α^i를 반복적으로 계산 (0 ≤ i < 256)
 * 3. 오버플로우 발생 시 생성 다항식으로 modulo 연산
 * 
 * **생성 다항식 0x11d = 0b100011101:**
 * - x^8 + x^4 + x^3 + x^1 + x^0
 * - AES(Advanced Encryption Standard)와 동일한 다항식
 * 
 * @function
 * @returns {void}
 * 
 * @example
 * // 초기화 후 테이블 확인
 * initGF256();
 * console.log(GF256_EXP[0]);  // 1 (α^0 = 1)
 * console.log(GF256_EXP[1]);  // 2 (α^1 = α)
 * console.log(GF256_LOG[2]);  // 1 (log_α(2) = 1)
 */
const initGF256 = () => {
    let x = 1;  // 시작: α^0 = 1
    for (let i = 0; i < 256; i++) {
        GF256_EXP[i] = x;      // EXP[i] = α^i
        GF256_LOG[x] = i;      // LOG[α^i] = i
        
        // 다음 거듭제곱 계산: x = x * α (α = 0x02)
        x <<= 1;  // 왼쪽으로 1비트 시프트 (α 곱하기)
        
        // 오버플로우 체크 (9번째 비트 발생)
        if (x & 0x100) {
            // 생성 다항식으로 modulo 연산
            // 0x100 XOR 0x11d = x^8 를 x^4+x^3+x+1로 대체
            x ^= 0x11d;
        }
    }
    
    // 특별 케이스: log(0)는 수학적으로 정의되지 않음
    // 편의상 0으로 설정 (실제 연산에서는 0 체크로 방지)
    GF256_LOG[0] = 0;
};

// GF(256) 테이블 초기화 (모듈 로드 시 자동 실행)
initGF256();

/**
 * GF(256) 곱셈
 * 
 * @description
 * Galois Field에서 두 원소의 곱셈을 수행.
 * 로그 테이블을 사용하여 O(1) 시간에 계산.
 * 
 * **수학적 원리:**
 * a * b = α^(log_α(a) + log_α(b) mod 255)
 * 
 * @param {number} a - 첫 번째 피연산자 (0-255)
 * @param {number} b - 두 번째 피연산자 (0-255)
 * @returns {number} a와 b의 GF(256) 곱셈 결과
 * 
 * @example
 * gfMul(3, 7);  // GF(256)에서 3 * 7
 * gfMul(0, 5);  // 0 (0과의 곱은 항상 0)
 */
const gfMul = (a, b) => {
    // 0과의 곱셈은 항상 0
    if (a === 0 || b === 0) return 0;
    
    // log(a) + log(b) mod 255를 지수로 하는 값
    return GF256_EXP[(GF256_LOG[a] + GF256_LOG[b]) % 255];
};

/**
 * GF(256) 나눗셈
 * 
 * @description
 * Galois Field에서 두 원소의 나눗셈을 수행.
 * 로그 테이블을 사용하여 O(1) 시간에 계산.
 * 
 * **수학적 원리:**
 * a / b = α^(log_α(a) - log_α(b) mod 255)
 * 
 * @param {number} a - 피제수 (0-255)
 * @param {number} b - 제수 (1-255, 0은 불가)
 * @returns {number} a를 b로 나눈 GF(256) 결과
 * @throws {Error} 0으로 나누려고 할 때
 * 
 * @example
 * gfDiv(21, 7);  // GF(256)에서 21 / 7
 * gfDiv(0, 5);   // 0 (0 나누기는 항상 0)
 * gfDiv(5, 0);   // Error: Division by zero
 */
const gfDiv = (a, b) => {
    if (b === 0) throw new Error('Division by zero');
    if (a === 0) return 0;
    
    // log(a) - log(b) mod 255를 지수로 하는 값
    // 음수 방지를 위해 255를 더함
    return GF256_EXP[(GF256_LOG[a] + 255 - GF256_LOG[b]) % 255];
};

// ============================================================================
// Lagrange 보간법 (Polynomial Interpolation)
// ============================================================================

/**
 * Lagrange 보간법으로 y절편(비밀) 복구
 * 
 * @description
 * k개의 점 (x₁, y₁), (x₂, y₂), ..., (xₖ, yₖ)로부터
 * (t-1)차 다항식 P(x)를 복원하고, P(0) = 비밀을 계산.
 * 
 * **수학적 원리:**
 * P(x) = Σᵢ yᵢ · Lᵢ(x)
 * 여기서 Lᵢ(x) = Πⱼ≠ᵢ (x - xⱼ) / (xᵢ - xⱼ) (Lagrange 기저 다항식)
 * 
 * P(0) = Σᵢ yᵢ · Πⱼ≠ᵢ (-xⱼ) / (xᵢ - xⱼ)
 *      = Σᵢ yᵢ · Πⱼ≠ᵢ xⱼ / (xᵢ - xⱼ)  (GF(256)에서 -x = x)
 * 
 * **GF(256) 특수 성질:**
 * - 덧셈 = 뺄셈 = XOR
 * - -x = x (자기 자신이 역원)
 * - 곱셈/나눗셈은 로그 테이블 사용
 * 
 * @param {Array<[number, number]>} shares - [(x₁, y₁), (x₂, y₂), ...] 조각들
 * @returns {number} 복구된 비밀 (P(0)의 값)
 * 
 * @example
 * // 3개의 조각으로 비밀 복구
 * const shares = [[1, 45], [2, 87], [3, 123]];
 * const secret = lagrangeInterpolate(shares);  // 원래 비밀 반환
 * 
 * @see https://en.wikipedia.org/wiki/Lagrange_polynomial
 */
const lagrangeInterpolate = (shares) => {
    let secret = 0;  // P(0)의 값 (누적)
    const k = shares.length;
    
    // 각 점에 대한 Lagrange 기저 다항식 계산
    for (let i = 0; i < k; i++) {
        const [xi, yi] = shares[i];
        let numerator = 1;     // Πⱼ≠ᵢ xⱼ
        let denominator = 1;   // Πⱼ≠ᵢ (xᵢ - xⱼ)
        
        // Lᵢ(0) 계산
        for (let j = 0; j < k; j++) {
            if (i === j) continue;
            const [xj] = shares[j];
            
            // numerator *= (0 - xj) = xj  (GF(256)에서 -xj = xj)
            numerator = gfMul(numerator, xj);
            
            // denominator *= (xi - xj) = xi XOR xj
            denominator = gfMul(denominator, xi ^ xj);
        }
        
        // basis = yi * Lᵢ(0) = yi * (numerator / denominator)
        const basis = gfMul(yi, gfDiv(numerator, denominator));
        
        // secret += basis (GF(256)에서 덧셈 = XOR)
        secret ^= basis;
    }
    
    return secret;
};

// ============================================================================
// 다항식 생성 및 평가 (Polynomial Generation & Evaluation)
// ============================================================================

/**
 * (t-1)차 랜덤 다항식 생성
 * 
 * @description
 * Shamir's Secret Sharing에서 사용할 (t-1)차 다항식 생성.
 * P(x) = a₀ + a₁·x + a₂·x² + ... + a_(t-1)·x^(t-1)
 * 
 * **핵심 특성:**
 * - a₀ = secret (y절편이 비밀)
 * - a₁, a₂, ..., a_(t-1)은 암호학적 안전 난수
 * - t개의 점이 있어야 (t-1)차 다항식 복원 가능
 * - t-1개의 점으로는 어떠한 정보도 얻을 수 없음 (Perfect Security)
 * 
 * @param {number} secret - 비밀 값 (0-255 바이트)
 * @param {number} threshold - 임계값 t (복구에 필요한 최소 조각 수)
 * @returns {Array<number>} 다항식 계수 배열 [a₀, a₁, ..., a_(t-1)]
 * 
 * @example
 * // threshold = 2이면 1차 다항식 생성
 * // P(x) = a₀ + a₁·x  (2개 점으로 복구 가능)
 * const poly = generatePolynomial(42, 2);
 * // poly = [42, 178]  // a₀=42(비밀), a₁=178(랜덤)
 * 
 * @security
 * Web Crypto API의 getRandomValues() 사용으로 암호학적으로 안전한 난수 생성
 */
const generatePolynomial = (secret, threshold) => {
    // a₀ = secret (y절편)
    const coefficients = [secret];
    
    // a₁, a₂, ..., a_(t-1) 생성 (threshold - 1개의 랜덤 계수)
    for (let i = 1; i < threshold; i++) {
        const randomByte = new Uint8Array(1);
        window.crypto.getRandomValues(randomByte);  // CSPRNG
        coefficients.push(randomByte[0]);
    }
    
    return coefficients;
};

/**
 * 다항식 평가 - P(x) 계산
 * 
 * @description
 * 주어진 x 값에 대해 다항식을 평가하여 P(x)를 계산.
 * GF(256)에서 Horner's method 변형을 사용.
 * 
 * **계산 방법:**
 * P(x) = a₀ + a₁·x + a₂·x² + ... + a_n·x^n
 * 
 * GF(256)에서:
 * - 덧셈 = XOR
 * - 곱셈 = gfMul()
 * 
 * @param {Array<number>} coefficients - 다항식 계수 [a₀, a₁, ..., a_n]
 * @param {number} x - 평가할 x 값 (1-255, 0은 비밀이므로 사용 안함)
 * @returns {number} P(x)의 값 (0-255)
 * 
 * @example
 * const poly = [42, 178];  // P(x) = 42 + 178·x
 * const y1 = evaluatePolynomial(poly, 1);  // P(1) = 42 XOR 178
 * const y2 = evaluatePolynomial(poly, 2);  // P(2) = 42 XOR gfMul(178, 2)
 * 
 * @complexity O(n) where n = degree of polynomial
 */
const evaluatePolynomial = (coefficients, x) => {
    let result = 0;    // P(x)의 누적 값
    let xPower = 1;    // x^i (시작: x^0 = 1)
    
    // P(x) = Σᵢ aᵢ · x^i
    for (let i = 0; i < coefficients.length; i++) {
        // result += aᵢ · x^i  (GF(256)에서 += 는 XOR)
        result ^= gfMul(coefficients[i], xPower);
        
        // 다음 x의 거듭제곱 계산: x^(i+1) = x^i · x
        xPower = gfMul(xPower, x);
    }
    
    return result;
};

// ============================================================================
// 인코딩/디코딩 유틸리티 (Encoding/Decoding Utilities)
// ============================================================================

/**
 * 바이트 배열을 16진수 문자열로 변환
 * 
 * @param {Array<number>|Uint8Array} bytes - 바이트 배열 (0-255)
 * @returns {string} 16진수 문자열 (예: [255, 0, 16] → "ff0010")
 * 
 * @example
 * bytesToHex([255, 0, 16]);  // "ff0010"
 * bytesToHex([65, 66, 67]);  // "414243" (ABC)
 */
const bytesToHex = (bytes) => {
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
};

/**
 * 16진수 문자열을 바이트 배열로 변환
 * 
 * @param {string} hex - 16진수 문자열 (예: "ff0010")
 * @returns {Array<number>} 바이트 배열 (예: [255, 0, 16])
 * 
 * @example
 * hexToBytes("ff0010");  // [255, 0, 16]
 * hexToBytes("414243");  // [65, 66, 67] (ABC)
 */
const hexToBytes = (hex) => {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
};

/**
 * UTF-8 문자열을 바이트 배열로 변환
 * 
 * @param {string} str - UTF-8 문자열
 * @returns {Array<number>} 바이트 배열
 * 
 * @example
 * stringToBytes("Hello");  // [72, 101, 108, 108, 111]
 * stringToBytes("안녕");    // UTF-8 인코딩된 바이트 배열
 */
const stringToBytes = (str) => {
    return Array.from(new TextEncoder().encode(str));
};

/**
 * 바이트 배열을 UTF-8 문자열로 변환
 * 
 * @param {Array<number>|Uint8Array} bytes - 바이트 배열
 * @returns {string} UTF-8 문자열
 * 
 * @example
 * bytesToString([72, 101, 108, 108, 111]);  // "Hello"
 */
const bytesToString = (bytes) => {
    return new TextDecoder().decode(new Uint8Array(bytes));
};

/**
 * SSS 조각을 문자열로 인코딩
 * 
 * @description
 * (x, y₀y₁y₂...yₙ) 형태의 조각을 "xx:yy..." 문자열로 인코딩.
 * - x: 조각 번호 (1-255)
 * - y: 비밀의 각 바이트에 대한 P(x) 값들
 * 
 * @param {number} x - x 좌표 (1-255)
 * @param {Array<number>} yBytes - y 좌표들 (각 바이트의 P(x) 값)
 * @returns {string} 인코딩된 조각 (형식: "01:a3f5...")
 * 
 * @example
 * encodeShare(1, [163, 245]);  // "01:a3f5"
 * encodeShare(3, [72, 101]);   // "03:4865"
 */
const encodeShare = (x, yBytes) => {
    // 형식: "x좌표(2자리 hex):y좌표들(hex)"
    return x.toString(16).padStart(2, '0') + ':' + bytesToHex(yBytes);
};

/**
 * 문자열 조각을 디코딩
 * 
 * @description
 * "xx:yy..." 형태의 문자열을 {x, yBytes} 객체로 디코딩.
 * 
 * @param {string} share - 인코딩된 조각 (형식: "01:a3f5...")
 * @returns {{x: number, yBytes: Array<number>}} 디코딩된 조각
 * 
 * @example
 * decodeShare("01:a3f5");  // {x: 1, yBytes: [163, 245]}
 * decodeShare("03:4865");  // {x: 3, yBytes: [72, 101]}
 */
const decodeShare = (share) => {
    const [xHex, yHex] = share.split(':');
    const x = parseInt(xHex, 16);
    const yBytes = hexToBytes(yHex);
    return { x, yBytes };
};

// ============================================================================
// 주요 Export 함수들 (Main Exported Functions)
// ============================================================================

/**
 * Shamir's Secret Sharing - 비밀 분할
 * 
 * @description
 * 비밀을 n개의 조각으로 분할하고, t개만 있으면 복구 가능하도록 함.
 * 
 * **알고리즘 과정:**
 * 1. 비밀을 바이트 배열로 변환
 * 2. 각 바이트마다 독립적으로 SSS 적용:
 *    a. (t-1)차 랜덤 다항식 생성 (P(0) = 비밀 바이트)
 *    b. n개의 점 (1, P(1)), (2, P(2)), ..., (n, P(n)) 생성
 * 3. 각 조각은 모든 바이트의 P(x) 값들로 구성
 * 
 * **보안 특성:**
 * - (t-1)개 이하의 조각으로는 비밀에 대한 어떠한 정보도 얻을 수 없음
 * - t개 이상의 조각이 있으면 완벽하게 비밀 복구 가능
 * - Information-Theoretic Security (계산 능력과 무관)
 * 
 * @param {string} secret - 분할할 비밀 (AES 키, 개인키 등)
 * @param {number} [totalShares=3] - 총 생성할 조각 수 (n, 최대 255)
 * @param {number} [threshold=2] - 복구에 필요한 최소 조각 수 (t, 최소 2)
 * @returns {Array<string>} 인코딩된 조각들 (형식: ["01:a3f5...", "02:b7e2...", ...])
 * @throws {Error} threshold > totalShares, threshold < 2, totalShares > 255
 * 
 * @example
 * // 2-of-3 threshold: 3개 생성, 2개로 복구
 * const secret = "my-secret-aes-key-256bit";
 * const shares = splitSecret(secret, 3, 2);
 * // shares = [
 * //   "01:a3f5d...",  // Guardian 1의 조각
 * //   "02:b7e2c...",  // Guardian 2의 조각
 * //   "03:c9f1a..."   // Guardian 3의 조각
 * // ]
 * 
 * @example
 * // 3-of-5 threshold: 더 높은 보안
 * const shares = splitSecret(secret, 5, 3);
 * // 5개 중 최소 3개 필요
 * 
 * @security
 * - 🔒 정보 이론적 안전성 (Perfect Secrecy)
 * - 🎲 암호학적 안전 난수 생성 (Web Crypto API)
 * - 🚫 단일 실패점 없음 (No Single Point of Failure)
 * 
 * @see combineShares - 조각들로부터 비밀 복구
 */
export const splitSecret = (secret, totalShares = 3, threshold = 2) => {
    try {
        console.log('🔐 [SSS] Shamir\'s Secret Sharing - 비밀 분할 시작');
        console.log(`   총 조각: ${totalShares}, 필요 조각: ${threshold}`);
        
        // 입력 검증
        if (threshold > totalShares) {
            throw new Error('threshold는 totalShares보다 클 수 없습니다');
        }
        
        if (threshold < 2) {
            throw new Error('threshold는 최소 2 이상이어야 합니다');
        }
        
        if (totalShares > 255) {
            throw new Error('totalShares는 최대 255까지 가능합니다 (GF(256) 제약)');
        }
        
        // 1. 비밀을 바이트 배열로 변환
        const secretBytes = stringToBytes(secret);
        const shares = [];
        
        // 2. 각 바이트마다 독립적으로 SSS 적용
        for (let byteIndex = 0; byteIndex < secretBytes.length; byteIndex++) {
            const secretByte = secretBytes[byteIndex];
            
            // 2a. (threshold - 1)차 다항식 생성
            // P(x) = secretByte + a₁·x + ... + a_(t-1)·x^(t-1)
            const polynomial = generatePolynomial(secretByte, threshold);
            
            // 2b. n개의 조각 생성: (x, P(x))
            for (let shareIndex = 0; shareIndex < totalShares; shareIndex++) {
                // x좌표: 1부터 시작 (0은 비밀이므로 사용 안함)
                const x = shareIndex + 1;
                
                // P(x) 계산 (GF(256)에서)
                const y = evaluatePolynomial(polynomial, x);
                
                if (byteIndex === 0) {
                    // 첫 바이트일 때 share 배열 초기화
                    shares[shareIndex] = { x, yBytes: [] };
                }
                
                // 현재 바이트의 P(x) 값을 조각에 추가
                shares[shareIndex].yBytes.push(y);
            }
        }
        
        // 3. 조각들을 문자열로 인코딩
        const encodedShares = shares.map(share => encodeShare(share.x, share.yBytes));
        
        console.log('✅ [SSS] Lagrange 보간법 기반 비밀 분할 완료');
        console.log(`   비밀 길이: ${secretBytes.length} bytes`);
        console.log(`   생성된 조각: ${encodedShares.length}개`);
        console.log(`   각 조각 크기: ~${Math.round(encodedShares[0].length / 2)} bytes`);
        
        return encodedShares;
    } catch (error) {
        console.error('❌ [SSS] 비밀 분할 오류:', error);
        throw new Error('비밀 분할에 실패했습니다: ' + error.message);
    }
};

/**
 * Shamir's Secret Sharing - 비밀 복구
 * 
 * @description
 * threshold 개 이상의 조각으로부터 원래 비밀을 복구.
 * 
 * **알고리즘 과정:**
 * 1. 조각들을 디코딩하여 (x, y) 점들로 변환
 * 2. 각 바이트 위치마다 독립적으로:
 *    a. 해당 위치의 (x, y) 점들 수집
 *    b. Lagrange 보간법으로 P(0) = 비밀 바이트 복구
 * 3. 모든 바이트를 결합하여 원래 비밀 복원
 * 
 * **수학적 원리:**
 * - t개의 점이 있으면 (t-1)차 다항식을 유일하게 결정 가능
 * - Lagrange 보간법으로 P(0) 계산 → 비밀 복구
 * - GF(256)에서 연산하므로 정확한 복구 보장
 * 
 * @param {Array<string>} encodedShares - 인코딩된 조각들 (형식: ["01:a3f5...", "02:b7e2...", ...])
 * @returns {string} 복구된 원래 비밀
 * @throws {Error} 조각 수 부족, 조각 길이 불일치, 디코딩 실패
 * 
 * @example
 * // 2-of-3 threshold에서 2개 조각으로 복구
 * const shares = [
 *   "01:a3f5d...",  // Guardian 1의 조각
 *   "02:b7e2c..."   // Guardian 2의 조각
 * ];
 * const secret = combineShares(shares);
 * // secret = "my-secret-aes-key-256bit" (원래 비밀)
 * 
 * @example
 * // 3개 모두 사용해도 동일한 결과
 * const allShares = [
 *   "01:a3f5d...",
 *   "02:b7e2c...",
 *   "03:c9f1a..."
 * ];
 * const secret2 = combineShares(allShares);
 * // secret2 === secret (동일한 비밀)
 * 
 * @security
 * - ✅ threshold 개 이상의 조각 필요
 * - ✅ 임의의 조각 조합 사용 가능
 * - ❌ threshold-1 개로는 복구 불가능
 * 
 * @see splitSecret - 비밀을 조각들로 분할
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
