# 블록체인 저장 구조 상세 설명

## 📊 전체 저장 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│              블록체인 (Ethereum Network)                 │
│                                                          │
│  EncryptedMedicalRecord 컨트랙트                         │
│  ├─ mapping(address => PatientInfo)                     │
│  └─ mapping(address => mapping(uint256 => MedicalRecord))│
│                                                          │
│  [저장되는 데이터]                                      │
│  • 환자 이름 (평문)                                     │
│  • IPFS CID                                             │
│  • 데이터 해시 (SHA-256)                                │
│  • 암호화된 AES 키 (의사용, 환자용)                     │
│  • 타임스탬프                                           │
└─────────────────────────────────────────────────────────┘
                          ↕ (CID로 연결)
┌─────────────────────────────────────────────────────────┐
│              IPFS Network (Pinata)                      │
│                                                          │
│  [실제 암호화된 데이터 저장]                            │
│  • AES-256-GCM으로 암호화된 기본정보/진료기록          │
│  • Base64로 인코딩된 문자열                            │
└─────────────────────────────────────────────────────────┘
```

---

## 🔐 블록체인 저장 구조

### 1. PatientInfo 구조체 (환자 기본정보)

**저장 위치**: `mapping(address => PatientInfo) private patientInfo`

```solidity
struct PatientInfo {
    string name;                    // 환자 이름 (평문, 블록체인에 저장)
    string ipfsCid;                 // IPFS CID (암호화된 데이터 위치)
    string dataHash;                // SHA-256 해시 (무결성 검증)
    string encryptedDoctorKey;      // RSA로 암호화된 AES 키 (의사용)
    string encryptedPatientKey;     // RSA로 암호화된 AES 키 (환자용)
    uint256 timestamp;              // 등록 시간
    bool isRegistered;              // 등록 여부 플래그
}
```

**실제 저장 예시:**

```
patientAddress: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8

patientInfo[0x7099...] = {
    name: "홍길동",                           // ← 블록체인에 평문으로 저장
    ipfsCid: "QmXxxxyyyzzz123456789",       // ← IPFS 위치 (블록체인)
    dataHash: "a3b5c7d9e1f2g3h4i5j6...",   // ← 해시 (블록체인)
    encryptedDoctorKey: "MIIBIjANBgkqh...", // ← RSA 암호화된 AES 키 (블록체인)
    encryptedPatientKey: "MIIBIjANBgkqh...", // ← RSA 암호화된 AES 키 (블록체인)
    timestamp: 1701234567,                  // ← 블록 타임스탬프
    isRegistered: true
}
```

---

### 2. MedicalRecord 구조체 (의료 기록)

**저장 위치**: `mapping(address => mapping(uint256 => MedicalRecord)) private medicalRecords`

```solidity
struct MedicalRecord {
    string ipfsCid;                 // IPFS CID (암호화된 데이터 위치)
    string dataHash;                // SHA-256 해시 (무결성 검증)
    string encryptedDoctorKey;      // RSA로 암호화된 AES 키 (의사용)
    string encryptedPatientKey;     // RSA로 암호화된 AES 키 (환자용)
    address doctor;                 // 진료한 의사 주소
    uint256 timestamp;              // 기록 생성 시간
}
```

**실제 저장 예시:**

```
patientAddress: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
recordId: 0

