const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  console.log("🚀 암호화 의료기록 시스템 컨트랙트 배포 시작...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 배포자 주소:", deployer.address);

  // 배포 정보를 저장할 객체
  const deploymentInfo = {
    network: hre.network.name,
    timestamp: new Date().toISOString(),
    contracts: {},
  };

  try {
    // 1. KeyRegistry 컨트랙트 배포
    console.log("\n🔑 KeyRegistry 컨트랙트 배포 중...");
    const KeyRegistry = await hre.ethers.getContractFactory("KeyRegistry");
    const keyRegistry = await KeyRegistry.deploy();
    await keyRegistry.waitForDeployment();
    const keyRegistryAddress = await keyRegistry.getAddress();
    console.log("✅ KeyRegistry 컨트랙트 배포됨:", keyRegistryAddress);

    deploymentInfo.contracts.keyRegistry = {
      address: keyRegistryAddress,
      name: "KeyRegistry",
    };

    // 2. EncryptedMedicalRecord 컨트랙트 배포
    console.log("\n📄 EncryptedMedicalRecord 컨트랙트 배포 중...");
    const EncryptedMedicalRecord = await hre.ethers.getContractFactory("EncryptedMedicalRecord");
    const encryptedMedicalRecord = await EncryptedMedicalRecord.deploy(keyRegistryAddress);
    await encryptedMedicalRecord.waitForDeployment();
    const encryptedMedicalRecordAddress = await encryptedMedicalRecord.getAddress();
    console.log("✅ EncryptedMedicalRecord 컨트랙트 배포됨:", encryptedMedicalRecordAddress);

    deploymentInfo.contracts.encryptedMedicalRecord = {
      address: encryptedMedicalRecordAddress,
      name: "EncryptedMedicalRecord",
    };

    // 3. KeyRecovery 컨트랙트 배포
    console.log("\n🔐 KeyRecovery 컨트랙트 배포 중...");
    const KeyRecovery = await hre.ethers.getContractFactory("KeyRecovery");
    const keyRecovery = await KeyRecovery.deploy(keyRegistryAddress);
    await keyRecovery.waitForDeployment();
    const keyRecoveryAddress = await keyRecovery.getAddress();
    console.log("✅ KeyRecovery 컨트랙트 배포됨:", keyRecoveryAddress);

    deploymentInfo.contracts.keyRecovery = {
      address: keyRecoveryAddress,
      name: "KeyRecovery",
    };

    // 4. 초기 설정
    console.log("\n⚙️ 초기 설정 중...");

    // 배포자를 의사로 등록
    console.log("👨‍⚕️ 배포자를 의사로 등록 중...");
    const certifyDoctorTx = await keyRegistry.certifyDoctor(deployer.address);
    await certifyDoctorTx.wait();
    console.log("✅ 배포자가 의사로 등록됨");

    // KeyRecovery를 신뢰할 수 있는 컨트랙트로 등록
    console.log("🔐 KeyRecovery를 신뢰할 수 있는 컨트랙트로 등록 중...");
    const addTrustedContractTx = await keyRegistry.addTrustedContract(keyRecoveryAddress);
    await addTrustedContractTx.wait();
    console.log("✅ KeyRecovery가 신뢰할 수 있는 컨트랙트로 등록됨");

    // 5. ABI 파일 복사
    console.log("\n📋 ABI 파일 복사 중...");
    await copyAbiToFrontend("KeyRegistry");
    await copyAbiToFrontend("EncryptedMedicalRecord");
    await copyAbiToFrontend("KeyRecovery");

    // 6. 배포 정보 저장
    const deploymentDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentDir)) {
      fs.mkdirSync(deploymentDir, { recursive: true });
    }

    const deploymentFile = path.join(
      deploymentDir,
      `deployment-encrypted-${hre.network.name}-${Date.now()}.json`
    );

    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

    // 7. .env 파일 업데이트
    const envUpdates = {
      KEY_REGISTRY_CONTRACT_ADDRESS: keyRegistryAddress,
      ENCRYPTED_MEDICAL_RECORD_CONTRACT_ADDRESS: encryptedMedicalRecordAddress,
      KEY_RECOVERY_CONTRACT_ADDRESS: keyRecoveryAddress,
    };

    updateEnvFile(envUpdates);

    // 8. 프론트엔드 환경 변수 파일도 업데이트
    updateFrontendEnv(envUpdates);

    console.log("\n✨ 암호화 의료기록 시스템 배포 완료!");
    console.log("\n📋 배포 정보:");
    console.log(JSON.stringify(deploymentInfo, null, 2));
    console.log("\n📝 환경 변수 파일이 업데이트되었습니다.");
    
    console.log("\n🔧 프론트엔드에서 사용할 환경 변수:");
    console.log(`REACT_APP_KEY_REGISTRY_ADDRESS=${keyRegistryAddress}`);
    console.log(`REACT_APP_ENCRYPTED_MEDICAL_RECORD_ADDRESS=${encryptedMedicalRecordAddress}`);
    console.log(`REACT_APP_KEY_RECOVERY_ADDRESS=${keyRecoveryAddress}`);

  } catch (error) {
    console.error("❌ 배포 중 오류 발생:", error);
    process.exit(1);
  }
}

