const ZkProofService = require('../services/zkProofService');
const config = require('../config');
const path = require('path');
const { generateBloodTypeZkProof, verifyBloodTypeZkProof } = require('../services/zkProofService');

// 필수 환경 변수 확인
if (!config.CONTRACT_ADDRESS) {
  console.error('오류: CONTRACT_ADDRESS가 설정되지 않았습니다. 서비스를 초기화할 수 없습니다.');
}

// ZK 증명 서비스 인스턴스 생성
let zkProofService;
try {
  zkProofService = new ZkProofService({
    providerUrl: config.RPC_URL,
    verifierContractAddress: config.CONTRACT_ADDRESS,
    verifierABI: require('../constants/verifierABI.json')
  });
  // 개발 모드에서만 로그 출력
  if (config.NODE_ENV === 'development' && process.env.DEBUG) {
    console.log('ZkProofService 초기화 성공');
  }
} catch (error) {
  console.error('ZkProofService 초기화 실패:', error);
}

// 증명 저장소 (실제 프로덕션에서는 데이터베이스를 사용해야 함)
const proofsDB = [];

/**
 * ZK 증명 생성 컨트롤러
 * @param {Object} req - 요청 객체 (patientAddress, requestId, requesterAddress 포함)
 * @param {Object} res - 응답 객체
 */
