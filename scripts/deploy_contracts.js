const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// 명령줄 인자 파싱 - 특정 컨트랙트만 배포할 경우 사용
const args = process.argv.slice(2);
const contractsToDeploy = args.length > 0 ? args : ["all"];

async function main() {
  console.log("✨ Zkare 컨트랙트 배포 시작...");
  
  // 환경 변수와 배포 정보 저장할 객체
  const deploymentInfo = {
    network: hre.network.name,
    timestamp: new Date().toISOString(),
    contracts: {}
  };
  
  // Zkare 메인 컨트랙트 배포
  if (contractsToDeployIncludes(["all", "zkare"])) {
    const Zkare = await hre.ethers.getContractFactory("Zkare");
    const zkare = await Zkare.deploy();
    await zkare.waitForDeployment();
    const zkareAddress = await zkare.getAddress();
    console.log(`✅ Zkare 컨트랙트 배포됨: ${zkareAddress}`);
    
    // 배포 정보 저장
    deploymentInfo.contracts.zkare = {
      address: zkareAddress,
      name: "Zkare"
    };
  } else {
    // 기존 주소 사용
    const zkareAddress = process.env.ZKARE_CONTRACT_ADDRESS;
    if (!zkareAddress) {
      console.error("❌ ZKARE_CONTRACT_ADDRESS가 .env 파일에 없습니다. Zkare가 이미 배포되어 있어야 합니다.");
      process.exit(1);
    }
    console.log(`🔄 기존 Zkare 컨트랙트 주소 사용: ${zkareAddress}`);
    
    deploymentInfo.contracts.zkare = {
      address: zkareAddress,
      name: "Zkare",
      reused: true
    };
  }
  
  // Groth16Verifier 배포
  if (contractsToDeployIncludes(["all", "verifier", "groth16"])) {
    const Groth16Verifier = await hre.ethers.getContractFactory("Groth16Verifier");
    const groth16Verifier = await Groth16Verifier.deploy();
    await groth16Verifier.waitForDeployment();
    const groth16VerifierAddress = await groth16Verifier.getAddress();
    console.log(`✅ Groth16Verifier 컨트랙트 배포됨: ${groth16VerifierAddress}`);
    
    // 배포 정보 저장
    deploymentInfo.contracts.groth16Verifier = {
      address: groth16VerifierAddress,
      name: "Groth16Verifier"
    };
  } else if (process.env.GROTH16_VERIFIER_ADDRESS) {
    // 기존 주소 사용
    deploymentInfo.contracts.groth16Verifier = {
      address: process.env.GROTH16_VERIFIER_ADDRESS,
      name: "Groth16Verifier",
      reused: true
    };
    console.log(`🔄 기존 Groth16Verifier 컨트랙트 주소 사용: ${process.env.GROTH16_VERIFIER_ADDRESS}`);
  }
  
  // MedicalDataVerifier 배포
  if (contractsToDeployIncludes(["all", "medical", "dataverifier"])) {
    const zkareAddress = deploymentInfo.contracts.zkare.address;
    const groth16VerifierAddress = deploymentInfo.contracts.groth16Verifier.address;
    
    const MedicalDataVerifier = await hre.ethers.getContractFactory("MedicalDataVerifier");
    const medicalDataVerifier = await MedicalDataVerifier.deploy(zkareAddress, groth16VerifierAddress);
    await medicalDataVerifier.waitForDeployment();
    const medicalDataVerifierAddress = await medicalDataVerifier.getAddress();
    console.log(`✅ MedicalDataVerifier 컨트랙트 배포됨: ${medicalDataVerifierAddress}`);
    
    // 배포 정보 저장
    deploymentInfo.contracts.medicalDataVerifier = {
      address: medicalDataVerifierAddress,
      name: "MedicalDataVerifier"
    };
    
    // 검증기 등록 (만약 Groth16Verifier가 배포된 경우)
    if (deploymentInfo.contracts.groth16Verifier) {
      console.log("혈액형 검증기 등록 중...");
      await medicalDataVerifier.setVerifier("bloodType", deploymentInfo.contracts.groth16Verifier.address);
      console.log("✅ 혈액형 검증기 등록 완료");
    }
  } else if (process.env.MEDICAL_DATA_VERIFIER_ADDRESS) {
    // 기존 주소 사용
    deploymentInfo.contracts.medicalDataVerifier = {
      address: process.env.MEDICAL_DATA_VERIFIER_ADDRESS,
      name: "MedicalDataVerifier",
      reused: true
    };
    console.log(`🔄 기존 MedicalDataVerifier 컨트랙트 주소 사용: ${process.env.MEDICAL_DATA_VERIFIER_ADDRESS}`);
  }
  
  // MedicalRecordVerifier 배포
  if (contractsToDeployIncludes(["all", "medical", "recordverifier"])) {
    const zkareAddress = deploymentInfo.contracts.zkare.address;
    const groth16VerifierAddress = deploymentInfo.contracts.groth16Verifier.address;
    
    const MedicalRecordVerifier = await hre.ethers.getContractFactory("MedicalRecordVerifier");
    const medicalRecordVerifier = await MedicalRecordVerifier.deploy(zkareAddress, groth16VerifierAddress);
    await medicalRecordVerifier.waitForDeployment();
    const medicalRecordVerifierAddress = await medicalRecordVerifier.getAddress();
    console.log(`✅ MedicalRecordVerifier 컨트랙트 배포됨: ${medicalRecordVerifierAddress}`);
    
    // 배포 정보 저장
    deploymentInfo.contracts.medicalRecordVerifier = {
      address: medicalRecordVerifierAddress,
      name: "MedicalRecordVerifier"
    };
  } else if (process.env.MEDICAL_RECORD_VERIFIER_ADDRESS) {
    // 기존 주소 사용
    deploymentInfo.contracts.medicalRecordVerifier = {
      address: process.env.MEDICAL_RECORD_VERIFIER_ADDRESS,
      name: "MedicalRecordVerifier",
      reused: true
    };
    console.log(`🔄 기존 MedicalRecordVerifier 컨트랙트 주소 사용: ${process.env.MEDICAL_RECORD_VERIFIER_ADDRESS}`);
  }
  
  // MedicalRecordViewer 배포
  if (contractsToDeployIncludes(["all", "medical", "viewer", "recordviewer"])) {
    const zkareAddress = deploymentInfo.contracts.zkare.address;
    
    const MedicalRecordViewer = await hre.ethers.getContractFactory("MedicalRecordViewer");
    const medicalRecordViewer = await MedicalRecordViewer.deploy(zkareAddress);
    await medicalRecordViewer.waitForDeployment();
    const medicalRecordViewerAddress = await medicalRecordViewer.getAddress();
    console.log(`✅ MedicalRecordViewer 컨트랙트 배포됨: ${medicalRecordViewerAddress}`);
    
    // 배포 정보 저장
    deploymentInfo.contracts.medicalRecordViewer = {
      address: medicalRecordViewerAddress,
      name: "MedicalRecordViewer"
    };
  } else if (process.env.MEDICAL_RECORD_VIEWER_ADDRESS) {
    // 기존 주소 사용
    deploymentInfo.contracts.medicalRecordViewer = {
      address: process.env.MEDICAL_RECORD_VIEWER_ADDRESS,
      name: "MedicalRecordViewer",
      reused: true
    };
    console.log(`🔄 기존 MedicalRecordViewer 컨트랙트 주소 사용: ${process.env.MEDICAL_RECORD_VIEWER_ADDRESS}`);
  }
  
  // 환경 변수 업데이트
  updateEnvFile(deploymentInfo);
  
  // ABI 파일 프론트엔드 디렉토리로 복사
  console.log("\n📄 컨트랙트 ABI 파일 복사 시작...");
  
  // 배포된 컨트랙트 ABI 복사
  for (const contractKey in deploymentInfo.contracts) {
    const contract = deploymentInfo.contracts[contractKey];
    if (!contract.reused) {
      try {
        await copyAbiToFrontend(contract.name);
      } catch (error) {
        console.error(`❌ ${contract.name} ABI 복사 실패:`, error.message);
      }
    }
  }
  
  // 배포 정보 JSON 파일 저장
  saveDeploymentInfo(deploymentInfo);
  
  console.log("\n✅ 배포 프로세스 완료!");
  
  // 배포된 모든 컨트랙트 정보 표시
  console.log("\n📋 배포 정보 요약:");
  Object.values(deploymentInfo.contracts).forEach(contract => {
    const status = contract.reused ? "🔄 (재사용)" : "✅ (신규)";
    console.log(`- ${contract.name}: ${contract.address} ${status}`);
  });
}

