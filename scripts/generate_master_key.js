/**
 * 행안부 장관 마스터키 생성 스크립트
 * 
 * 이 스크립트는 RSA 키 쌍을 생성하고,
 * 공개키를 frontend/.env에 추가합니다.
 */

const { generateKeyPair } = require('../frontend/src/utils/encryption');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('🔑 행안부 장관 마스터키 생성 중...\n');
  
  try {
    // RSA 키 쌍 생성
    const { publicKey, privateKey } = await generateKeyPair();
    
    console.log('✅ RSA 키 쌍 생성 완료!\n');
    
    // 공개키 출력
    console.log('📋 공개키 (PEM 형식):');
    console.log(publicKey);
    console.log('\n');
    
    // frontend/.env 파일 읽기
    const frontendEnvPath = path.join(__dirname, '../frontend/.env');
    let envContent = '';
    
    if (fs.existsSync(frontendEnvPath)) {
      envContent = fs.readFileSync(frontendEnvPath, 'utf8');
    }
    
    // REACT_APP_MASTER_PUBLIC_KEY 업데이트 또는 추가
    const keyRegex = /^REACT_APP_MASTER_PUBLIC_KEY=.*$/m;
    const newKeyLine = `REACT_APP_MASTER_PUBLIC_KEY="${publicKey.replace(/\n/g, '\\n')}"`;
    
    if (envContent.match(keyRegex)) {
      envContent = envContent.replace(keyRegex, newKeyLine);
      console.log('✅ frontend/.env의 REACT_APP_MASTER_PUBLIC_KEY를 업데이트했습니다.');
    } else {
      envContent += `\n${newKeyLine}\n`;
      console.log('✅ frontend/.env에 REACT_APP_MASTER_PUBLIC_KEY를 추가했습니다.');
    }
    
    // 파일 저장
    fs.writeFileSync(frontendEnvPath, envContent);
    
    // 개인키 저장 (안전한 곳에 보관)
    const privateKeyPath = path.join(__dirname, '../master_private_key.txt');
    fs.writeFileSync(privateKeyPath, privateKey);
    
    console.log('\n⚠️  중요: 개인키가 다음 파일에 저장되었습니다:');
    console.log(`   ${privateKeyPath}`);
    console.log('⚠️  이 파일을 안전한 곳에 보관하고, Git에 커밋하지 마세요!');
    console.log('\n✅ 마스터키 설정 완료!');
    console.log('   이제 컨트랙트를 배포할 수 있습니다.');
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

main();

