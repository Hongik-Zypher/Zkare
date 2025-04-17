const express = require('express');
const router = express.Router();
const medicalController = require('../controllers/medicalController');

/**
 * @route   POST /api/medical/blood-type/proof
 * @desc    혈액형 증명 생성
 * @access  Public
 */
router.post('/blood-type/proof', medicalController.generateBloodTypeProof);

/**
 * @route   POST /api/medical/blood-type/verify
 * @desc    혈액형 증명 검증
 * @access  Public
 */
router.post('/blood-type/verify', medicalController.verifyBloodTypeProof);

module.exports = router; 