// 주어진 컨트랙트가 배포 목록에 포함되어 있는지 확인
function contractsToDeployIncludes(keywords) {
  return keywords.some(keyword => contractsToDeploy.includes(keyword.toLowerCase()));
}

// 환경 변수 파일 업데이트
function updateEnvFile(deploymentInfo) {
  const envPath = path.resolve(__dirname, '../.env');
  let envContent = '';
  
  try {
    envContent = fs.readFileSync(envPath, 'utf8');
  } catch (err) {
    console.log('📝 .env 파일이 없습니다. 새로 생성합니다.');
  }

  // 환경 변수 파일에 추가할 변수 목록
  const envUpdates = {};
  
  // 계약 주소를 환경 변수로 변환
  Object.entries(deploymentInfo.contracts).forEach(([key, contract]) => {
    const envVarName = `${key.toUpperCase()}_ADDRESS`;
    envUpdates[envVarName] = contract.address;
  });
  
  // 적용하기 쉽게 약어 변수도 추가
  if (deploymentInfo.contracts.zkare) {
    envUpdates.ZKARE_CONTRACT_ADDRESS = deploymentInfo.contracts.zkare.address;
  }
  if (deploymentInfo.contracts.groth16Verifier) {
    envUpdates.GROTH16_VERIFIER_ADDRESS = deploymentInfo.contracts.groth16Verifier.address;
  }
  if (deploymentInfo.contracts.medicalDataVerifier) {
    envUpdates.MEDICAL_DATA_VERIFIER_ADDRESS = deploymentInfo.contracts.medicalDataVerifier.address;
  }
  if (deploymentInfo.contracts.medicalRecordVerifier) {
    envUpdates.MEDICAL_RECORD_VERIFIER_ADDRESS = deploymentInfo.contracts.medicalRecordVerifier.address;
  }
  if (deploymentInfo.contracts.medicalRecordViewer) {
    envUpdates.MEDICAL_RECORD_VIEWER_ADDRESS = deploymentInfo.contracts.medicalRecordViewer.address;
  }
  
  // 마지막 배포 날짜 저장
  envUpdates.LAST_DEPLOYMENT_DATE = deploymentInfo.timestamp;
  envUpdates.DEPLOYMENT_NETWORK = deploymentInfo.network;
  
  // 환경 변수 파일 업데이트
  Object.entries(envUpdates).forEach(([key, value]) => {
    if (envContent.includes(`${key}=`)) {
      // 기존 변수 업데이트
      envContent = envContent.replace(
        new RegExp(`${key}=.*`), 
        `${key}=${value}`
      );
    } else {
      // 새 변수 추가
      envContent += `\n${key}=${value}`;
    }
  });

  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env 파일이 업데이트되었습니다.');
}

