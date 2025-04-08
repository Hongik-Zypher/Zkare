const hre = require("hardhat");

async function main() {
  const MedicalRecordStorage = await hre.ethers.getContractFactory(
    "MedicalRecordStorage"
  );
  const storage = await MedicalRecordStorage.deploy();
  await storage.waitForDeployment();
  console.log(
    "✅ MedicalRecordStorage deployed to:",
    await storage.getAddress()
  );

  const MedicalRecordViewer = await hre.ethers.getContractFactory(
    "MedicalRecordViewer"
  );
  const viewer = await MedicalRecordViewer.deploy(await storage.getAddress());
  await viewer.waitForDeployment();
  console.log("✅ MedicalRecordViewer deployed to:", await viewer.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
