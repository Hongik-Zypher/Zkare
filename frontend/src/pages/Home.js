import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Paper,
  Stack,
  Divider,
} from "@mui/material";
import {
  LocalHospital as LocalHospitalIcon,
  Security as SecurityIcon,
  Lock as LockIcon,
  CloudUpload as CloudUploadIcon,
  VerifiedUser as VerifiedUserIcon,
  AccountBalanceWallet as WalletIcon,
  Shield as ShieldIcon,
  VpnKey as KeyIcon,
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
  CheckCircle as CheckIcon,
  ArrowForward as ArrowIcon,
  HealthAndSafety as HealthIcon,
} from "@mui/icons-material";
import {
  connectWallet,
  isDoctor,
  addDoctor,
  getContractOwner,
} from "../utils/contracts";
import { useNavigate } from 'react-router-dom';
import { COLORS } from "../utils/constants";

const Home = () => {
  const [currentAccount, setCurrentAccount] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [isOwnerAccount, setIsOwnerAccount] = useState(false);
  const [alert, setAlert] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [doctorManagementOpen, setDoctorManagementOpen] = useState(false);
  const [newDoctorAddress, setNewDoctorAddress] = useState("");

  const navigate = useNavigate();

  useEffect(() => { 
    checkExistingConnection();

    // MetaMask 계정 변경 감지
    if (window.ethereum) {
      const handleAccountsChanged = async (accounts) => {
        if (accounts.length > 0) {
          const newAccount = accounts[0];
          setCurrentAccount(newAccount);
          setIsConnected(true);
          await checkUserRole(newAccount);
        } else {
          setCurrentAccount("");
          setIsConnected(false);
          setUserRole(null);
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);

      // 클린업 함수
      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
      };
    }
  }, []);

  const checkExistingConnection = async () => {
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setCurrentAccount(accounts[0]);
          setIsConnected(true);
          await checkUserRole(accounts[0]);
        }
      }
    } catch (error) {
      console.error("연결 상태 확인 중 오류:", error);
    }
  };

  const checkUserRole = async (account) => {
    try {
      // 마스터 계정 확인 (최우선)
      const masterAuthorityAddress = process.env.REACT_APP_MASTER_AUTHORITY_ADDRESS;
      const isMasterAccount = masterAuthorityAddress && 
        account.toLowerCase() === masterAuthorityAddress.toLowerCase();
      
      if (isMasterAccount) {
        setUserRole('master');
        setIsOwnerAccount(false);
        return;
      }

      const doctorStatus = await isDoctor(account);
      const owner = await getContractOwner();
      const ownerStatus = owner.toLowerCase() === account.toLowerCase();
      setIsOwnerAccount(ownerStatus);
      setUserRole(ownerStatus ? 'owner' : (doctorStatus ? 'doctor' : 'patient'));
    } catch (error) {
      console.error('사용자 역할 확인 중 오류:', error);
      setIsOwnerAccount(false);
      setUserRole('patient');
    }
  };

  const handleConnectWallet = async () => {
    try {
      const account = await connectWallet();
      setCurrentAccount(account);
      setIsConnected(true);
      await checkUserRole(account);
    } catch (error) {
      console.error("지갑 연결 중 오류:", error);
      showAlert("지갑 연결 중 오류가 발생했습니다.", "error");
    }
  };

  const showAlert = (message, severity) => {
    setAlert({ open: true, message, severity });
    setTimeout(() => {
      setAlert((prev) => ({ ...prev, open: false }));
    }, 3000);
  };

  const handleAddDoctor = async () => {
    if (!newDoctorAddress) {
      showAlert("의사 주소를 입력해주세요.", "error");
      return;
    }
    try {
      await addDoctor(newDoctorAddress);
      showAlert("의사가 성공적으로 등록되었습니다.", "success");
      setNewDoctorAddress("");
      setDoctorManagementOpen(false);
    } catch (error) {
      console.error("의사 등록 중 오류:", error);
      showAlert("의사 등록에 실패했습니다.", "error");
    }
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', backgroundColor: COLORS.background }}>
      {/* 헤더 섹션 - 전문적인 병원 스타일 */}
      <Box
        sx={{
          backgroundColor: COLORS.cardBg,
          borderBottom: `2px solid ${COLORS.border}`,
          py: 4,
        }}
      >
        <Container maxWidth="xl">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={8}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: '12px',
                    background: COLORS.gradientPrimary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    boxShadow: `0 4px 12px ${COLORS.primary}30`,
                  }}
                >
                  <HealthIcon sx={{ fontSize: 32 }} />
                </Box>
                <Box>
                  <Typography
                    variant="h3"
                    sx={{
                      fontSize: { xs: '1.75rem', md: '2.25rem' },
                      fontWeight: 700,
                      color: COLORS.textPrimary,
                      mb: 0.5,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    Zkare 의료기록 관리 시스템
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      color: COLORS.textSecondary,
                      fontSize: '1rem',
                      fontWeight: 400,
                    }}
                  >
                    블록체인 기반 암호화 의료정보 보호 플랫폼
                  </Typography>
                </Box>
              </Box>
              <Divider sx={{ my: 3, borderColor: COLORS.border }} />
              <Typography
                variant="body1"
                sx={{
                  color: COLORS.textSecondary,
                  lineHeight: 1.8,
                  fontSize: '1rem',
                  maxWidth: '700px',
                }}
              >
                RSA-2048 암호화와 블록체인 기술을 활용하여 의료정보를 최고 수준으로 보호합니다.
                환자와 의사만 접근 가능한 완벽한 프라이버시와 변조 불가능한 데이터 무결성을 제공합니다.
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card
                elevation={0}
                sx={{
                  border: `2px solid ${COLORS.border}`,
                  borderRadius: '16px',
                  backgroundColor: COLORS.cardBg,
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  {!isConnected ? (
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS.textPrimary, mb: 2 }}>
                        지갑 연결 필요
                      </Typography>
                      <Button
                        variant="contained"
                        onClick={handleConnectWallet}
                        fullWidth
                        startIcon={<WalletIcon />}
                        sx={{
                          py: 1.5,
                          borderRadius: '8px',
                          background: COLORS.gradientPrimary,
                          fontWeight: 600,
                          textTransform: 'none',
                          boxShadow: `0 2px 8px ${COLORS.primary}30`,
                          '&:hover': {
                            background: COLORS.gradientPrimary,
                            boxShadow: `0 4px 12px ${COLORS.primary}40`,
                          },
                        }}
                      >
                        MetaMask 연결
                      </Button>
                    </Box>
                  ) : (
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS.textPrimary }}>
                          연결된 계정
                        </Typography>
                        <Chip
                          label={
                            userRole === 'master' ? '마스터' :
                            userRole === 'doctor' ? '의사' :
                            userRole === 'owner' ? '관리자' : '환자'
                          }
                          size="small"
                          sx={{
                            backgroundColor: 
                              userRole === 'master' ? COLORS.roleMaster :
                              userRole === 'doctor' ? COLORS.roleDoctor :
                              userRole === 'owner' ? COLORS.roleMaster : COLORS.rolePatient,
                            color: 
                              userRole === 'master' ? '#7C3AED' :
                              userRole === 'doctor' ? COLORS.primary :
                              userRole === 'owner' ? '#7C3AED' : COLORS.success,
                            fontWeight: 600,
                            fontSize: '0.75rem',
                          }}
                        />
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'monospace',
                          color: COLORS.textSecondary,
                          mb: 2,
                          wordBreak: 'break-all',
                          fontSize: '0.75rem',
                        }}
                      >
                        {currentAccount}
                      </Typography>
                      <Divider sx={{ my: 2, borderColor: COLORS.border }} />
                      <Button
                        variant="contained"
                        onClick={() => navigate('/encrypted')}
                        fullWidth
                        startIcon={<LocalHospitalIcon />}
                        sx={{
                          py: 1.5,
                          borderRadius: '8px',
                          background: COLORS.gradientPrimary,
                          fontWeight: 600,
                          textTransform: 'none',
                          boxShadow: `0 2px 8px ${COLORS.primary}30`,
                          '&:hover': {
                            background: COLORS.gradientPrimary,
                            boxShadow: `0 4px 12px ${COLORS.primary}40`,
                          },
                        }}
                      >
                        의료기록 관리 시작
                      </Button>
                      {isOwnerAccount && (
                        <Button
                          variant="outlined"
                          onClick={() => setDoctorManagementOpen(true)}
                          fullWidth
                          startIcon={<AdminIcon />}
                          sx={{
                            mt: 1.5,
                            py: 1.5,
                            borderRadius: '8px',
                            borderColor: COLORS.borderDark,
                            color: COLORS.textPrimary,
                            fontWeight: 600,
                            textTransform: 'none',
                            '&:hover': {
                              borderColor: COLORS.primary,
                              backgroundColor: COLORS.primaryBg,
                            },
                          }}
                        >
                          의사 등록
                        </Button>
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* 주요 기능 섹션 */}
      <Box sx={{ py: 8, backgroundColor: COLORS.cardBg }}>
        <Container maxWidth="xl">
          <Box sx={{ mb: 6, textAlign: 'center' }}>
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: '1.75rem', md: '2.25rem' },
                fontWeight: 700,
                color: COLORS.textPrimary,
                mb: 1.5,
                letterSpacing: '-0.02em',
              }}
            >
              핵심 기능
            </Typography>
            <Divider
              sx={{
                width: '80px',
                height: '3px',
                backgroundColor: COLORS.primary,
                mx: 'auto',
                border: 'none',
              }}
            />
          </Box>
          <Grid container spacing={3}>
            {[
              {
                icon: <LockIcon sx={{ fontSize: 32 }} />,
                title: "RSA-2048 암호화",
                description: "의료정보를 최고 수준의 암호화로 보호하여 무단 접근을 차단합니다.",
                color: COLORS.primary,
              },
              {
                icon: <SecurityIcon sx={{ fontSize: 32 }} />,
                title: "블록체인 저장",
                description: "분산 저장으로 데이터 무결성을 보장하고 변조를 방지합니다.",
                color: COLORS.success,
              },
              {
                icon: <KeyIcon sx={{ fontSize: 32 }} />,
                title: "키 복구 시스템",
                description: "2-of-3 보호자 승인으로 안전한 키 복구가 가능합니다.",
                color: COLORS.warningText,
              },
              {
                icon: <CloudUploadIcon sx={{ fontSize: 32 }} />,
                title: "IPFS 통합",
                description: "대용량 의료 데이터를 안전하게 분산 저장합니다.",
                color: COLORS.info,
              },
            ].map((feature, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Card
                  elevation={0}
                  sx={{
                    height: '100%',
                    border: `2px solid ${COLORS.border}`,
                    borderRadius: '12px',
                    backgroundColor: COLORS.cardBg,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: feature.color,
                      boxShadow: `0 4px 16px ${feature.color}20`,
                      transform: 'translateY(-4px)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: '12px',
                        backgroundColor: `${feature.color}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: feature.color,
                        mb: 2.5,
                      }}
                    >
                      {feature.icon}
                    </Box>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        color: COLORS.textPrimary,
                        mb: 1.5,
                        fontSize: '1.125rem',
                      }}
                    >
                      {feature.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: COLORS.textSecondary,
                        lineHeight: 1.7,
                        fontSize: '0.9375rem',
                      }}
                    >
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* 보안 특징 섹션 */}
      <Box sx={{ py: 8, backgroundColor: COLORS.background }}>
        <Container maxWidth="xl">
          <Grid container spacing={6}>
            <Grid item xs={12} md={6}>
              <Card
                elevation={0}
                sx={{
                  height: '100%',
                  border: `2px solid ${COLORS.border}`,
                  borderRadius: '12px',
                  backgroundColor: COLORS.cardBg,
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Typography
                    variant="h3"
                    sx={{
                      fontSize: { xs: '1.5rem', md: '2rem' },
                      fontWeight: 700,
                      color: COLORS.textPrimary,
                      mb: 3,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    보안 특징
                  </Typography>
                  <Divider sx={{ mb: 3, borderColor: COLORS.border }} />
                  <Stack spacing={2.5}>
                    {[
                      "환자와 의사만 접근 가능한 완벽한 프라이버시",
                      "블록체인 기반 변조 불가능한 데이터 무결성",
                      "2-of-3 보호자 시스템으로 안전한 키 복구",
                      "마스터 키를 통한 긴급 상황 대응",
                    ].map((item, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: '6px',
                            backgroundColor: COLORS.successBg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: COLORS.success,
                            flexShrink: 0,
                            mt: 0.25,
                          }}
                        >
                          <CheckIcon sx={{ fontSize: 16 }} />
                        </Box>
                        <Typography
                          variant="body1"
                          sx={{
                            color: COLORS.textPrimary,
                            lineHeight: 1.7,
                            fontSize: '0.9375rem',
                            fontWeight: 400,
                          }}
                        >
                          {item}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card
                elevation={0}
                sx={{
                  height: '100%',
                  border: `2px solid ${COLORS.border}`,
                  borderRadius: '12px',
                  backgroundColor: COLORS.cardBg,
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: '12px',
                      backgroundColor: COLORS.primaryBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: COLORS.primary,
                      mb: 3,
                    }}
                  >
                    <ShieldIcon sx={{ fontSize: 36 }} />
                  </Box>
                  <Typography
                    variant="h3"
                    sx={{
                      fontSize: { xs: '1.5rem', md: '2rem' },
                      fontWeight: 700,
                      color: COLORS.textPrimary,
                      mb: 2,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    최고 수준의 보안
                  </Typography>
                  <Divider sx={{ mb: 3, borderColor: COLORS.border }} />
                  <Typography
                    variant="body1"
                    sx={{
                      color: COLORS.textSecondary,
                      lineHeight: 1.8,
                      fontSize: '0.9375rem',
                    }}
                  >
                    RSA-2048 암호화와 블록체인 기술을 결합하여 의료정보를 최고 수준으로 보호합니다.
                    의사와 환자만 개인키로 복호화할 수 있으며, 블록체인에 저장된 데이터는 변조가 불가능합니다.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* CTA 섹션 */}
      {!isConnected && (
        <Box
          sx={{
            py: 8,
            backgroundColor: COLORS.cardBg,
            borderTop: `2px solid ${COLORS.border}`,
          }}
        >
          <Container maxWidth="md" sx={{ textAlign: 'center' }}>
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: '1.75rem', md: '2.25rem' },
                fontWeight: 700,
                color: COLORS.textPrimary,
                mb: 2,
                letterSpacing: '-0.02em',
              }}
            >
              지금 시작하세요
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: COLORS.textSecondary,
                mb: 4,
                fontSize: '1rem',
              }}
            >
              MetaMask 지갑을 연결하고 안전한 의료기록 관리를 시작하세요
            </Typography>
            <Button
              variant="contained"
              onClick={handleConnectWallet}
              size="large"
              startIcon={<WalletIcon />}
              sx={{
                px: 5,
                py: 1.75,
                borderRadius: '8px',
                background: COLORS.gradientPrimary,
                fontWeight: 600,
                fontSize: '1rem',
                textTransform: 'none',
                boxShadow: `0 2px 8px ${COLORS.primary}30`,
                '&:hover': {
                  background: COLORS.gradientPrimary,
                  boxShadow: `0 4px 12px ${COLORS.primary}40`,
                },
              }}
            >
              지갑 연결하기
            </Button>
          </Container>
        </Box>
      )}

      {/* 의사 등록 다이얼로그 */}
      <Dialog
        open={doctorManagementOpen}
        onClose={() => setDoctorManagementOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            border: `2px solid ${COLORS.border}`,
          },
        }}
      >
        <DialogTitle
          sx={{
            fontSize: '1.25rem',
            fontWeight: 600,
            color: COLORS.textPrimary,
            pb: 2,
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          새로운 의사 등록
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography
            variant="body2"
            sx={{
              color: COLORS.textSecondary,
              mb: 3,
              fontSize: '0.875rem',
            }}
          >
            등록할 의사의 지갑 주소를 입력해주세요.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="의사 지갑 주소"
            type="text"
            variant="outlined"
            value={newDoctorAddress}
            onChange={(e) => setNewDoctorAddress(e.target.value)}
            placeholder="0x..."
            helperText="올바른 이더리움 주소를 입력해주세요"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                '& fieldset': {
                  borderColor: COLORS.border,
                },
                '&:hover fieldset': {
                  borderColor: COLORS.borderDark,
                },
                '&.Mui-focused fieldset': {
                  borderColor: COLORS.primary,
                },
              },
            }}
          />
        </DialogContent>
        <DialogActions
          sx={{
            p: 3,
            pt: 2,
            borderTop: `1px solid ${COLORS.border}`,
          }}
        >
          <Button
            onClick={() => setDoctorManagementOpen(false)}
            sx={{
              borderRadius: '8px',
              fontWeight: 600,
              color: COLORS.textSecondary,
              '&:hover': {
                backgroundColor: COLORS.background,
              },
            }}
          >
            취소
          </Button>
          <Button
            onClick={handleAddDoctor}
            variant="contained"
            disabled={!newDoctorAddress || newDoctorAddress.length !== 42}
            sx={{
              borderRadius: '8px',
              fontWeight: 600,
              background: COLORS.gradientPrimary,
              '&:hover': {
                background: COLORS.gradientPrimary,
              },
              '&:disabled': {
                backgroundColor: COLORS.border,
                color: COLORS.textTertiary,
              },
            }}
          >
            등록하기
          </Button>
        </DialogActions>
      </Dialog>

      {/* 알림 스낵바 */}
      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={() => setAlert({ ...alert, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setAlert({ ...alert, open: false })}
          severity={alert.severity}
          sx={{
            width: '100%',
            borderRadius: '8px',
            border: `1px solid ${COLORS.border}`,
          }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Home;
