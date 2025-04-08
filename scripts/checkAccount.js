const { ethers } = require("hardhat");
const { formatEther } = require("ethers");

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("✅ 연결된 계정 주소:", signer.address);

  const balance = await ethers.provider.getBalance(signer.address);
  console.log("💰 Sepolia 잔고:", formatEther(balance), "ETH");
}

main().catch((error) => {
  console.error("❌ 오류 발생:", error);
  process.exitCode = 1;
});
