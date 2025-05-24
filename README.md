# Zkare - 블록체인 기반 의료 기록 관리 시스템

Zkare는 블록체인과 IPFS를 활용한 안전하고 투명한 의료 기록 관리 시스템입니다.

## 주요 기능

- 의료 기록의 안전한 저장 및 관리
- IPFS를 통한 의료 데이터 분산 저장
- 스마트 컨트랙트를 통한 접근 제어
- 의사 인증 및 권한 관리
- 환자 중심의 데이터 접근 제어

## 기술 스택

### 프론트엔드

- React
- ethers.js
- Web3.js

### 백엔드

- Node.js
- Express
- IPFS
- Hardhat

### 스마트 컨트랙트

- Solidity
- OpenZeppelin

## 시작하기

### 필수 조건

- Node.js (v14 이상)
- MetaMask
- Hardhat
- IPFS

### 설치

1. 저장소 클론

```bash
git clone https://github.com/your-username/Zkare.git
cd Zkare
```

2. 의존성 설치

```bash
# 루트 디렉토리
npm install

# 프론트엔드
cd frontend
npm install

# 백엔드
cd ../backend
npm install
```

3. 환경 변수 설정

```bash
# .env.example을 .env로 복사
cp .env.example .env
```

4. 스마트 컨트랙트 배포

```bash
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost
```

5. 서버 실행

```bash
# 백엔드
cd backend
npm start

# 프론트엔드
cd frontend
npm start
```

## 사용 방법

1. MetaMask 지갑 연결
2. 의사 계정 등록 (관리자만 가능)
3. 의료 기록 추가
4. 의료 기록 조회 및 관리

## 라이선스

MIT License

## 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
