import React, { useEffect, useState } from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';
import PendingRequests from '../components/PendingRequests';
import { getCurrentAccount, initVerificationService } from '../utils/medicalVerificationService';

const PatientPage = () => {
  const [account, setAccount] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await initVerificationService();
      const currentAccount = await getCurrentAccount();
      setAccount(currentAccount);
      setIsLoading(false);
    };
    
    init();
  }, []);
  
  return (
    <Container maxWidth="md">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          환자 페이지
        </Typography>
        
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            현재 연결된 계정
          </Typography>
          <Typography>
            {isLoading ? '로딩 중...' : account}
          </Typography>
        </Paper>
        
        <PendingRequests />
        
        <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            사용 안내
          </Typography>
          <Typography paragraph>
            이 페이지에서는 다른 사용자가 보낸 의료 정보 검증 요청을 관리할 수 있습니다.
          </Typography>
          <Typography paragraph>
            1. '새로고침' 버튼을 클릭하여 대기 중인 요청을 확인합니다.
          </Typography>
          <Typography paragraph>
            2. 각 요청에 대해 '승인' 또는 '거부'를 선택합니다.
          </Typography>
          <Typography paragraph>
            3. 승인을 선택하면 자동으로 영지식 증명이 생성되어 요청자에게 결과가 전송됩니다.
          </Typography>
          <Typography paragraph>
            * 영지식 증명을 통해 의료 정보(혈액형)의 일치 여부만 검증되며, 실제 의료 정보는 직접 공개되지 않습니다.
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default PatientPage; 