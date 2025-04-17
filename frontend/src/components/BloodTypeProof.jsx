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
  Alert,
  Paper,
  LinearProgress,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import axios from 'axios';

// const API_URL = 'http://localhost:5001/api'; // API 기본 URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// 혈액형 코드와 이름 매핑
const BLOOD_TYPES = [
  { code: 1, name: 'A형' },
  { code: 2, name: 'B형' },
  { code: 3, name: 'AB형' },
  { code: 4, name: 'O형' }
];

/**
 * 혈액형 ZK 증명 컴포넌트
 * @param {Object} props - 속성
 * @param {string} props.userAddress - 사용자 주소
 */
const BloodTypeProof = ({ userAddress }) => {
  const [actualBloodType, setActualBloodType] = useState('');
  const [targetBloodType, setTargetBloodType] = useState('');
  const [loading, setLoading] = useState(false);
  const [proof, setProof] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [step, setStep] = useState(1); // 1: 입력, 2: 증명 생성 중, 3: 증명 생성 완료, 4: 검증 완료

  // 혈액형 선택 처리
  const handleActualBloodTypeChange = (e) => {
    setActualBloodType(e.target.value);
    // 결과 초기화
    setProof(null);
    setVerificationResult(null);
    setStep(1);
  };

  const handleTargetBloodTypeChange = (e) => {
    setTargetBloodType(e.target.value);
    // 결과 초기화
    setProof(null);
    setVerificationResult(null);
    setStep(1);
  };

  // 증명 생성
  const generateProof = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setStep(2); // 증명 생성 중
      
      console.log('증명 생성 요청 데이터:', {
        patientAddress: userAddress,
        actualBloodTypeCode: parseInt(actualBloodType),
        targetBloodTypeCode: parseInt(targetBloodType)
      });
      
      // 혈액형 증명 생성 API 호출
      const response = await axios.post(`${API_URL}/proofs/blood-type/generate`, {
        patientAddress: userAddress,
        actualBloodTypeCode: parseInt(actualBloodType),
        targetBloodTypeCode: parseInt(targetBloodType)
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('증명 생성 응답 데이터:', response.data);
      
      if (response.data.success && response.data.proofData) {
        // 응답 형식 확인 및 정규화
        const proofData = response.data.proofData;
        
        // 검증을 위해 필요한 데이터 형식 확인
        if (!proofData.proof || !Array.isArray(proofData.publicSignals)) {
          throw new Error('서버에서 반환된 증명 데이터 형식이 잘못되었습니다.');
        }
        
        console.log('저장할 증명 데이터:', proofData);
        
        setProof(proofData);
        setSuccess('영지식 증명이 성공적으로 생성되었습니다. 이제 검증할 수 있습니다.');
        setStep(3); // 증명 생성 완료
      } else {
        throw new Error(response.data.message || '증명 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('증명 생성 오류 세부 정보:', error);
      
      if (error.response) {
        console.error('서버 응답 데이터:', error.response.data);
        console.error('서버 응답 상태:', error.response.status);
        
        setError(error.response.data?.message || '증명 생성 중 서버 오류가 발생했습니다.');
      } else {
        setError(error.message || '증명 생성 중 오류가 발생했습니다.');
      }
      
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  // 증명 검증
  const verifyProof = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      console.log('검증할 증명 데이터(원본):', {
        proof: proof.proof,
        publicSignals: proof.publicSignals
      });
      
      // 요청 데이터 형식을 검증
      if (!proof || !proof.proof || !Array.isArray(proof.publicSignals)) {
        throw new Error('유효한 증명 데이터가 아닙니다. 다시 생성해주세요.');
      }
      
      // 백엔드가 기대하는 형식으로 데이터 변환
      // 서버는 proof가 배열이기를 기대하지만, snarkjs는 객체 형태로 반환함
      // proof 객체에서 필요한 값들을 추출하여 배열로 변환
      
      // 원본 증명 데이터
      console.log('pi_a:', proof.proof.pi_a);
      console.log('pi_b:', proof.proof.pi_b);
      console.log('pi_c:', proof.proof.pi_c);
      
      // 증명 객체를 그대로 전달
      const requestData = {
        proof: proof.proof,  // 객체 그대로 전달
        publicSignals: proof.publicSignals
      };
      
      console.log('전송할 요청 데이터:', JSON.stringify(requestData, null, 2));
      
      // 혈액형 증명 검증 API 호출
      const response = await axios.post(`${API_URL}/proofs/blood-type/verify`, requestData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('검증 응답 데이터:', response.data);
      
      if (response.data.success) {
        setVerificationResult({
          valid: response.data.isValid,
          isMatch: proof.isMatch
        });
        setSuccess('증명 검증이 완료되었습니다.');
        setStep(4); // 검증 완료
      } else {
        throw new Error(response.data.message || '증명 검증에 실패했습니다.');
      }
    } catch (error) {
      console.error('증명 검증 오류 세부 정보:', error);
      
      if (error.response) {
        console.error('서버 응답 데이터:', error.response.data);
        console.error('서버 응답 상태:', error.response.status);
        
        // 상태 코드에 따른 친절한 오류 메시지
        if (error.response.status === 400) {
          setError('검증 요청 형식이 올바르지 않습니다: ' + (error.response.data.message || '데이터 형식 오류'));
        } else {
          setError(error.response.data.message || '증명 검증 중 오류가 발생했습니다.');
        }
      } else {
        setError(error.message || '증명 검증 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 혈액형 코드로부터 이름 가져오기
  const getBloodTypeName = (code) => {
    const bloodType = BLOOD_TYPES.find(type => type.code === parseInt(code));
    return bloodType ? bloodType.name : '알 수 없음';
  };

  return (
    <Box sx={{ mt: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom>
        혈액형 영지식 증명
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          증명 생성
        </Typography>
        
        {/* 단계 표시 */}
        <Box sx={{ mb: 2 }}>
          <LinearProgress
            variant="determinate"
            value={step * 25}
            color={step === 4 ? 'success' : 'primary'}
            sx={{ height: 10, borderRadius: 1 }}
          />
          <Grid container sx={{ mt: 1 }}>
            <Grid item xs={3} sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color={step >= 1 ? 'primary' : 'text.secondary'}>
                정보 입력
              </Typography>
            </Grid>
            <Grid item xs={3} sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color={step >= 2 ? 'primary' : 'text.secondary'}>
                증명 생성
              </Typography>
            </Grid>
            <Grid item xs={3} sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color={step >= 3 ? 'primary' : 'text.secondary'}>
                증명 완료
              </Typography>
            </Grid>
            <Grid item xs={3} sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color={step >= 4 ? 'success.main' : 'text.secondary'}>
                검증 완료
              </Typography>
            </Grid>
          </Grid>
        </Box>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="actual-blood-type-label">실제 혈액형 (비공개)</InputLabel>
              <Select
                labelId="actual-blood-type-label"
                value={actualBloodType}
                onChange={handleActualBloodTypeChange}
                disabled={loading || step > 1}
              >
                {BLOOD_TYPES.map(type => (
                  <MenuItem key={type.code} value={type.code}>{type.name}</MenuItem>
                ))}
              </Select>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                * 이 정보는 공개되지 않고 ZK 증명에만 사용됩니다.
              </Typography>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="target-blood-type-label">확인할 혈액형 (공개)</InputLabel>
              <Select
                labelId="target-blood-type-label"
                value={targetBloodType}
                onChange={handleTargetBloodTypeChange}
                disabled={loading || step > 1}
              >
                {BLOOD_TYPES.map(type => (
                  <MenuItem key={type.code} value={type.code}>{type.name}</MenuItem>
                ))}
              </Select>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                * "이 사람이 A형인가요?"와 같은 질문에 답변하기 위한 공개 정보입니다.
              </Typography>
            </FormControl>
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
          {/* 증명 생성 버튼 */}
          {step < 3 && (
            <Button
              variant="contained"
              color="primary"
              onClick={generateProof}
              disabled={loading || !actualBloodType || !targetBloodType}
              fullWidth
            >
              {loading ? <CircularProgress size={24} /> : '영지식 증명 생성'}
            </Button>
          )}
          
          {/* 증명 검증 버튼 */}
          {step === 3 && (
            <Button
              variant="outlined"
              color="secondary"
              onClick={verifyProof}
              disabled={loading || !proof}
              fullWidth
            >
              {loading ? <CircularProgress size={24} /> : '증명 검증하기'}
            </Button>
          )}
        </Box>
      </Paper>
      
      {/* 증명 결과 보기 */}
      {proof && (
        <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            증명 결과
          </Typography>
          
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                공개 정보:
              </Typography>
              <Typography variant="body2">
                확인 대상 혈액형: {getBloodTypeName(targetBloodType)}
              </Typography>
            </CardContent>
          </Card>
          
          {verificationResult && (
            <Alert 
              severity={verificationResult.valid ? (verificationResult.isMatch ? "success" : "warning") : "error"}
              sx={{ mb: 2 }}
            >
              {verificationResult.valid ? (
                verificationResult.isMatch ? 
                  `✅ 검증 결과: 사용자의 혈액형은 ${getBloodTypeName(targetBloodType)}이 맞습니다.` : 
                  `❌ 검증 결과: 사용자의 혈액형은 ${getBloodTypeName(targetBloodType)}이 아닙니다.`
              ) : (
                "⚠️ 증명이 유효하지 않습니다."
              )}
            </Alert>
          )}
          
          <Typography variant="body2" color="text.secondary">
            * 이 영지식 증명은 실제 혈액형 정보를 공개하지 않고도 특정 혈액형인지 여부만 검증합니다.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default BloodTypeProof; 