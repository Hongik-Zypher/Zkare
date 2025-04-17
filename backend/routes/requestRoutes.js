const express = require('express');
const router = express.Router();

// 메모리에 요청을 저장할 배열
const requests = [];
let requestIdCounter = 1;

/**
 * @route POST /api/requests
 * @desc 새 요청 생성
 * @access Public
 */
router.post('/', (req, res) => {
  try {
    const { patientAddress, requesterAddress, recordType, reason } = req.body;
    
    // 입력 검증
    if (!patientAddress || !requesterAddress || !recordType || !reason) {
      return res.status(400).json({
        success: false,
        message: '모든 필수 필드를 입력해주세요.'
      });
    }
    
    console.log(`새 요청 생성: ${requesterAddress}가 ${patientAddress}에게 ${recordType} 요청`);
    
    // 실제로는 데이터베이스에 저장하겠지만 임시로 메모리에 저장
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 요청 생성 성공 응답
    return res.status(201).json({
      success: true,
      message: '요청이 성공적으로 생성되었습니다.',
      request: {
        requestId: requestId,
        patientAddress,
        requesterAddress,
        recordType,
        reason,
        createdAt: Date.now(),
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('요청 생성 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

/**
 * @route GET /api/requests
 * @desc 모든 요청 조회
 * @access Public
 */
router.get('/', (req, res) => {
  try {
    // 더미 데이터 반환
    return res.json({
      success: true,
      requests: [
        {
          id: 'req_123456',
          patientAddress: '0xd156da7fd9179DB748a0119Be1a8697daB32F388',
          requesterAddress: '0x0165878A594ca255338adfa4d48449f69242Eb8F',
          requestType: 'bloodType',
          description: '수술 전 혈액형 확인이 필요합니다',
          timestamp: Date.now() - 3600000, // 1시간 전
          status: 'approved'
        },
        {
          id: 'req_789012',
          patientAddress: '0xd156da7fd9179DB748a0119Be1a8697daB32F388',
          requesterAddress: '0x0165878A594ca255338adfa4d48449f69242Eb8F',
          requestType: 'medicalHistory',
          description: '이전 수술 기록이 필요합니다',
          timestamp: Date.now() - 7200000, // 2시간 전
          status: 'pending'
        }
      ]
    });
  } catch (error) {
    console.error('요청 조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

/**
 * @route GET /api/requests/:id
 * @desc 특정 요청 조회
 * @access Public
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    // 더미 데이터 반환
    return res.json({
      success: true,
      request: {
        id: id,
        patientAddress: '0xd156da7fd9179DB748a0119Be1a8697daB32F388',
        requesterAddress: '0x0165878A594ca255338adfa4d48449f69242Eb8F',
        requestType: 'bloodType',
        description: '수술 전 혈액형 확인이 필요합니다',
        timestamp: Date.now() - 3600000, // 1시간 전
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('요청 조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

/**
 * @route PUT /api/requests/:id
 * @desc 요청 상태 업데이트
 * @access Public
 */
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '유효한 상태 값을 입력해주세요.'
      });
    }
    
    // 업데이트 성공 응답
    return res.json({
      success: true,
      message: '요청 상태가 성공적으로 업데이트되었습니다.',
      request: {
        id: id,
        status: status,
        updatedAt: Date.now()
      }
    });
  } catch (error) {
    console.error('요청 상태 업데이트 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

/**
 * @route GET /api/requests/patient
 * @desc 환자 주소를 기준으로 요청 조회
 * @access Public
 */
router.get('/patient', (req, res) => {
  try {
    const { patientAddress } = req.query;
    
    if (!patientAddress) {
      return res.status(400).json({
        success: false,
        message: '환자 주소를 입력해주세요.'
      });
    }
    
    console.log(`환자 주소 ${patientAddress}에 대한 요청 조회`);
    
    // 더미 데이터 반환
    return res.json({
      success: true,
      requests: [
        {
          requestId: 'req_123456',
          patientAddress: patientAddress,
          requesterAddress: '0x0165878A594ca255338adfa4d48449f69242Eb8F',
          recordType: 'bloodType',
          reason: '수술 전 혈액형 확인이 필요합니다',
          createdAt: Date.now() - 3600000, // 1시간 전
          status: 'approved',
          updatedAt: Date.now() - 1800000 // 30분 전
        },
        {
          requestId: 'req_789012',
          patientAddress: patientAddress,
          requesterAddress: '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6',
          recordType: 'medicalHistory',
          reason: '이전 수술 기록이 필요합니다',
          createdAt: Date.now() - 7200000, // 2시간 전
          status: 'pending'
        }
      ]
    });
  } catch (error) {
    console.error('환자별 요청 조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

/**
 * @route GET /api/requests/requester
 * @desc 요청자 주소를 기준으로 요청 조회
 * @access Public
 */
router.get('/requester', (req, res) => {
  try {
    const { requesterAddress } = req.query;
    
    if (!requesterAddress) {
      return res.status(400).json({
        success: false,
        message: '요청자 주소를 입력해주세요.'
      });
    }
    
    console.log(`요청자 주소 ${requesterAddress}에 대한 요청 조회`);
    
    // 더미 데이터 반환
    return res.json({
      success: true,
      requests: [
        {
          requestId: 'req_123456',
          patientAddress: '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853',
          requesterAddress: requesterAddress,
          recordType: 'bloodType',
          reason: '수술 전 혈액형 확인이 필요합니다',
          createdAt: Date.now() - 3600000, // 1시간 전
          status: 'approved',
          updatedAt: Date.now() - 1800000 // 30분 전
        },
        {
          requestId: 'req_789012',
          patientAddress: '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318',
          requesterAddress: requesterAddress,
          recordType: 'medicalHistory',
          reason: '이전 수술 기록이 필요합니다',
          createdAt: Date.now() - 7200000, // 2시간 전
          status: 'pending'
        }
      ]
    });
  } catch (error) {
    console.error('요청자별 요청 조회 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

/**
 * @route POST /api/requests/:requestId/approve
 * @desc 요청 승인
 * @access Public
 */
router.post('/:requestId/approve', (req, res) => {
  try {
    const { requestId } = req.params;
    const { patientAddress } = req.body;
    
    if (!patientAddress) {
      return res.status(400).json({
        success: false,
        message: '환자 주소를 입력해주세요.'
      });
    }
    
    console.log(`요청 ID ${requestId} 승인 처리: 환자 ${patientAddress}`);
    
    // 승인 성공 응답
    return res.json({
      success: true,
      message: '요청이 성공적으로 승인되었습니다.',
      request: {
        requestId,
        patientAddress,
        status: 'approved',
        updatedAt: Date.now()
      }
    });
  } catch (error) {
    console.error('요청 승인 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

/**
 * @route POST /api/requests/:requestId/deny
 * @desc 요청 거부
 * @access Public
 */
router.post('/:requestId/deny', (req, res) => {
  try {
    const { requestId } = req.params;
    const { patientAddress } = req.body;
    
    if (!patientAddress) {
      return res.status(400).json({
        success: false,
        message: '환자 주소를 입력해주세요.'
      });
    }
    
    console.log(`요청 ID ${requestId} 거부 처리: 환자 ${patientAddress}`);
    
    // 거부 성공 응답
    return res.json({
      success: true,
      message: '요청이 성공적으로 거부되었습니다.',
      request: {
        requestId,
        patientAddress,
        status: 'denied',
        updatedAt: Date.now()
      }
    });
  } catch (error) {
    console.error('요청 거부 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

module.exports = router; 