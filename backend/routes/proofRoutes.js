const express = require('express');
const router = express.Router();
const proofController = require('../controllers/proofController');

/**
 * @route POST /api/proofs/blood-type/generate
 * @desc 혈액형 ZK 증명 생성 API
 * @access Private
 */
router.post('/blood-type/generate', proofController.generateBloodTypeProof);

/**
 * @route POST /api/proofs/blood-type/verify
 * @desc 혈액형 ZK 증명 검증 API
 * @access Private
 */
router.post('/blood-type/verify', proofController.verifyBloodTypeProof);

module.exports = router; 