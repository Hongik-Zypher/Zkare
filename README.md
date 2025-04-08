다음 내용을 그대로 README.md에 복사해서 올리면 돼👇

⸻

# 🩺 Zkare (Demo Branch)

Zkare는 ZK 기반 진료정보 증명 dApp입니다.  
이 `Demo` 브랜치는 간략화된 데모를 위한 스마트 컨트랙트와 UI를 포함합니다.

---

## 📁 프로젝트 구조

Zkare/
├── zkare-contract/ # 스마트 컨트랙트 (Hardhat)
├── zkare-ui/ # 프론트엔드 (React + Vite + TypeScript)

---

## 🧩 설치 및 실행 방법

### 1. 레포 클론 및 이동

```bash
git clone -b Demo https://github.com/Hongik-Zypher/Zkare.git
cd Zkare



⸻

2. 컨트랙트 설치 및 배포

cd zkare-contract
npm install

.env 파일 생성:

SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_project_id
PRIVATE_KEY=0xyour_private_key

npx hardhat test
npx hardhat run scripts/deploy.js --network sepolia



⸻

3. 프론트 실행

cd ../zkare-ui
npm install
npm run dev

	브라우저에서 http://localhost:5173 접속

⸻

🔗 배포된 컨트랙트 주소

Contract	Address
Storage	0x26F7bE5cad3c6CDd6C06270bd4Fb2AfBDe7Cfb7C
Viewer	0xeE721a9383Df1DBf85eCDF1F851F9691F3Baced0



⸻

🔌 지갑 연동
	•	MetaMask 설치 및 Sepolia 네트워크 설정
	•	받은 PRIVATE_KEY로 계정 import
	•	Sepolia Faucet에서 테스트 ETH 수령

⸻

📄 License

MIT

---
```
