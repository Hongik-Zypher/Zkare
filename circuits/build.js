const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const snarkjs = require('snarkjs');

const buildDir = path.join(__dirname, 'build');
const circuitName = 'blood_type_proof';
const circuitPath = path.join(__dirname, 'src', 'blood_type', `${circuitName}.circom`);

// 빌드 디렉토리 생성
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// blood_type 서브디렉토리 생성
const circuitDir = path.join(buildDir, 'blood_type');
if (!fs.existsSync(circuitDir)) {
  fs.mkdirSync(circuitDir, { recursive: true });
}

// 파일 존재 여부 확인 유틸리티 함수
function ensureFileExists(filePath, errorMessage) {
  if (!fs.existsSync(filePath)) {
    console.error(errorMessage || `오류: ${filePath} 파일이 존재하지 않습니다.`);
    return false;
  }
  return true;
}

async function main() {
  console.log('===== ZK 서킷 빌드 시작 =====');

  try {
    // 1. circom 컴파일 - 명시적으로 blood_type 디렉토리에 출력
    console.log('1. circom 컴파일 중...');
    execSync(`circom ${circuitPath} --r1cs --wasm --sym -o ${circuitDir}`, { stdio: 'inherit' });
    
    // 2. Powers of Tau 파일 확인
    const ptauPath = path.join(buildDir, 'powersOfTau28_hez_final_14.ptau');
    if (!ensureFileExists(ptauPath)) {
      console.error('ptau 파일을 다운로드해주세요: https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_14.ptau');
      process.exit(1);
    }

    // R1CS 파일 경로 (blood_type 서브디렉토리 내부)
    const r1csPath = path.join(circuitDir, `${circuitName}.r1cs`);
    if (!ensureFileExists(r1csPath)) {
      console.error('R1CS 파일을 찾을 수 없습니다. circom 컴파일에 실패했을 수 있습니다.');
      process.exit(1);
    }

    // 3. zkey 생성 (blood_type 서브디렉토리 내부)
    console.log('3. zKey 생성 중...');
    const zkey0Path = path.join(circuitDir, `${circuitName}_0000.zkey`);
    await snarkjs.zKey.newZKey(
      r1csPath,
      ptauPath,
      zkey0Path
    );
    
    if (!ensureFileExists(zkey0Path, "초기 zkey 파일 생성 실패")) {
      process.exit(1);
    }
    
    // 4. 최종 zkey 생성 (blood_type 서브디렉토리 내부)
    console.log('4. 최종 zKey 생성 중...');
    const finalZkeyPath = path.join(circuitDir, `${circuitName}_final.zkey`);
    
    // beacon 함수 호출 성공 여부 확인
    try {
      await snarkjs.zKey.beacon(
        zkey0Path,
        finalZkeyPath,
        'Medical Record Proof Ceremony',
        '0x0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f'
      );
      
      // 파일 크기 확인
      const stats = fs.statSync(finalZkeyPath);
      if (stats.size === 0) {
        throw new Error(`최종 zkey 파일이 비어 있습니다: ${finalZkeyPath}`);
      }
      
      console.log(`최종 zkey 생성 완료: ${finalZkeyPath} (${stats.size} 바이트)`);
    } catch (error) {
      console.error(`최종 zkey 생성 실패: ${error.message}`);
      
      // 대안으로 contribute 메서드 시도
      console.log('대안 방법으로 zkey 생성 시도...');
      try {
        // 0000.zkey에서 간단한 contribution을 통해 final.zkey 생성
        await snarkjs.zKey.contribute(
          zkey0Path,
          finalZkeyPath,
          'Contributor 1',
          '랜덤 엔트로피 소스'
        );
        
        const stats = fs.statSync(finalZkeyPath);
        if (stats.size === 0) {
          throw new Error('두 번째 방법으로도 zkey 파일이 비어 있습니다.');
        }
        
        console.log(`대안 방법으로 zkey 생성 완료: ${finalZkeyPath} (${stats.size} 바이트)`);
      } catch (err) {
        console.error(`대안 zkey 생성도 실패: ${err.message}`);
        process.exit(1);
      }
    }

    if (!ensureFileExists(finalZkeyPath, "최종 zkey 파일 생성 실패")) {
      process.exit(1);
    }
    
    // 5. 검증 키 내보내기
    console.log('5. 검증 키 내보내기 중...');
    const vKey = await snarkjs.zKey.exportVerificationKey(finalZkeyPath);
    
    const vKeyPath = path.join(circuitDir, `${circuitName}_verification_key.json`);
    fs.writeFileSync(vKeyPath, JSON.stringify(vKey, null, 2));

    // 6. Solidity 검증자 생성
    console.log('6. Solidity 검증자 생성 중...');
    let verifierCode = '';
    
    try {
      // 최신 snarkjs API 사용
      verifierCode = await snarkjs.zKey.exportSolidityVerifier(finalZkeyPath);
      console.log('Solidity 검증자 생성 성공');
    } catch (error) {
      console.log(`최신 API로 Solidity 검증자 생성 실패: ${error.message}`);
      
      try {
        // 이전 버전 API 시도
        console.log('이전 버전 API로 시도...');
        verifierCode = await snarkjs.zKey.exportSolidityVerifier(
          finalZkeyPath,
          { groth16: true }
        );
      } catch (oldApiError) {
        console.log(`이전 API로도 실패: ${oldApiError.message}`);
        
        // CLI 명령어 직접 실행 시도
        try {
          console.log('CLI 명령어로 시도...');
          const tmpVerifierPath = path.join(circuitDir, 'verifier_tmp.sol');
          
          execSync(
            `node --no-warnings ./node_modules/.bin/snarkjs zkey export solidityverifier "${finalZkeyPath}" "${tmpVerifierPath}"`,
            { stdio: 'inherit' }
          );
          
          if (fs.existsSync(tmpVerifierPath)) {
            verifierCode = fs.readFileSync(tmpVerifierPath, 'utf8');
            fs.unlinkSync(tmpVerifierPath); // 임시 파일 삭제
            console.log('CLI 명령어로 검증자 생성 성공');
          } else {
            throw new Error('CLI 명령어로 생성한 파일을 찾을 수 없습니다');
          }
        } catch (cliError) {
          console.error(`모든 방법으로 Solidity 검증자 생성 실패: ${cliError.message}`);
        }
      }
    }
    
    const verifierPath = path.join(circuitDir, 'verifier.sol');
    fs.writeFileSync(verifierPath, verifierCode);
    console.log(`Solidity 검증자 파일 저장 완료: ${verifierPath}`);

    console.log('===== ZK 서킷 빌드 완료 =====');
    
    // 회로 파일 복사
    copyCircuitFilesToPublic();

  } catch (error) {
    console.error('빌드 중 오류 발생:', error);
    process.exit(1);
  }
}

