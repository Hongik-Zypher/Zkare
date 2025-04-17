import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  TextField,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent
} from '@mui/material';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import AssignmentIcon from '@mui/icons-material/Assignment';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import HistoryIcon from '@mui/icons-material/History';
import RequesterInterface from '../interfaces/RequesterInterface';
import proofAPI from '../api/proofAPI';
import { verifyProof } from '../utils/wallet';
import BloodTypeVerification from '../components/BloodTypeVerification';

const RequesterDashboard = ({ account, provider, signer, isConnected }) => {
  const navigate = useNavigate();
  const [patientAddress, setPatientAddress] = useState('');
  const [recordHash, setRecordHash] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [error, setError] = useState(null);
  const [requestId, setRequestId] = useState(null);
  const [proofs, setProofs] = useState([]);
  const [loadingProofs, setLoadingProofs] = useState(false);
  const [requesterInterface, setRequesterInterface] = useState(null);

  // 지갑 연결 상태 확인 및 리다이렉트
  useEffect(() => {
    if (!isConnected) {
      navigate('/');
    }
  }, [isConnected, navigate]);

  // RequesterInterface 초기화
  useEffect(() => {
    const initInterface = async () => {
      if (provider && isConnected) {
        try {
          // 환경 변수에서 컨트랙트 주소 가져오기
          const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;
          
          // ABI를 직접 가져오기
          const verifierABI = [
            {
              "inputs": [
                {
                  "internalType": "uint256[2]",
                  "name": "a",
                  "type": "uint256[2]"
                },
                {
                  "internalType": "uint256[2][2]",
                  "name": "b",
                  "type": "uint256[2][2]"
                },
                {
                  "internalType": "uint256[2]",
                  "name": "c",
                  "type": "uint256[2]"
                },
                {
                  "internalType": "uint256[5]",
                  "name": "input",
                  "type": "uint256[5]"
                }
              ],
              "name": "verifyProof",
              "outputs": [
                {
                  "internalType": "bool",
                  "name": "",
                  "type": "bool"
                }
              ],
              "stateMutability": "view",
              "type": "function"
            },
            {
              "inputs": [
                {
                  "internalType": "address",
                  "name": "patient",
                  "type": "address"
                },
                {
                  "internalType": "bytes32",
                  "name": "recordHash",
                  "type": "bytes32"
                }
              ],
              "name": "requestAccess",
              "outputs": [
                {
                  "internalType": "bytes32",
                  "name": "",
                  "type": "bytes32"
                }
              ],
              "stateMutability": "nonpayable",
              "type": "function"
            }
          ];
          
          // 요청자 인터페이스 인스턴스 생성
          const requesterInterfaceInstance = new RequesterInterface(
            provider,
            contractAddress,
            verifierABI,
            contractAddress,
            verifierABI,
            process.env.REACT_APP_API_URL || 'http://localhost:5001/api'
          );
          setRequesterInterface(requesterInterfaceInstance);
        } catch (error) {
          console.error('RequesterInterface 초기화 오류:', error);
          setError('블록체인 연결 중 오류가 발생했습니다.');
        }
      }
    };

    initInterface();
  }, [provider, isConnected]);

  // 이전에 생성된 증명 목록 로드
  const loadProofs = async () => {
    if (!account) return;

    setLoadingProofs(true);
    setError(null);

    try {
      // API를 통해 증명 목록 조회
      const response = await proofAPI.getAllProofs({ requesterAddress: account });
      setProofs(response.data);
    } catch (error) {
      console.error('증명 목록 로드 오류:', error);
      setError('증명 목록을 불러오는 데 실패했습니다.');
    } finally {
      setLoadingProofs(false);
    }
  };

  // 컴포넌트 마운트 시 증명 목록 로드
  useEffect(() => {
    if (account) {
      loadProofs();
    }
  }, [account]);

  // 접근 요청 제출
  const handleRequestAccess = async () => {
    if (!requesterInterface || !signer || !patientAddress || !recordHash) return;

    setLoadingRequest(true);
    setError(null);
    setActiveStep(0);
    
    try {
      // 접근 요청 전송
      const result = await requesterInterface.requestAccess(patientAddress, recordHash, signer);
      setRequestId(result.requestId);
      setActiveStep(1);
      
      // 증명 목록 새로고침
      await loadProofs();
    } catch (error) {
      console.error('접근 요청 오류:', error);
      setError('접근 요청 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setLoadingRequest(false);
    }
  };

  // 접근 요청 상태 확인
  const checkApprovalStatus = async () => {
    if (!requesterInterface || !patientAddress || !requestId) return;

    setLoadingRequest(true);
    setError(null);
    
    try {
      const status = await requesterInterface.checkApprovalStatus(patientAddress, requestId);
      
      if (status.isApproved) {
        setActiveStep(2);
      } else {
        setError('아직 요청이 승인되지 않았습니다. 나중에 다시 확인해주세요.');
      }
    } catch (error) {
      console.error('승인 상태 확인 오류:', error);
      setError('승인 상태 확인 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setLoadingRequest(false);
    }
  };

  // ZK 증명 생성 및 제출
  const generateAndSubmitProof = async () => {
    if (!requesterInterface || !signer || !patientAddress || !requestId) return;

    setLoadingRequest(true);
    setError(null);
    
    try {
      // ZK 증명 생성 요청
      const proofData = await requesterInterface.requestZkProof(patientAddress, requestId, account);
      
      // 증명 데이터 준비
      const preparedData = await requesterInterface.submitProof(proofData, signer);
      
      // 지갑 연결 및 사용자 서명을 통한 증명 제출
      const result = await verifyProof(preparedData.proof, preparedData.publicInputs);
      
      if (result.success) {
        setActiveStep(3);
        // 증명 목록 새로고침
        await loadProofs();
      } else {
        throw new Error(result.error || '증명 검증에 실패했습니다.');
      }
    } catch (error) {
      console.error('증명 생성/제출 오류:', error);
      setError('증명 생성 또는 제출 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setLoadingRequest(false);
    }
  };

  // 자동화된 전체 프로세스 (옵션)
  const startCompleteProcess = async () => {
    if (!requesterInterface || !signer || !patientAddress || !recordHash) return;

    setLoadingRequest(true);
    setError(null);
    setActiveStep(0);
    
    try {
      // 전체 프로세스 시작 (요청 → 타임아웃 있음)
      const result = await requesterInterface.completeAccessProcess(
        patientAddress,
        recordHash,
        signer,
        { 
          pollInterval: 5000, // 5초마다 확인
          timeout: 5 * 60 * 1000 // 5분 타임아웃
        }
      );
      
      setRequestId(result.requestId);
      
      // 증명 준비가 완료되면 실제 검증 수행
      if (result.preparationComplete && result.proof && result.publicInputs) {
        // 사용자 지갑으로 트랜잭션 서명 및 제출
        const verifyResult = await verifyProof(result.proof, result.publicInputs);
        
        if (verifyResult.success) {
          setActiveStep(3);
          // 증명 목록 새로고침
          await loadProofs();
        } else {
          throw new Error(verifyResult.error || '증명 검증에 실패했습니다.');
        }
      } else {
        setActiveStep(3);
        // 증명 목록 새로고침
        await loadProofs();
      }
    } catch (error) {
      console.error('전체 프로세스 오류:', error);
      setError('프로세스 진행 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setLoadingRequest(false);
    }
  };

  // 타임스탬프를 날짜로 변환
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  // 로딩 중 표시
  if (!isConnected) {
    return (
      <Container>
        <Typography variant="h6" sx={{ mt: 4 }}>지갑을 연결해주세요.</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 2 }}>
        <Typography variant="h4" gutterBottom>요청자 대시보드</Typography>
        <Typography variant="body1" color="text.secondary">
          환자의 의료 기록에 접근 요청을 생성하고 ZK 증명을 생성하세요.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <AssignmentIcon sx={{ mr: 1 }} />
          <Typography variant="h6">새 접근 요청</Typography>
        </Box>
        
        <TextField
          label="환자 주소"
          variant="outlined"
          fullWidth
          margin="normal"
          value={patientAddress}
          onChange={(e) => setPatientAddress(e.target.value)}
          placeholder="0x..."
          disabled={loadingRequest}
        />
        
        <TextField
          label="의료 기록 해시"
          variant="outlined"
          fullWidth
          margin="normal"
          value={recordHash}
          onChange={(e) => setRecordHash(e.target.value)}
          placeholder="0x..."
          disabled={loadingRequest}
        />

        <Box sx={{ mt: 3, mb: 4 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            <Step>
              <StepLabel>접근 요청</StepLabel>
            </Step>
            <Step>
              <StepLabel>환자 승인 대기</StepLabel>
            </Step>
            <Step>
              <StepLabel>ZK 증명 생성</StepLabel>
            </Step>
            <Step>
              <StepLabel>증명 완료</StepLabel>
            </Step>
          </Stepper>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button
            variant="contained"
            onClick={handleRequestAccess}
            disabled={!patientAddress || !recordHash || loadingRequest}
            fullWidth
          >
            {loadingRequest && activeStep === 0 ? <CircularProgress size={24} /> : '1. 접근 요청 생성'}
          </Button>
          
          <Button
            variant="contained"
            onClick={checkApprovalStatus}
            disabled={activeStep < 1 || loadingRequest}
            fullWidth
          >
            {loadingRequest && activeStep === 1 ? <CircularProgress size={24} /> : '2. 승인 상태 확인'}
          </Button>
          
          <Button
            variant="contained"
            onClick={generateAndSubmitProof}
            disabled={activeStep < 2 || loadingRequest}
            fullWidth
          >
            {loadingRequest && activeStep === 2 ? <CircularProgress size={24} /> : '3. ZK 증명 생성/제출'}
          </Button>
        </Box>
        
        <Divider sx={{ my: 3 }} />
        
        <Button
          variant="outlined"
          color="secondary"
          onClick={startCompleteProcess}
          disabled={!patientAddress || !recordHash || loadingRequest}
          fullWidth
          sx={{ mt: 2 }}
        >
          {loadingRequest ? <CircularProgress size={24} /> : '자동화된 전체 프로세스 시작 (요청+증명)'}
        </Button>
      </Paper>

      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          <VerifiedUserIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          특정 속성 검증
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          환자의 실제 의료 데이터를 공개하지 않고도 특정 조건을 만족하는지 검증합니다.
        </Typography>
        
        <BloodTypeVerification 
          patientAddress={patientAddress || ''} 
          requesterAddress={account || ''}
        />
        
        {/* 추가 속성 검증 컴포넌트들은 여기에 추가할 수 있습니다 */}
      </Paper>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          증명 내역
          <Button
            variant="outlined"
            size="small"
            sx={{ ml: 2 }}
            onClick={loadProofs}
            disabled={loadingProofs}
          >
            {loadingProofs ? <CircularProgress size={20} /> : '새로고침'}
          </Button>
        </Typography>
        
        {proofs.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              아직 생성된 증명이 없습니다.
            </Typography>
          </Paper>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
            {proofs.map((proof) => (
              <Card key={proof.id} elevation={2}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <VerifiedUserIcon color="success" sx={{ mr: 1 }} />
                    <Typography variant="h6" component="div">
                      증명 {proof.id.substring(0, 8)}
                    </Typography>
                  </Box>
                  <Chip
                    label={proof.isApproved ? '승인됨' : '거부됨'}
                    color={proof.isApproved ? 'success' : 'error'}
                    size="small"
                    sx={{ mb: 2 }}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    환자: {proof.patientAddress.substring(0, 6)}...{proof.patientAddress.substring(proof.patientAddress.length - 4)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    기록 해시: {proof.recordHash.substring(0, 10)}...
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    생성일: {formatDate(proof.createdAt)}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default RequesterDashboard; 