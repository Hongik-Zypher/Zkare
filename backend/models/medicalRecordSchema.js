/**
 * 표준화된 의료기록 JSON 스키마
 * 헤더 번호(header_id)로 각 필드를 식별합니다.
 * 
 * 주요 헤더 ID:
 * 1000: 환자 기본 정보
 * 1001: 혈액형 정보 (A, B, AB, O)
 * 1002: 알러지 정보
 * 2000: 검사 결과
 * 3000: 처방 정보
 */

const standardMedicalRecordSchema = {
  patient_id: String,
  record_id: String,
  timestamp: Date,
  data: [
    {
      header_id: Number,
      name: String,
      value: String,
      unit: String,
      timestamp: Date
    }
  ],
  hash: String,
  signature: String
};

// 혈액형 값에 대한 상수 정의
const BLOOD_TYPES = {
  A: "A",
  B: "B",
  AB: "AB",
  O: "O"
};

// 헤더 ID 상수
const HEADER_IDS = {
  PATIENT_INFO: 1000,
  BLOOD_TYPE: 1001,
  ALLERGIES: 1002,
  TEST_RESULTS: 2000,
  PRESCRIPTIONS: 3000
};

module.exports = {
  standardMedicalRecordSchema,
  BLOOD_TYPES,
  HEADER_IDS
}; 