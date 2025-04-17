import React, { useEffect, useState } from 'react';
import { Container, Typography, Box, Paper, Alert, CircularProgress } from '@mui/material';
import DoctorPanel from '../components/DoctorPanel';
import { getCurrentAccount, initVerificationService, isDoctor } from '../utils/medicalVerificationService';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';

const HospitalPage = () => {
  const [account, setAccount] = useState('');
  const [doctorStatus, setDoctorStatus] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // 메타마스크 연결 및 컨트랙트 초기화
        await initVerificationService();
        const currentAccount = await getCurrentAccount();
        setAccount(currentAccount);
        
        // 의사 권한 확인 - 오류가 발생해도 페이지는 로드됨
        try {
          const doctorCheck = await isDoctor();
          setDoctorStatus(doctorCheck);
        } catch (doctorError) {
          console.error('의사 계정 확인 오류:', doctorError);
          // 오류 발생시 false로 처리하고 계속 진행
          setDoctorStatus(false);
        }
      } catch (error) {
        console.error('페이지 초기화 오류:', error);
        setError('계정 연결 중 오류가 발생했습니다. MetaMask가 설치되어 있고 연결되어 있는지 확인하세요.');
      } finally {
        setIsLoading(false);
      }
    };
    
    init();
  }, []);
  
  return (
    <Container maxWidth="md">
      <Box my={4}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
          <LocalHospitalIcon color="primary" sx={{ fontSize: 36, mr: 1.5 }} />
          <Typography variant="h4" component="h1" gutterBottom>
            의사 페이지
          </Typography>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            현재 연결된 계정
          </Typography>
          
          {isLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
              <CircularProgress size={20} sx={{ mr: 2 }} />
              <Typography>계정 정보 로딩 중...</Typography>
            </Box>
          ) : account ? (
            <>
              <Typography sx={{ wordBreak: 'break-all' }}>
                {account}
              </Typography>
              <Typography 
                sx={{ mt: 1, fontWeight: 'bold' }} 
                color={doctorStatus ? 'success.main' : 'error.main'}
              >
                상태: {doctorStatus ? '의사 계정' : '일반 계정'}
              </Typography>
              
              {!doctorStatus && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  의사 계정이 아닙니다. 홈 페이지에서 의사로 등록한 후 다시 시도해주세요.
                </Alert>
              )}
            </>
          ) : (
            <Alert severity="warning">
              연결된 계정이 없습니다. MetaMask를 연결해주세요.
            </Alert>
          )}
        </Paper>
        
        <DoctorPanel />
        
        <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            사용 안내
          </Typography>
          <Typography paragraph>
            이 페이지는 의사만 접근할 수 있는 기능을 제공합니다.
          </Typography>
          <Typography paragraph>
            1. 환자의 의료 정보(현재는 혈액형)를 등록합니다.
          </Typography>
          <Typography paragraph>
            2. 등록된 정보는 블록체인에 저장되며, 환자가 영지식 증명 생성에 사용할 수 있습니다.
          </Typography>
          <Typography paragraph>
            * 의사 권한이 없으면 환자 데이터를 등록할 수 없습니다. 시스템 관리자에게 의사 등록을 요청하세요.
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default HospitalPage;