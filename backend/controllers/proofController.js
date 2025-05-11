const ZkProofService = require('../services/zkProofService');
const config = require('../config');
const path = require('path');

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
    const { patientAddress, requestId, requesterAddress } = req.body;
    
    if (!patientAddress || !requestId || !requesterAddress) {
      return res.status(400).json({
        success: false,
        message: '필수 파라미터가 누락되었습니다. (patientAddress, requestId, requesterAddress)'
      });
    }
    
    console.log(`증명 생성 요청: 환자=${patientAddress}, 요청ID=${requestId}, 요청자=${requesterAddress}`);
    
    const proofData = await zkProofService.createProof(patientAddress, requestId, requesterAddress);
    
    return res.json({
      success: true,
      message: '증명이 성공적으로 생성되었습니다.',
      proofData
    });
  } catch (error) {
    console.error('증명 생성 오류:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '증명 생성 중 오류가 발생했습니다.'
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
    const { proof, publicSignals } = req.body;
    
    if (!proof || !publicSignals) {
      return res.status(400).json({
        success: false,
        message: '증명 데이터가 필요합니다.'
      });
    }
    
    const isValid = await zkProofService.validateProof(proof, publicSignals);
    
    return res.json({
      success: true,
      isValid
    });
  } catch (error) {
    console.error('증명 검증 오류:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '증명 검증 중 오류가 발생했습니다.'
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
    const { proof, publicInputs } = req.body;
    
    if (!proof || !publicInputs) {
      return res.status(400).json({
        success: false,
        message: '증명 데이터가 필요합니다.'
      });
    }
    
    const transactionData = await zkProofService.prepareVerifyTransaction(proof, publicInputs);
    
    return res.json({
      success: true,
      transactionData
    });
  } catch (error) {
    console.error('검증 트랜잭션 준비 오류:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '검증 트랜잭션 준비 중 오류가 발생했습니다.'
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
 * 혈액형 ZK 증명 생성 컨트롤러
 * @param {Object} req - 요청 객체
 * @param {Object} res - 응답 객체
 */
exports.generateBloodTypeProof = async (req, res) => {
  try {
    console.log('혈액형 증명 생성 요청 받음:', req.body);
    
    // ZkProofService 인스턴스 확인
    if (!zkProofService) {
      console.error('ZK 증명 서비스가 초기화되지 않았습니다.');
      return res.status(500).json({ 
        success: false, 
        message: 'ZK 증명 서비스가 초기화되지 않았습니다. 서버 로그를 확인하세요.' 
      });
    }

    const { patientAddress, actualBloodTypeCode, targetBloodTypeCode } = req.body;
    
    // 파라미터 검증
    if (!patientAddress || actualBloodTypeCode === undefined || targetBloodTypeCode === undefined) {
      console.error('필수 파라미터가 누락되었습니다:', req.body);
      return res.status(400).json({ 
        success: false, 
        message: 'patientAddress, actualBloodTypeCode, targetBloodTypeCode 파라미터가 모두 필요합니다.' 
      });
    }
    
    // 혈액형 코드 검증 (1-4 범위 내에 있어야 함)
    if (actualBloodTypeCode < 1 || actualBloodTypeCode > 4 || targetBloodTypeCode < 1 || targetBloodTypeCode > 4) {
      console.error('혈액형 코드가 유효하지 않습니다:', { actualBloodTypeCode, targetBloodTypeCode });
      return res.status(400).json({
        success: false,
        message: '혈액형 코드는 1(A형), 2(B형), 3(AB형), 4(O형) 중 하나여야 합니다.'
      });
    }

    // 환자 주소 검증 (유효한 이더리움 주소 형식)
    if (!patientAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      console.error('유효하지 않은 환자 주소:', patientAddress);
      return res.status(400).json({
        success: false,
        message: '유효한 이더리움 주소 형식이 아닙니다.'
      });
    }

    console.log('혈액형 증명 생성 시작...');
    console.log('서비스 호출 파라미터:', { patientAddress, actualBloodTypeCode, targetBloodTypeCode });
    
    try {
      // 혈액형 증명 생성
      const proofData = await zkProofService.generateBloodTypeProof(
        patientAddress,
        actualBloodTypeCode,
        targetBloodTypeCode
      );
      
      console.log('혈액형 증명 생성 완료:', { proofExists: !!proofData });
      
      // 증명 생성 실패
      if (!proofData) {
        return res.status(500).json({
          success: false,
          message: '혈액형 증명 생성에 실패했습니다.'
        });
      }
      
      // 응답 생성
      res.status(200).json({
        success: true,
        message: '혈액형 증명이 성공적으로 생성되었습니다.',
        proofData: {
          proof: proofData.proof,
          publicSignals: proofData.publicSignals,
          isMatch: proofData.isMatch,
          actualBloodTypeCode,
          targetBloodTypeCode
        }
      });
    } catch (innerError) {
      console.error('서비스 내부 오류:', innerError);
      return res.status(500).json({
        success: false,
        message: '증명 생성 중 내부 오류가 발생했습니다.',
        error: innerError.message
      });
    }
  } catch (error) {
    console.error('혈액형 증명 생성 컨트롤러 오류:', error);
    res.status(500).json({
      success: false,
      message: '혈액형 증명 생성 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

/**
 * 혈액형 ZK 증명 검증 컨트롤러
 * @param {Object} req - 요청 객체
 * @param {Object} res - 응답 객체
 */
exports.verifyBloodTypeProof = async (req, res) => {
  try {
    console.log('혈액형 증명 검증 요청 받음:', JSON.stringify(req.body, null, 2));
    
    // ZkProofService 인스턴스 확인
    if (!zkProofService) {
      console.error('ZK 증명 서비스가 초기화되지 않았습니다.');
      return res.status(500).json({ 
        success: false, 
        message: 'ZK 증명 서비스가 초기화되지 않았습니다. 서버 로그를 확인하세요.' 
      });
    }

    const { proof, publicSignals } = req.body;
    
    // 필수 파라미터 검증
    if (!proof || !publicSignals) {
      console.error('필수 파라미터가 누락되었습니다:', req.body);
      return res.status(400).json({ 
        success: false, 
        message: 'proof와 publicSignals 파라미터가 모두 필요합니다.' 
      });
    }
    
    // proof 형식 검증 - 객체 형태 허용
    if (typeof proof !== 'object') {
      console.error('증명 데이터 형식이 잘못되었습니다:', proof);
      return res.status(400).json({
        success: false,
        message: 'proof는 유효한 객체여야 합니다.'
      });
    }
    
    // publicSignals 형식 검증
    if (!Array.isArray(publicSignals) || publicSignals.length === 0) {
      console.error('공개 입력값 형식이 잘못되었습니다:', publicSignals);
      return res.status(400).json({
        success: false,
        message: 'publicSignals는 비어있지 않은 배열이어야 합니다.'
      });
    }

    console.log('혈액형 증명 검증 시작...');
    
    try {
      // 증명 검증
      const isValid = await zkProofService.verifyBloodTypeProof(proof, publicSignals);
      console.log('혈액형 증명 검증 결과:', isValid);
      
      // 결과 분석
      let isMatch = false;
      try {
        // publicSignals에서 isMatch 값 추출 (0 또는 1)
        isMatch = publicSignals[0] === '1';
      } catch (parseError) {
        console.warn('공개 입력값에서 isMatch를 추출할 수 없습니다:', parseError);
      }
      
      // 응답 생성
      res.status(200).json({
        success: true,
        isValid,
        isMatch,
        message: isValid 
          ? (isMatch ? '증명이 유효하며, 혈액형이 일치합니다.' : '증명이 유효하며, 혈액형이 일치하지 않습니다.') 
          : '증명이 유효하지 않습니다.'
      });
    } catch (innerError) {
      console.error('검증 서비스 내부 오류:', innerError);
      return res.status(500).json({
        success: false,
        message: '증명 검증 중 내부 오류가 발생했습니다.',
        error: innerError.message
      });
    }
  } catch (error) {
    console.error('혈액형 증명 검증 컨트롤러 오류:', error);
    res.status(500).json({
      success: false,
      message: '혈액형 증명 검증 중 오류가 발생했습니다.',
      error: error.message
    });
  }
};

/**
 * 환자가 승인 후 ZK 증명 생성
 * @param {Request} req - Express 요청 객체
 * @param {Response} res - Express 응답 객체
 */
exports.generatePatientProof = async (req, res) => {
  try {
    const { 
      requestId, 
      patientAddress, 
      requesterAddress, 
      patientData 
    } = req.body;
    
    if (!patientAddress || !requestId || !requesterAddress || !patientData) {
      return res.status(400).json({
        success: false,
        message: '필수 파라미터가 누락되었습니다.'
      });
    }
    
    console.log(`환자 증명 생성 요청: 환자=${patientAddress}, 요청ID=${requestId}, 요청자=${requesterAddress}`);
    
    // 환자 데이터 검증 (실제로는 DB와 대조하거나 스마트 컨트랙트에서 가져온 값 사용)
    if (patientData.bloodTypeCode < 1 || patientData.bloodTypeCode > 4) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 혈액형 코드입니다.'
      });
    }
    
    // 승인 상태 확인 (선택적)
    try {
      const approvalStatus = await zkProofService.checkApprovalStatus(patientAddress, requestId);
      if (!approvalStatus.isApproved) {
        return res.status(400).json({
          success: false,
          message: '아직 요청이 승인되지 않았습니다.'
        });
      }
    } catch (statusError) {
      console.error('승인 상태 확인 오류:', statusError);
      // 승인 상태 확인 실패는 무시하고 계속 진행 (옵션)
    }
    
    // 증명 생성을 위한 입력값 구성
    const bloodTypeInput = {
      actualBloodTypeCode: patientData.bloodTypeCode,
      targetBloodTypeCode: patientData.bloodTypeCode
    };
    
    // 혈액형 검증을 위한 증명 생성
    const proofData = await zkProofService.generateBloodTypeProof(
      patientAddress, 
      bloodTypeInput.actualBloodTypeCode,
      bloodTypeInput.targetBloodTypeCode
    );
    
    return res.json({
      success: true,
      message: '환자 데이터를 위한 증명이 성공적으로 생성되었습니다.',
      proofData
    });
  } catch (error) {
    console.error('환자 증명 생성 오류:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '증명 생성 중 오류가 발생했습니다.'
    });
  }
};

/**
 * 증명 상태 확인
 * @param {Request} req - Express 요청 객체
 * @param {Response} res - Express 응답 객체
 */
exports.getProofStatus = async (req, res) => {
  try {
    const { nullifierHash } = req.params;
    
    if (!nullifierHash) {
      return res.status(400).json({
        success: false,
        message: 'Nullifier 해시가 필요합니다.'
      });
    }
    
    // 실제 구현에서는 DB나 이벤트 로그에서 해당 증명의 상태를 확인
    const status = await zkProofService.getProofStatus(nullifierHash);
    
    return res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('증명 상태 확인 오류:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '증명 상태 확인 중 오류가 발생했습니다.'
    });
  }
}; 