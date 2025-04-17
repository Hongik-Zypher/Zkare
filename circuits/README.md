# Zkare ZK 서킷 (Zero-Knowledge Circuits)

이 디렉토리는 Zkare 의료 기록 시스템에서 사용하는 ZK 증명(Zero-Knowledge Proof) 서킷을 포함하고 있습니다. ZK 증명을 통해 환자는 의료 기록의 내용을 공개하지 않고도 자신의 의료 기록에 대한 소유권과 특정 조건을 충족함을 증명할 수 있습니다.

## 디렉토리 구조

```
circuits/
├── build/              # 빌드 결과물이 저장되는 디렉토리
├── src/                # ZK 서킷 소스 코드
│   ├── medical_record_proof.circom  # 의료 기록 증명 서킷
│   └── utils.circom              # 유틸리티 서킷 함수
├── test/               # 테스트 코드
├── build.js            # 빌드 스크립트
├── package.json        # 의존성 정보
└── README.md           # 현재 문서
```

## 필요 조건

- Node.js (v14 이상)
- circom (v2.0.0 이상)
- snarkjs

## 설치 방법

1. 필요한 패키지 설치:

```bash
npm install
```

2. circom 설치 (설치되어 있지 않은 경우):

```bash
npm install -g circom
```

## 사용 방법

### 서킷 빌드하기

```bash
npm run build
```

이 명령은 다음을 수행합니다:
1. circom으로 R1CS, WASM, SYM 파일 생성
2. Powers of Tau 다운로드 (필요한 경우)
3. zkey 생성
4. 검증 키 내보내기
5. Solidity 검증자 생성

### 테스트 실행하기

```bash
npm test
```

## 서킷 설명

### medical_record_proof.circom

이 서킷은 의료 기록의 진위 여부를 증명하는 기본 서킷입니다. 다음 기능을 제공합니다:

- 의료 기록 해시의 소유권 증명
- nullifier를 통한 중복 증명 방지
- 개인 정보 보호 기능

### utils.circom

의료 기록 증명에 유용한 유틸리티 함수들을 포함합니다:

- Bytes32ToBits: Solidity의 bytes32 해시값을 Circom 호환 형식으로 변환
- TimestampVerifier: 타임스탬프 검증
- AddressOwnershipProof: 주소 소유권 증명

## 스마트 컨트랙트 통합

build.js 스크립트를 실행하면 build/verifier.sol 파일이 생성됩니다. 이 파일은 ZK 증명을 검증하는 Solidity 컨트랙트를 포함하고 있으며, 기존 Zkare 컨트랙트에 통합할 수 있습니다.

## 예제: 의료 기록 증명 생성 및 검증

```javascript
const snarkjs = require("snarkjs");
const fs = require("fs");

async function generateProof() {
  const input = {
    recordHash: [123456789, 987654321],
    patientAddress: 111222333444,
    doctorAddress: 555666777888,
    timestamp: 1678901234,
    nullifier: 987654321,
    secret: 123456789
  };

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input, 
    "build/medical_record_proof_js/medical_record_proof.wasm",
    "build/medical_record_proof_final.zkey"
  );

  console.log("증명 생성 완료!");
  return { proof, publicSignals };
}

async function verifyProof(proof, publicSignals) {
  const vKey = JSON.parse(fs.readFileSync("build/medical_record_proof_verification_key.json"));
  const res = await snarkjs.groth16.verify(vKey, publicSignals, proof);

  if (res === true) {
    console.log("증명이 유효합니다!");
  } else {
    console.log("증명이 유효하지 않습니다!");
  }
  return res;
}

// 사용 예시
async function main() {
  const { proof, publicSignals } = await generateProof();
  await verifyProof(proof, publicSignals);
}

main().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
``` 