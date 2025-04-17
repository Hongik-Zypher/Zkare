const { HEADER_IDS, BLOOD_TYPES } = require('../models/medicalRecordSchema');
const ethers = require('ethers');

/**
 * 의료기록에서 혈액형 정보 추출
 * @param {Object} medicalRecord - 환자 의료기록
 * @returns {String|null} - 혈액형 (A, B, AB, O) 또는 null
 */
function extractBloodType(medicalRecord) {
  if (!medicalRecord || !medicalRecord.data || !Array.isArray(medicalRecord.data)) {
    console.error('유효하지 않은 의료기록 형식입니다.');
    return null;
  }

  // 헤더 ID가 1001(혈액형)인 데이터 항목 찾기
  const bloodTypeRecord = medicalRecord.data.find(item => item.header_id === HEADER_IDS.BLOOD_TYPE);
  
  if (!bloodTypeRecord) {
    console.warn('해당 의료기록에 혈액형 정보가 없습니다.');
    return null;
  }

  // 혈액형 값 검증
  const bloodType = bloodTypeRecord.value.toUpperCase();
  if (!Object.values(BLOOD_TYPES).includes(bloodType)) {
    console.error('유효하지 않은 혈액형 값입니다:', bloodType);
    return null;
  }

  return bloodType;
}

/**
 * 혈액형 코드 변환 (문자 -> 숫자)
 * @param {String} bloodType - 혈액형 문자열 (A, B, AB, O)
 * @returns {Number} - 혈액형 코드 (1: A, 2: B, 3: AB, 4: O)
 */
function getBloodTypeCode(bloodType) {
  if (!bloodType) return 0;
  
  switch(bloodType.toUpperCase()) {
    case 'A': return 1;
    case 'B': return 2;
    case 'AB': return 3;
    case 'O': return 4;
    default: return 0;
  }
}

/**
 * 혈액형 코드 변환 (숫자 -> 문자)
 * @param {Number} code - 혈액형 코드 (1: A, 2: B, 3: AB, 4: O)
 * @returns {String} - 혈액형 문자열 또는 null
 */
function getBloodTypeFromCode(code) {
  switch(code) {
    case 1: return 'A';
    case 2: return 'B';
    case 3: return 'AB';
    case 4: return 'O';
    default: return null;
  }
}

/**
 * 의료기록이 특정 혈액형인지 확인
 * @param {Object} medicalRecord - 환자 의료기록
 * @param {String} bloodType - 확인할 혈액형 (A, B, AB, O)
 * @returns {Boolean} - 일치 여부
 */
function verifyBloodType(medicalRecord, bloodType) {
  const actualBloodType = extractBloodType(medicalRecord);
  if (!actualBloodType) return false;

  return actualBloodType === bloodType.toUpperCase();
}

/**
 * 의료기록을 머클트리에 추가하기 위한 해시 생성
 * @param {Object} medicalRecord - 의료기록
 * @returns {String} - 해시값
 */
function hashMedicalRecord(medicalRecord) {
  if (!medicalRecord || !medicalRecord.data) {
    throw new Error('유효하지 않은 의료기록입니다.');
  }

  // 기록의 필드들을 연결하여 해싱
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ['string', 'string', 'uint256'],
      [
        medicalRecord.record_id,
        medicalRecord.patient_id,
        Math.floor(new Date(medicalRecord.timestamp).getTime() / 1000)
      ]
    )
  );
}

module.exports = {
  extractBloodType,
  getBloodTypeCode,
  getBloodTypeFromCode,
  verifyBloodType,
  hashMedicalRecord
}; 