import React, { useEffect, useState } from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';
import VerificationRequest from '../components/VerificationRequest';
import { getCurrentAccount, initVerificationService } from '../utils/medicalVerificationService';

const RequesterPage = () => {
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
          검증 요청자 페이지
        </Typography>
        
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            현재 연결된 계정
          </Typography>
          <Typography>
            {isLoading ? '로딩 중...' : account}
          </Typography>
        </Paper>
        
        <VerificationRequest />
        
        <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            사용 안내
          </Typography>
          <Typography paragraph>
            이 페이지에서는 환자의 의료 정보(현재는 혈액형)에 대한 검증을 요청할 수 있습니다.
          </Typography>
          <Typography paragraph>
            1. 환자 지갑 주소를 입력합니다.
          </Typography>
          <Typography paragraph>
            2. 확인하고자 하는 혈액형을 선택합니다.
          </Typography>
          <Typography paragraph>
            3. '검증 요청하기' 버튼을 클릭합니다.
          </Typography>
          <Typography paragraph>
            4. 요청이 환자에게 전송되고, 환자가 승인하면 자동으로 ZK 증명을 통해 결과를 받게 됩니다.
          </Typography>
          <Typography paragraph>
            * 이 과정에서 환자의 실제 혈액형은 직접 공개되지 않으며, 입력한 혈액형이 정확한지에 대한 True/False 결과만 받게 됩니다.
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default RequesterPage; 