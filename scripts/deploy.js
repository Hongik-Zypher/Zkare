const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// 명령줄 인자 파싱
const args = process.argv.slice(2);
const deployOnlyVerifier = args.includes("--only-verifier");

async function main() {
  let zkare, groth16Verifier, verifier;
  let zkareAddress;

  if (deployOnlyVerifier) {
    // 기존 배포된 컨트랙트 주소 가져오기
    zkareAddress = process.env.ZKARE_CONTRACT_ADDRESS;
    
    if (!zkareAddress) {
      console.error("❌ ZKARE_CONTRACT_ADDRESS가 .env 파일에 설정되어 있지 않습니다.");
      process.exit(1);
    }
    
    console.log(`✅ 기존 Zkare 컨트랙트 주소 사용: ${zkareAddress}`);
  } else {
    // 모든 컨트랙트 배포
    console.log("🚀 Zkare 컨트랙트 배포 시작...");
    
    // Zkare 컨트랙트 배포
    const Zkare = await ethers.getContractFactory("Zkare");
    zkare = await Zkare.deploy();
    await zkare.waitForDeployment();
    zkareAddress = zkare.target;
    console.log(`✅ Zkare deployed to: ${zkareAddress}`);
  }

  // Groth16Verifier 컨트랙트 배포 (항상 실행)
  const Groth16Verifier = await ethers.getContractFactory("Groth16Verifier");
  groth16Verifier = await Groth16Verifier.deploy();
  await groth16Verifier.waitForDeployment();
  const groth16VerifierAddress = groth16Verifier.target;
  console.log(`✅ Groth16Verifier deployed to: ${groth16VerifierAddress}`);

  // MedicalDataVerifier 컨트랙트 배포 (항상 실행)
  const Verifier = await ethers.getContractFactory("MedicalDataVerifier");
  verifier = await Verifier.deploy(zkareAddress, groth16VerifierAddress);
  await verifier.waitForDeployment();
  const verifierAddress = verifier.target;
  console.log(`✅ MedicalDataVerifier deployed to: ${verifierAddress}`);

  // .env 파일 업데이트
  const envUpdates = {
    GROTH16_VERIFIER_ADDRESS: groth16VerifierAddress,
    CONTRACT_ADDRESS: verifierAddress
  };
  
  // 전체 배포시 모든 주소 업데이트
  if (!deployOnlyVerifier) {
    envUpdates.ZKARE_CONTRACT_ADDRESS = zkareAddress;
  }
  
  updateEnv(envUpdates);
  
  // 프론트엔드를 위한 배포 정보 저장
  saveDeploymentInfo({
    zkare: zkareAddress,
    groth16Verifier: groth16VerifierAddress,
    medicalDataVerifier: verifierAddress
  });
  
  // ABI 파일 프론트엔드 디렉토리로 복사
  console.log("\n📄 ABI 파일 복사 시작...");
  
  // 항상 복사할 컨트랙트들
  const contractsToCopy = [
    { name: "MedicalDataVerifier", source: verifier },
    { name: "Groth16Verifier", source: groth16Verifier }
  ];
  
  // 전체 배포시에만 Zkare 컨트랙트도 복사
  if (!deployOnlyVerifier) {
    contractsToCopy.push({ name: "Zkare", source: zkare });
  }
  
  // 각 컨트랙트의 ABI 파일 복사
  for (const contract of contractsToCopy) {
    try {
      await copyAbiToFrontend(contract.name, contract.source);
    } catch (error) {
      console.error(`❌ ${contract.name} ABI 복사 실패:`, error.message);
    }
  }
  
  console.log("\n✅ 배포 완료!");
  console.log("📝 배포 결과:");
  if (!deployOnlyVerifier) {
    console.log(`- Zkare: ${zkareAddress}`);
  }
  console.log(`- Groth16Verifier: ${groth16VerifierAddress}`);
  console.log(`- MedicalDataVerifier: ${verifierAddress}`);
}

function updateEnv(newEnv) {
  const envPath = path.resolve(__dirname, '../.env');
  let envContent = '';
  
  try {
    envContent = fs.readFileSync(envPath, 'utf8');
  } catch (err) {
    console.log('❌ .env 파일이 없습니다. 새로 생성합니다.');
  }

  Object.entries(newEnv).forEach(([key, value]) => {
    if (envContent.includes(`${key}=`)) {
      envContent = envContent.replace(
        new RegExp(`${key}=.*`), 
        `${key}=${value}`
      );
    } else {
      envContent += `\n${key}=${value}`;
    }
  });

  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env 파일이 업데이트되었습니다.');
}

function saveDeploymentInfo(contracts) {
  const deploymentsDir = path.resolve(__dirname, '../frontend/src/deployments');
  
  // 디렉토리가 없으면 생성
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deploymentPath = path.join(deploymentsDir, 'latest.json');
  const deployment = {
    timestamp: new Date().toISOString(),
    network: process.env.HARDHAT_NETWORK || 'localhost',
    contracts: {
      zkare: { address: contracts.zkare },
      groth16Verifier: { address: contracts.groth16Verifier },
      medicalDataVerifier: { address: contracts.medicalDataVerifier }
    }
  };
  
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log('✅ 배포 정보가 frontend/src/deployments/latest.json에 저장되었습니다.');
}

/**
 * 컨트랙트 ABI 파일을 프론트엔드 디렉토리로 복사
 * @param {string} contractName 컨트랙트 이름
 * @param {Object} contractInstance 배포된 컨트랙트 인스턴스
 */
async function copyAbiToFrontend(contractName, contractInstance) {
  // ABI 파일 경로
  const artifactsDir = path.resolve(__dirname, '../artifacts/contracts');
  const frontendAbisDir = path.resolve(__dirname, '../frontend/src/abis');
  
  // 프론트엔드 ABI 디렉토리가 없으면 생성
  if (!fs.existsSync(frontendAbisDir)) {
    fs.mkdirSync(frontendAbisDir, { recursive: true });
  }
  
  // 원본 ABI 파일 경로
  const contractDir = path.join(artifactsDir, `${contractName}.sol`);
  const abiSourcePath = path.join(contractDir, `${contractName}.json`);
  
  if (!fs.existsSync(abiSourcePath)) {
    throw new Error(`ABI 파일을 찾을 수 없습니다: ${abiSourcePath}`);
  }
  
  // 대상 디렉토리 생성
  const targetDir = path.join(frontendAbisDir, `${contractName}.sol`);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  
  // ABI 파일 복사
  const targetPath = path.join(targetDir, `${contractName}.json`);
  fs.copyFileSync(abiSourcePath, targetPath);
  
  console.log(`✅ ${contractName} ABI 파일이 프론트엔드 디렉토리로 복사되었습니다.`);
}

main().catch((error) => {
  console.error("❌ Error deploying contracts:", error);
  process.exitCode = 1;
});
