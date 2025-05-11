import React, { useState, useEffect } from 'react';
import {
  Box, 
  Typography, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Button, 
  CircularProgress, 
  Alert,
  Stepper,
  Step,
  StepLabel,
  Paper
} from '@mui/material';
import { 
  generateBloodTypeProof, 
  verifyMedicalData, 
  requestVerification, 
  respondToVerification, 
  submitProof,
  checkBloodType
} from '../utils/medicalVerificationService';

// 혈액형 코드 변환 함수
const bloodTypeToCode = (type) => {
  switch(type) {
    case 'A': return 1;
    case 'B': return 2;
    case 'O': return 3;
    case 'AB': return 4;
    default: return 0;
  }
};

// 혈액형 코드에서 이름으로 변환
const codeToBloodType = (code) => {
  switch(Number(code)) {
    case 1: return 'A';
    case 2: return 'B';
    case 3: return 'O';
    case 4: return 'AB';
    default: return '알 수 없음';
  }
};

/**
 * 혈액형 검증 컴포넌트
 * @param {Object} props - 속성
 * @param {String} props.patientAddress - 환자 이더리움 주소
 * @param {String} props.requesterAddress - 요청자 이더리움 주소
 * @param {Boolean} props.isPatient - 현재 로그인한 사용자가 환자인지 여부
 * @param {Function} props.onComplete - 검증 완료 후 호출될 콜백 함수 
 */
