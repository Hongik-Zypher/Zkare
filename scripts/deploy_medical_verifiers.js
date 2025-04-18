const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("의료 데이터 검증 시스템 배포 시작...");

  // 1. Zkare 컨트랙트 배포
  const Zkare = await hre.ethers.getContractFactory("Zkare");
  const zkare = await Zkare.deploy();
  // 배포 트랜잭션이 마이닝될 때까지 기다림
  console.log("Zkare 컨트랙트 배포 중...");
  await zkare.waitForDeployment();
  console.log("Zkare 컨트랙트 배포됨:", await zkare.getAddress());

  // 2. MedicalDataVerifier 컨트랙트 배포
  const MedicalDataVerifier = await hre.ethers.getContractFactory("MedicalDataVerifier");
  const medicalDataVerifier = await MedicalDataVerifier.deploy(await zkare.getAddress());
  console.log("MedicalDataVerifier 컨트랙트 배포 중...");
  await medicalDataVerifier.waitForDeployment();
  console.log("MedicalDataVerifier 컨트랙트 배포됨:", await medicalDataVerifier.getAddress());

  // 3. 혈액형 검증용 Groth16Verifier 컨트랙트 배포
  const BloodTypeVerifier = await hre.ethers.getContractFactory("Groth16Verifier");
  const bloodTypeVerifier = await BloodTypeVerifier.deploy();
  console.log("BloodType Groth16Verifier 컨트랙트 배포 중...");
  await bloodTypeVerifier.waitForDeployment();
  console.log("BloodType Groth16Verifier 컨트랙트 배포됨:", await bloodTypeVerifier.getAddress());
  
  // 4. 검증기를 MedicalDataVerifier에 등록
  console.log("검증기 등록 중...");
  
  await medicalDataVerifier.setVerifier("bloodType", await bloodTypeVerifier.getAddress());
  console.log("혈액형 검증기 등록 완료");

  // 5. 배포자를 의사로 등록
  const [deployer] = await hre.ethers.getSigners();
  await zkare.addDoctor(deployer.address);
  console.log("배포자가 의사로 등록됨:", deployer.address);

  // 6. 테스트용 환자 데이터 등록
  const patientAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // 테스트용 환자 주소 (Hardhat 기본 계정)
  await medicalDataVerifier.registerPatientData(patientAddress, "bloodType", 1); // 1 = A형
  console.log("테스트 환자 혈액형 등록 완료:", patientAddress);

  // 7. 배포 정보 저장 (프론트엔드에서 사용)
  const deploymentInfo = {
    zkareAddress: await zkare.getAddress(),
    medicalDataVerifierAddress: await medicalDataVerifier.getAddress(),
    verifiers: {
      bloodType: await bloodTypeVerifier.getAddress()
    },
    network: hre.network.name,
    timestamp: new Date().toISOString()
  };

  // 배포 정보 저장 (폴더가 없으면 생성)
  const deployDir = path.join(__dirname, "../frontend/src/deployments");
  if (!fs.existsSync(deployDir)){
    fs.mkdirSync(deployDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(deployDir, "deployment-info.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("배포 정보 저장됨:", path.join(deployDir, "deployment-info.json"));

  console.log("배포 완료!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 