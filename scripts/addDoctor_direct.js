const hre = require("hardhat");

async function main() {
  const [deployer, account1] = await hre.ethers.getSigners();
  
  console.log("=== KeyRegistry 의사 등록 ===");
  console.log("실행 계정 (Owner):", deployer.address);
  
  // Account #1을 의사로 등록
  const doctorAddress = account1.address;
  console.log("등록할 의사:", doctorAddress);
  
  // 최신 배포 주소
  const keyRegistryAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  console.log("KeyRegistry 주소:", keyRegistryAddress);
  
  try {
    const KeyRegistry = await hre.ethers.getContractFactory("KeyRegistry");
    const keyRegistry = KeyRegistry.attach(keyRegistryAddress);
    
    // Owner 확인
    const owner = await keyRegistry.owner();
    console.log("컨트랙트 Owner:", owner);
    
    // 이미 의사인지 확인
    const isAlreadyDoctor = await keyRegistry.isDoctor(doctorAddress);
    console.log("현재 의사 상태:", isAlreadyDoctor);
    
    if (isAlreadyDoctor) {
      console.log("✅ 이미 의사로 등록되어 있습니다!");
      return;
    }
    
    // 의사 등록 실행
    console.log("의사 등록 중...");
    const tx = await keyRegistry.certifyDoctor(doctorAddress);
    await tx.wait();
    
    console.log("✅ 의사 등록 완료!");
    console.log("트랜잭션 해시:", tx.hash);
    
    // 등록 확인
    const isNowDoctor = await keyRegistry.isDoctor(doctorAddress);
    console.log("등록 확인:", isNowDoctor ? "✅ 성공" : "❌ 실패");
    
  } catch (error) {
    console.error("❌ 오류 발생:", error.message);
    console.error(error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