exports.generateProof = async (req, res) => {
  try {
    // ZkProofService 인스턴스 확인
    if (!zkProofService) {
      return res.status(500).json({ 
        success: false, 
        message: 'ZK 증명 서비스가 초기화되지 않았습니다. 서버 로그를 확인하세요.' 
      });
    }

    const { patientAddress, requestId, requesterAddress } = req.body;
    
    // 필수 파라미터 검증
    if (!patientAddress || !requestId || !requesterAddress) {
      return res.status(400).json({ 
        success: false, 
        message: '모든 필수 파라미터를 제공해야 합니다.' 
      });
    }

    // ZK 증명 생성
    const proofData = await zkProofService.generateProof(
      patientAddress, 
      requestId, 
      requesterAddress
    );

    // 증명 저장 (ID 생성)
    const proofId = Date.now().toString();
    const savedProof = {
      id: proofId,
      ...proofData,
      createdAt: new Date().toISOString()
    };
    
    proofsDB.push(savedProof);

    // 성공 응답
    res.status(200).json({
      success: true,
      proofId,
      data: proofData
    });
  } catch (error) {
    console.error('증명 생성 오류:', error);
    res.status(500).json({
      success: false,
      message: '증명 생성 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

/**
 * 증명 상태 확인 컨트롤러
 * @param {Object} req - 요청 객체 (nullifierHash 파라미터 포함)
 * @param {Object} res - 응답 객체
 */
exports.verifyProofStatus = async (req, res) => {
  try {
    // ZkProofService 인스턴스 확인
    if (!zkProofService) {
      return res.status(500).json({ 
        success: false, 
        message: 'ZK 증명 서비스가 초기화되지 않았습니다. 서버 로그를 확인하세요.' 
      });
    }

    const { nullifierHash } = req.params;
    
    if (!nullifierHash) {
      return res.status(400).json({ 
        success: false, 
        message: 'nullifierHash 파라미터가 필요합니다.' 
      });
    }

    // 증명 상태 확인
    const isUsed = await zkProofService.verifyProofStatus(nullifierHash);

    res.status(200).json({
      success: true,
      isUsed
    });
  } catch (error) {
    console.error('증명 상태 확인 오류:', error);
    res.status(500).json({
      success: false,
      message: '증명 상태 확인 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

/**
 * 증명 오프체인 검증 컨트롤러
 * @param {Object} req - 요청 객체 (proof와 publicSignals 포함)
 * @param {Object} res - 응답 객체
 */
exports.validateProof = async (req, res) => {
  try {
    // ZkProofService 인스턴스 확인
    if (!zkProofService) {
      return res.status(500).json({ 
        success: false, 
        message: 'ZK 증명 서비스가 초기화되지 않았습니다. 서버 로그를 확인하세요.' 
      });
    }

    const { proof, publicSignals } = req.body;
    
    if (!proof || !publicSignals) {
      return res.status(400).json({ 
        success: false, 
        message: 'proof와 publicSignals가 모두 필요합니다.' 
      });
    }

    // 증명 오프체인 검증
    const isValid = await zkProofService.validateProof(proof, publicSignals);

    res.status(200).json({
      success: true,
      isValid
    });
  } catch (error) {
    console.error('증명 검증 오류:', error);
    res.status(500).json({
      success: false,
      message: '증명 검증 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

/**
 * 증명 온체인 검증 컨트롤러 (레거시 지원용)
 * @param {Object} req - 요청 객체
 * @param {Object} res - 응답 객체
 * @deprecated - 지갑 연결 방식 전환으로 인해 prepareProofVerification 사용 권장
 */
exports.verifyProof = async (req, res) => {
  try {
    // ZkProofService 인스턴스 확인
    if (!zkProofService) {
      return res.status(500).json({ 
        success: false, 
        message: 'ZK 증명 서비스가 초기화되지 않았습니다. 서버 로그를 확인하세요.' 
      });
    }

    const { proof, publicInputs } = req.body;
    
    if (!proof || !publicInputs) {
      return res.status(400).json({
        success: false,
        message: 'proof와 publicInputs가 모두 필요합니다.'
      });
    }
    
    // 새로운 방식 안내
    console.warn('비권장 API 호출: verifyProof. 대신 prepare-verification을 사용하세요.');
    
    // 트랜잭션 데이터 준비
    const txData = await zkProofService.prepareProofTransaction(proof, publicInputs);
    
    res.status(200).json({
      success: true,
      message: '온체인 검증을 위해서는 사용자 지갑을 통한 서명이 필요합니다.',
      transactionData: txData,
      updateNotice: '새로운 API인 /api/proofs/prepare-verification과 /api/proofs/submit-transaction을 사용하세요.'
    });
  } catch (error) {
    console.error('온체인 증명 검증 오류:', error);
    res.status(500).json({
      success: false,
      message: '온체인 증명 검증 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

/**
 * ID로 증명 조회 컨트롤러
 * @param {Object} req - 요청 객체
 * @param {Object} res - 응답 객체
 */
exports.getProofById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: '증명 ID가 필요합니다.'
      });
    }
    
    // 증명 ID로 검색
    const proof = proofsDB.find(p => p.id === id);
    
    if (!proof) {
      return res.status(404).json({
        success: false,
        message: `ID ${id}에 해당하는 증명을 찾을 수 없습니다.`
      });
    }
    
    res.status(200).json({
      success: true,
      data: proof
    });
  } catch (error) {
    console.error('증명 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '증명 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

/**
 * 모든 증명 조회 컨트롤러
 * @param {Object} req - 요청 객체
 * @param {Object} res - 응답 객체
 */
exports.getAllProofs = async (req, res) => {
  try {
    // 필터링 옵션 (예: ?patientAddress=0x123...)
    const { patientAddress, requesterAddress } = req.query;
    
    let results = [...proofsDB];
    
    // 필터링 적용
    if (patientAddress) {
      results = results.filter(p => p.patientAddress === patientAddress);
    }
    
    if (requesterAddress) {
      results = results.filter(p => p.requesterAddress === requesterAddress);
    }
    
    // 최신순 정렬
    results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.status(200).json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    console.error('증명 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '증명 목록 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

/**
 * 증명 검증을 위한 트랜잭션 데이터 준비 컨트롤러
 * @param {Object} req - 요청 객체
 * @param {Object} res - 응답 객체
 */
exports.prepareProofVerification = async (req, res) => {
  try {
    // ZkProofService 인스턴스 확인
    if (!zkProofService) {
      return res.status(500).json({ 
        success: false, 
        message: 'ZK 증명 서비스가 초기화되지 않았습니다. 서버 로그를 확인하세요.' 
      });
    }

    const { proof, publicInputs } = req.body;
    
    if (!proof || !publicInputs) {
      return res.status(400).json({
        success: false,
        message: 'proof와 publicInputs가 모두 필요합니다.'
      });
    }
    
    // 트랜잭션 데이터만 준비
    const txData = await zkProofService.prepareProofTransaction(proof, publicInputs);
    
    res.status(200).json({
      success: true,
      transactionData: txData
    });
  } catch (error) {
    console.error('증명 검증 준비 오류:', error);
    res.status(500).json({
      success: false,
      message: '증명 검증 준비 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

/**
 * 서명된 트랜잭션 제출 컨트롤러
 * @param {Object} req - 요청 객체
 * @param {Object} res - 응답 객체
 */
exports.submitSignedTransaction = async (req, res) => {
  try {
    // ZkProofService 인스턴스 확인
    if (!zkProofService) {
      return res.status(500).json({ 
        success: false, 
        message: 'ZK 증명 서비스가 초기화되지 않았습니다. 서버 로그를 확인하세요.' 
      });
    }

    const { signedTx } = req.body;
    
    if (!signedTx) {
      return res.status(400).json({
        success: false,
        message: '서명된 트랜잭션이 필요합니다.'
      });
    }
    
    // 중복 생성 제거하고 기존 인스턴스 사용
    const result = await zkProofService.submitSignedTransaction(signedTx);
    
    res.status(200).json({
      success: true,
      transactionHash: result.transactionHash
    });
  } catch (error) {
    console.error('트랜잭션 제출 오류:', error);
    res.status(500).json({
      success: false,
      message: '트랜잭션 제출 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

/**
 * 컨트랙트 ABI 제공 컨트롤러
 * @param {Object} req - 요청 객체
 * @param {Object} res - 응답 객체
 */
exports.getContractABI = async (req, res) => {
  try {
    // verifierABI.json 파일에서 ABI 로드
    const abi = require('../constants/verifierABI.json');
    
    res.status(200).json({
      success: true,
      abi
    });
  } catch (error) {
    console.error('ABI 제공 오류:', error);
    res.status(500).json({
      success: false,
      message: 'ABI 제공 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

/**
 * 혈액형 ZK 증명 생성
 * @param {Object} req - Express 요청 객체
 * @param {Object} req.body - 요청 본문
 * @param {string} req.body.actualBloodTypeCode - 환자의 실제 혈액형 코드
 * @param {string} req.body.targetBloodTypeCode - 검증하려는 대상 혈액형 코드
 * @param {Object} res - Express 응답 객체
 */
exports.generateBloodTypeProof = async (req, res) => {
  try {
    const { actualBloodTypeCode, targetBloodTypeCode } = req.body;
    
    if (!actualBloodTypeCode || !targetBloodTypeCode) {
      return res.status(400).json({ 
        success: false, 
        message: '혈액형 코드가 누락되었습니다.' 
      });
    }
    
    console.log(`혈액형 증명 생성 요청: 실제=${actualBloodTypeCode}, 대상=${targetBloodTypeCode}`);
    
    const proofData = await generateBloodTypeZkProof(actualBloodTypeCode, targetBloodTypeCode);
    
    return res.status(200).json({
      success: true,
      message: '혈액형 증명이 성공적으로 생성되었습니다.',
      data: proofData
    });
  } catch (error) {
    console.error('혈액형 증명 생성 오류:', error);
    return res.status(500).json({
      success: false,
      message: '혈액형 증명 생성 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

/**
 * 혈액형 ZK 증명 검증
 * @param {Object} req - Express 요청 객체
 * @param {Object} req.body - 요청 본문
 * @param {Object} req.body.proof - 검증할 증명 데이터
 * @param {Object} res - Express 응답 객체
 */
exports.verifyBloodTypeProof = async (req, res) => {
  try {
    const { proof } = req.body;
    
    if (!proof) {
      return res.status(400).json({ 
        success: false, 
        message: '증명 데이터가 누락되었습니다.' 
      });
    }
    
    console.log('혈액형 증명 검증 요청 수신됨');
    
    const verificationResult = await verifyBloodTypeZkProof(proof);
    
    return res.status(200).json({
      success: true,
      message: '혈액형 증명 검증이 완료되었습니다.',
      isValid: verificationResult.isValid,
      data: verificationResult
    });
  } catch (error) {
    console.error('혈액형 증명 검증 오류:', error);
    return res.status(500).json({
      success: false,
      message: '혈액형 증명 검증 중 오류가 발생했습니다.',
      error: error.message
    });
  }
}; 