// 환경 변수 파일 업데이트
function updateEnvFile(envUpdates) {
  const envPath = path.join(__dirname, "../.env");
  let envContent = "";

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf8");
  }

  // 환경 변수 업데이트 또는 추가
  Object.entries(envUpdates).forEach(([key, value]) => {
    const regex = new RegExp(`^${key}=.*`, "m");
    const newLine = `${key}=${value}`;

    if (envContent.match(regex)) {
      envContent = envContent.replace(regex, newLine);
    } else {
      envContent += `\n${newLine}`;
    }
  });

  fs.writeFileSync(envPath, envContent.trim() + "\n");
  console.log("✅ .env 파일이 업데이트되었습니다.");
}

// 프론트엔드 환경 변수 파일 업데이트
function updateFrontendEnv(envUpdates) {
  const frontendEnvPath = path.join(__dirname, "../frontend/.env");
  let envContent = "";

  if (fs.existsSync(frontendEnvPath)) {
    envContent = fs.readFileSync(frontendEnvPath, "utf8");
  }

  // React 앱용 환경 변수로 변환
  const reactEnvUpdates = {};
  Object.entries(envUpdates).forEach(([key, value]) => {
    const reactKey = `REACT_APP_${key}`;
    reactEnvUpdates[reactKey] = value;
  });

  // 환경 변수 업데이트 또는 추가
  Object.entries(reactEnvUpdates).forEach(([key, value]) => {
    const regex = new RegExp(`^${key}=.*`, "m");
    const newLine = `${key}=${value}`;

    if (envContent.match(regex)) {
      envContent = envContent.replace(regex, newLine);
    } else {
      envContent += `\n${newLine}`;
    }
  });

  fs.writeFileSync(frontendEnvPath, envContent.trim() + "\n");
  console.log("✅ 프론트엔드 .env 파일이 업데이트되었습니다.");
}

/**
 * 컨트랙트 ABI 파일을 프론트엔드 디렉토리로 복사하는 함수
 */
async function copyAbiToFrontend(contractName) {
  // ABI 파일 경로
  const artifactsDir = path.resolve(__dirname, "../artifacts/contracts");
  const frontendAbisDir = path.resolve(__dirname, "../frontend/src/abis");

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

  // ABI 파일을 직접 abis 폴더에 복사
  const targetPath = path.join(frontendAbisDir, `${contractName}.json`);
  fs.copyFileSync(abiSourcePath, targetPath);

  console.log(
    `✅ ${contractName} ABI 파일이 프론트엔드 디렉토리로 복사되었습니다.`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 배포 중 오류 발생:", error);
    process.exit(1);
  });


