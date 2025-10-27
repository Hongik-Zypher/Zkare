/**
 * SSS 암호화 로직 실제 테스트
 * Node.js 환경에서 SSS 분할/복구를 직접 테스트
 */

// Web Crypto API polyfill for Node.js
const { webcrypto } = require('crypto');
if (!global.crypto) {
  global.crypto = webcrypto;
}
if (!global.window) {
  global.window = { crypto: webcrypto };
}

// TextEncoder/TextDecoder polyfill
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// SSS 함수 import
const { splitSecret, combineShares, encryptAndSplitKey, combineAndDecryptKey } = require('../frontend/src/utils/secretSharing.js');

console.log('🧪 SSS 암호화 로직 실제 테스트 시작\n');

// 테스트 1: 기본 SSS 분할/복구
async function testBasicSSS() {
  console.log('📝 테스트 1: 기본 SSS 분할/복구');
  
  const secret = "This is a secret message for testing SSS!";
  console.log(`   원본 비밀: "${secret}"`);
  
  // 분할 (3개 조각, 2개 필요)
  const shares = splitSecret(secret, 3, 2);
  console.log(`   생성된 조각 수: ${shares.length}`);
  shares.forEach((share, i) => {
    console.log(`   조각 ${i + 1}: ${share.substring(0, 20)}...`);
  });
  
  // 복구 (조각 2개 사용)
  const recovered1 = combineShares([shares[0], shares[1]]);
  const recovered2 = combineShares([shares[0], shares[2]]);
  const recovered3 = combineShares([shares[1], shares[2]]);
  
  if (recovered1 === secret && recovered2 === secret && recovered3 === secret) {
    console.log('   ✅ 성공: 어떤 2개 조각으로도 원본 복구 가능!');
    console.log(`   복구된 비밀: "${recovered1}"\n`);
    return true;
  } else {
    console.log('   ❌ 실패: 복구된 비밀이 원본과 다릅니다\n');
    return false;
  }
}

// 테스트 2: 긴 문자열 (RSA 개인키 크기)
async function testLongString() {
  console.log('📝 테스트 2: 긴 문자열 (RSA 개인키 시뮬레이션)');
  
  const longSecret = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDGHj8RvzF1XWQP
abc123def456ghi789jkl012mno345pqr678stu901vwx234yzA567BCD890EFG123
HIJ456KLM789NOP012QRS345TUV678WXY901ZAB234CDE567FGH890IJK123LMN456
OPQ789RST012UVW345XYZ678ABC901DEF234GHI567JKL890MNO123PQR456STU789
VWX012YZA345BCD678EFG901HIJ234KLM567NOP890QRS123TUV456WXY789ZAB012
-----END PRIVATE KEY-----`;
  
  console.log(`   원본 길이: ${longSecret.length} chars`);
  
  const shares = splitSecret(longSecret, 3, 2);
  const recovered = combineShares([shares[0], shares[2]]);
  
  if (recovered === longSecret) {
    console.log('   ✅ 성공: 긴 문자열도 정확히 복구됨!');
    console.log(`   복구된 길이: ${recovered.length} chars\n`);
    return true;
  } else {
    console.log('   ❌ 실패: 복구된 문자열이 원본과 다릅니다');
    console.log(`   원본 길이: ${longSecret.length}, 복구 길이: ${recovered.length}\n`);
    return false;
  }
}

// 테스트 3: 전체 플로우 (AES + SSS)
async function testFullFlow() {
  console.log('📝 테스트 3: 전체 플로우 (AES 암호화 + SSS)');
  
  const privateKey = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDGHj8RvzF1XWQP
TestPrivateKeyDataForFullFlowVerification123456789ABCDEFGHIJKLMNOPQRSTUVW
XYZabcdefghijklmnopqrstuvwxyz0123456789TestingSSS
-----END PRIVATE KEY-----`;
  
  console.log(`   원본 개인키 길이: ${privateKey.length} chars`);
  
  // 1. 암호화 + SSS 분할
  console.log('   🔐 1단계: AES 암호화 + SSS 분할 중...');
  const { encryptedPrivateKey, iv, shares } = await encryptAndSplitKey(privateKey, 3, 2);
  
  console.log(`   암호화된 개인키: ${encryptedPrivateKey.substring(0, 40)}...`);
  console.log(`   IV: ${iv.substring(0, 32)}...`);
  console.log(`   생성된 조각 수: ${shares.length}`);
  
  // 2. SSS 복구 + 복호화
  console.log('   🔓 2단계: SSS 복구 + AES 복호화 중...');
  const recovered = await combineAndDecryptKey(encryptedPrivateKey, iv, [shares[0], shares[1]]);
  
  if (recovered === privateKey) {
    console.log('   ✅ 성공: 전체 플로우가 완벽하게 작동합니다!');
    console.log(`   복구된 개인키 길이: ${recovered.length} chars`);
    console.log(`   원본과 100% 일치 확인!\n`);
    return true;
  } else {
    console.log('   ❌ 실패: 복구된 개인키가 원본과 다릅니다\n');
    return false;
  }
}

