const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  const [deployer, account1] = await hre.ethers.getSigners();
  
  console.log("=== KeyRegistry 의사 등록 ===");
  console.log("실행 계정 (Owner):", deployer.address);
  
  // Account #1을 의사로 등록
  const doctorAddress = account1.address;
  console.log("등록할 의사:", doctorAddress);
  
  // .env에서 KeyRegistry 주소 읽기
  const envPath = path.join(__dirname, '..', '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const keyRegistryMatch = envContent.match(/KEY_REGISTRY_ADDRESS=(.+)/);
  const keyRegistryAddress = keyRegistryMatch ? keyRegistryMatch[1].trim() : null;
  
  if (!keyRegistryAddress) {
    console.error("❌ KEY_REGISTRY_ADDRESS를 찾을 수 없습니다!");
    return;
  }
  
  console.log("KeyRegistry 주소:", keyRegistryAddress);
  
  try {
    const KeyRegistry = await hre.ethers.getContractFactory("KeyRegistry");
    const keyRegistry = KeyRegistry.attach(keyRegistryAddress);
    
    // Owner 확인
    const owner = await keyRegistry.owner();
    console.log("컨트랙트 Owner:", owner);
    
    if (deployer.address.toLowerCase() !== owner.toLowerCase()) {
      console.error("❌ 오류: Owner 계정이 아닙니다!");
      return;
    }
    
    // 이미 의사인지 확인
    const isAlreadyDoctor = await keyRegistry.isDoctor(doctorAddress);
    if (isAlreadyDoctor) {
      console.log("✅ 이미 의사로 등록되어 있습니다!");
      return;
    }
    
    // 의사 등록 실행
    console.log("의사 등록 중...");
    const tx = await keyRegistry.addDoctor(doctorAddress);
    await tx.wait();
    
    console.log("✅ 의사 등록 완료!");
    console.log("트랜잭션 해시:", tx.hash);
    
    // 등록 확인
    const isNowDoctor = await keyRegistry.isDoctor(doctorAddress);
    console.log("등록 확인:", isNowDoctor ? "✅ 성공" : "❌ 실패");
    
  } catch (error) {
    console.error("❌ 오류 발생:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
