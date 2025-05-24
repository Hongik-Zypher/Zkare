const fs = require("fs");
const path = require("path");

const envContent = `# Smart Contract Addresses
MEDICAL_RECORD_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
ACCESS_CONTROL_CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

# Frontend Environment Variables
REACT_APP_MEDICAL_RECORD_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
REACT_APP_ACCESS_CONTROL_CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

# Backend Environment Variables
RPC_URL=http://localhost:8545
HOSPITAL_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
IPFS_API_URL=http://localhost:5001
`;

const envPath = path.join(__dirname, "..", ".env");

try {
  fs.writeFileSync(envPath, envContent);
  console.log("✅ .env 파일이 성공적으로 생성되었습니다.");
} catch (error) {
  console.error("❌ .env 파일 생성 중 오류가 발생했습니다:", error);
}
