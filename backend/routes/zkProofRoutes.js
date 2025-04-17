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

/**
 * @route   POST /api/proofs/generate
 * @desc    ZK 증명 생성 (일반)
 * @access  Public
 */
router.post('/generate', proofController.generateProof);

/**
 * @route   POST /api/proofs/verify
 * @desc    ZK 증명 검증 (일반)
 * @access  Public
 */
router.post('/verify', proofController.verifyProof);

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

// 프루프 조회 라우트
router.get('/:id', proofController.getProofById);
router.get('/', proofController.getAllProofs);

// 새 엔드포인트 추가
router.post('/prepare-verification', proofController.prepareProofVerification);
router.post('/submit-transaction', proofController.submitSignedTransaction);

module.exports = router; 