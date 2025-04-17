import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  IconButton
} from '@mui/material';
import { Check, Close, DeleteOutline } from '@mui/icons-material';
import axios from 'axios';

// API URL을 환경 변수에서 가져오기
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Axios 기본 설정
axios.defaults.withCredentials = false; // CORS 문제 해결을 위해 credentials 비활성화
axios.defaults.headers.common['Content-Type'] = 'application/json';

/**
 * 의료 정보 접근 요청 컴포넌트
 * @param {Object} props - 속성
 * @param {string} props.userAddress - 사용자 주소 (환자 또는 요청자)
 * @param {string} props.userRole - 사용자 역할 ('patient' 또는 'requester')
 */
const MedicalRecordRequest = ({ userAddress, userRole }) => {
  const [patientAddress, setPatientAddress] = useState('');
  const [recordType, setRecordType] = useState('');
  const [reason, setReason] = useState('');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // 요청 목록 로드
  useEffect(() => {
    if (userAddress) {
      loadRequests();
    }
  }, [userAddress, userRole]);

  // 요청 목록 로드
  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // API endpoint 결정 (환자 또는 요청자)
      const endpoint = userRole === 'patient'
        ? `${API_URL}/requests/patient?patientAddress=${userAddress}`
        : `${API_URL}/requests/requester?requesterAddress=${userAddress}`;
      
      const response = await axios.get(endpoint);
      
      if (response.data.success) {
        // 응답 구조가 변경됨 - data 대신 requests 필드 사용
        setRequests(response.data.requests || []);
      } else {
        throw new Error(response.data.message || '요청 목록을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('요청 목록 로드 오류:', error);
      setError(error.message || '요청 목록을 불러오는 중 오류가 발생했습니다.');
      // 오류 발생 시 빈 배열로 설정하여 렌더링 오류 방지
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // 새 요청 생성
  const handleCreateRequest = async (e) => {
    e.preventDefault();
    
    try {
      setRequestLoading(true);
      setError(null);
      setSuccess(null);
      
      const response = await axios.post(`${API_URL}/requests`, {
        requesterAddress: userAddress,
        patientAddress,
        recordType,
        reason
      });
      
      if (response.data.success) {
        setSuccess('요청이 성공적으로 생성되었습니다.');
        setPatientAddress('');
        setRecordType('');
        setReason('');
        // 요청 목록 새로고침
        loadRequests();
      } else {
        throw new Error(response.data.message || '요청 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('요청 생성 오류:', error);
      setError(error.message || '요청 생성 중 오류가 발생했습니다.');
    } finally {
      setRequestLoading(false);
    }
  };

  // 요청 승인/거부
  const handleRequestAction = async (requestId, action) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const response = await axios.post(`${API_URL}/requests/${requestId}/${action}`, {
        patientAddress: userAddress,
        generateProof: action === 'approve' // 승인할 경우 ZK 증명 생성
      });
      
      if (response.data.success) {
        setSuccess(`요청이 성공적으로 ${action === 'approve' ? '승인' : '거부'}되었습니다.`);
        // 요청 목록 새로고침
        loadRequests();
      } else {
        throw new Error(response.data.message || `요청 ${action === 'approve' ? '승인' : '거부'}에 실패했습니다.`);
      }
    } catch (error) {
      console.error(`요청 ${action} 오류:`, error);
      setError(error.message || `요청 ${action === 'approve' ? '승인' : '거부'} 중 오류가 발생했습니다.`);
    } finally {
      setLoading(false);
    }
  };

  // 요청 상태에 따른 칩 색상
  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'denied':
        return 'error';
      case 'pending':
      default:
        return 'warning';
    }
  };

  return (
    <Box sx={{ mt: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom>
        {userRole === 'patient' ? '의료 정보 접근 요청 관리' : '의료 정보 접근 요청'}
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
      
      {/* 요청자만 새 요청 생성 가능 */}
      {userRole === 'requester' && (
        <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            새 요청 생성
          </Typography>
          
          <form onSubmit={handleCreateRequest}>
            <TextField
              label="환자 주소"
              fullWidth
              margin="normal"
              value={patientAddress}
              onChange={(e) => setPatientAddress(e.target.value)}
              required
            />
            
            <TextField
              label="요청 기록 유형"
              fullWidth
              margin="normal"
              value={recordType}
              onChange={(e) => setRecordType(e.target.value)}
              required
              placeholder="예: 혈액형, 알레르기, 수술이력 등"
            />
            
            <TextField
              label="요청 사유"
              fullWidth
              margin="normal"
              multiline
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              placeholder="왜 이 정보가 필요한지 설명해주세요."
            />
            
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 2 }}
              disabled={requestLoading || !patientAddress || !recordType || !reason}
            >
              {requestLoading ? <CircularProgress size={24} /> : '요청 생성'}
            </Button>
          </form>
        </Paper>
      )}
      
      {/* 요청 목록 */}
      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          요청 목록
        </Typography>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (!requests || requests.length === 0) ? (
          <Alert severity="info">요청이 없습니다.</Alert>
        ) : (
          <List>
            {requests.map((request) => (
              <React.Fragment key={request.requestId}>
                <ListItem
                  alignItems="flex-start"
                  secondaryAction={
                    userRole === 'patient' && request.status === 'pending' ? (
                      <Box>
                        <IconButton
                          color="success"
                          onClick={() => handleRequestAction(request.requestId, 'approve')}
                          disabled={loading}
                          title="승인"
                        >
                          <Check />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => handleRequestAction(request.requestId, 'deny')}
                          disabled={loading}
                          title="거부"
                        >
                          <Close />
                        </IconButton>
                      </Box>
                    ) : null
                  }
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1">
                          {request.recordType}
                        </Typography>
                        <Chip
                          label={
                            request.status === 'approved' ? '승인됨' :
                            request.status === 'denied' ? '거부됨' : '대기 중'
                          }
                          color={getStatusColor(request.status)}
                          size="small"
                        />
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography component="span" variant="body2" color="text.primary">
                          {userRole === 'patient' ? '요청자: ' : '환자: '}
                          {userRole === 'patient' ? request.requesterAddress : request.patientAddress}
                        </Typography>
                        <Typography component="p" variant="body2">
                          사유: {request.reason}
                        </Typography>
                        <Typography component="p" variant="body2">
                          요청일: {new Date(request.createdAt).toLocaleString()}
                        </Typography>
                        {request.updatedAt && (
                          <Typography component="p" variant="body2">
                            {request.status === 'approved' ? '승인일: ' : '거부일: '}
                            {new Date(request.updatedAt).toLocaleString()}
                          </Typography>
                        )}
                      </>
                    }
                  />
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
};

export default MedicalRecordRequest; 