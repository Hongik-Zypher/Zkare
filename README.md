# Zkare - 영지식증명 기반 의료기록 시스템

환자의 프라이버시를 보호하면서 의료 정보 검증이 가능한 분산형 애플리케이션입니다.

## 주요 기능

- 🔐 **영지식증명(ZK)** 기반 의료 데이터 검증
- 🩸 **혈액형 검증** - 실제 혈액형 노출 없이 일치 여부만 확인
- 🔄 **접근 제어** - 환자 승인 기반 의료기록 접근 관리
- 📱 **대시보드** - 환자 및 요청자를 위한 직관적 인터페이스

## 기술 스택

- **블록체인**: Ethereum, Hardhat
- **스마트 컨트랙트**: Solidity
- **영지식증명**: Circom, SnarkJS
- **프론트엔드**: React, Material-UI
- **백엔드**: Node.js, Express

## 시작하기

### 필수 조건
- Node.js v16 이상
- npm v7 이상
- MetaMask 지갑

### 설치

```bash
# 저장소 복제
git clone https://github.com/your-username/zkare.git
cd zkare

# 의존성 설치
npm run install:all

# ZK 증명 서킷 컴파일 (필요시)
npm run compile:circuits
```

### 실행

간단한 명령어 하나로 전체 시스템을 실행할 수 있습니다:

```bash
npm run start:all
```

이 명령어는 다음을 자동으로 수행합니다:
1. 로컬 이더리움 네트워크 시작
2. 스마트 컨트랙트 배포
3. 백엔드 및 프론트엔드 서버 실행

상세 로그를 보려면:
```bash
npm run start:all:verbose
```

### 접속 정보
- 프론트엔드: http://localhost:3000
- 백엔드 API: http://localhost:5001
- 이더리움 노드: http://localhost:8545

## 라이센스

MIT 라이센스로 배포됩니다.
```
