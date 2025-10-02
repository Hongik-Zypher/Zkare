const { ethers } = require("hardhat");

async function main() {
  console.log("👨‍⚕️ 배포자를 의사로 인증하는 스크립트 시작...");

  // 배포자 계정 가져오기
  const [deployer] = await ethers.getSigners();
  console.log("배포자 계정:", deployer.address);

  // KeyRegistry 컨트랙트 주소 (새로 배포된 주소)
  const KEY_REGISTRY_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  // KeyRegistry 컨트랙트 인스턴스 생성
  const KeyRegistry = await ethers.getContractFactory("KeyRegistry");
  const keyRegistry = KeyRegistry.attach(KEY_REGISTRY_ADDRESS);

  try {
    // 배포자가 오너인지 확인
    const owner = await keyRegistry.owner();
    console.log("컨트랙트 오너:", owner);
    console.log("배포자 주소:", deployer.address);

    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
      console.error("❌ 배포자가 컨트랙트 오너가 아닙니다!");
      return;
    }

    // 배포자를 의사로 인증
    console.log("🔐 배포자를 의사로 인증 중...");
    const tx = await keyRegistry.certifyDoctor(deployer.address);
    await tx.wait();

    console.log("✅ 배포자가 성공적으로 의사로 인증되었습니다!");

    // 인증 확인
    const isDoctor = await keyRegistry.isDoctor(deployer.address);
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