medicalRecords[0x7099...][0] = {
    ipfsCid: "QmAbcdef123456789",           // ← IPFS 위치 (블록체인)
    dataHash: "1a2b3c4d5e6f7a8b9c...",     // ← 해시 (블록체인)
    encryptedDoctorKey: "MIIBIjANBgkqh...", // ← RSA 암호화된 AES 키 (블록체인)
    encryptedPatientKey: "MIIBIjANBgkqh...", // ← RSA 암호화된 AES 키 (블록체인)
    doctor: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266, // ← 의사 주소
    timestamp: 1701234567                   // ← 블록 타임스탬프
}
```

---

## 🌐 IPFS에 저장되는 데이터 구조

### 1. 환자 기본정보 (IPFS)

**IPFS CID**: `QmXxxxyyyzzz123456789` (블록체인에 저장)

**저장된 JSON 구조:**

```json
{
  "data": "eyJlbmNyeXB0ZWRSZWNvcmQiOiJhYjEyMzQ1Njc4OTBhYmNkZWYxMjM0NTY3ODkwYWJjZGVmMTIzNDU2Nzg5MGFiY2RlZjEyMzQ1Njc4OTBhYmNkZWYxMjM0NTY3ODkwYWJjZGVmMTIzNDU2Nzg5MCIsIml2IjoieHl6YWJjZGVmMTIzNDU2Nzg5MCI="
}
```

**실제 내용 (복호화 후):**

```json
{
  "encryptedRecord": "ab1234567890abcdef1234567890abcdef...", // Base64 암호화된 데이터
  "iv": "xyzabcdef1234567890" // 초기화 벡터
}
```

**원본 데이터 (복호화 후):**

```json
{
  "height": "175",
  "weight": "70",
  "bloodType": "A",
  "ssn": "123456-1234567"
}
```

---

### 2. 의료 기록 (IPFS)

**IPFS CID**: `QmAbcdef123456789` (블록체인에 저장)

**저장된 JSON 구조:**

```json
{
  "data": "eyJlbmNyeXB0ZWRSZWNvcmQiOiJkZWY0NTY3ODkwYWJjZGVmMTIzNDU2Nzg5MGFiY2RlZjEyMzQ1Njc4OTBhYmNkZWYxMjM0NTY3ODkwYWJjZGVmMTIzNDU2Nzg5MCIsIml2IjoiYWJjZGVmMTIzNDU2Nzg5MCI="
}
```

**원본 데이터 (복호화 후):**

```json
{
  "symptoms": "두통, 발열, 인후통",
  "diagnosis": "감기",
  "treatment": "충분한 휴식",
  "prescription": "해열제, 진통제",
  "notes": "3일 후 재방문",
  "date": "2025-10-29T10:30:00.000Z"
}
```

---

## 🔄 데이터 저장 및 조회 플로우

### **저장 플로우 (환자 등록)**

```
1. 프론트엔드
   └─> 기본정보: { height, weight, bloodType, ssn }

2. 암호화 (브라우저)
   ├─> AES-256-GCM으로 암호화
   └─> AES 키를 RSA로 암호화 (의사용, 환자용 각각)

3. IPFS 업로드
   ├─> 암호화된 데이터 JSON.stringify
   ├─> Pinata에 업로드
   ├─> CID 반환: "QmXxxxyyyzzz..."
   └─> SHA-256 해시 계산: "a3b5c7d9..."

4. 블록체인 저장
   └─> registerPatient(
         patientAddress,
         name,              // ← 평문으로 블록체인 저장
         cid,               // ← IPFS 위치만 저장
         hash,              // ← 해시만 저장
         encryptedDoctorKey, // ← AES 키 저장
         encryptedPatientKey // ← AES 키 저장
       )
```

### **조회 플로우 (환자 정보 조회)**

```
1. 블록체인 조회
   └─> getPatientInfo(patientAddress)
       └─> 반환: { name, ipfsCid, dataHash, encryptedDoctorKey, ... }

2. IPFS 조회
   └─> CID로 IPFS Gateway에서 데이터 다운로드
       └─> { "data": "eyJlbmNye..." }

3. 무결성 검증
   └─> 다운로드한 데이터의 SHA-256 해시 계산
   └─> 블록체인의 hash와 비교
   └─> 일치하지 않으면 에러 (데이터 변조 가능성)

4. 복호화
   ├─> RSA 개인키로 encryptedDoctorKey 복호화 → AES 키 획득
   └─> AES 키로 암호화된 데이터 복호화
       └─> 원본 기본정보 획득: { height, weight, bloodType, ssn }
