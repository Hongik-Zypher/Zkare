# Zkare ZK 서킷 문서

이 문서는 Zkare 프로젝트의 영지식 증명(Zero-Knowledge Proof, ZK) 서킷 구조와 사용법을 설명합니다.

## 목차

1. [서킷 구조 개요](#서킷-구조-개요)
2. [혈액형 검증 서킷](#혈액형-검증-서킷)
3. [의료 기록 서킷](#의료-기록-서킷)
4. [유틸리티 함수](#유틸리티-함수)
5. [서킷 컴파일 방법](#서킷-컴파일-방법)
6. [새 서킷 추가 방법](#새-서킷-추가-방법)
7. [프론트엔드 통합](#프론트엔드-통합)

## 서킷 구조 개요

Zkare 프로젝트의 ZK 서킷은 다음과 같은 구조로 구성되어 있습니다:

```
circuits/
├── src/                           # 서킷 소스 코드
│   ├── blood_type/                # 혈액형 검증 서킷
│   │   └── blood_type_proof.circom
│   ├── medical_record/            # 의료 기록 서킷
│   │   └── medical_record_proof.circom
│   └── utils.circom               # 공통 유틸리티 함수
├── build/                         # 컴파일된 파일
│   └── blood_type/                # 혈액형 서킷 빌드 결과
├── compile.sh                     # 컴파일 스크립트 (의료 기록)
└── build.js                       # 빌드 스크립트 (혈액형)

frontend/public/circuits/          # 프론트엔드에서 접근 가능한 컴파일된 파일
├── blood_type_proof.wasm          # WebAssembly 바이너리
├── blood_type_proof_final.zkey    # 증명 키
└── blood_type_proof_verification_key.json # 검증 키
```

## 혈액형 검증 서킷

`blood_type_proof.circom` 서킷은 환자의 실제 혈액형 정보를 공개하지 않고도 특정 혈액형과의 일치 여부를 검증합니다.

### 입력과 출력

- **공개 입력**: `targetBloodTypeCode` - 검증하려는 혈액형 코드
- **비공개 입력**: `actualBloodTypeCode` - 환자의 실제 혈액형 코드
- **출력**: `isMatch` - 일치하면 1, 불일치하면 0

### 혈액형 코드

- 1: A형
- 2: B형
- 3: O형
- 4: AB형

### 구현 예시

```circom
template BloodTypeProof() {
    // 공개 입력: 검증할 혈액형 코드
    signal input targetBloodTypeCode;
    
    // 비공개 입력: 실제 혈액형 코드
    signal input actualBloodTypeCode;
    
    // 출력 신호: 일치 여부 (1: 일치, 0: 불일치)
    signal output isMatch;
    
    // 유효한 혈액형 코드인지 확인 (1-4)
    component validTarget = IsInRange(64);
    validTarget.in <== targetBloodTypeCode;
    validTarget.lowerBound <== 1;
    validTarget.upperBound <== 4;
    
    component validActual = IsInRange(64);
    validActual.in <== actualBloodTypeCode;
    validActual.lowerBound <== 1;
    validActual.upperBound <== 4;
    
    // 혈액형 일치 여부 확인
    component eq = IsEqual();
    eq.in[0] <== actualBloodTypeCode;
    eq.in[1] <== targetBloodTypeCode;
    
    // 결과 출력
    isMatch <== eq.out;
}

component main {public [targetBloodTypeCode]} = BloodTypeProof();
```

## 의료 기록 서킷

`medical_record_proof.circom` 서킷은 환자의 의료 기록 및 승인 정보를 검증합니다.

### 입력과 출력

- **공개 입력**:
  - `recordHash[2]`: 의료 기록 해시
  - `patientAddress`: 환자 주소
  - `doctorAddress`: 의사 주소
  - `timestamp`: 진료 시간
  - `approvalTimestamp`: 환자 승인 시간

- **비공개 입력**:
  - `nullifier`: 중복 증명 방지용 난수
  - `secret`: 환자의 비밀값
  - `patientSignatureR[2]`, `patientSignatureS`: 환자 서명 값

- **출력**:
  - `hashOutput`: 전체 데이터의 해시값
  - `nullifierHash`: nullifier의 해시값
  - `isApproved`: 환자 승인 유효성

### 구현 예시

```circom
template MedicalRecordProof() {
    // 공개 입력값
    signal input recordHash[2]; // 의료 기록 해시
    signal input patientAddress; // 환자 주소
    signal input doctorAddress; // 의사 주소
    signal input timestamp; // 진료 시간
    signal input approvalTimestamp; // 환자 승인 시간

    // 비공개 입력값
    signal input nullifier; // 중복 증명 방지용 난수
    signal input secret; // 환자의 비밀값
    signal input patientSignatureR[2]; // 환자 서명 r 값
    signal input patientSignatureS; // 환자 서명 s 값

    // 출력값
    signal output hashOutput; // 전체 데이터의 해시값
    signal output nullifierHash; // nullifier의 해시값
    signal output isApproved; // 환자 승인 유효성

    // 의료 기록 해시 계산
    component recordHasher = Poseidon(5);
    recordHasher.inputs[0] <== recordHash[0];
    recordHasher.inputs[1] <== recordHash[1];
    recordHasher.inputs[2] <== patientAddress;
    recordHasher.inputs[3] <== doctorAddress;
    recordHasher.inputs[4] <== timestamp;
    
    // ... (서명 검증 및 해시 계산 로직) ...
    
    // 출력값 할당
    hashOutput <== finalHasher.out;
    nullifierHash <== nullifierHasher.out;
}
```

## 유틸리티 함수

`utils.circom` 파일은 여러 서킷에서 공통으로 사용되는 함수들을 제공합니다:

- `Bytes32ToBits()`: 32바이트 값을 비트로 변환
- `TimestampVerifier()`: 타임스탬프가 특정 범위 내에 있는지 확인
- `AddressOwnershipProof()`: 주소 소유권 증명
- `IsEqual()`: 두 값이 동일한지 확인
- `IsInRange()`: 값이 특정 범위 내에 있는지 확인

## 서킷 컴파일 방법

### 자동 컴파일 (추천)

전체 서킷 컴파일은 다음 명령어로 수행할 수 있습니다:

```bash
npm run compile:circuits
```

이 명령어는 다음 작업을 수행합니다:
1. Circom 서킷을 컴파일하여 R1CS, WASM, SYM 파일 생성
2. Powers of Tau 파일 다운로드 (필요시)
3. ZKey 파일 생성
4. 검증 키 추출
5. Solidity 검증자 생성
6. 필요한 파일을 프론트엔드 디렉토리로 복사

### 수동 컴파일

특정 서킷만 수동으로 컴파일하려면:

```bash
# 의료 기록 서킷 컴파일
cd circuits
./compile.sh

# 혈액형 서킷 컴파일
node build.js
```

## 새 서킷 추가 방법

1. **서킷 파일 생성**
   ```
   circuits/src/new_feature/new_feature_proof.circom
   ```

2. **서킷 템플릿 구현**
   ```circom
   pragma circom 2.0.0;
   
   include "../utils.circom";
   
   template NewFeatureProof() {
       // 입력 신호 정의
       signal input publicInput;
       signal input privateInput;
       
       // 출력 신호 정의
       signal output result;
       
       // 증명 로직 구현
       // ...
       
       // 결과 할당
       result <== computationResult;
   }
   
   component main {public [publicInput]} = NewFeatureProof();
   ```

3. **build.js 스크립트 수정 또는 새 빌드 스크립트 생성**
   
   build.js를 복사하여 새 서킷에 맞게 수정하거나, 기존 build.js에 새 서킷 컴파일 로직을 추가합니다.

4. **package.json에 스크립트 추가**
   ```json
   "scripts": {
     "compile:new_feature": "cd circuits && node build_new_feature.js"
   }
   ```

## 프론트엔드 통합

컴파일된 서킷 파일은 프론트엔드에서 다음 경로로 접근할 수 있습니다:

```
frontend/public/circuits/
```

### 프론트엔드에서 ZK 증명 생성

```javascript
import * as snarkjs from 'snarkjs';

async function generateProof(publicInput, privateInput) {
  // 입력값 준비
  const input = {
    publicInput: publicInput,
    privateInput: privateInput
  };
  
  // 증명 생성
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    '/circuits/new_feature_proof.wasm',
    '/circuits/new_feature_proof_final.zkey'
  );
  
  return { proof, publicSignals };
}
```

### 주의사항

1. ZK 서킷 컴파일은 계산 집약적인 작업이므로 상당한 시간이 소요될 수 있습니다.
2. 컴파일된 파일(.wasm, .zkey)은 재사용 가능하므로 서킷 코드가 변경되지 않는 한 다시 컴파일할 필요가 없습니다.
3. 새 기여자가 프로젝트를 복제할 경우, 컴파일된 파일이 이미 포함되어 있으면 `npm run compile:circuits` 단계를 건너뛸 수 있습니다. 