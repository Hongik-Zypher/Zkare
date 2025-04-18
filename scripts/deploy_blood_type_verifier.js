const hre = require("hardhat");

async function main() {
  // 1. Zkare 컨트랙트 배포
  const Zkare = await hre.ethers.getContractFactory("Zkare");
  const zkare = await Zkare.deploy();
  await zkare.deployed();
  console.log("Zkare 컨트랙트 배포됨:", zkare.address);

  // 2. Groth16Verifier 컨트랙트 배포 (blood_type_proof 서킷용)
  const Groth16Verifier = await hre.ethers.getContractFactory("Groth16Verifier");
  const verifier = await Groth16Verifier.deploy();
  await verifier.deployed();
  console.log("Groth16Verifier 컨트랙트 배포됨:", verifier.address);

  // 3. BloodTypeVerifier 컨트랙트 배포
  const BloodTypeVerifier = await hre.ethers.getContractFactory("BloodTypeVerifier");
  const bloodTypeVerifier = await BloodTypeVerifier.deploy(zkare.address, verifier.address);
  await bloodTypeVerifier.deployed();
  console.log("BloodTypeVerifier 컨트랙트 배포됨:", bloodTypeVerifier.address);

  // 4. 배포자를 의사로 등록
  const [deployer] = await hre.ethers.getSigners();
  await zkare.addDoctor(deployer.address);
  console.log("배포자가 의사로 등록됨:", deployer.address);

  console.log("배포 완료!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 