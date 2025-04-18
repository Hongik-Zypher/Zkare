const express = require('express');
const router = express.Router();
const proofController = require('../controllers/proofController');

/**
 * @route   POST /api/proofs
 * @desc    ZK 증명 생성
 * @access  Public
 */
router.post('/', proofController.generateProof);

/**
 * @route   GET /api/proofs/status/:nullifierHash
 * @desc    증명 상태 확인 (사용 여부)
 * @access  Public
 */
router.get('/status/:nullifierHash', proofController.verifyProofStatus);

/**
 * @route   POST /api/proofs/validate
 * @desc    증명 오프체인 검증
 * @access  Public
 */
router.post('/validate', proofController.validateProof);

/**
 * @route   GET /api/proofs/contract-abi
 * @desc    컨트랙트 ABI 제공
 * @access  Public
 */
router.get('/contract-abi', proofController.getContractABI);

// 프루프 생성 및 검증 라우트
router.post('/generate', proofController.generateProof);
router.post('/verify', proofController.verifyProof);

// 프루프 조회 라우트
router.get('/:id', proofController.getProofById);
router.get('/', proofController.getAllProofs);

// 새 엔드포인트 추가
router.post('/prepare-verification', proofController.prepareProofVerification);
router.post('/submit-transaction', proofController.submitSignedTransaction);

/**
 * @route   POST /api/proofs/blood-type/generate
 * @desc    혈액형 ZK 증명 생성
 * @access  Public
 */
router.post('/blood-type/generate', proofController.generateBloodTypeProof);

/**
 * @route   POST /api/proofs/blood-type/verify
 * @desc    혈액형 ZK 증명 검증
 * @access  Public
 */
router.post('/blood-type/verify', proofController.verifyBloodTypeProof);

// 컨트랙트 정보 제공 엔드포인트 추가
router.get('/contract/:type', (req, res) => {
  const { type } = req.params;
  
  try {
    let contractInfo = {};
    
    if (type === 'patient') {
      contractInfo = {
        address: process.env.PATIENT_CONTRACT_ADDRESS || '0x0165878A594ca255338adfa4d48449f69242Eb8F',
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
        ]
      };
    } else if (type === 'verifier') {
      contractInfo = {
        address: process.env.GROTH16_VERIFIER_ADDRESS || '0x0165878A594ca255338adfa4d48449f69242Eb8F',
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
        ]
      };
    } else {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 컨트랙트 타입입니다.'
      });
    }
    
    res.json({
      success: true,
      address: contractInfo.address,
      abi: contractInfo.abi
    });
  } catch (error) {
    console.error('컨트랙트 정보 제공 오류:', error);
    res.status(500).json({
      success: false,
      message: '컨트랙트 정보를 가져오는 중 오류가 발생했습니다.'
    });
  }
});

module.exports = router; 