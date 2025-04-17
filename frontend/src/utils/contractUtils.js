import axios from 'axios';

// 백엔드 API URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

/**
 * 컨트랙트 ABI와 주소를 가져옵니다.
 * @param {string} contractType - 컨트랙트 타입 ('zkare', 'medicalDataVerifier' 등)
 * @returns {Promise<{abi: any, address: string}>} ABI와 컨트랙트 주소
 */
export const getContractInfo = async (contractType = 'zkare') => {
  try {
    // 1단계: 단순화된 로컬 ABI 파일 로드 시도
    try {
      const abiModule = await import(`../abis/simplified/${getContractNameFromType(contractType)}.json`);
      if (abiModule?.default) {
        console.log(`로컬 ABI 파일에서 ${contractType} 컨트랙트 정보 로드됨`);
        return {
          abi: abiModule.default.abi,
          address: abiModule.default.address
        };
      }
    } catch (localError) {
      console.log(`로컬 ABI 파일을 찾을 수 없음: ${localError.message}`);
    }
    
    // 2단계: 백엔드 API를 통해 컨트랙트 정보 가져오기
    console.log(`백엔드 API에서 컨트랙트 정보 요청 중... ${API_URL}/proofs/contract/${contractType}`);
    
    const response = await axios.get(`${API_URL}/proofs/contract/${contractType}`);
    
    if (response.data && response.data.success) {
      console.log('API에서 컨트랙트 정보 불러오기 성공');
      return {
        abi: response.data.abi,
        address: response.data.address
      };
    }
    
    throw new Error('컨트랙트 정보를 가져오는데 실패했습니다.');
  } catch (error) {
    console.error('컨트랙트 정보 로딩 오류:', error);
    
    // 3단계: fallback으로 하드코딩된 ABI와 주소 사용
    console.log('하드코딩된 컨트랙트 정보 사용 중...');
    return getFallbackContractInfo(contractType);
  }
};

/**
 * 컨트랙트 타입에서 컨트랙트 이름을 가져옵니다.
 */
function getContractNameFromType(contractType) {
  const contractNames = {
    'zkare': 'Zkare',
    'patient': 'Zkare',
    'verifier': 'Groth16Verifier',
    'medicalData': 'MedicalDataVerifier',
    'medicalDataVerifier': 'MedicalDataVerifier',
    'medicalRecord': 'MedicalRecordVerifier',
    'medicalRecordVerifier': 'MedicalRecordVerifier',
    'medicalRecordViewer': 'MedicalRecordViewer',
    'bloodType': 'BloodTypeVerifier'
  };
  
  return contractNames[contractType] || 'Zkare';
}

/**
 * 백업 방법: 하드코딩된 기본 ABI와 주소를 반환합니다.
 * API 호출이 실패했을 때 사용됩니다.
 */
const getFallbackContractInfo = (contractType) => {
  // 환자 정보 컨트랙트 기본값
  if (contractType === 'patient') {
    return {
      abi: [
        {
          "inputs": [
            { "internalType": "address", "name": "patientAddress", "type": "address" }
          ],
          "name": "getPatientData",
          "outputs": [
            { "internalType": "string", "name": "name", "type": "string" },
            { "internalType": "uint256", "name": "height", "type": "uint256" },
            { "internalType": "uint256", "name": "weight", "type": "uint256" },
            { "internalType": "uint8", "name": "bloodType", "type": "uint8" }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            { "internalType": "address", "name": "_patientAddress", "type": "address" },
            { "internalType": "string", "name": "_name", "type": "string" },
            { "internalType": "uint256", "name": "_height", "type": "uint256" },
            { "internalType": "uint256", "name": "_weight", "type": "uint256" },
            { "internalType": "uint8", "name": "_bloodType", "type": "uint8" }
          ],
          "name": "addPatientInfo",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        }
      ],
      address: process.env.REACT_APP_PATIENT_CONTRACT_ADDRESS || '0x0165878A594ca255338adfa4d48449f69242Eb8F'
    };
  }
  
  // 검증자(verifier) 컨트랙트 기본값
  if (contractType === 'verifier') {
    return {
      abi: [
        {
          "inputs": [
            {
              "internalType": "uint256[2]",
              "name": "a",
              "type": "uint256[2]"
            },
            {
              "internalType": "uint256[2][2]",
              "name": "b",
              "type": "uint256[2][2]"
            },
            {
              "internalType": "uint256[2]",
              "name": "c",
              "type": "uint256[2]"
            },
            {
              "internalType": "uint256[2]",
              "name": "input",
              "type": "uint256[2]"
            }
          ],
          "name": "verifyProof",
          "outputs": [
            {
              "internalType": "bool",
              "name": "",
              "type": "bool"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        }
      ],
      address: process.env.REACT_APP_VERIFIER_CONTRACT_ADDRESS || '0x0165878A594ca255338adfa4d48449f69242Eb8F'
    };
  }
  
  // 기본값 반환
  return {
    abi: [],
    address: '0x0000000000000000000000000000000000000000'
  };
};

/**
 * 이더스캔 API를 통해 컨트랙트 ABI를 가져옵니다 (대체 방법).
 * API 키가 필요하며, 네트워크에 따라 URL이 다릅니다.
 * @param {string} contractAddress 컨트랙트 주소
 * @returns {Promise<any>} 컨트랙트 ABI
 */
export const getContractABIFromEtherscan = async (contractAddress) => {
  try {
    const etherscanApiKey = process.env.REACT_APP_ETHERSCAN_API_KEY;
    const network = process.env.REACT_APP_NETWORK || 'sepolia';
    
    // 네트워크에 따른 이더스캔 API URL
    const etherscanUrl = {
      'mainnet': 'https://api.etherscan.io/api',
      'sepolia': 'https://api-sepolia.etherscan.io/api',
      'goerli': 'https://api-goerli.etherscan.io/api'
    }[network] || 'https://api-sepolia.etherscan.io/api';
    
    const response = await axios.get(etherscanUrl, {
      params: {
        module: 'contract',
        action: 'getabi',
        address: contractAddress,
        apikey: etherscanApiKey
      }
    });
    
    if (response.data.status === '1') {
      return JSON.parse(response.data.result);
    }
    
    throw new Error(`이더스캔 API 오류: ${response.data.message}`);
  } catch (error) {
    console.error('이더스캔 API 호출 오류:', error);
    throw error;
  }
}; 