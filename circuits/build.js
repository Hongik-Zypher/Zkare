const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const snarkjs = require('snarkjs');

const buildDir = path.join(__dirname, 'build');
const circuitName = 'medical_record_proof';
const circuitPath = path.join(__dirname, 'src', `${circuitName}.circom`);

// 빌드 디렉토리 생성
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

async function main() {
  console.log('===== ZK 서킷 빌드 시작 =====');

  try {
    // 1. circom으로 R1CS, WASM, SYM 파일 생성
    console.log('1. circom 컴파일 중...');
    execSync(`circom ${circuitPath} --r1cs --wasm --sym -o ${buildDir}`, { stdio: 'inherit' });
    console.log('circom 컴파일 완료');

    // 2. zkey 및 증명 설정 파일 생성
    console.log('2. Powers of Tau 파일 확인 중...');
    // powersOfTau28_hez_final_20.ptau 파일 사용
    const ptauPath = path.join(buildDir, 'powersOfTau28_hez_final_14.ptau');
    if (!fs.existsSync(ptauPath)) {
      console.error(`오류: ${ptauPath} 파일이 존재하지 않습니다.`);
      console.error('먼저 wget 또는 curl을 사용하여 ptau 파일을 다운로드하세요.');
      process.exit(1);
    }

    // 3. zkey 생성
    console.log('3. zKey 생성 중...');
    await snarkjs.zKey.newZKey(
      path.join(buildDir, `${circuitName}.r1cs`),
      ptauPath,
      path.join(buildDir, `${circuitName}_0000.zkey`)
    );

    // 4. 최종 zkey 생성 (실제 구현에서는 Trusted Setup 과정 필요)
    console.log('4. 최종 zKey 생성 중...');
    await snarkjs.zKey.beacon(
      path.join(buildDir, `${circuitName}_0000.zkey`),
      path.join(buildDir, `${circuitName}_final.zkey`),
      'Medical Record Proof Ceremony', // 세레모니 이름
      '0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f' // 랜덤 비콘 값
    );

    // 5. 검증 키 내보내기
    console.log('5. 검증 키 내보내기 중...');
    const vKey = await snarkjs.zKey.exportVerificationKey(
      path.join(buildDir, `${circuitName}_final.zkey`)
    );
    fs.writeFileSync(
      path.join(buildDir, `${circuitName}_verification_key.json`),
      JSON.stringify(vKey, null, 2)
    );

    // 6. Solidity 검증자 생성
    console.log('6. Solidity 검증자 생성 중...');
    const verifierCode = await snarkjs.zKey.exportSolidityVerifier(
      path.join(buildDir, `${circuitName}_final.zkey`),
      { 
        groth16: true // 명시적으로 groth16 사용
      }
    );
    fs.writeFileSync(
      path.join(buildDir, 'verifier.sol'),
      verifierCode
    );

    console.log('===== ZK 서킷 빌드 완료 =====');
    console.log(`빌드 결과물은 ${buildDir} 디렉토리에 생성되었습니다.`);

  } catch (error) {
    console.error('빌드 중 오류 발생:', error);
    process.exit(1);
  }
}

main().then(() => {
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
}); 