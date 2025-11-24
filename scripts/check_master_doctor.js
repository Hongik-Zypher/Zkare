const { ethers } = require("hardhat");

async function main() {
  const keyRegistryAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const masterAddress = "0xbcd4042de499d14e55001ccbb24a551f3b954096";
  
  console.log("🔍 마스터 계정 의사 인식 확인 중...");
  console.log("KeyRegistry 주소:", keyRegistryAddress);
  console.log("마스터 계정 주소:", masterAddress);
  
  const KeyRegistry = await ethers.getContractAt("KeyRegistry", keyRegistryAddress);
  
  // MASTER_AUTHORITY_ADDRESS는 public constant이므로 직접 읽을 수 있음
  try {
    const MASTER_AUTHORITY = await KeyRegistry.MASTER_AUTHORITY_ADDRESS();
    console.log("\n📋 컨트랙트의 MASTER_AUTHORITY_ADDRESS:", MASTER_AUTHORITY);
    console.log("마스터 계정 주소와 일치하는가?", MASTER_AUTHORITY.toLowerCase() === masterAddress.toLowerCase());
  } catch (e) {
    console.log("\n⚠️ MASTER_AUTHORITY_ADDRESS를 읽을 수 없습니다. (컨트랙트가 재배포되지 않았을 수 있음)");
  }
  
  // isDoctor 확인
  const isDoctor = await KeyRegistry.isDoctor(masterAddress);
  console.log("\n👨‍⚕️ 마스터 계정이 의사로 인식되는가?", isDoctor);
  
  if (!isDoctor) {
    console.log("❌ 문제: 마스터 계정이 의사로 인식되지 않습니다!");
    console.log("💡 해결: 컨트랙트를 재배포하거나 Hardhat 노드를 재시작해야 합니다.");
  } else {
    console.log("✅ 마스터 계정이 의사로 올바르게 인식됩니다!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

