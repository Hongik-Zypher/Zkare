import React, { useState, useEffect } from 'react';
import { isDoctor, registerPatientData } from '../utils/medicalVerificationService';
import { Box, Typography, TextField, Button, Select, MenuItem, FormControl, InputLabel, Paper, Alert, CircularProgress } from '@mui/material';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';

// 혈액형 코드와 이름 매핑
const BLOOD_TYPES = [
  { code: 1, name: 'A형' },
  { code: 2, name: 'B형' },
  { code: 3, name: 'AB형' },
  { code: 4, name: 'O형' }
];

/**
 * 의사용 환자 데이터 등록 컴포넌트
 */
const DoctorPanel = () => {
  const [isDoctorAccount, setIsDoctorAccount] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [patientAddress, setPatientAddress] = useState('');
  const [bloodType, setBloodType] = useState(1);
  const [result, setResult] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  
  // 컴포넌트 마운트 시 의사 계정 확인
  useEffect(() => {
    checkDoctorAccount();
  }, []);
  
  // 의사 계정인지 확인
  const checkDoctorAccount = async () => {
    setIsLoading(true);
    try {
      const doctorStatus = await isDoctor();
      setIsDoctorAccount(doctorStatus);
      setAuthChecked(true);
    } catch (error) {
      console.error('의사 계정 확인 오류:', error);
      setAuthChecked(true);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 환자 혈액형 등록 처리
  const handleRegisterBloodType = async () => {
    if (!patientAddress || patientAddress.trim() === '') {
      setResult({
        success: false,
        message: '환자 주소를 입력해주세요.'
      });
      return;
    }
    
    setResult(null);
    setIsLoading(true);
    
    try {
      const registerResult = await registerPatientData(
        patientAddress,
        'bloodType',
        bloodType
      );
      
      setResult(registerResult);
    } catch (error) {
      console.error('환자 데이터 등록 오류:', error);
      setResult({
        success: false,
        message: '환자 데이터 등록 중 오류가 발생했습니다. 다시 시도해주세요.'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // 로딩 중 표시
  if (isLoading && !authChecked) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          의사 계정 확인 중...
        </Typography>
      </Box>
    );
  }
  
  // 의사 계정이 아닌 경우 액세스 거부 메시지 출력
  if (authChecked && !isDoctorAccount) {
    return (
      <Paper elevation={3} sx={{ p: 4, maxWidth: 600, mx: 'auto', mt: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          의사 패널
        </Typography>
        <Alert severity="error" sx={{ mt: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            접근 권한이 없습니다.
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            이 기능은 의사 계정만 사용할 수 있습니다. 의사 계정으로 다시 로그인해주세요.
          </Typography>
        </Alert>
      </Paper>
    );
  }
  
  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <LocalHospitalIcon color="primary" sx={{ mr: 1 }} />
        <Typography variant="h5" component="h2">
          의사 패널
        </Typography>
      </Box>
      
      {authChecked && isDoctorAccount && (
        <Alert severity="success" sx={{ mb: 3 }}>
          의사 계정이 확인되었습니다.
        </Alert>
      )}
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          환자 혈액형 등록
        </Typography>
        
        <TextField
          label="환자 주소"
          placeholder="0x..."
          value={patientAddress}
          onChange={(e) => setPatientAddress(e.target.value)}
          fullWidth
          margin="normal"
          variant="outlined"
        />
        
        <FormControl fullWidth margin="normal">
          <InputLabel id="blood-type-label">혈액형</InputLabel>
          <Select
            labelId="blood-type-label"
            value={bloodType}
            onChange={(e) => setBloodType(Number(e.target.value))}
            label="혈액형"
          >
            {BLOOD_TYPES.map((type) => (
              <MenuItem key={type.code} value={type.code}>
                {type.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <Button
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 2 }}
          onClick={handleRegisterBloodType}
          disabled={isLoading || !patientAddress}
        >
          {isLoading ? '등록 중...' : '환자 혈액형 등록'}
        </Button>
      </Box>
      
      {result && (
        <Alert severity={result.success ? "success" : "error"} sx={{ mt: 2 }}>
          {result.message}
        </Alert>
      )}
    </Paper>
  );
};

export default DoctorPanel; 