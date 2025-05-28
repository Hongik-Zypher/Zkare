# Zkare 의료 기록 관리 시스템

## 프로젝트 소개

Zkare는 이더리움 스마트 컨트랙트와 영지식증명 기반의 의료 기록 관리 시스템입니다.

- **스마트컨트랙트**: 환자 의료 기록의 안전한 저장/조회/검증
- **프론트엔드**: React 기반 UI, MetaMask 연동
- **백엔드**: Node.js/Express, (IPFS 연동은 선택)
- **개발환경**: Hardhat(로컬 이더리움), Cursor(코드 AI), GitHub 협업

---

## 개발 환경 세팅 (팀원용)

### 1. 의존성 설치

```bash
npm install
cd frontend && npm install
cd ../backend && npm install
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

### 6. 백엔드 실행 (필요시)

```bash
cd backend
npm start
```

---

## Cursor 사용법 (팀원 필독)

- **Cursor**는 AI 코드 어시스턴트입니다. 코드 수정, 디버깅, 문서화, 질문 등 모두 가능합니다.
- 코드 에디터에서 `/`를 누르거나, README/코드 파일에서 바로 "Cursor에게 물어보기"를 클릭하세요.
- 예시 질문:
  - "이 함수가 무슨 역할인지 설명해줘"
  - "이 부분 버그 고쳐줘"
  - "이더리움 컨트랙트 배포 자동화 스크립트 만들어줘"
  - "환경변수 예시 추가해줘"
- **문제 발생 시**: 에러 메시지, 실행 로그, 코드 일부를 복사해서 Cursor에게 붙여넣고 질문하면 빠르게 해결할 수 있습니다.

---

## 트러블슈팅 & 자주 묻는 질문

- **컨트랙트 배포 후 오너 계정이 의사로 자동 등록됩니다.**
- 컨트랙트 주소가 바뀌면 `.env`와 프론트엔드 주소도 꼭 바꿔주세요.
- MetaMask 계정이 의사로 인식되지 않으면, 오너 계정으로 로그인했는지 확인하세요.
- "cannot estimate gas" 등 오류 발생 시, 환경변수/컨트랙트 주소/네트워크 상태를 점검하세요.
- IPFS 연동은 이번 학기에는 사용하지 않습니다.

---

## 주요 폴더 구조

```
Zkare/
├── contracts/           # 스마트컨트랙트 (Solidity)
├── scripts/             # 배포/자동화 스크립트
├── frontend/            # React 프론트엔드
├── backend/             # Node.js/Express 백엔드
├── artifacts/           # 하드햇 컴파일 결과(자동생성)
├── .env                 # 환경변수 파일 (직접 생성)
└── README.md            # 이 문서
```

---

## 팀원 협업 안내

- **GitHub**에서 브랜치 전략을 지키고, 커밋 메시지는 명확하게 작성하세요.
- **Cursor**를 적극 활용해 코드 리뷰, 문서화, 버그 수정, 질문 등을 빠르게 해결하세요.
- 궁금한 점은 README에 추가하거나, Cursor에게 바로 물어보세요!
