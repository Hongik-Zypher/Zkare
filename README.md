# Zkare - 영지식증명 기반 의료기록 접근 제어 시스템

Zkare는 영지식증명(Zero-Knowledge Proof)을 활용하여 환자의 개인정보를 보호하면서 의료 기록에 대한 안전한 접근을 제공하는 분산형 응용 프로그램(DApp)입니다.

## 🚀 주요 기능

- **제로지식증명(ZKP) 기반 의료 기록 검증**: 실제 데이터를 공개하지 않고 의료 기록의 유효성 증명
- **블록체인 기반 접근 제어**: 환자가 자신의 의료 기록에 대한 접근 권한을 승인/거부
- **의료 기록 무결성 검증**: 블록체인에 저장된 해시를 통한 데이터 무결성 보장
- **개인정보 보호 강화**: 중요한 의료 데이터를 공개하지 않고 접근 관리
- **스마트 컨트랙트 기반 자동화**: 승인된 접근에 대한 자동 처리

## 🏗️ 시스템 아키텍처

시스템은 다음과 같은 주요 컴포넌트로 구성됩니다:

1. **스마트 컨트랙트**
   - `MedicalRecordVerifier.sol`: 증명 검증 및 접근 제어
   - `MedicalRecordStorage.sol`: 의료 기록 해시 저장
   - `MedicalRecordViewer.sol`: 승인된 접근 관리

2. **ZK 증명 서킷**
   - `medical_record_proof.circom`: 의료 기록 접근 증명 서킷

3. **백엔드 서비스**
   - ZK 증명 생성 서비스
   - 블록체인 상호작용 API
   
4. **프론트엔드**
   - 환자용 인터페이스: 접근 요청 관리
   - 요청자용 인터페이스: 의료 기록 접근 요청

## 📂 폴더 구조

```
/Users/hwan/Projects/Zkare/
├── contracts/                      # 스마트 컨트랙트 코드
│   ├── MedicalRecordVerifier.sol
│   ├── MedicalRecordStorage.sol
│   ├── MedicalRecordViewer.sol
│   └── Zkare.sol
│
├── circuits/                       # ZK 서킷 코드
│   ├── medical_record_proof/
│   │   ├── medical_record_proof.circom
│   │   └── ... (생성된 파일들)
│   └── compile.sh
│
├── frontend/                       # 웹 프론트엔드
│   ├── src/
│   │   ├── interfaces/            # 인터페이스 라이브러리
│   │   │   ├── PatientInterface.js  # 환자용 인터페이스
│   │   │   └── RequesterInterface.js # 보험사/연구자용 인터페이스
│   │   ├── api/
│   │   │   └── proofAPI.js         # 백엔드 API 클라이언트
│   │   ├── components/            # React 컴포넌트
│   │   ├── pages/
│   │   └── App.js
│   ├── public/
│   └── package.json
│
└── backend/                        # 백엔드 서버
    ├── controllers/
    │   └── proofController.js      # API 컨트롤러
    ├── routes/
    │   └── zkProofRoutes.js          # API 라우트
    ├── services/
    │   └── zkProofService.js       # ZK 증명 생성 서비스
    ├── constants/
    │   └── verifierABI.json        # 컨트랙트 ABI
    ├── config.js                  # 서버 설정
    ├── server.js                  # 메인 서버 파일
    └── package.json
```

## 🛠️ 기술 스택

- **블록체인**: 이더리움
- **스마트 컨트랙트**: Solidity
- **ZK 증명**: Circom, SnarkJS
- **프론트엔드**: React, Ethers.js
- **백엔드**: Node.js, Express

## 🚀 시작하기

### 사전 요구사항

- Node.js v16 이상
- npm v7 이상
- 이더리움 네트워크 액세스 (로컬 개발의 경우 Hardhat 또는 Ganache)
- Metamask 또는 기타 Web3 지갑

### 설치

1. 레포지토리 클론

```bash
git clone https://github.com/your-username/zkare.git
cd zkare
```

2. 의존성 패키지 설치

```bash
npm run install:all
```

3. 환경 설정

`.env` 파일을 프로젝트 루트에 생성하고 설정을 입력합니다.

4. ZK 증명 서킷 컴파일

```bash
npm run compile:circuits
```

5. 개발 서버 실행

```bash
npm run dev
```

## 🤝 기여하기

기여는 언제나 환영합니다! 버그 리포트, 기능 제안 또는 코드 기여를 위해 이슈를 열거나 풀 리퀘스트를 제출해주세요.

## 📄 라이센스

이 프로젝트는 MIT 라이센스 하에 공개되어 있습니다. 자세한 내용은 LICENSE 파일을 참조하세요.

## 스마트 컨트랙트 배포 및 환경 변수 관리

Zkare 시스템은 여러 스마트 컨트랙트로 구성되어 있으며, 이들을 효율적으로 배포하고 주소를 관리하기 위한 자동화 스크립트를 제공합니다.

### 컨트랙트 배포 방법

1. **모든 컨트랙트 배포**
   ```
   npm run deploy
   ```

2. **특정 컨트랙트만 배포**
   ```
   npm run deploy:zkare     # Zkare 컨트랙트만 배포
   npm run deploy:verifiers # 검증 관련 컨트랙트만 배포
   ```

3. **커스텀 배포**
   ```
   npx hardhat run scripts/deploy_contracts.js --network localhost zkare medical
   ```

### 환경 변수 관리

스마트 컨트랙트 배포 후, 모든 주소는 다음 위치에 자동으로 저장됩니다:

1. **`.env` 파일**: 백엔드 및 스크립트에서 사용
2. **`frontend/src/deployments/latest.json`**: 프론트엔드에서 사용
3. **`backend/deployments/latest.json`**: 백엔드에서 사용

이를 통해 한 번 배포된 컨트랙트를 다시 배포하지 않고도 계속 사용할 수 있습니다.

#### 통합된 환경 변수 설정

모든 환경 변수는 프로젝트 루트 디렉토리의 `.env` 파일에서 관리됩니다. 프론트엔드와 백엔드 모두 이 파일을 참조합니다.

### 배포 기록 관리

모든 배포 정보는 타임스탬프가 포함된 JSON 파일로 저장되어 배포 이력을 추적할 수 있습니다:

```
frontend/src/deployments/deployment-{network}-{timestamp}.json
backend/deployments/deployment-{network}-{timestamp}.json
```

---
```
