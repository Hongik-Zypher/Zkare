const express = require('express');
const router = express.Router();
const proofController = require('../controllers/proofController');

/**
 * @route   POST /api/proofs
 * @desc    요청자를 위한 ZK 증명 생성 (기존 방식)
 * @access  Public
 */
router.post('/', proofController.generateProof);

/**
 * @route   POST /api/proofs/generate
 * @desc    환자가 승인 후 ZK 증명 생성
 * @access  Public
 */
router.post('/generate', proofController.generatePatientProof);

/**
 * @route   GET /api/proofs/status/:nullifierHash
 * @desc    증명 상태 확인
 * @access  Public
 */
router.get('/status/:nullifierHash', proofController.getProofStatus);

/**
 * @route   POST /api/proofs/validate
 * @desc    오프체인 증명 검증
 * @access  Public
 */
router.post('/validate', proofController.validateProof);

/**
 * @route   POST /api/proofs/verify
 * @desc    온체인 증명 검증
 * @access  Public
 */
router.post('/verify', proofController.verifyProof);

module.exports = router; 