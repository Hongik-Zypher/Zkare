const hre = require("hardhat");

// Node.js crypto 모듈 사용
const crypto = require('crypto');

// RSA 키 쌍 생성 함수 (Node.js 환경용)
function generateRSAKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  return { publicKey, privateKey };
}

async function main() {
  console.log("🔑 테스트용 보호자 계정 3개 설정 시작...\n");

  const [deployer, account1, account2, account3, account4] = await hre.ethers.getSigners();

  const keyRegistryAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // 새로 배포된 주소
  const KeyRegistry = await hre.ethers.getContractFactory("KeyRegistry");
  const keyRegistry = KeyRegistry.attach(keyRegistryAddress);

  // Account #2, #3, #4를 보호자로 설정
  const guardianAccounts = [account2, account3, account4];
  
  for (let i = 0; i < guardianAccounts.length; i++) {
    const account = guardianAccounts[i];
    console.log(`\n👤 보호자 ${i + 1}: ${account.address}`);
    
    // 이미 키가 등록되어 있는지 확인
    const isRegistered = await keyRegistry.isPublicKeyRegistered(account.address);
    
    if (isRegistered) {
      console.log(`   ✅ 이미 공개키가 등록되어 있습니다.`);
    } else {
      // 실제 RSA 키 쌍 생성
      console.log(`   🔐 RSA 키 생성 중...`);
      const { publicKey, privateKey } = generateRSAKeyPair();
      
      // 공개키 등록 (환자로 등록)
      const tx = await keyRegistry.connect(account).registerPublicKey(publicKey, false);
      await tx.wait();
      
      console.log(`   ✅ 공개키가 등록되었습니다.`);
    }
  }

  console.log("\n✨ 모든 보호자 계정 설정 완료!");
  console.log("\n📋 보호자 주소 목록:");
  console.log(`   보호자 1: ${guardianAccounts[0].address}`);
  console.log(`   보호자 2: ${guardianAccounts[1].address}`);
  console.log(`   보호자 3: ${guardianAccounts[2].address}`);
  console.log("\n💡 이제 새 계정으로 키를 생성하고 위 주소들을 보호자로 입력하세요!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 오류 발생:", error);
    process.exit(1);
  });

