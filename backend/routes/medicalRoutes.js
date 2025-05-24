const express = require("express");
const router = express.Router();
const medicalController = require("../controllers/medicalController");

// 의료 기록 추가
router.post("/records", (req, res) =>
  medicalController.addMedicalRecord(req, res)
);

// 의료 기록 조회
router.get("/records/:patientAddress/:recordId", (req, res) =>
  medicalController.getMedicalRecord(req, res)
);

// 의사 추가
router.post("/doctors", (req, res) => medicalController.addDoctor(req, res));

// 의사 여부 확인
router.get("/doctors/:address", (req, res) =>
  medicalController.isDoctor(req, res)
);

module.exports = router;
