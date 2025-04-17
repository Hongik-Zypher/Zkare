const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// 명령줄 인자 파싱
const args = process.argv.slice(2);
const deployOnlyVerifier = args.includes("--only-verifier");

async function main() {
  let zkare, groth16Verifier;
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

  // Zkare에 Groth16Verifier 설정
  if (!deployOnlyVerifier) {
    const setVerifierTx = await zkare.setVerifierContract(groth16VerifierAddress);
    await setVerifierTx.wait();
    console.log(`✅ Groth16Verifier가 Zkare 컨트랙트에 설정되었습니다.`);
  }

  // .env 파일 업데이트
  const envUpdates = {
    GROTH16_VERIFIER_ADDRESS: groth16VerifierAddress
  };
  
  // 전체 배포시 모든 주소 업데이트
  if (!deployOnlyVerifier) {
    envUpdates.ZKARE_CONTRACT_ADDRESS = zkareAddress;
  }
  
  updateEnv(envUpdates);
  
  // 프론트엔드를 위한 배포 정보 저장
  saveDeploymentInfo({
    zkare: zkareAddress,
    groth16Verifier: groth16VerifierAddress
  });
  
  // ABI 파일을 프론트엔드 디렉토리에 복사
  await copyAbiToFrontend();
  
  console.log("\n✅ 배포 완료!");
  console.log("📝 배포 결과:");
  if (!deployOnlyVerifier) {
    console.log(`- Zkare: ${zkareAddress}`);
  }
  console.log(`- Groth16Verifier: ${groth16VerifierAddress}`);
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
      groth16Verifier: { address: contracts.groth16Verifier }
    }
  };
  
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log('✅ 배포 정보가 frontend/src/deployments/latest.json에 저장되었습니다.');
}

/**
 * 컴파일된 ABI 파일을 프론트엔드 디렉토리로 복사
 */
async function copyAbiToFrontend() {
  console.log("📂 ABI 파일을 프론트엔드로 복사 중...");
  
  const artifactsDir = path.resolve(__dirname, '../artifacts/contracts');
  const frontendAbiDir = path.resolve(__dirname, '../frontend/src/abis');
  
  // 프론트엔드 ABI 디렉토리가 없으면 생성
  if (!fs.existsSync(frontendAbiDir)) {
    fs.mkdirSync(frontendAbiDir, { recursive: true });
  }
  
  // 복사할 컨트랙트 리스트
  const contractsToCopy = [
    { name: 'Zkare.sol/Zkare.json', destDir: 'Zkare.sol' },
    { name: 'Groth16Verifier.sol/Groth16Verifier.json', destDir: 'Groth16Verifier.sol' }
  ];
  
  for (const contract of contractsToCopy) {
    const srcPath = path.join(artifactsDir, contract.name);
    const destDir = path.join(frontendAbiDir, contract.destDir);
    const destFileName = path.basename(contract.name);
    
    // 대상 디렉토리가 없으면 생성
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    try {
      // 파일이 존재하는지 확인
      if (fs.existsSync(srcPath)) {
        const artifactContents = fs.readFileSync(srcPath, 'utf8');
        fs.writeFileSync(path.join(destDir, destFileName), artifactContents);
        console.log(`✅ ${contract.name} ABI 파일이 복사되었습니다.`);
      } else {
        console.warn(`⚠️ ${srcPath} 파일이 존재하지 않습니다.`);
      }
    } catch (error) {
      console.error(`❌ ${contract.name} 복사 중 오류 발생:`, error);
    }
  }
  
  console.log("✅ 모든 ABI 파일이 프론트엔드 디렉토리에 복사되었습니다.");
}

main().catch((error) => {
  console.error("❌ Error deploying contracts:", error);
  process.exitCode = 1;
});
