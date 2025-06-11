# Zkare 의료 기록 관리 시스템

## 프로젝트 소개

Zkare는 이더리움 스마트 컨트랙트 기반의 간단하고 안전한 의료 기록 관리 시스템입니다.

- **스마트컨트랙트**: 환자 의료 기록의 안전한 저장/조회/검증
- **프론트엔드**: React 기반 UI, MetaMask 연동
- **개발환경**: Hardhat(로컬 이더리움), Cursor(코드 AI), GitHub 협업

## 주요 특징

- ✅ **완전한 탈중앙화**: 백엔드 서버 없이 프론트엔드에서 스마트 컨트랙트와 직접 통신
- ✅ **권한 기반 접근제어**: 의사만 의료 기록 추가 가능
- ✅ **디지털 서명**: ECDSA 서명으로 의료 기록 무결성 보장
- ✅ **투명성**: 모든 거래가 블록체인에 투명하게 기록
- ✅ **간단한 구조**: 복잡한 영지식증명 없이 기본적인 의료 기록 관리에 집중

---

## 개발 환경 세팅

### 1. 의존성 설치

```bash
npm install
cd frontend && npm install
```

### 2. 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 아래 예시처럼 작성하세요:

```
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
CONTRACT_ADDRESS=배포된_컨트랙트_주소_여기에_입력
RPC_URL=http://127.0.0.1:8545
```

- `PRIVATE_KEY`는 하드햇 기본 첫 번째 계정의 프라이빗키입니다.
- `CONTRACT_ADDRESS`는 배포 후 출력되는 MedicalRecord 컨트랙트 주소를 입력하세요.

### 3. 하드햇 노드 실행 (로컬 이더리움)

```bash
npx hardhat node
```

### 4. 스마트컨트랙트 배포 및 오너 자동 의사 등록

```bash
npx hardhat run scripts/deploy.js --network localhost
```

- 배포가 완료되면, 콘솔에 MedicalRecord 컨트랙트 주소가 출력됩니다.
- 이 주소를 `.env`와 `frontend/src/utils/contracts.js`의 `MEDICAL_RECORD_ADDRESS`에 입력하세요.

### 5. 프론트엔드 실행

```bash
cd frontend
npm start
```

- 브라우저에서 `http://localhost:3000` 접속
- MetaMask에서 하드햇 네트워크(`http://127.0.0.1:8545`) 추가 및 첫 번째 계정 import

---

## 시스템 구조

```
Zkare/
├── contracts/           # 스마트컨트랙트 (Solidity)
│   ├── MedicalRecord.sol    # 메인 의료기록 컨트랙트
│   └── AccessControl.sol    # 접근제어 컨트랙트
├── scripts/             # 배포/자동화 스크립트
├── frontend/            # React 프론트엔드
│   ├── src/
│   │   ├── components/      # React 컴포넌트
│   │   ├── pages/          # 페이지 컴포넌트
│   │   ├── utils/          # 유틸리티 (컨트랙트 연동)
│   │   └── abis/           # 컨트랙트 ABI 파일
├── artifacts/           # 하드햇 컴파일 결과
├── .env                 # 환경변수 파일 (직접 생성)
└── README.md            # 이 문서
```

---

## 사용 방법

### 1. 지갑 연결
- 웹사이트 접속 후 "MetaMask 연결" 버튼 클릭
- MetaMask에서 계정 연결 승인

### 2. 의사 권한 획득
- 컨트랙트 Owner(배포자)가 의사 주소를 등록해야 함
- Owner 계정으로 로그인 시 "의사 관리" 메뉴에서 의사 추가 가능

### 3. 의료 기록 관리
- **의사 계정**: 
  - 환자 주소 입력 후 "의료 기록 추가" 버튼으로 새 기록 추가
  - 진단, 처방, 날짜, 메모 등 입력 가능
- **모든 사용자**:
  - 환자 주소 입력 후 "조회" 버튼으로 해당 환자의 모든 의료 기록 조회

### 4. 기록 내용
- 진단명, 처방전, 진료 날짜, 추가 메모
- 담당의 주소, 기록 생성 시간
- 디지털 서명으로 무결성 검증

---

## 스마트 컨트랙트 주요 기능

### MedicalRecord.sol
- `addDoctor(address)`: 의사 추가 (Owner만 가능)
- `removeDoctor(address)`: 의사 제거 (Owner만 가능)
- `isDoctor(address)`: 의사 여부 확인
- `addMedicalRecord(...)`: 의료 기록 추가 (의사만 가능)
- `getMedicalRecord(...)`: 의료 기록 조회
- `getRecordCount(address)`: 환자의 기록 수 조회

---

## 트러블슈팅

### 일반적인 문제
- **컨트랙트 주소 오류**: `.env` 파일과 `contracts.js`의 주소가 일치하는지 확인
- **MetaMask 네트워크**: 하드햇 로컬 네트워크(`http://127.0.0.1:8545`)에 연결되어 있는지 확인
- **의사 권한 없음**: Owner 계정으로 해당 주소를 의사로 등록했는지 확인
- **Gas 부족**: MetaMask에서 충분한 ETH가 있는지 확인

### 개발자 도구 활용
- 브라우저 개발자 도구 콘솔에서 에러 메시지 확인
- MetaMask 활동 탭에서 트랜잭션 상태 확인
- Hardhat 노드 터미널에서 블록체인 로그 확인

---

## 향후 개발 계획

### 단기 계획
- [ ] 환자별 의료 기록 검색 기능
- [ ] 의료 기록 수정/삭제 기능 (권한 제어)
- [ ] 의료진 정보 관리 시스템
- [ ] 기록 카테고리 분류 (진료과별)

### 중기 계획
- [ ] IPFS 연동으로 대용량 의료 데이터 저장
- [ ] 환자 동의 시스템 구현
- [ ] 모바일 앱 개발 (React Native)
- [ ] 다중 병원 네트워크 지원

### 장기 계획
- [ ] Layer 2 네트워크 이전 (가스비 절약)
- [ ] 의료 표준 프로토콜 준수 (HL7 FHIR)
- [ ] 보험사 연동 시스템
- [ ] AI 기반 의료 기록 분석

---

## 기여하기

1. 이 저장소를 Fork 하세요
2. 새로운 기능 브랜치를 만드세요 (`git checkout -b feature/새기능`)
3. 변경사항을 커밋하세요 (`git commit -am '새기능 추가'`)
4. 브랜치에 Push 하세요 (`git push origin feature/새기능`)
5. Pull Request를 만드세요

---

## 라이센스

이 프로젝트는 MIT 라이센스 하에 배포됩니다.

## 팀원 협업 안내

- **GitHub**에서 브랜치 전략을 지키고, 커밋 메시지는 명확하게 작성하세요.
- **Cursor**를 적극 활용해 코드 리뷰, 문서화, 버그 수정, 질문 등을 빠르게 해결하세요.
- 궁금한 점은 README에 추가하거나, Cursor에게 바로 물어보세요!