const BloodTypeVerification = ({ patientAddress, requesterAddress, isPatient, onComplete }) => {
  const [targetBloodType, setTargetBloodType] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [requestId, setRequestId] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [verificationResult, setVerificationResult] = useState(null);
  const [directCheckResult, setDirectCheckResult] = useState(null);

  // 검증 단계
  const steps = [
    '혈액형 선택',
    '검증 요청 전송',
    '환자 승인 대기',
    'ZK 증명 생성 및 제출',
    '검증 결과 확인'
  ];

  // 요청자 모드인 경우 검증 요청 전송
  const handleSendRequest = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const targetBloodTypeCode = bloodTypeToCode(targetBloodType);
      
      // 1. 혈액형 검증 요청 전송
      console.log('1. 혈액형 검증 요청 전송 중...');
      const requestResponse = await requestVerification(
        patientAddress,
        "bloodType",
        targetBloodTypeCode
      );

      if (!requestResponse.success) {
        throw new Error(requestResponse.message || '검증 요청 전송에 실패했습니다.');
      }

      // 요청 ID 저장
      setRequestId(requestResponse.requestId);
      console.log('요청 ID:', requestResponse.requestId);
      
      // 다음 단계로 이동
      setActiveStep(2);
      setResult({
        success: true,
        message: `${targetBloodType}형 검증 요청이 전송되었습니다. 환자의 승인을 기다립니다.`
      });
      
    } catch (error) {
      console.error('검증 요청 전송 오류:', error);
      setError(error.message || '검증 요청 전송 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 환자 모드인 경우 요청 승인
  const handleApproveRequest = async () => {
    if (!requestId) {
      setError('승인할 요청 ID가 없습니다.');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // 요청 승인
      console.log('2. 검증 요청 승인 중...');
      const approvalResponse = await respondToVerification(requestId, true);

      if (!approvalResponse.success) {
        throw new Error(approvalResponse.message || '요청 승인에 실패했습니다.');
      }

      // 다음 단계로 이동
      setActiveStep(3);
      setResult({
        success: true,
        message: '검증 요청이 승인되었습니다. ZK 증명을 생성하고 제출합니다.'
      });
      
    } catch (error) {
      console.error('요청 승인 오류:', error);
      setError(error.message || '요청 승인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // ZK 증명 생성 및 제출
  const handleSubmitProof = async () => {
    if (!requestId) {
      setError('제출할 요청 ID가 없습니다.');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const targetBloodTypeCode = bloodTypeToCode(targetBloodType);
      
      // 3. 혈액형 증명 생성 (오프체인)
      console.log('3. 혈액형 증명 생성 중...');
      const proofResponse = await generateBloodTypeProof(
        targetBloodTypeCode, // 실제 혈액형 코드 (실제 구현에서는 환자의 실제 데이터 사용)
        targetBloodTypeCode  // 요청자가 확인하려는 혈액형 코드
      );

      if (!proofResponse.success) {
        throw new Error(proofResponse.message || '증명 생성에 실패했습니다.');
      }

      // 4. 증명 제출
      console.log('4. 증명 제출 중...');
      const submitResponse = await submitProof(
        patientAddress, 
        requestId, 
        proofResponse.proofData
      );

      if (!submitResponse.success) {
        throw new Error(submitResponse.message || '증명 제출에 실패했습니다.');
      }

      setVerificationResult(submitResponse);
      
      // 다음 단계로 이동
      setActiveStep(4);
      
      // 5. 직접 확인 메서드로 결과 검증
      console.log('5. 직접 확인으로 검증 결과 확인 중...');
      const checkResult = await checkBloodType(patientAddress, targetBloodTypeCode);
      setDirectCheckResult({
        isMatch: checkResult,
        bloodType: targetBloodType
      });
      
      // 최종 결과 설정
      setResult({
        success: true,
        isValid: submitResponse.isValid,
        message: submitResponse.isValid 
          ? `검증 성공: 환자는 ${targetBloodType}형이 맞습니다.` 
          : `검증 결과: 환자는 ${targetBloodType}형이 아닙니다.`
      });
      
      // 완료 콜백 호출 (있는 경우)
      if (onComplete) {
        onComplete({
          success: true,
          isValid: submitResponse.isValid,
          bloodType: targetBloodType
        });
      }
      
    } catch (error) {
      console.error('증명 생성/제출 오류:', error);
      setError(error.message || '증명 생성 또는 제출 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 시작 단계 설정
  useEffect(() => {
    if (isPatient) {
      // 환자 모드에서는 승인 대기 단계부터 시작
      setActiveStep(2);
    } else {
      // 요청자 모드에서는 처음부터 시작
      setActiveStep(0);
    }
  }, [isPatient]);

  // 현재 단계에 따른 작업 버튼 렌더링
  const renderActionButton = () => {
    if (loading) {
      return (
        <Button variant="contained" disabled fullWidth>
          <CircularProgress size={24} sx={{ mr: 1 }} /> 처리 중...
        </Button>
      );
    }

    switch (activeStep) {
      case 0:
        // 혈액형 선택 단계
        return (
          <Button 
            variant="contained" 
            onClick={() => setActiveStep(1)} 
            disabled={!targetBloodType}
            fullWidth
          >
            다음 단계
          </Button>
        );
      
      case 1:
        // 요청 전송 단계
        return (
          <Button 
            variant="contained" 
            onClick={handleSendRequest}
            fullWidth
          >
            검증 요청 전송
          </Button>
        );
      
      case 2:
        // 환자 승인 대기 단계
        if (isPatient) {
          return (
            <Button 
              variant="contained" 
              onClick={handleApproveRequest}
              fullWidth
              color="success"
            >
              요청 승인하기
            </Button>
          );
        }
        return (
          <Button 
            variant="outlined" 
            disabled
            fullWidth
          >
            환자의 승인 대기 중...
          </Button>
        );
      
      case 3:
        // ZK 증명 생성 및 제출 단계
        return (
          <Button 
            variant="contained" 
            onClick={handleSubmitProof}
            fullWidth
            color="primary"
          >
            증명 생성 및 제출
          </Button>
        );
      
      case 4:
        // 결과 확인 단계
        return (
          <Button 
            variant="outlined" 
            onClick={() => {
              setActiveStep(0);
              setTargetBloodType('');
              setResult(null);
              setError(null);
              setRequestId(null);
              setVerificationResult(null);
              setDirectCheckResult(null);
            }}
            fullWidth
          >
            새로운 검증 시작
          </Button>
        );
      
      default:
        return null;
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mt: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        혈액형 ZK 검증 시스템
      </Typography>
      
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3, mt: 2 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      
      <Box sx={{ mb: 3 }}>
        {activeStep === 0 && (
          <FormControl fullWidth>
            <InputLabel id="blood-type-label">혈액형 선택</InputLabel>
            <Select
              labelId="blood-type-label"
              value={targetBloodType}
              onChange={(e) => setTargetBloodType(e.target.value)}
              required
            >
              <MenuItem value="A">A형</MenuItem>
              <MenuItem value="B">B형</MenuItem>
              <MenuItem value="O">O형</MenuItem>
              <MenuItem value="AB">AB형</MenuItem>
            </Select>
          </FormControl>
        )}
        
        {activeStep > 0 && targetBloodType && (
          <Alert severity="info" sx={{ mb: 2 }}>
            검증 대상 혈액형: <strong>{targetBloodType}형</strong>
            {requestId && <> (요청 ID: {requestId})</>}
          </Alert>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {result && (
          <Alert 
            severity={result.success ? (result.isValid ? "success" : "warning") : "error"} 
            sx={{ mb: 2 }}
          >
            {result.message}
          </Alert>
        )}
        
        {directCheckResult && (
          <Alert severity={directCheckResult.isMatch ? "success" : "warning"} sx={{ mb: 2 }}>
            <Typography variant="body2">
              직접 확인 결과: 환자는 {directCheckResult.bloodType}형이 
              {directCheckResult.isMatch ? " 맞습니다." : " 아닙니다."}
            </Typography>
          </Alert>
        )}
      </Box>
      
      {renderActionButton()}
    </Paper>
  );
};

export default BloodTypeVerification; 