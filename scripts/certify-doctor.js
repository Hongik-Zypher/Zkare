const { ethers } = require("hardhat");

async function main() {
  console.log("👨‍⚕️ 다른 계정을 의사로 인증하는 스크립트 시작...");

  // 배포자 계정 가져오기
  const [deployer] = await ethers.getSigners();
  console.log("배포자 계정:", deployer.address);

  // 의사로 인증할 계정 (Account #2)
  const doctorAddress = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
  console.log("의사로 인증할 계정:", doctorAddress);

  // KeyRegistry 컨트랙트 주소
  const KEY_REGISTRY_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  // KeyRegistry 컨트랙트 인스턴스 생성
  const KeyRegistry = await ethers.getContractFactory("KeyRegistry");
  const keyRegistry = KeyRegistry.attach(KEY_REGISTRY_ADDRESS);

  try {
    // 배포자가 오너인지 확인
    const owner = await keyRegistry.owner();
    console.log("컨트랙트 오너:", owner);

    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
      console.error("❌ 배포자가 컨트랙트 오너가 아닙니다!");
      return;
    }

    // 다른 계정을 의사로 인증
    console.log("🔐 계정을 의사로 인증 중...");
    const tx = await keyRegistry.certifyDoctor(doctorAddress);
    await tx.wait();

    console.log("✅ 계정이 성공적으로 의사로 인증되었습니다!");

    // 인증 확인
    const isDoctor = await keyRegistry.isDoctor(doctorAddress);
    console.log("의사 인증 확인:", isDoctor);
  } catch (error) {
    console.error("❌ 의사 인증 중 오류:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