// 배포 정보를 JSON 파일로 저장
function saveDeploymentInfo(deploymentInfo) {
  // 프론트엔드 배포 정보 디렉토리
  const frontendDeployDir = path.join(__dirname, "../frontend/src/deployments");
  if (!fs.existsSync(frontendDeployDir)){
    fs.mkdirSync(frontendDeployDir, { recursive: true });
  }
  
  // 백엔드 배포 정보 디렉토리
  const backendDeployDir = path.join(__dirname, "../backend/deployments");
  if (!fs.existsSync(backendDeployDir)){
    fs.mkdirSync(backendDeployDir, { recursive: true });
  }
  
  // 최신 배포 정보 파일명 생성 (날짜-시간 포함)
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  const filename = `deployment-${deploymentInfo.network}-${timestamp}.json`;
  
  // 프론트엔드용 배포 정보 저장
  fs.writeFileSync(
    path.join(frontendDeployDir, filename),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  // latest.json 파일도 업데이트 (항상 최신 정보 포함)
  fs.writeFileSync(
    path.join(frontendDeployDir, "latest.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  // 백엔드용 배포 정보도 동일하게 저장
  fs.writeFileSync(
    path.join(backendDeployDir, filename),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  fs.writeFileSync(
    path.join(backendDeployDir, "latest.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log(`✅ 배포 정보가 저장되었습니다:`);
  console.log(`   - ${path.join(frontendDeployDir, filename)}`);
  console.log(`   - ${path.join(backendDeployDir, "latest.json")}`);
}

/**
 * 컨트랙트 ABI 파일을 프론트엔드 디렉토리로 복사
 * @param {string} contractName 컨트랙트 이름
 */
async function copyAbiToFrontend(contractName) {
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

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 배포 중 오류 발생:", error);
    process.exit(1);
  }); 