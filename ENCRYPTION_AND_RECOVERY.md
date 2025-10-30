# Zkare 암호화 및 키 복구 시스템 기술 문서

## 📋 목차

1. [시스템 개요](#시스템-개요)
2. [암호화 시스템](#암호화-시스템)
3. [키 생성 및 관리](#키-생성-및-관리)
4. [Shamir's Secret Sharing 키 복구](#shamirs-secret-sharing-키-복구)
5. [보안 고려사항](#보안-고려사항)

---

## 시스템 개요

### 시스템 아키텍처

```
┌─────────────────┐
│    사용자       │
│  (의사/환자)    │
└────────┬────────┘
         │ MetaMask
         │ 트랜잭션
         ↓
┌─────────────────────────────────────────┐
│         프론트엔드 (React)              │
│  ┌─────────────────────────────────┐   │
│  │  Web Crypto API                 │   │
│  │  • RSA-OAEP 2048 키 생성       │   │
│  │  • AES-256-GCM 암호화          │   │
│  │  • Shamir's Secret Sharing     │   │
│  └─────────────────────────────────┘   │
└──────────┬─────────────┬────────────────┘
           │             │
           │             │
     ┌─────┘             └─────┐
     ↓                         ↓
┌─────────────┐        ┌──────────────────┐
│    IPFS     │        │   이더리움       │
│  (Pinata)   │        │   블록체인       │
│             │        │                  │
│ 암호화된    │        │ • CID (IPFS주소) │
│ 의료 데이터 │        │ • Hash (무결성)  │
│             │        │ • 접근 제어      │
└─────────────┘        └──────────────────┘

[데이터 흐름]
① 사용자 → 프론트엔드: 의료 데이터 입력
② 프론트엔드 → IPFS: 암호화된 데이터 업로드 → CID 반환
③ 프론트엔드 → 블록체인: CID + Hash 저장
④ 조회 시: 블록체인 → CID → IPFS → 암호화 데이터 → 복호화
```

### 핵심 기술 스택

- **암호화**: RSA-OAEP 2048비트 + AES-256-GCM
- **키 복구**: Shamir's Secret Sharing (2-out-of-3 threshold)
  - 총 3개 조각 생성, 2개 이상으로 복구 가능
- **저장**: IPFS (분산 저장) + Ethereum (메타데이터)
- **스마트 컨트랙트**: Solidity 0.8.0
- **프론트엔드**: JavaScript (Web Crypto API)

---

## 암호화 시스템

### 1. 하이브리드 암호화 구조

의료 데이터는 **AES-256-GCM + RSA-OAEP** 하이브리드 방식으로 암호화됩니다.

```javascript
// 실제 구현 (frontend/src/utils/encryption.js)

1. AES 키 생성 (256비트)
   └─> window.crypto.subtle.generateKey({ name: "AES-GCM", length: 256 })

2. 데이터를 AES로 암호화
   └─> encryptedData = AES-GCM(데이터, AES키, IV)

3. AES 키를 RSA 공개키로 암호화
   └─> encryptedKey = RSA-OAEP(AES키, 공개키)

4. 결과물
   └─> { encryptedData, encryptedKey, iv }
```

### 2. 암호화 프로세스

#### 의료기록 생성 시 (의사)

```
[1단계] 의료 데이터 준비
  ├─ 환자 정보 (이름, 키, 몸무게, 혈액형, 주민번호)
  ├─ 진료 기록 (증상, 진단, 처방, 메모)
  └─ JSON 직렬화

[2단계] AES 암호화
  ├─ 랜덤 AES-256 키 생성
  ├─ 랜덤 IV (12바이트) 생성
  └─ 데이터 암호화: AES-GCM(데이터, 키, IV)

[3단계] 키 암호화 (다중 수신자)
  ├─ 환자 공개키로 AES 키 암호화
  │   └─> encryptedKey_patient = RSA-OAEP(AES키, 환자공개키)
  └─ 의사 공개키로 AES 키 암호화
      └─> encryptedKey_doctor = RSA-OAEP(AES키, 의사공개키)

[4단계] IPFS 업로드
  ├─ 암호화된 데이터 + 암호화된 키들을 JSON으로 패키징
  └─> Pinata API를 통해 IPFS에 업로드
      └─> 반환: CID (예: QmXxx...)

[5단계] 블록체인 저장
  ├─ CID 저장 (IPFS 위치)
  ├─ Hash 저장 (무결성 검증용, SHA-256)
  └─> 스마트 컨트랙트 트랜잭션
```

#### 의료기록 조회 시 (환자/의사)

```
[1단계] 블록체인에서 메타데이터 조회
  └─> getRecord(recordId) → { cid, hash }

[2단계] IPFS에서 암호화된 데이터 다운로드
  └─> fetch(IPFS_GATEWAY + cid)

[3단계] 무결성 검증
  ├─ 다운로드한 데이터의 SHA-256 계산
  └─ 블록체인의 hash와 비교
      └─> 불일치 시 "데이터 변조 감지" 오류

[4단계] 복호화
  ├─ 자신의 RSA 개인키로 AES 키 복호화
  │   └─> AES키 = RSA-OAEP-DECRYPT(encryptedKey, 개인키)
  ├─ AES 키로 데이터 복호화
  │   └─> 데이터 = AES-GCM-DECRYPT(encryptedData, AES키, IV)
  └─> JSON 파싱 후 화면 표시
```

### 3. 암호화 알고리즘 세부사항

#### RSA-OAEP

```javascript
// 키 생성 파라미터
{
  name: "RSA-OAEP",
  modulusLength: 2048,        // 2048비트
  publicExponent: new Uint8Array([1, 0, 1]),  // 65537
  hash: "SHA-256"
}
```

- **용도**: AES 키 암호화/복호화
- **키 길이**: 2048비트 (현재 권장 수준)
- **패딩**: OAEP (Optimal Asymmetric Encryption Padding)

#### AES-256-GCM

```javascript
// 암호화 파라미터
{
  name: "AES-GCM",
  length: 256,           // 256비트 키
  iv: crypto.getRandomValues(new Uint8Array(12))  // 12바이트 IV
}
```

- **용도**: 의료 데이터 암호화
- **모드**: GCM (Galois/Counter Mode) - 인증 암호화
- **IV**: 매번 랜덤 생성 (12바이트)
- **장점**: 암호화 + 무결성 검증 동시 제공

---

## 키 생성 및 관리

### 1. RSA 키 쌍 생성

```javascript
// frontend/src/components/KeyGeneration.js

const generateRSAKeyPair = async () => {
  // 1. RSA 키 쌍 생성
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256"
    },
    true,  // extractable
    ["encrypt", "decrypt"]
  );
  
  // 2. 공개키 내보내기 (PEM 형식)
  const publicKeyBuffer = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
  const publicKeyPEM = bufferToPEM(publicKeyBuffer, "PUBLIC KEY");
  
  // 3. 개인키 내보내기 (PEM 형식)
  const privateKeyBuffer = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
  const privateKeyPEM = bufferToPEM(privateKeyBuffer, "PRIVATE KEY");
  
  return { publicKeyPEM, privateKeyPEM };
};
```

### 2. 키 저장 위치

#### 공개키
- **저장 위치**: 블록체인 (KeyRegistry 컨트랙트)
- **형식**: PEM 문자열
- **접근 권한**: 누구나 조회 가능
- **함수**: `registerPublicKey(string memory _publicKey, bool _isDoctor)`

```solidity
// contracts/KeyRegistry.sol
struct PublicKey {
    string key;           // RSA 공개키 (PEM 형식)
    uint256 timestamp;    // 등록 시간
    bool isRegistered;    // 등록 여부
}
```

#### 개인키
- **저장 위치**: 사용자 로컬 (다운로드 파일)
- **형식**: PEM 문자열
- **파일명**: `zkare_private_key_[ADDRESS]_[TIMESTAMP].txt`
- **⚠️ 중요**: 절대 블록체인이나 서버에 저장하지 않음

### 3. 키 생성 프로세스

```
사용자 (의사/환자)
  │
  ├─[1] "키 생성하기" 버튼 클릭
  │     └─> RSA 키 쌍 생성 (브라우저 내)
  │
  ├─[2] 개인키 다운로드
  │     └─> 파일로 저장: zkare_private_key_0xABC...123_1234567890.txt
  │
  ├─[3] 공개키 블록체인 등록
  │     ├─> MetaMask 트랜잭션 승인
  │     └─> KeyRegistry.registerPublicKey() 호출
  │
  └─[4] (선택) 보호자 설정
        └─> Shamir's Secret Sharing 설정
```

---

## Shamir's Secret Sharing 키 복구

### 1. SSS 개요

**Shamir's Secret Sharing**은 비밀(개인키)을 여러 조각으로 나누어, 일정 개수 이상의 조각이 모이면 원래 비밀을 복구할 수 있는 방식입니다.

#### Zkare 구현 파라미터

- **전체 조각 수 (n)**: 3개 (보호자 3명에게 분배)
- **복구 임계값 (t)**: 2개 (최소 2명의 보호자 승인 필요)
- **수학적 기반**: Galois Field GF(256) + Lagrange 보간법
- **표기법**: (2, 3)-threshold scheme 또는 2-out-of-3

```
비밀(개인키)
  │
  ├─[분할]─> Share 1 (보호자 A용)
  ├─[분할]─> Share 2 (보호자 B용)
  └─[분할]─> Share 3 (보호자 C용)

복구: Share 1 + Share 2 (또는 다른 2개 조합) → 원래 개인키
```

### 2. 키 생성 시 SSS 설정

#### 프로세스

```javascript
// frontend/src/components/KeyGeneration.js

[1단계] RSA 키 생성
  └─> { publicKey, privateKey }

[2단계] 개인키를 AES로 암호화
  ├─ 랜덤 AES 키 생성 (복구용 비밀번호)
  ├─ 랜덤 IV 생성
  └─> encryptedPrivateKey = AES-GCM(privateKey, aesKey, iv)

[3단계] AES 키를 SSS로 분할
  ├─ splitSecret(aesKey, 3, 2)  // 3개 조각, 2개로 복구
  └─> [share1, share2, share3]

[4단계] 각 조각을 보호자 공개키로 암호화
  ├─ encryptedShare1 = RSA-OAEP(share1, 보호자A공개키)
  ├─ encryptedShare2 = RSA-OAEP(share2, 보호자B공개키)
  └─ encryptedShare3 = RSA-OAEP(share3, 보호자C공개키)

[5단계] 블록체인에 저장
  └─> KeyRecovery.setGuardiansWithShares(
        [보호자A, 보호자B, 보호자C],
        [이름A, 이름B, 이름C],
        [연락처A, 연락처B, 연락처C],
        encryptedPrivateKey,  // AES로 암호화된 개인키
        iv,
        [encryptedShare1, encryptedShare2, encryptedShare3]
      )
```

#### 저장 구조 (KeyRecovery.sol)

```solidity
struct UserData {
    Guardian[3] guardians;                      // 보호자 정보
    string encryptedPrivateKey;                 // AES로 암호화된 개인키
    string iv;                                  // AES IV
    mapping(address => string) guardianShares;  // 각 보호자의 암호화된 조각
    bool isSet;                                 // 설정 완료 여부
}
```

### 3. 키 복구 프로세스

#### 전체 플로우

```
[상황] 사용자가 개인키를 분실함

[1단계] 복구 요청 (사용자)
  ├─ KeyRecovery.requestRecovery() 호출
  ├─> requestId 생성 (24시간 유효)
  └─> 이벤트 발생: RecoveryRequested

[2단계] 보호자 승인 (보호자 A, B, C 중 2명 이상)
  보호자 A:
    ├─[A-1] 복구 요청 확인
    ├─[A-2] 자신의 암호화된 조각 조회
    │       └─> KeyRecovery.getMyShare(requestId)
    ├─[A-3] 자신의 개인키로 조각 복호화
    │       └─> share_A = RSA-OAEP-DECRYPT(encryptedShare_A, 보호자A개인키)
    └─[A-4] 복호화된 조각 제출
            └─> KeyRecovery.approveRecovery(requestId, share_A)
  
  보호자 B:
    └─> (동일 과정) → share_B 제출

[3단계] 사용자가 키 복구 완료 (2명 승인 후)
  ├─[3-1] 승인 상태 확인 (approvalCount >= 2)
  ├─[3-2] 복구 데이터 조회
  │       └─> getRecoveryData(requestId)
  │           └─> { encryptedPrivateKey, iv }
  ├─[3-3] 복호화된 조각들 조회
  │       └─> getDecryptedShares(requestId)
  │           └─> [share_A, share_B]
  ├─[3-4] Lagrange 보간법으로 AES 키 복구
  │       └─> aesKey = combineShares([share_A, share_B])
  ├─[3-5] AES 키로 개인키 복호화
  │       └─> privateKey = AES-GCM-DECRYPT(encryptedPrivateKey, aesKey, iv)
  └─[3-6] 복구 완료 트랜잭션
          └─> KeyRecovery.completeRecovery(requestId)
```

#### 코드 흐름 (프론트엔드)

```javascript
// 1. 복구 요청 (RecoveryRequest.js)
const handleRequestRecovery = async () => {
  const tx = await requestRecovery();  // 컨트랙트 호출
  const requestId = tx.requestId;
  // ... 24시간 대기
};

// 2. 보호자 승인 (GuardianApproval.js)
const handleApprove = async () => {
  // 2-1. 암호화된 조각 조회
  const encryptedShare = await getMyShare(requestId);
  
  // 2-2. 자신의 개인키로 복호화
  const decryptedShare = await decryptWithRSA(
    encryptedShare,
    guardianPrivateKey
  );
  
  // 2-3. 복호화된 조각 제출
  await approveRecovery(requestId, decryptedShare);
};

// 3. 키 복구 완료 (KeyRecoveryProcess.js)
const handleCompleteRecovery = async () => {
  // 3-1. 복구 데이터 조회
  const { encryptedPrivateKey, iv } = await getRecoveryData(requestId);
  
  // 3-2. 복호화된 조각들 조회
  const shares = await getDecryptedShares(requestId);
  
  // 3-3. SSS로 AES 키 복구
  const recoveredAESKey = combineShares(
    shares.filter(s => s.length > 0)  // 빈 조각 제외
  );
  
  // 3-4. 개인키 복구
  const recoveredPrivateKey = await decryptAES(
    encryptedPrivateKey,
    recoveredAESKey,
    iv
  );
  
  // 3-5. 파일로 다운로드
  downloadPrivateKey(recoveredPrivateKey, currentAccount);
  
  // 3-6. 복구 완료 트랜잭션
  await completeRecovery(requestId);
};
```

### 4. Lagrange 보간법 구현

```javascript
// frontend/src/utils/secretSharing.js

/**
 * Galois Field GF(256) 연산
 */
const gfMul = (a, b) => {
  if (a === 0 || b === 0) return 0;
  return GF256_EXP[(GF256_LOG[a] + GF256_LOG[b]) % 255];
};

const gfDiv = (a, b) => {
  if (b === 0) throw new Error('Division by zero');
  if (a === 0) return 0;
  return GF256_EXP[(GF256_LOG[a] + 255 - GF256_LOG[b]) % 255];
};

/**
 * Lagrange 보간법
 * shares = [[x1, y1], [x2, y2], ...]
 * 목표: x=0에서의 y값 (비밀) 계산
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
      
      // L_i(0) = Π(0-xj) / Π(xi-xj)
      numerator = gfMul(numerator, xj);
      denominator = gfMul(denominator, xi ^ xj);
    }
    
    const basis = gfMul(yi, gfDiv(numerator, denominator));
    secret ^= basis;
  }
  
  return secret;
};
```

### 5. 보안 특징

#### SSS의 암호학적 장점

1. **정보 이론적 안전성 (Information-Theoretic Security)**
   - Threshold 미만의 조각(1개)으로는 원래 비밀에 대한 **어떠한 정보도** 얻을 수 없음
   - 무한한 계산 능력으로도 복구 불가능 (단순 연산 복잡도 문제가 아님)

2. **유연성 (Flexibility)**
   - 3명의 보호자 중 **아무 2명의 조합**으로 복구 가능
   - (A+B), (A+C), (B+C) 모두 동일하게 작동

3. **단일 실패점 제거 (No Single Point of Failure)**
   - 보호자 1명이 조각을 분실하거나 응답하지 않아도 복구 가능
   - 보호자 1명의 개인키가 탈취되어도 복구 불가능 (2명 필요)

#### 구현 보안

```
[보호 계층]

1. 개인키 자체
   └─> AES-256-GCM으로 암호화

2. AES 키
   └─> SSS로 3개 조각으로 분할

3. 각 조각
   └─> 해당 보호자의 RSA 공개키로 암호화

4. 블록체인 저장
   └─> 불변성 + 투명성

[공격 시나리오 방어]

- 보호자 1명 탈취: 복구 불가능 (2명 필요)
- 블록체인 데이터 유출: 암호화된 조각만 존재
- 보호자 공모: 2명이 합의해야 가능 (신뢰할 수 있는 보호자 선택 중요)
```

---

## 보안 고려사항

### 1. 키 관리

#### ✅ 적용된 보안 원칙

- **개인키 로컬 저장**: 개인키는 사용자 기기에만 저장
- **공개키 블록체인 등록**: 누구나 암호화 가능, 복호화는 개인키 소유자만
- **메모리 관리**: 개인키 사용 후 10분 뒤 자동 삭제

```javascript
// frontend/src/components/KeyGeneration.js

// 개인키 메모리 자동 삭제 (10분)
useEffect(() => {
  if (generatedPrivateKey) {
    const timer = setTimeout(() => {
      setGeneratedPrivateKey(null);
      console.log('🗑️ 개인키가 메모리에서 삭제되었습니다 (보안)');
    }, 10 * 60 * 1000);
    
    return () => clearTimeout(timer);
  }
}, [generatedPrivateKey]);
```

### 2. 암호화 강도

#### AES-256-GCM
- **키 길이**: 256비트 (2^256 = 10^77 경우의 수)
- **모드**: GCM (인증 암호화 - 무결성 + 기밀성)
- **현황**: NSA Suite B 승인, 군사/정부 수준

#### RSA-2048
- **키 길이**: 2048비트
- **보안 수준**: ~112비트 대칭키 수준
- **권장 사항**: NIST는 2030년까지 RSA-2048 권장

### 3. 무결성 검증

```javascript
// 데이터 저장 시
const hash = await crypto.subtle.digest('SHA-256', data);

// 데이터 조회 시
const downloadedHash = await crypto.subtle.digest('SHA-256', downloadedData);
if (hashCompare(hash, downloadedHash)) {
  // 데이터 무결성 확인
} else {
  throw new Error('데이터가 변조되었습니다');
}
```

### 4. 접근 제어

#### 블록체인 수준

```solidity
// contracts/EncryptedMedicalRecord.sol

// 의사만 기록 추가 가능
modifier onlyDoctor() {
    require(keyRegistry.isDoctor(msg.sender), "Not a doctor");
    _;
}

// 환자 본인 또는 의사만 조회 가능
function getRecord(address _patient, uint256 _recordId) external view {
    require(
        msg.sender == _patient || keyRegistry.isDoctor(msg.sender),
        "Access denied"
    );
    // ...
}
```

### 5. 알려진 제한사항

#### 현재 구현의 한계

1. **보호자 신뢰 문제**
   - 보호자 2명이 공모하면 키 복구 가능
   - → 신뢰할 수 있는 보호자 선택 필요

2. **개인키 분실 시**
   - SSS 미설정 시 복구 불가능
   - → 키 생성 시 SSS 설정 권장

3. **브라우저 의존성**
   - Web Crypto API 사용 (브라우저 환경 필수)
   - → 추후 모바일 앱에서는 Native Crypto API 필요

4. **IPFS 영속성**
   - Pinata 서비스 의존
   - → 자체 IPFS 노드 또는 다중 핀닝 서비스 고려

---

## 부록: 실제 사용 예시

### A. 의사가 환자 기록 작성

**시나리오**: 의사가 환자의 진료 기록을 작성하여 안전하게 저장

```text
1. 의사 계정으로 로그인 (MetaMask)
   └─> 계정: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

2. "Encrypted Medical" 페이지 이동

3. 환자 주소 입력
   └─> 0x70997970C51812dc3A010C7d01b50e0d17dc79C8

4. 의료 기록 입력
   ├─ 증상: "두통, 발열, 인후통"
   ├─ 진단: "급성 상기도 감염 (감기)"
   ├─ 처방: "해열제 500mg, 진통제 250mg, 충분한 휴식"
   └─ 메모: "3일 후 재방문 권장"

5. "기록 추가" 클릭
   ├─> [프론트엔드] AES-256 암호화
   ├─> [IPFS] Pinata 업로드
   ├─> [블록체인] CID + Hash 저장
   └─> 트랜잭션 완료 (약 2초)

6. ✅ 완료!
   ├─ CID: QmXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx
   ├─ Transaction Hash: 0xabc123...
   └─ 환자와 의사만 복호화 가능
```

### B. 환자가 자신의 기록 조회

**시나리오**: 환자가 본인의 의료 기록을 확인

```text
1. 환자 계정으로 로그인
   └─> MetaMask에서 환자 계정 선택

2. "My Medical Records" 페이지 이동

3. 기록 목록 확인
   ├─ Record #0: 2025-10-28 (의사: Dr. Kim)
   └─ Record #1: 2025-10-20 (의사: Dr. Lee)

4. 조회할 기록 선택
   └─> Record #0 클릭

5. 개인키 파일 업로드
   └─> zkare_private_key_0x709...C8_1730090000.txt

6. 자동 복호화 프로세스
   ├─> [블록체인] CID 조회
   ├─> [IPFS] 암호화된 데이터 다운로드
   ├─> [검증] Hash 비교 (무결성 확인)
   └─> [복호화] RSA 개인키로 AES 키 복호화 → 데이터 복호화

7. ✅ 의료 기록 표시
   ├─ 증상: 두통, 발열, 인후통
   ├─ 진단: 급성 상기도 감염 (감기)
   ├─ 처방: 해열제 500mg, 진통제 250mg
   └─ 담당의: Dr. Kim
```

### C. 키 복구 (개인키 분실 시)

**시나리오**: 환자가 개인키를 분실했으나 보호자 시스템으로 복구

```text
[사전 조건]
✅ 키 생성 시 보호자 3명 설정 완료
   ├─ 보호자 A: 가족 (0x3C44...)
   ├─ 보호자 B: 친구 (0x90F7...)
   └─ 보호자 C: 신뢰기관 (0x15d3...)

[1단계] 환자 - 복구 요청
   └─> "Key Recovery" 페이지에서 "복구 요청" 클릭
   └─> MetaMask 트랜잭션 승인
   └─> requestId 생성: 0xabc123...
   └─> ⏰ 24시간 유효 (만료: 2025-10-29 16:00)

[2단계] 보호자 A - 승인
   ├─ "Guardian Dashboard" 접속
   ├─ 복구 요청 확인
   │   └─> 요청자: 0x70997970... (환자)
   │   └─> 요청 시간: 2025-10-28 16:00
   ├─ 본인 확인: 개인키 파일 업로드
   │   └─> zkare_private_key_0x3C44...txt
   ├─ "승인" 클릭
   │   └─> [복호화] 자신에게 할당된 SSS 조각 복호화
   │   └─> [제출] 블록체인에 복호화된 조각 제출
   └─> ✅ 승인 완료 (1/2)

[3단계] 보호자 B - 승인
   └─> (보호자 A와 동일 과정)
   └─> ✅ 승인 완료 (2/2) - 임계값 도달!

[4단계] 환자 - 복구 완료
   ├─ "복구 완료" 버튼 활성화 확인
   ├─ 클릭 시 자동 프로세스:
   │   ├─> [조회] 블록체인에서 복호화된 조각 2개 가져오기
   │   ├─> [복구] Lagrange 보간법으로 AES 키 재구성
   │   ├─> [복호화] 암호화된 개인키를 AES 키로 복호화
   │   └─> [저장] 파일 다운로드
   └─> ✅ 복구 완료!
       └─> zkare_recovered_key_0x709...C8_1730100000.txt

[보안 특징]
- ✅ 보호자 1명만으로는 복구 불가능
- ✅ 환자 본인만 최종 복구 수행 가능
- ✅ 24시간 내 복구하지 않으면 요청 자동 만료
- ✅ 모든 과정이 블록체인에 투명하게 기록됨
```

---

## 참고 문헌

- [NIST SP 800-57](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final) - Key Management Guidelines
- [RFC 8017](https://www.rfc-editor.org/rfc/rfc8017) - RSA-OAEP
- [Shamir's Secret Sharing](https://en.wikipedia.org/wiki/Shamir%27s_Secret_Sharing) - Original Paper (1979)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)

---

## 문서 정보

- **문서 버전**: 1.1
- **최종 수정일**: 2025-10-28
- **작성자**: Zkare 개발팀
- **검토 상태**: ✅ 기술 검토 완료
- **문서 유형**: 기술 문서 (Technical Documentation)

### 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.1  | 2025-10-28 | 아키텍처 다이어그램 개선, SSS 설명 보강, 실사용 예시 상세화 |
| 1.0  | 2025-10-28 | 초안 작성 - 암호화 시스템 및 키 복구 프로세스 문서화 |

### 관련 문서

- [DEMO_PLAN.md](./DEMO_PLAN.md) - 시스템 데모 계획서
- [BLOCKCHAIN_STORAGE_STRUCTURE.md](./BLOCKCHAIN_STORAGE_STRUCTURE.md) - 블록체인 저장 구조
- [README.md](./README.md) - 프로젝트 개요

---

**© 2025 Zkare Development Team. All rights reserved.**

