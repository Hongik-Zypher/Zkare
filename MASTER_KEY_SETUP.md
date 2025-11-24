# 행안부 장관 마스터키 설정 가이드

## 📋 개요

행안부 장관의 마스터키는 **frontend/.env 파일**에서 설정합니다.
배포 시 이 값을 읽어서 컨트랙트에 하드코딩됩니다.

## 🔐 하드코딩된 정보

### 행안부 장관 주소
```
0xbcd4042de499d14e55001ccbb24a551f3b954096
```
- **위치**: `contracts/KeyRegistry.sol`의 `MASTER_AUTHORITY_ADDRESS` 상수
- **변경 불가**: `constant`로 선언되어 컴파일 시 고정됨

## 🚀 설정 방법

### 1. 행안부 장관 공개키 생성

프론트엔드에서 키 생성 페이지에 접속하여 키를 생성하거나, 브라우저 콘솔에서:

```javascript
// 프론트엔드 브라우저 콘솔에서 실행
import { generateKeyPair } from './utils/encryption';
const { publicKey } = await generateKeyPair();
console.log(publicKey);
```

### 2. frontend/.env 파일에 추가

`frontend/.env` 파일에 다음을 추가하세요:

```bash
# 행안부 장관 마스터키 (배포 시 사용)
REACT_APP_MASTER_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
[실제 공개키 내용]
...
-----END PUBLIC KEY-----"
```

**중요**: 
- 여러 줄로 작성 가능합니다
- 따옴표로 감싸거나 감싸지 않아도 됩니다
- `\n`을 사용하여 줄바꿈을 표현할 수도 있습니다

### 3. 컨트랙트 배포

```bash
npx hardhat run scripts/deploy_encrypted_contracts.js --network localhost
```

배포 스크립트가 자동으로 `frontend/.env`에서 `REACT_APP_MASTER_PUBLIC_KEY`를 읽어서 컨트랙트에 전달합니다.

## ✅ 배포 확인

배포 후 다음을 확인하세요:

```bash
npx hardhat console --network localhost
```

```javascript
const KeyRegistry = await ethers.getContractFactory("KeyRegistry");
const keyRegistry = await KeyRegistry.attach("0x..."); // 배포된 주소
const masterKey = await keyRegistry.getMasterKey();
console.log("마스터키 등록 여부:", masterKey.isRegistered); // true
console.log("등록 시간:", new Date(masterKey.timestamp * 1000));
```

## 🔒 보안 특징

1. **변경 불가능**
   - 마스터키는 constructor에서만 설정 가능
   - 배포 후 변경 불가
   - 행안부 장관 주소는 `constant`로 고정

2. **투명성**
   - 모든 마스터키 사용은 이벤트로 로깅
   - 블록체인에서 감사 가능

3. **접근 제어**
   - 행안부 장관만 마스터키로 복호화 가능
   - 의사, 환자, 행안부 장관 3명만 접근 가능

## 📝 예시

### frontend/.env 파일 예시

```bash
# 기존 환경 변수들...
REACT_APP_KEY_REGISTRY_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
REACT_APP_ENCRYPTED_MEDICAL_RECORD_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
REACT_APP_KEY_RECOVERY_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0

# 행안부 장관 마스터키
REACT_APP_MASTER_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyK8vJ8vJ8vJ8vJ8vJ8vJ
8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ
8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ
8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ
8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ8vJ
QIDAQAB
-----END PUBLIC KEY-----"
```

## ⚠️ 주의사항

1. **개인키 보관**
   - 행안부 장관의 개인키는 절대 공유하지 마세요
   - 안전한 곳에 보관하세요

2. **배포 후 변경 불가**
   - 한 번 배포하면 마스터키 변경 불가
   - 변경하려면 컨트랙트 재배포 필요

3. **frontend/.env 파일**
   - 이 파일은 Git에 커밋하지 마세요 (보안)
   - `.gitignore`에 포함되어 있는지 확인하세요

## 🎯 사용 시나리오

1. **정상 상황**: 의사와 환자가 각자의 개인키로 복호화
2. **긴급 상황**: 환자와 보호자 모두 의식불명
   - 행안부 장관이 마스터키로 복호화
   - 의료 기록 조회 가능

## 📞 문제 해결

### 마스터키를 찾을 수 없다는 에러가 나는 경우

1. `frontend/.env` 파일이 존재하는지 확인
2. `REACT_APP_MASTER_PUBLIC_KEY` 변수가 올바르게 설정되었는지 확인
3. 공개키 형식이 올바른지 확인 (PEM 형식)
