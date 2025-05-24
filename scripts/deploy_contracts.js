const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// 명령줄 인자 파싱 - 특정 컨트랙트만 배포할 경우 사용
const args = process.argv.slice(2);
const contractsToDeploy = args.length > 0 ? args : ["all"];

async function main() {
  console.log("🚀 컨트랙트 배포 시작...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 배포자 주소:", deployer.address);

  // 배포 정보를 저장할 객체
  const deploymentInfo = {
    network: hre.network.name,
    timestamp: new Date().toISOString(),
    contracts: {},
  };

  try {
    // 1. MedicalRecord 컨트랙트 배포
    console.log("\n📄 MedicalRecord 컨트랙트 배포 중...");
    const MedicalRecord = await hre.ethers.getContractFactory("MedicalRecord");
    const medicalRecord = await MedicalRecord.deploy();
    await medicalRecord.waitForDeployment();
    const medicalRecordAddress = await medicalRecord.getAddress();
    console.log("✅ MedicalRecord 컨트랙트 배포됨:", medicalRecordAddress);

    deploymentInfo.contracts.medicalRecord = {
      address: medicalRecordAddress,
      name: "MedicalRecord",
    };

    // 2. AccessControl 컨트랙트 배포
    console.log("\n📄 AccessControl 컨트랙트 배포 중...");
    const AccessControl = await hre.ethers.getContractFactory("AccessControl");
    const accessControl = await AccessControl.deploy(medicalRecordAddress);
    await accessControl.waitForDeployment();
    const accessControlAddress = await accessControl.getAddress();
    console.log("✅ AccessControl 컨트랙트 배포됨:", accessControlAddress);

    deploymentInfo.contracts.accessControl = {
      address: accessControlAddress,
      name: "AccessControl",
    };

    // 3. 초기 설정
    console.log("\n⚙️ 초기 설정 중...");

    // 배포자를 의사로 등록
    console.log("👨‍⚕️ 배포자를 의사로 등록 중...");
    const addDoctorTx = await medicalRecord.addDoctor(deployer.address);
    await addDoctorTx.wait();
    console.log("✅ 배포자가 의사로 등록됨");

    // 배포 정보를 JSON 파일로 저장
    const deploymentDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentDir)) {
      fs.mkdirSync(deploymentDir, { recursive: true });
    }

    const deploymentFile = path.join(
      deploymentDir,
      `deployment-${hre.network.name}-${Date.now()}.json`
    );

    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

    // .env 파일 업데이트
    const envUpdates = {
      MEDICAL_RECORD_CONTRACT_ADDRESS: medicalRecordAddress,
      ACCESS_CONTROL_CONTRACT_ADDRESS: accessControlAddress,
    };

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

    console.log("\n✨ 배포 완료!");
    console.log("\n📋 배포 정보:");
    console.log(JSON.stringify(deploymentInfo, null, 2));
    console.log("\n📝 .env 파일이 업데이트되었습니다.");
  } catch (error) {
    console.error("❌ 배포 중 오류 발생:", error);
    process.exit(1);
  }
}

// 주어진 컨트랙트가 배포 목록에 포함되어 있는지 확인
function contractsToDeployIncludes(keywords) {
  return keywords.some((keyword) =>
    contractsToDeploy.includes(keyword.toLowerCase())
  );
}

// 환경 변수 파일 업데이트
function updateEnvFile(deploymentInfo) {
  const envPath = path.resolve(__dirname, "../.env");
  let envContent = "";

  try {
    envContent = fs.readFileSync(envPath, "utf8");
  } catch (err) {
    console.log("📝 .env 파일이 없습니다. 새로 생성합니다.");
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
    envUpdates.GROTH16_VERIFIER_ADDRESS =
      deploymentInfo.contracts.groth16Verifier.address;
  }
  if (deploymentInfo.contracts.medicalDataVerifier) {
    envUpdates.MEDICAL_DATA_VERIFIER_ADDRESS =
      deploymentInfo.contracts.medicalDataVerifier.address;
  }
  if (deploymentInfo.contracts.medicalRecordVerifier) {
    envUpdates.MEDICAL_RECORD_VERIFIER_ADDRESS =
      deploymentInfo.contracts.medicalRecordVerifier.address;
  }
  if (deploymentInfo.contracts.medicalRecordViewer) {
    envUpdates.MEDICAL_RECORD_VIEWER_ADDRESS =
      deploymentInfo.contracts.medicalRecordViewer.address;
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
  console.log("✅ .env 파일이 업데이트되었습니다.");
}

// 배포 정보를 JSON 파일로 저장
function saveDeploymentInfo(deploymentInfo) {
  // 프론트엔드 배포 정보 디렉토리
  const frontendDeployDir = path.join(__dirname, "../frontend/src/deployments");
  if (!fs.existsSync(frontendDeployDir)) {
    fs.mkdirSync(frontendDeployDir, { recursive: true });
  }

  // 백엔드 배포 정보 디렉토리
  const backendDeployDir = path.join(__dirname, "../backend/deployments");
  if (!fs.existsSync(backendDeployDir)) {
    fs.mkdirSync(backendDeployDir, { recursive: true });
  }

  // 최신 배포 정보 파일명 생성 (날짜-시간 포함)
  const timestamp = new Date()
    .toISOString()
    .replace(/:/g, "-")
    .replace(/\..+/, "");
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
