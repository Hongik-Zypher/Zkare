import React, { useState } from 'react';
import {
  Box, 
  Typography, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Button, 
  CircularProgress, 
  Alert
} from '@mui/material';
import { generateBloodTypeProof, verifyMedicalData } from '../utils/medicalVerificationService';

// 혈액형 코드 변환 함수
const bloodTypeToCode = (type) => {
  switch(type) {
    case 'A': return 1;
    case 'B': return 2;
    case 'AB': return 3;
    case 'O': return 4;
    default: return 0;
  }
};

// 혈액형 코드에서 이름으로 변환
const codeToBloodType = (code) => {
  switch(Number(code)) {
    case 1: return 'A';
    case 2: return 'B';
    case 3: return 'AB';
    case 4: return 'O';
    default: return '알 수 없음';
  }
};

/**
 * 혈액형 검증 컴포넌트
 * @param {Object} props - 속성
 * @param {String} props.patientAddress - 환자 이더리움 주소
 * @param {String} props.requesterAddress - 요청자 이더리움 주소 
 */
const BloodTypeVerification = ({ patientAddress, requesterAddress }) => {
  const [targetBloodType, setTargetBloodType] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [txHash, setTxHash] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setTxHash(null);

    try {
      // 혈액형 코드로 변환
      const targetBloodTypeCode = bloodTypeToCode(targetBloodType);
      
      // 1. 혈액형 증명 생성 (오프체인)
      console.log('1. 혈액형 증명 생성 중...');
      const proofResponse = await generateBloodTypeProof(
        targetBloodTypeCode, // 추측하는 혈액형 코드
        targetBloodTypeCode  // 이 예제에서는 같은 값을 사용합니다. 실제로는 실제 값을 사용해야 합니다.
      );

      if (!proofResponse.success) {
        throw new Error(proofResponse.message || '증명 생성에 실패했습니다.');
      }

      console.log('2. 블록체인에 증명 제출 및 검증 요청 중...');
      // 2. 온체인 검증 - 스마트 컨트랙트 직접 호출
      const verifyResponse = await verifyMedicalData(
        'bloodType',
        patientAddress,
        proofResponse.proofData.proof,
        [targetBloodTypeCode] // 공개 입력값 - 추측하는 혈액형 코드
      );

      console.log('3. 블록체인 검증 결과:', verifyResponse);
      
      // 트랜잭션 해시가 있으면 저장
      if (verifyResponse.txHash) {
        setTxHash(verifyResponse.txHash);
      }
      
      setResult(verifyResponse);
    } catch (error) {
      console.error('혈액형 검증 오류:', error);
      setError(error.message || '검증 과정에서 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ mt: 3, mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
      <Typography variant="h6" gutterBottom>
        혈액형 검증 (온체인)
      </Typography>
      
      <form onSubmit={handleSubmit}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="blood-type-label">혈액형 선택</InputLabel>
          <Select
            labelId="blood-type-label"
            value={targetBloodType}
            onChange={(e) => setTargetBloodType(e.target.value)}
            required
          >
            <MenuItem value="A">A형</MenuItem>
            <MenuItem value="B">B형</MenuItem>
            <MenuItem value="AB">AB형</MenuItem>
            <MenuItem value="O">O형</MenuItem>
          </Select>
        </FormControl>
        
        <Button 
          type="submit" 
          variant="contained" 
          disabled={loading || !targetBloodType}
          fullWidth
        >
          {loading ? <CircularProgress size={24} /> : '블록체인에서 검증하기'}
        </Button>
      </form>
      
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      
      {result && (
        <Alert 
          severity={result.success ? (result.isValid ? "success" : "warning") : "error"} 
          sx={{ mt: 2 }}
        >
          {result.success 
            ? (result.isValid 
                ? `온체인 검증 성공: 환자는 ${targetBloodType}형이 맞습니다.` 
                : `온체인 검증 결과: 환자는 ${targetBloodType}형이 아닙니다.`)
            : `온체인 검증 실패: ${result.message}`}
        </Alert>
      )}
      
      {txHash && (
        <Typography variant="body2" sx={{ mt: 1, fontSize: '0.8rem' }}>
          트랜잭션 해시: {txHash}
        </Typography>
      )}
    </Box>
  );
};

export default BloodTypeVerification; 