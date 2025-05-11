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
  CardContent,
  Grid,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Tooltip
} from '@mui/material';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import AssignmentIcon from '@mui/icons-material/Assignment';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import HistoryIcon from '@mui/icons-material/History';
import RefreshIcon from '@mui/icons-material/Refresh';
import TimelineIcon from '@mui/icons-material/Timeline';
import ArticleIcon from '@mui/icons-material/Article';
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
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loadingProofs, setLoadingProofs] = useState(false);
  const [loadingPendingRequests, setLoadingPendingRequests] = useState(false);
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

  // 대기 중인 요청 목록 로드
  const loadPendingRequests = async () => {
    if (!requesterInterface || !account) return;

    setLoadingPendingRequests(true);
    setError(null);

    try {
      // RequesterInterface를 통해 대기 중인 요청 목록 조회
      const requests = await requesterInterface.getPendingRequests(account);
      setPendingRequests(requests);
    } catch (error) {
      console.error('대기 중인 요청 목록 로드 오류:', error);
      setError('대기 중인 요청 목록을 불러오는 데 실패했습니다.');
    } finally {
      setLoadingPendingRequests(false);
    }
  };

  // 컴포넌트 마운트 시 증명 목록과 대기 중인 요청 목록 로드
  useEffect(() => {
    if (account) {
      loadProofs();
    }
  }, [account]);

  useEffect(() => {
    if (requesterInterface && account) {
      loadPendingRequests();
    }
  }, [requesterInterface, account]);

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

  // 요청자 주소 줄임 함수
  const shortenAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
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

      {/* 대기 중인 요청 목록 */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TimelineIcon sx={{ mr: 1 }} />
            <Typography variant="h6">요청 응답 현황</Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={loadPendingRequests}
            disabled={loadingPendingRequests}
          >
            {loadingPendingRequests ? <CircularProgress size={20} /> : '새로고침'}
          </Button>
        </Box>
        
        {loadingPendingRequests ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : pendingRequests.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              대기 중인 요청이 없습니다.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>요청 ID</TableCell>
                  <TableCell>환자 주소</TableCell>
                  <TableCell>기록 해시</TableCell>
                  <TableCell>요청 시간</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingRequests.map((request) => (
                  <TableRow key={request.requestId}>
                    <TableCell>{request.requestId.substring(0, 8)}...</TableCell>
                    <TableCell>{shortenAddress(request.patientAddress)}</TableCell>
                    <TableCell>{request.recordHash && request.recordHash.substring(0, 8)}...</TableCell>
                    <TableCell>{formatDate(request.requestTime)}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color="warning"
                        label="승인 대기중"
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="상태 확인">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setRequestId(request.requestId);
                            setPatientAddress(request.patientAddress);
                            checkApprovalStatus();
                          }}
                        >
                          <RefreshIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
      
      {/* 혈액형 검증 컴포넌트 (새로운 플로우) */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <VerifiedUserIcon sx={{ mr: 1 }} />
          <Typography variant="h6">혈액형 ZK 검증</Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          환자의 혈액형을 영지식 증명(ZK)을 통해 검증합니다. 
          환자의 실제 혈액형 정보는 공개되지 않으면서 귀하가 추측한 혈액형이 맞는지만 검증됩니다.
        </Typography>
        
        {/* 새로운 플로우를 사용하는 혈액형 검증 컴포넌트 */}
        <BloodTypeVerification 
          patientAddress={patientAddress || ''}
          requesterAddress={account || ''}
          isPatient={false}
          onComplete={(result) => {
            console.log('혈액형 검증 완료:', result);
            loadProofs(); // 증명 목록 새로고침
          }}
        />
      </Paper>

      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">
            <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            증명 내역
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={loadProofs}
            disabled={loadingProofs}
          >
            {loadingProofs ? <CircularProgress size={20} /> : '새로고침'}
          </Button>
        </Box>
        
        {loadingProofs ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <CircularProgress />
          </Box>
        ) : proofs.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              아직 생성된 증명이 없습니다.
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {proofs.map((proof) => (
              <Grid item xs={12} sm={6} md={4} key={proof.id}>
                <Card elevation={2}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <VerifiedUserIcon color={proof.isApproved ? "success" : "error"} sx={{ mr: 1 }} />
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
                      환자: {shortenAddress(proof.patientAddress)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      기록 해시: {proof.recordHash && proof.recordHash.substring(0, 10)}...
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Nullifier: {proof.nullifierHash && proof.nullifierHash.substring(0, 8)}...
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      생성일: {formatDate(proof.createdAt)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Container>
  );
};

export default RequesterDashboard; 