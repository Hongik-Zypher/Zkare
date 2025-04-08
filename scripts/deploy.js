const { ethers } = require("hardhat");

async function main() {
  const Storage = await ethers.getContractFactory("MedicalRecordStorage");
  const storage = await Storage.deploy();
  await storage.waitForDeployment(); // ✅ v6 표준
  console.log(`✅ MedicalRecordStorage deployed to: ${storage.target}`);

  const Viewer = await ethers.getContractFactory("MedicalRecordViewer");
  const viewer = await Viewer.deploy(storage.target);
  await viewer.waitForDeployment();
  console.log(`✅ MedicalRecordViewer deployed to: ${viewer.target}`);
}

main().catch((error) => {
  console.error("❌ Error deploying contracts:", error);
  process.exitCode = 1;
});
