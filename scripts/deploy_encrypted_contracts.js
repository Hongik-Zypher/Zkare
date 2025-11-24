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
    // 0. 행안부 장관 주소 및 마스터키 읽기 (frontend/.env에서)
    // 우선순위: frontend/.env > 환경 변수
    let MASTER_AUTHORITY_ADDRESS = null;
    let MASTER_PUBLIC_KEY = null;
    
    // 1순위: frontend/.env에서 읽기
    const frontendEnvPath = path.join(__dirname, "../frontend/.env");
    if (fs.existsSync(frontendEnvPath)) {
      const frontendEnvContent = fs.readFileSync(frontendEnvPath, "utf8");
      
      // REACT_APP_MASTER_AUTHORITY_ADDRESS 찾기
      const masterAddressMatch = frontendEnvContent.match(/REACT_APP_MASTER_AUTHORITY_ADDRESS\s*=\s*([^\s\n]+)/);
      if (masterAddressMatch && masterAddressMatch[1]) {
        MASTER_AUTHORITY_ADDRESS = masterAddressMatch[1].trim();
        console.log("✅ frontend/.env에서 마스터 계정 주소를 읽어왔습니다.");
      }
      
      // REACT_APP_MASTER_PUBLIC_KEY 찾기 (여러 줄 지원)
      const masterKeyMatch = frontendEnvContent.match(/REACT_APP_MASTER_PUBLIC_KEY\s*=\s*["']?([^"'\n]+(?:\n[^"'\n]+)*)["']?/s);
      if (masterKeyMatch && masterKeyMatch[1]) {
        MASTER_PUBLIC_KEY = masterKeyMatch[1].trim();
        // 따옴표 제거
        MASTER_PUBLIC_KEY = MASTER_PUBLIC_KEY.replace(/^["']|["']$/g, '');
        console.log("✅ frontend/.env에서 마스터키를 읽어왔습니다.");
      }
    }
    
    // 2순위: 환경 변수에서 읽기
    if (!MASTER_AUTHORITY_ADDRESS && process.env.MASTER_AUTHORITY_ADDRESS) {
      MASTER_AUTHORITY_ADDRESS = process.env.MASTER_AUTHORITY_ADDRESS;
      console.log("✅ 환경 변수에서 마스터 계정 주소를 읽어왔습니다.");
    }
    if (!MASTER_PUBLIC_KEY && process.env.MASTER_PUBLIC_KEY) {
      MASTER_PUBLIC_KEY = process.env.MASTER_PUBLIC_KEY;
      console.log("✅ 환경 변수에서 마스터키를 읽어왔습니다.");
    }
    
    // 기본값 설정 (없으면 에러)
    if (!MASTER_AUTHORITY_ADDRESS) {
      throw new Error("❌ 마스터 계정 주소가 설정되지 않았습니다. frontend/.env에 REACT_APP_MASTER_AUTHORITY_ADDRESS를 설정해주세요.");
    }
    
    // 주소 유효성 검증
    try {
      hre.ethers.getAddress(MASTER_AUTHORITY_ADDRESS); // 주소 형식 검증
    } catch (error) {
      throw new Error(`❌ 잘못된 마스터 계정 주소입니다: ${MASTER_AUTHORITY_ADDRESS}`);
    }
    
    console.log("📋 마스터 계정 주소:", MASTER_AUTHORITY_ADDRESS);
    
    // 마스터키가 없어도 괜찮음 (행안부 장관이 나중에 등록 가능)
    if (!MASTER_PUBLIC_KEY) {
      console.warn("⚠️  frontend/.env에 REACT_APP_MASTER_PUBLIC_KEY가 없습니다.");
      console.warn("⚠️  행안부 장관이 나중에 키를 등록하면 자동으로 마스터키로 설정됩니다.");
    }

    // 1. KeyRegistry 컨트랙트 배포
    console.log("\n🔑 KeyRegistry 컨트랙트 배포 중...");
    console.log("   마스터 계정 주소:", MASTER_AUTHORITY_ADDRESS);
    if (MASTER_PUBLIC_KEY) {
      console.log("   ✅ frontend/.env에서 읽은 마스터키를 사용합니다.");
      console.log("   💡 또는 행안부 장관이 키를 등록하면 자동으로 마스터키로 설정됩니다.");
    } else {
      console.log("   ℹ️  마스터키 없이 배포합니다.");
      console.log("   💡 행안부 장관이 키를 등록하면 자동으로 마스터키로 설정됩니다.");
    }
    const KeyRegistry = await hre.ethers.getContractFactory("KeyRegistry");
    const keyRegistry = await KeyRegistry.deploy(MASTER_AUTHORITY_ADDRESS, MASTER_PUBLIC_KEY || "");
    await keyRegistry.waitForDeployment();
    const keyRegistryAddress = await keyRegistry.getAddress();
    console.log("✅ KeyRegistry 컨트랙트 배포됨:", keyRegistryAddress);
    
    if (MASTER_PUBLIC_KEY) {
      console.log("✅ 행안부 장관 마스터키가 컨트랙트에 설정되었습니다.");
    } else {
      console.log("ℹ️  행안부 장관이 키를 등록하면 자동으로 마스터키로 설정됩니다.");
    }

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
    
    // 검증: 의사 등록 확인
    const isDoctorRegistered = await keyRegistry.isDoctor(deployer.address);
    if (!isDoctorRegistered) {
      throw new Error("❌ 배포자 의사 등록 실패!");
    }
    console.log("✅ 배포자가 의사로 등록됨 (검증 완료)");

    // KeyRecovery를 신뢰할 수 있는 컨트랙트로 등록
    console.log("🔐 KeyRecovery를 신뢰할 수 있는 컨트랙트로 등록 중...");
    const addTrustedContractTx = await keyRegistry.addTrustedContract(keyRecoveryAddress);
    await addTrustedContractTx.wait();
    
    // 검증: 신뢰할 수 있는 컨트랙트 등록 확인
    const isTrustedRegistered = await keyRegistry.isTrustedContract(keyRecoveryAddress);
    if (!isTrustedRegistered) {
      throw new Error("❌ KeyRecovery 신뢰할 수 있는 컨트랙트 등록 실패!");
    }
    console.log("✅ KeyRecovery가 신뢰할 수 있는 컨트랙트로 등록됨 (검증 완료)");
    
    // 최종 초기화 검증
    console.log("\n🔍 최종 초기화 검증 중...");
    
    // 마스터키 검증
    const masterKeyCheck = await keyRegistry.getMasterKey();
    if (MASTER_PUBLIC_KEY && !masterKeyCheck.isRegistered) {
      throw new Error("❌ 마스터키 등록 실패!");
    }
    if (MASTER_PUBLIC_KEY) {
      console.log("✅ 마스터키 검증 완료");
    }
    
    // EncryptedMedicalRecord KeyRegistry 연결 검증
    const keyRegistryInMedical = await encryptedMedicalRecord.keyRegistry();
    if (keyRegistryInMedical.toLowerCase() !== keyRegistryAddress.toLowerCase()) {
      throw new Error("❌ EncryptedMedicalRecord KeyRegistry 연결 실패!");
    }
    console.log("✅ EncryptedMedicalRecord KeyRegistry 연결 검증 완료");
    
    // KeyRecovery KeyRegistry 연결 검증
    const keyRegistryInRecovery = await keyRecovery.keyRegistry();
    if (keyRegistryInRecovery.toLowerCase() !== keyRegistryAddress.toLowerCase()) {
      throw new Error("❌ KeyRecovery KeyRegistry 연결 실패!");
    }
    console.log("✅ KeyRecovery KeyRegistry 연결 검증 완료");
    
    console.log("✅ 모든 초기화 검증 완료!");

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


