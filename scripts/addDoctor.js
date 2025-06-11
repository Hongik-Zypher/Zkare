const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  // 등록할 의사 주소 (기본값: deployer 자신)
  const doctorAddress = process.argv[2] || deployer.address;
  
  console.log("=== 의사 등록 ===");
  console.log("실행 계정:", deployer.address);
  console.log("등록할 의사:", doctorAddress);
  
  // 컨트랙트 주소
  const contractAddress = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  
  try {
    const MedicalRecord = await hre.ethers.getContractFactory("MedicalRecord");
    const medicalRecord = MedicalRecord.attach(contractAddress);
    
    // Owner 확인
    const owner = await medicalRecord.owner();
    console.log("컨트랙트 Owner:", owner);
    
    if (deployer.address.toLowerCase() !== owner.toLowerCase()) {
      console.error("❌ 오류: Owner 계정이 아닙니다!");
      console.log("Owner 계정으로 실행해주세요.");
      return;
    }
    
    // 이미 의사인지 확인
    const isAlreadyDoctor = await medicalRecord.isDoctor(doctorAddress);
    if (isAlreadyDoctor) {
      console.log("✅ 이미 의사로 등록되어 있습니다!");
      return;
    }
    
    // 의사 등록 실행
    console.log("의사 등록 중...");
    const tx = await medicalRecord.addDoctor(doctorAddress);
    await tx.wait();
    
    console.log("✅ 의사 등록 완료!");
    console.log("트랜잭션 해시:", tx.hash);
    
    // 등록 확인
    const isNowDoctor = await medicalRecord.isDoctor(doctorAddress);
    console.log("등록 확인:", isNowDoctor ? "성공" : "실패");
    
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