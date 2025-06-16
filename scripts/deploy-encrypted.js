const { ethers } = require("hardhat");

async function main() {
  console.log("🔐 암호화된 의료기록 시스템 배포 시작...");

  // 배포자 계정 정보
  const [deployer] = await ethers.getSigners();
  console.log("배포자 계정:", deployer.address);
  console.log("계정 잔액:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)));

  // 1. KeyRegistry 컨트랙트 배포
  console.log("\n1️⃣ KeyRegistry 컨트랙트 배포 중...");
  const KeyRegistry = await ethers.getContractFactory("KeyRegistry");
  const keyRegistry = await KeyRegistry.deploy();
  await keyRegistry.waitForDeployment();
  const keyRegistryAddress = await keyRegistry.getAddress();
  console.log("✅ KeyRegistry 배포 완료:", keyRegistryAddress);

  // 2. EncryptedMedicalRecord 컨트랙트 배포
  console.log("\n2️⃣ EncryptedMedicalRecord 컨트랙트 배포 중...");
  const EncryptedMedicalRecord = await ethers.getContractFactory("EncryptedMedicalRecord");
  const encryptedMedicalRecord = await EncryptedMedicalRecord.deploy(keyRegistryAddress);
  await encryptedMedicalRecord.waitForDeployment();
  const encryptedMedicalRecordAddress = await encryptedMedicalRecord.getAddress();
  console.log("✅ EncryptedMedicalRecord 배포 완료:", encryptedMedicalRecordAddress);

  // 3. 배포 결과 요약
  console.log("\n🎉 배포 완료!");
  console.log("=====================================");
  console.log("KeyRegistry 주소:", keyRegistryAddress);
  console.log("EncryptedMedicalRecord 주소:", encryptedMedicalRecordAddress);
  console.log("=====================================");

  // 4. 환경 변수 파일 생성을 위한 정보 출력
  console.log("\n📝 .env 파일에 추가할 내용:");
  console.log(`REACT_APP_KEY_REGISTRY_ADDRESS=${keyRegistryAddress}`);
  console.log(`REACT_APP_ENCRYPTED_MEDICAL_RECORD_ADDRESS=${encryptedMedicalRecordAddress}`);

  // 5. 컨트랙트 검증 (optional - 실제 네트워크에서 사용)
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\n🔍 컨트랙트 검증 중...");
    try {
      await hre.run("verify:verify", {
        address: keyRegistryAddress,
        constructorArguments: [],
      });
      console.log("✅ KeyRegistry 검증 완료");
    } catch (error) {
      console.log("❌ KeyRegistry 검증 실패:", error.message);
    }

    try {
      await hre.run("verify:verify", {
        address: encryptedMedicalRecordAddress,
        constructorArguments: [keyRegistryAddress],
      });
      console.log("✅ EncryptedMedicalRecord 검증 완료");
    } catch (error) {
      console.log("❌ EncryptedMedicalRecord 검증 실패:", error.message);
    }
  }

  // 6. 기본 설정
  console.log("\n⚙️ 기본 설정 중...");
  
  // 배포자를 첫 번째 의사로 인증 (테스트용)
  console.log("배포자를 의사로 인증 중...");
  try {
    // 배포자가 의사 공개키를 등록할 수 있도록 기본 설정
    console.log("배포자는 직접 공개키를 등록하고 의사 인증을 받아야 합니다.");
  } catch (error) {
    console.log("기본 설정 중 오류:", error.message);
  }

  console.log("\n🚀 시스템이 성공적으로 배포되었습니다!");
  console.log("이제 프론트엔드에서 다음 URL로 접속하세요: /encrypted");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("배포 중 오류 발생:", error);
    process.exit(1);
  }); 