const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  const signerAddress = signer.address;
  
  console.log("=== 계정 상태 확인 ===");
  console.log("현재 계정:", signerAddress);
  
  // 컨트랙트 주소 가져오기 (환경 변수 또는 하드코딩)
  const contractAddress = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  
  try {
    const MedicalRecord = await hre.ethers.getContractFactory("MedicalRecord");
    const medicalRecord = MedicalRecord.attach(contractAddress);
    
    // Owner 확인
    const owner = await medicalRecord.owner();
    console.log("컨트랙트 Owner:", owner);
    console.log("현재 계정이 Owner인가?", signerAddress.toLowerCase() === owner.toLowerCase());
    
    // 의사 여부 확인
    const isDoctor = await medicalRecord.isDoctor(signerAddress);
    console.log("현재 계정이 의사인가?", isDoctor);
    
    // 해결방법 제시
    if (signerAddress.toLowerCase() === owner.toLowerCase() && !isDoctor) {
      console.log("\n=== 해결방법 ===");
      console.log("Owner이지만 의사로 등록되지 않았습니다.");
      console.log("다음 명령어로 자신을 의사로 등록하세요:");
      console.log(`npx hardhat run scripts/addDoctor.js --network localhost`);
    } else if (!isDoctor) {
      console.log("\n=== 해결방법 ===");
      console.log("의사가 아닙니다. Owner에게 의사 등록을 요청하세요.");
      console.log("Owner 주소:", owner);
    } else {
      console.log("\n✅ 모든 권한이 정상입니다!");
    }
    
  } catch (error) {
    console.error("오류 발생:", error.message);
    console.log("\n컨트랙트 주소가 올바른지 확인하세요:");
    console.log("현재 사용 중인 주소:", contractAddress);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
