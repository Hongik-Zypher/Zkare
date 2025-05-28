const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const MedicalRecord = await hre.ethers.getContractFactory("MedicalRecord");
  const medicalRecord = await MedicalRecord.deploy();
  await medicalRecord.waitForDeployment();

  const contractAddress = await medicalRecord.getAddress();
  console.log("MedicalRecord deployed to:", contractAddress);

  // 오너 계정을 의사로 자동 등록
  const tx = await medicalRecord.addDoctor(deployer.address);
  await tx.wait();
  console.log("Owner registered as doctor:", deployer.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
