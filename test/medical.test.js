const hre = require("hardhat");

async function main() {
  const MedicalRecord = await hre.ethers.getContractFactory("MedicalRecord");
  const contract = await MedicalRecord.deploy();
  await contract.waitForDeployment();
  console.log("✅ MedicalRecord deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
