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
import medicalAPI from '../api/medicalAPI';

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // 1. 혈액형 증명 생성 요청
      const proofResponse = await medicalAPI.generateBloodTypeProof(
        patientAddress, 
        targetBloodType
      );

      if (!proofResponse.success) {
        throw new Error(proofResponse.message || '증명 생성에 실패했습니다.');
      }

      // 2. 혈액형 증명 검증 요청
      const verifyResponse = await medicalAPI.verifyBloodTypeProof(
        proofResponse.proofData.proof,
        proofResponse.proofData.publicInputs
      );

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
        혈액형 검증
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
          {loading ? <CircularProgress size={24} /> : '검증하기'}
        </Button>
      </form>
      
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      
      {result && (
        <Alert 
          severity={result.isValid ? "success" : "warning"} 
          sx={{ mt: 2 }}
        >
          {result.isValid 
            ? `환자는 ${targetBloodType}형이 맞습니다.` 
            : `환자는 ${targetBloodType}형이 아닙니다.`}
        </Alert>
      )}
    </Box>
  );
};

export default BloodTypeVerification; 