```

---

## 📊 데이터 저장 위치 비교표

| 데이터 항목                                 | 블록체인 저장 | IPFS 저장 | 암호화 여부  |
| ------------------------------------------- | ------------- | --------- | ------------ | --- |
| calend                                      | 환자 이름     | ✅ 평문   | ❌           | ❌  |
| IPFS CID                                    | ✅            | ❌        | ❌           |
| 데이터 해시                                 | ✅            | ❌        | ❌           |
| 암호화된 AES 키 (의사용)                    | ✅            | ❌        | ✅ (RSA)     |
| 암호화된 AES 키 (환자용)                    | ✅            | ❌        | ✅ (RSA)     |
| 타임스탬프                                  | ✅            | ❌        | ❌           |
| **기본정보** (키, 몸무게, 혈액형, 주민번호) | ❌            | ✅        | ✅ (AES-256) |
| **진료기록** (증상, 진단, 처방 등)          | ❌            | ✅        | ✅ (AES-256) |
| 의사 주소                                   | ✅            | ❌        | ❌           |

---

## 💡 주요 포인트

### 1. **블록체인에는 메타데이터만 저장**

- 실제 의료 데이터는 IPFS에 저장
- 블록체인에는 IPFS 위치(CID)와 해시만 저장
- **가스비 절감**: 대용량 데이터를 블록체인에 저장하지 않음

### 2. **이중 암호화 구조**

- **1차**: AES-256-GCM으로 데이터 암호화 (빠른 암호화/복호화)
- **2차**: AES 키를 RSA-OAEP로 암호화 (의사용, 환자용 각각)
- 각 사용자는 자신의 개인키로만 AES 키를 복호화 가능

### 3. **무결성 검증**

- 블록체인에 저장된 해시와 IPFS에서 다운로드한 데이터의 해시 비교
- 해시가 다르면 데이터가 변조되었거나 손상되었을 가능성
- **데이터 신뢰성 보장**

### 4. **접근 제어**

- `encryptedDoctorKey`: 의사만 복호화 가능 (의사 RSA 개인키 필요)
- `encryptedPatientKey`: 환자만 복호화 가능 (환자 RSA 개인키 필요)
- 블록체인의 `isDoctor` 검증으로 접근 권한 제어

### 5. **영구 보관**

- IPFS 핀닝 서비스(Pinata)로 데이터 영구 보관
- 블록체인은 영구적이므로 CID와 해시는 영구 보관
- **데이터 손실 방지**

---

## 🔍 실제 블록체인 트랜잭션 예시

### registerPatient 트랜잭션:

```javascript
// 트랜잭션 데이터
{
  "to": "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e", // 컨트랙트 주소
  "function": "registerPatient",
  "parameters": {
    "_patient": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "_name": "홍길동",                                    // ← 평문 저장
    "_ipfsCid": "QmXxxxyyyzzz123456789",                // ← IPFS 위치
    "_dataHash": "0xa3b5c7d9e1f2g3h4i5j6...",           // ← 해시
    "_encryptedDoctorKey": "MIIBIjANBgkqhkiG9w...",     // ← RSA 암호화
    "_encryptedPatientKey": "MIIBIjANBgkqhkiG9w..."     // ← RSA 암호화
  }
}
```

### 블록체인에 저장된 상태:

```solidity
// Storage 슬롯 (간소화된 표현)
patientInfo[0x7099...] = Storage {
    slot 0: name = "홍길동"
    slot 1: ipfsCid = "QmXxxxyyyzzz123456789"  // 약 46 bytes
    slot 2: dataHash = "0xa3b5c7d9..."          // 66 bytes
    slot 3: encryptedDoctorKey = "MIIBIj..."    // 약 400 bytes
    slot 4: encryptedPatientKey = "MIIBIj..."   // 약 400 bytes
    slot 5: timestamp = 1701234567              // 32 bytes
    slot 6: isRegistered = true                 // 1 byte
}

// 총 블록체인 저장 크기: 약 ~950 bytes
// 실제 의료 데이터 (IPFS): 약 ~500 bytes (암호화된 상태)
// 가스비 절감: 약 99% (큰 데이터는 IPFS에 저장)
```

---

## 📝 요약

### **블록체인에 저장되는 것:**

1. ✅ 환자 이름 (평문)
2. ✅ IPFS CID (암호화된 데이터 위치)
3. ✅ 데이터 해시 (무결성 검증)
4. ✅ 암호화된 AES 키 (의사용, 환자용)
5. ✅ 타임스탬프
6. ✅ 의사 주소 (진료기록만)

### **IPFS에 저장되는 것:**

1. ✅ 암호화된 기본정보 (키, 몸무게, 혈액형, 주민번호)
2. ✅ 암호화된 진료기록 (증상, 진단, 처방, 메모)

### **저장되지 않는 것:**

1. ❌ 원본 의료 데이터 (블록체인에는 저장 안 함)
2. ❌ AES 키 (평문, 암호화된 형태만 저장)
3. ❌ IV (Initialization Vector, IPFS 데이터에 포함)

---

**이 구조의 장점:**

- 🚀 가스비 절감 (99% 이상)
- 🔐 강력한 암호화 및 접근 제어
- ✅ 데이터 무결성 검증
- 🌐 분산 저장 (IPFS)
- 🔒 프라이버시 보호