function copyCircuitFilesToPublic() {
  const publicDir = path.join(__dirname, '../frontend/public/circuits');
  
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
    console.log(`디렉토리 생성됨: ${publicDir}`);
  }
  
  console.log('===== 회로 파일 프론트엔드로 복사 중 =====');
  
  // WASM 파일 복사
  const wasmPath = path.join(circuitDir, `${circuitName}_js`, `${circuitName}.wasm`);
  const wasmDestPath = path.join(publicDir, `${circuitName}.wasm`);
  
  if (fs.existsSync(wasmPath)) {
    try {
      fs.copyFileSync(wasmPath, wasmDestPath);
      // 파일 크기 확인으로 성공 여부 검증
      const stats = fs.statSync(wasmDestPath);
      console.log(`✅ WASM 파일 복사 성공: ${wasmPath} -> ${wasmDestPath} (${stats.size} 바이트)`);
    } catch (error) {
      console.error(`❌ WASM 파일 복사 실패: ${error.message}`);
    }
  } else {
    console.error(`❌ WASM 파일을 찾을 수 없습니다: ${wasmPath}`);
  }
  
  // zkey 파일 복사
  const zkeyPath = path.join(circuitDir, `${circuitName}_final.zkey`);
  const zkeyDestPath = path.join(publicDir, `${circuitName}_final.zkey`);
  
  if (fs.existsSync(zkeyPath)) {
    try {
      fs.copyFileSync(zkeyPath, zkeyDestPath);
      // 파일 크기 확인으로 성공 여부 검증
      const stats = fs.statSync(zkeyDestPath);
      console.log(`✅ zkey 파일 복사 성공: ${zkeyPath} -> ${zkeyDestPath} (${stats.size} 바이트)`);
    } catch (error) {
      console.error(`❌ zkey 파일 복사 실패: ${error.message}`);
    }
  } else {
    console.error(`❌ zkey 파일을 찾을 수 없습니다: ${zkeyPath}`);
  }
  
  // 검증 키 파일도 복사
  const vkeyPath = path.join(circuitDir, `${circuitName}_verification_key.json`);
  const vkeyDestPath = path.join(publicDir, `${circuitName}_verification_key.json`);
  
  if (fs.existsSync(vkeyPath)) {
    try {
      fs.copyFileSync(vkeyPath, vkeyDestPath);
      console.log(`✅ 검증 키 파일 복사 성공: ${vkeyPath} -> ${vkeyDestPath}`);
    } catch (error) {
      console.error(`❌ 검증 키 파일 복사 실패: ${error.message}`);
    }
  }
  
  // 복사된 파일 확인
  console.log('===== 복사된 파일 확인 =====');
  if (fs.existsSync(publicDir)) {
    const files = fs.readdirSync(publicDir);
    if (files.length > 0) {
      console.log(`frontend/public/circuits 디렉토리 내 파일 목록:`);
      files.forEach(file => {
        const filePath = path.join(publicDir, file);
        const stats = fs.statSync(filePath);
        console.log(`- ${file} (${stats.size} 바이트)`);
      });
    } else {
      console.log('frontend/public/circuits 디렉토리가 비어 있습니다.');
    }
  }
}

main().then(() => {
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
}); 