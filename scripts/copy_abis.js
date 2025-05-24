const fs = require("fs");
const path = require("path");

// ABI 파일 경로
const artifactsDir = path.resolve(__dirname, "../artifacts/contracts");
const frontendAbisDir = path.resolve(__dirname, "../frontend/src/abis");

// 프론트엔드 ABI 디렉토리가 없으면 생성
if (!fs.existsSync(frontendAbisDir)) {
  fs.mkdirSync(frontendAbisDir, { recursive: true });
}

// 복사할 컨트랙트 목록
const contracts = ["MedicalRecord", "AccessControl"];

// 각 컨트랙트의 ABI 파일 복사
contracts.forEach((contractName) => {
  const contractDir = path.join(artifactsDir, `${contractName}.sol`);
  const abiSourcePath = path.join(contractDir, `${contractName}.json`);

  if (!fs.existsSync(abiSourcePath)) {
    console.error(`❌ ABI 파일을 찾을 수 없습니다: ${abiSourcePath}`);
    return;
  }

  // ABI 파일을 직접 abis 폴더에 복사
  const targetPath = path.join(frontendAbisDir, `${contractName}.json`);
  fs.copyFileSync(abiSourcePath, targetPath);
  console.log(
    `✅ ${contractName} ABI 파일이 프론트엔드 디렉토리로 복사되었습니다.`
  );
});
