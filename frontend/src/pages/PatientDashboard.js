import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HistoryIcon from '@mui/icons-material/History';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import PatientInterface from '../interfaces/PatientInterface';

const PatientDashboard = ({ account, provider, signer, isConnected }) => {
  const navigate = useNavigate();
  const [pendingRequests, setPendingRequests] = useState([]);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [patientInterface, setPatientInterface] = useState(null);

  // 지갑 연결 상태 확인 및 리다이렉트
  useEffect(() => {
    if (!isConnected) {
      navigate('/');
    }
  }, [isConnected, navigate]);

  // PatientInterface 초기화
  useEffect(() => {
    const initInterface = async () => {
      if (provider && isConnected) {
        try {
          // 환경 변수에서 컨트랙트 주소 가져오기
          const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;
          
          // ABI를 직접 가져오기 - API 요청 방식 대신 직접 임포트
          // 이미 백엔드에 가져온 verifierABI.json 사용
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
            },
            {
              "inputs": [
                {
                  "internalType": "bytes32",
                  "name": "requestId",
                  "type": "bytes32"
                }
              ],
              "name": "approveAccess",
              "outputs": [],
              "stateMutability": "nonpayable",
              "type": "function"
            },
            {
              "inputs": [
                {
                  "internalType": "bytes32",
                  "name": "requestId",
                  "type": "bytes32"
                }
              ],
              "name": "denyAccess",
              "outputs": [],
              "stateMutability": "nonpayable",
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
                  "name": "requestId",
                  "type": "bytes32"
                }
              ],
              "name": "getApprovalStatus",
              "outputs": [
                {
                  "internalType": "bool",
                  "name": "",
                  "type": "bool"
                },
                {
                  "internalType": "uint256",
                  "name": "",
                  "type": "uint256"
                }
              ],
              "stateMutability": "view",
              "type": "function"
            },
            {
              "inputs": [
                {
                  "internalType": "bytes32",
                  "name": "requestId",
                  "type": "bytes32"
                }
              ],
              "name": "getRequestDetails",
              "outputs": [
                {
                  "components": [
                    {
                      "internalType": "address",
                      "name": "requester",
                      "type": "address"
                    },
                    {
                      "internalType": "address",
                      "name": "patient",
                      "type": "address"
                    },
                    {
                      "internalType": "bytes32",
                      "name": "recordHash",
                      "type": "bytes32"
                    },
                    {
                      "internalType": "bool",
                      "name": "pendingApproval",
                      "type": "bool"
                    },
                    {
                      "internalType": "bool",
                      "name": "isApproved",
                      "type": "bool"
                    },
                    {
                      "internalType": "uint256",
                      "name": "requestTime",
                      "type": "uint256"
                    },
                    {
                      "internalType": "uint256",
                      "name": "approvalTime",
                      "type": "uint256"
                    }
                  ],
                  "internalType": "struct MedicalRecordVerifier.AccessRequest",
                  "name": "",
                  "type": "tuple"
                }
              ],
              "stateMutability": "view",
              "type": "function"
            },
            {
              "anonymous": false,
              "inputs": [
                {
                  "indexed": true,
                  "internalType": "address",
                  "name": "requester",
                  "type": "address"
                },
                {
                  "indexed": true,
                  "internalType": "address",
                  "name": "patient",
                  "type": "address"
                },
                {
                  "indexed": false,
                  "internalType": "bytes32",
                  "name": "recordHash",
                  "type": "bytes32"
                },
                {
                  "indexed": false,
                  "internalType": "bytes32",
                  "name": "requestId",
                  "type": "bytes32"
                }
              ],
              "name": "AccessRequested",
              "type": "event"
            },
            {
              "anonymous": false,
              "inputs": [
                {
                  "indexed": true,
                  "internalType": "address",
                  "name": "patient",
                  "type": "address"
                },
                {
                  "indexed": false,
                  "internalType": "bytes32",
                  "name": "requestId",
                  "type": "bytes32"
                },
                {
                  "indexed": false,
                  "internalType": "uint256",
                  "name": "approvalTime",
                  "type": "uint256"
                }
              ],
              "name": "AccessApproved",
              "type": "event"
            },
            {
              "anonymous": false,
              "inputs": [
                {
                  "indexed": true,
                  "internalType": "address",
                  "name": "requester",
                  "type": "address"
                },
                {
                  "indexed": false,
                  "internalType": "bytes32",
                  "name": "recordHash",
                  "type": "bytes32"
                },
                {
                  "indexed": false,
                  "internalType": "bytes32",
                  "name": "nullifierHash",
                  "type": "bytes32"
                },
                {
                  "indexed": false,
                  "internalType": "bool",
                  "name": "isApproved",
                  "type": "bool"
                }
              ],
              "name": "ProofVerified",
              "type": "event"
            }
          ];
          
          // 환자 인터페이스 인스턴스 생성
          const patientInterfaceInstance = new PatientInterface(provider, contractAddress, verifierABI);
          setPatientInterface(patientInterfaceInstance);
        } catch (error) {
          console.error('PatientInterface 초기화 오류:', error);
          setError('블록체인 연결 중 오류가 발생했습니다.');
        }
      }
    };

    initInterface();
  }, [provider, isConnected]);

  // 요청 목록 로드
  const loadRequests = async () => {
    if (!patientInterface || !account) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // 대기 중인 요청 로드
      const pending = await patientInterface.getPendingRequests(account);
      setPendingRequests(pending);
      
      // 승인된 요청 로드
      const approved = await patientInterface.getApprovedRequests(account);
      setApprovedRequests(approved);
    } catch (error) {
      console.error('요청 목록 로드 오류:', error);
      setError('요청 목록을 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 및 PatientInterface 변경 시 요청 목록 로드
  useEffect(() => {
    if (patientInterface) {
      loadRequests();
    }
  }, [patientInterface, account]);

  // 요청 승인/거부 처리
  const handleRequestAction = async (requestId, approve) => {
    if (!patientInterface || !signer) return;
    
    setLoading(true);
    setError(null);
    
    try {
      if (approve) {
        await patientInterface.approveAccess(requestId, signer);
      } else {
        await patientInterface.denyAccess(requestId, signer);
      }
      
      // 요청 목록 새로고침
      await loadRequests();
    } catch (error) {
      console.error(`요청 ${approve ? '승인' : '거부'} 오류:`, error);
      setError(`요청을 ${approve ? '승인' : '거부'}하는 중 오류가 발생했습니다.`);
    } finally {
      setLoading(false);
    }
  };

  // 요청자 주소 줄임 함수
  const shortenAddress = (address) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // 타임스탬프를 날짜로 변환
  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
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
        <Typography variant="h4" gutterBottom>환자 대시보드</Typography>
        <Typography variant="body1" color="text.secondary">
          의료 기록 접근 요청을 관리하고 승인 내역을 확인하세요.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <PersonIcon sx={{ mr: 1 }} />
          <Typography variant="h6">내 계정</Typography>
        </Box>
        <Typography variant="body1">{account}</Typography>
        <Button
          variant="outlined"
          size="small"
          sx={{ mt: 2 }}
          onClick={loadRequests}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : '새로고침'}
        </Button>
      </Paper>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          <NewReleasesIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          대기 중인 요청
        </Typography>
        <Paper elevation={2}>
          {pendingRequests.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                대기 중인 요청이 없습니다.
              </Typography>
            </Box>
          ) : (
            <List>
              {pendingRequests.map((request, index) => (
                <React.Fragment key={request.requestId}>
                  <ListItem
                    secondaryAction={
                      <Box>
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          onClick={() => handleRequestAction(request.requestId, true)}
                          disabled={loading}
                          sx={{ mr: 1 }}
                        >
                          <CheckCircleIcon sx={{ mr: 0.5 }} />
                          승인
                        </Button>
                        <Button
                          variant="contained"
                          color="error"
                          size="small"
                          onClick={() => handleRequestAction(request.requestId, false)}
                          disabled={loading}
                        >
                          <CancelIcon sx={{ mr: 0.5 }} />
                          거부
                        </Button>
                      </Box>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar>
                        <PersonIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`요청 ID: ${request.requestId.substring(0, 10)}...`}
                      secondary={
                        <>
                          <Typography component="span" variant="body2">
                            요청자: {shortenAddress(request.requester)}
                          </Typography>
                          <br />
                          <Typography component="span" variant="body2">
                            요청 시간: {formatDate(request.requestTime)}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                  {index < pendingRequests.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Paper>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          승인된 요청 내역
        </Typography>
        <Paper elevation={2}>
          {approvedRequests.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                승인된 요청이 없습니다.
              </Typography>
            </Box>
          ) : (
            <List>
              {approvedRequests.map((request, index) => (
                <React.Fragment key={request.requestId}>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'success.main' }}>
                        <CheckCircleIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <>
                          <Typography component="span" variant="body1">
                            요청 ID: {request.requestId.substring(0, 10)}...
                          </Typography>
                          <Chip
                            size="small"
                            color="success"
                            label="승인됨"
                            sx={{ ml: 1 }}
                          />
                        </>
                      }
                      secondary={
                        <>
                          <Typography component="span" variant="body2">
                            요청자: {shortenAddress(request.requester)}
                          </Typography>
                          <br />
                          <Typography component="span" variant="body2">
                            승인 시간: {formatDate(request.approvalTime)}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                  {index < approvedRequests.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default PatientDashboard; 