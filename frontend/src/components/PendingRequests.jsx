import React, { useState, useEffect } from 'react';
import { 
  getMyPendingRequests, 
  respondToVerification, 
  generateBloodTypeProof,
  getPatientData,
  submitProof
} from '../utils/medicalVerificationService';
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  Card,
  CardContent,
  CardActions,
  Divider,
  CircularProgress,
  Chip,
  Grid
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

// 혈액형 코드를 텍스트로 변환
const getBloodTypeName = (code) => {
  const types = {
    1: 'A형',
    2: 'B형',
    3: 'AB형',
    4: 'O형'
  };
  return types[code] || '알 수 없음';
};

/**
 * 환자의 대기 중인 요청 목록 및 응답 컴포넌트
 */
const PendingRequests = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessages, setStatusMessages] = useState({});
  const [actualData, setActualData] = useState({});
  const [globalAlert, setGlobalAlert] = useState(null);
  
  // 페이지 로드 시 대기 중인 요청 조회
  useEffect(() => {
    fetchPendingRequests();
  }, []);
  
  // 대기 중인 요청 목록 조회
  const fetchPendingRequests = async () => {
    setIsLoading(true);
    setGlobalAlert(null);
    
    try {
      const result = await getMyPendingRequests();
      if (result.success) {
        setPendingRequests(result.requests);
        
        // 각 요청 유형에 대한 실제 데이터 로드
        const dataMap = {};
        for (const request of result.requests) {
          if (request.verificationType === 'bloodType') {
            try {
              const dataResult = await getPatientData(request.requester, 'bloodType');
              if (dataResult.success) {
                dataMap[`${request.verificationType}_${request.requestId}`] = dataResult.value;
              }
            } catch (e) {
              console.error('환자 데이터 로드 오류:', e);
              // 개별 데이터 로드 실패는 무시하고 계속 진행
            }
          }
        }
        setActualData(dataMap);
        
        if (result.requests.length === 0) {
          setGlobalAlert({
            severity: 'info',
            message: result.message || '대기 중인 요청이 없습니다.'
          });
        }
      } else {
        setGlobalAlert({
          severity: 'warning',
          message: result.message || '요청 목록을 불러오는 데 실패했습니다.'
        });
      }
    } catch (error) {
      console.error('요청 조회 오류:', error);
      setGlobalAlert({
        severity: 'error',
        message: '서버 연결 오류가 발생했습니다. 다시 시도해주세요.'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // 요청 승인 처리
  const handleApprove = async (requestId) => {
    await handleResponse(requestId, true);
  };
  
  // 요청 거부 처리
  const handleReject = async (requestId) => {
    await handleResponse(requestId, false);
  };
  
  // 요청 응답 처리 (승인/거부)
  const handleResponse = async (requestId, approved) => {
    setStatusMessages(prev => ({ 
      ...prev, 
      [requestId]: { text: '처리 중...', severity: 'info' }
    }));
    
    try {
      const result = await respondToVerification(requestId, approved);
      
      if (result.success) {
        // 승인된 경우 증명 자동 생성 및 제출
        if (approved) {
          await processApprovedRequest(requestId);
        } else {
          setStatusMessages(prev => ({ 
            ...prev, 
            [requestId]: { text: '요청을 거부했습니다.', severity: 'warning' }
          }));
        }
        
        // 목록 다시 로드
        fetchPendingRequests();
      } else {
        setStatusMessages(prev => ({ 
          ...prev, 
          [requestId]: { text: result.message, severity: 'error' }
        }));
      }
    } catch (error) {
      console.error('응답 처리 오류:', error);
      setStatusMessages(prev => ({ 
        ...prev, 
        [requestId]: { text: '요청 처리 중 오류가 발생했습니다.', severity: 'error' }
      }));
    }
  };
  
  // 승인된 요청에 대한 증명 생성 및 제출 처리
  const processApprovedRequest = async (requestId) => {
    try {
      const request = pendingRequests.find(req => req.requestId === requestId);
      if (!request) return;
      
      setStatusMessages(prev => ({ 
        ...prev, 
        [requestId]: { text: '증명 생성 중...', severity: 'info' }
      }));
      
      if (request.verificationType === 'bloodType') {
        const actualBloodType = actualData[`bloodType_${requestId}`] || 0;
        
        // 증명 생성
        const proofResult = await generateBloodTypeProof(
          actualBloodType,
          request.requestedValue
        );
        
        if (!proofResult.success) {
          setStatusMessages(prev => ({ 
            ...prev, 
            [requestId]: { text: '증명 생성에 실패했습니다.', severity: 'error' }
          }));
          return;
        }
        
        setStatusMessages(prev => ({ 
          ...prev, 
          [requestId]: { text: '증명 제출 중...', severity: 'info' }
        }));
        
        // 증명 제출
        const submitResult = await submitProof(
          request.requester,
          requestId,
          proofResult.proofData
        );
        
        setStatusMessages(prev => ({ 
          ...prev, 
          [requestId]: { 
            text: submitResult.message, 
            severity: submitResult.success ? 'success' : 'error' 
          }
        }));
      }
    } catch (error) {
      console.error('증명 처리 오류:', error);
      setStatusMessages(prev => ({ 
        ...prev, 
        [requestId]: { text: '증명 처리 중 오류가 발생했습니다.', severity: 'error' }
      }));
    }
  };
  
  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 700, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        대기 중인 검증 요청
      </Typography>
      
      {globalAlert && (
        <Alert severity={globalAlert.severity} sx={{ my: 2 }}>
          {globalAlert.message}
        </Alert>
      )}
      
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<RefreshIcon />}
          onClick={fetchPendingRequests}
          disabled={isLoading}
        >
          {isLoading ? '불러오는 중...' : '새로고침'}
        </Button>
        
        {isLoading && (
          <CircularProgress size={24} sx={{ ml: 2 }} />
        )}
      </Box>
      
      {pendingRequests.length === 0 && !isLoading ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          {globalAlert ? null : <Typography>대기 중인 요청이 없습니다.</Typography>}
        </Box>
      ) : (
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            {pendingRequests.map((request) => (
              <Grid item xs={12} key={request.requestId}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      요청 #{request.requestId}
                    </Typography>
                    
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        요청자
                      </Typography>
                      <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>
                        {request.requester}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        검증 유형
                      </Typography>
                      <Chip 
                        label={request.verificationType === 'bloodType' ? '혈액형' : request.verificationType} 
                        color="primary" 
                        size="small"
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                    
                    {request.verificationType === 'bloodType' && (
                      <>
                        <Divider sx={{ my: 1.5 }} />
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              추측 혈액형
                            </Typography>
                            <Typography variant="body1">
                              {getBloodTypeName(request.requestedValue)}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              실제 혈액형
                            </Typography>
                            <Typography variant="body1">
                              {getBloodTypeName(actualData[`bloodType_${request.requestId}`] || 0)}
                            </Typography>
                          </Grid>
                        </Grid>
                      </>
                    )}
                    
                    {statusMessages[request.requestId] && (
                      <Alert 
                        severity={statusMessages[request.requestId].severity} 
                        sx={{ mt: 2 }}
                      >
                        {statusMessages[request.requestId].text}
                      </Alert>
                    )}
                  </CardContent>
                  
                  {!statusMessages[request.requestId] && (
                    <CardActions sx={{ px: 2, pb: 2 }}>
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<CheckCircleIcon />}
                        onClick={() => handleApprove(request.requestId)}
                        sx={{ mr: 1 }}
                      >
                        승인
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        startIcon={<CancelIcon />}
                        onClick={() => handleReject(request.requestId)}
                      >
                        거부
                      </Button>
                    </CardActions>
                  )}
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
      
      <Divider sx={{ my: 2 }} />
      
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          승인을 선택하면 자동으로 영지식 증명을 생성하여 검증 결과를 요청자에게 전송합니다.
          이 과정에서 실제 의료 데이터가 직접 공개되지 않습니다.
        </Typography>
      </Box>
    </Paper>
  );
};

export default PendingRequests; 