// 테스트 4: 한글 및 특수문자
async function testUnicode() {
  console.log('📝 테스트 4: 한글 및 특수문자');
  
  const unicodeSecret = "안녕하세요! 這是測試 🔐🎉 Special: @#$%^&*()";
  console.log(`   원본: "${unicodeSecret}"`);
  
  const shares = splitSecret(unicodeSecret, 3, 2);
  const recovered = combineShares([shares[1], shares[2]]);
  
  if (recovered === unicodeSecret) {
    console.log('   ✅ 성공: 유니코드 문자도 정확히 복구됨!');
    console.log(`   복구: "${recovered}"\n`);
    return true;
  } else {
    console.log('   ❌ 실패\n');
    return false;
  }
}

// 테스트 5: Threshold 검증 (조각 1개로는 복구 불가)
async function testThreshold() {
  console.log('📝 테스트 5: Threshold 검증 (보안 테스트)');
  
  const secret = "Secret that requires 2 shares";
  const shares = splitSecret(secret, 3, 2);
  
  try {
    // 조각 1개로 복구 시도 (실패해야 함)
    const recovered = combineShares([shares[0]]);
    console.log('   ❌ 경고: 조각 1개로 복구가 되면 안됩니다!');
    console.log(`   복구된 값: "${recovered}"`);
    
    // 복구된 값이 원본과 같으면 threshold가 작동하지 않는 것
    if (recovered === secret) {
      console.log('   ❌ 실패: Threshold 보안이 작동하지 않습니다!\n');
      return false;
    } else {
      console.log('   ✅ 좋음: 복구된 값이 원본과 다릅니다 (예상된 동작)');
      console.log('   ℹ️  조각 2개가 필요합니다\n');
      return true;
    }
  } catch (error) {
    console.log('   ✅ 성공: 조각이 부족하여 에러 발생 (예상된 동작)');
    console.log(`   에러: ${error.message}\n`);
    return true;
  }
}

// 모든 테스트 실행
async function runAllTests() {
  console.log('═'.repeat(60));
  console.log('🔐 Shamir\'s Secret Sharing 암호화 로직 검증');
  console.log('═'.repeat(60) + '\n');
  
  const results = [];
  
  results.push(await testBasicSSS());
  results.push(await testLongString());
  results.push(await testFullFlow());
  results.push(await testUnicode());
  results.push(await testThreshold());
  
  console.log('═'.repeat(60));
  console.log('📊 테스트 결과 요약');
  console.log('═'.repeat(60));
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`\n총 ${total}개 테스트 중 ${passed}개 통과`);
  
  if (passed === total) {
    console.log('\n🎉 모든 테스트 통과! SSS 시스템이 완벽하게 작동합니다!');
    console.log('\n✅ 검증된 기능:');
    console.log('   1. Lagrange 보간법 기반 SSS 분할/복구');
    console.log('   2. AES-256-GCM 암호화/복호화');
    console.log('   3. Threshold (2-of-3) 보안');
    console.log('   4. 긴 문자열 (RSA 키 크기) 처리');
    console.log('   5. 유니코드 문자 지원');
    console.log('\n💡 결론: 키 생성 시 SSS 조각이 블록체인에 저장되면');
    console.log('        보호자 2명의 승인으로 원본 개인키 복구 가능!');
  } else {
    console.log(`\n❌ ${total - passed}개 테스트 실패`);
    process.exit(1);
  }
}

// 실행
runAllTests().catch(error => {
  console.error('❌ 테스트 실행 중 오류:', error);
  process.exit(1);
});

