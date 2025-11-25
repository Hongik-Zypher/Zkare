import React, { useState, useEffect } from 'react';
import {
    Container,
    Box,
    Typography,
    Tab,
    Tabs,
    Alert,
    CircularProgress,
    Paper,
    Button,
    Card,
    CardContent,
    Chip,
    Grid,
    Divider,
    Stepper,
    Step,
    StepLabel,
    StepContent,
} from '@mui/material';
import { Security, Shield, Person, VpnKey, CheckCircle, Lock } from '@mui/icons-material';
import GuardianSetup from '../../components/KeyRecovery/GuardianSetup';
import RecoveryRequest from '../../components/KeyRecovery/RecoveryRequest';
import KeyRecoveryProcess from '../../components/KeyRecovery/KeyRecoveryProcess';
import KeyGeneration from '../../components/KeyGeneration';
import LateGuardianSetup from '../../components/KeyRecovery/LateGuardianSetup';
import { hasGuardians, getActiveRecoveryRequest, isPublicKeyRegistered, hasUserData, getGuardians } from '../../utils/contracts';
import { COLORS } from '../../utils/constants';

function TabPanel({ children, value, index, ...other }) {
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`key-recovery-tabpanel-${index}`}
            aria-labelledby={`key-recovery-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ pt: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

const KeyRecoveryPage = ({ currentAccount }) => {
    const [tabValue, setTabValue] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [hasGuardiansSet, setHasGuardiansSet] = useState(false);
    const [activeRequestId, setActiveRequestId] = useState(null);
    const [canComplete, setCanComplete] = useState(false);
    const [hasPublicKey, setHasPublicKey] = useState(false);
    const [hasUserDataSet, setHasUserDataSet] = useState(false);
    const [guardianInfo, setGuardianInfo] = useState(null);
    const [showLateSetup, setShowLateSetup] = useState(false);

    useEffect(() => {
        if (currentAccount) {
            checkUserStatus();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentAccount]);

    // MetaMask 계정 변경 감지
    useEffect(() => {
        if (window.ethereum) {
            const handleAccountsChanged = async (accounts) => {
                if (accounts.length > 0) {
                    // 계정이 변경되면 상태 새로고침
                    await checkUserStatus();
                } else {
                    // 계정 연결 해제
                    setHasGuardiansSet(false);
                    setActiveRequestId(null);
                    setCanComplete(false);
                    setHasPublicKey(false);
                    setHasUserDataSet(false);
                    setGuardianInfo(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const checkUserStatus = async () => {
        setLoading(true);
        setError('');

        try {
            const publicKeyRegistered = await isPublicKeyRegistered(currentAccount);
            setHasPublicKey(publicKeyRegistered);

            if (!publicKeyRegistered) {
                setTabValue(0);
                setLoading(false);
                return;
            }

            const userDataSet = await hasUserData(currentAccount);
            setHasUserDataSet(userDataSet);

            const guardiansSet = await hasGuardians(currentAccount);
            setHasGuardiansSet(guardiansSet);

            if (userDataSet || guardiansSet) {
                try {
                    const guardians = await getGuardians(currentAccount);
                    setGuardianInfo(guardians);
                } catch (error) {
                    console.error('보호자 정보 조회 오류:', error);
                }
            }

            if (userDataSet || guardiansSet) {
                const requestId = await getActiveRecoveryRequest(currentAccount);
                if (requestId && requestId !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
                    setActiveRequestId(requestId);
                    setTabValue(1);
                } else {
                    setActiveRequestId(null);
                    setCanComplete(false);
                    setTabValue(1);
                }
            } else {
                setTabValue(0);
            }

        } catch (error) {
            console.error('사용자 상태 확인 오류:', error);
            setError('사용자 상태를 확인할 수 없습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    const handleGuardianSetupComplete = () => {
        setHasGuardiansSet(true);
        setTabValue(1);
    };

    const handleRecoveryComplete = (requestId) => {
        setActiveRequestId(requestId);
        setCanComplete(true);
        setTabValue(2);
    };

    const handleNewKeyComplete = () => {
        checkUserStatus();
    };

    if (!currentAccount) {
        return (
            <Box sx={{ minHeight: '100vh', backgroundColor: COLORS.background }}>
                <Container maxWidth="lg" sx={{ py: 4 }}>
                    <Card elevation={0} sx={{ border: `2px solid ${COLORS.border}`, borderRadius: '12px' }}>
                        <CardContent sx={{ p: 4, textAlign: 'center' }}>
                            <Alert severity="warning" sx={{ borderRadius: '8px' }}>
                                키 복구 시스템을 사용하려면 먼저 MetaMask를 연결해주세요.
                            </Alert>
                        </CardContent>
                    </Card>
                </Container>
            </Box>
        );
    }

    if (loading) {
        return (
            <Box sx={{ minHeight: '100vh', backgroundColor: COLORS.background, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Box sx={{ textAlign: 'center' }}>
                    <CircularProgress />
                    <Typography variant="body2" sx={{ mt: 2, color: COLORS.textSecondary }}>
                        상태를 확인하는 중...
                    </Typography>
                </Box>
            </Box>
        );
    }

    // 현재 단계 계산
    const getCurrentStep = () => {
        if (!hasPublicKey) return 0;
        if (!hasUserDataSet && !hasGuardiansSet) return 1;
        if (activeRequestId && canComplete) return 3;
        return 2;
    };

    return (
        <Box sx={{ minHeight: '100vh', backgroundColor: COLORS.background }}>
            <Container maxWidth="xl" sx={{ py: 4 }}>
                {/* 헤더 섹션 */}
                <Box sx={{ mb: 4, pb: 3, borderBottom: `2px solid ${COLORS.border}` }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                        <Box
                            sx={{
                                width: 48,
                                height: 48,
                                borderRadius: '10px',
                                backgroundColor: COLORS.primary,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                            }}
                        >
                            <Security sx={{ fontSize: 24 }} />
                        </Box>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700, color: COLORS.textPrimary, letterSpacing: '-0.02em' }}>
                                키 복구 시스템
                            </Typography>
                            <Typography variant="body2" sx={{ color: COLORS.textSecondary, fontSize: '0.875rem', mt: 0.5 }}>
                                2-of-3 보호자 승인을 통한 안전한 키 복구
                            </Typography>
                        </Box>
                    </Box>
                </Box>

                {/* 진행 단계 표시 - 컴팩트 버전 */}
                <Card elevation={0} sx={{ mb: 4, border: `2px solid ${COLORS.border}`, borderRadius: '12px' }}>
                    <CardContent sx={{ p: 2.5 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS.textPrimary, mb: 2.5, fontSize: '1rem' }}>
                            복구 프로세스 진행 상황
                        </Typography>
                        <Grid container spacing={2}>
                            {[
                                {
                                    icon: hasPublicKey ? <CheckCircle sx={{ fontSize: 18 }} /> : <Lock sx={{ fontSize: 18 }} />,
                                    title: '키 생성',
                                    desc: 'RSA 키 쌍 생성 및 공개키 등록',
                                    completed: hasPublicKey,
                                },
                                {
                                    icon: (hasUserDataSet || hasGuardiansSet) ? <CheckCircle sx={{ fontSize: 18 }} /> : <Shield sx={{ fontSize: 18 }} />,
                                    title: '보호자 설정',
                                    desc: '3명의 보호자 등록 및 SSS 조각 저장',
                                    completed: hasUserDataSet || hasGuardiansSet,
                                },
                                {
                                    icon: <Person sx={{ fontSize: 18 }} />,
                                    title: '복구 요청',
                                    desc: '보호자 2명의 승인 대기',
                                    completed: false,
                                    active: activeRequestId,
                                },
                                {
                                    icon: canComplete ? <CheckCircle sx={{ fontSize: 18 }} /> : <VpnKey sx={{ fontSize: 18 }} />,
                                    title: '키 복구 완료',
                                    desc: 'SSS 조각 결합 및 새 키 생성',
                                    completed: canComplete,
                                },
                            ].map((step, index) => (
                                <Grid item xs={12} sm={6} md={3} key={index}>
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 2,
                                            border: `2px solid ${step.completed ? COLORS.success : step.active ? COLORS.primary : COLORS.border}`,
                                            borderRadius: '8px',
                                            backgroundColor: step.completed ? COLORS.successBg : step.active ? COLORS.primaryBg : COLORS.background,
                                            height: '100%',
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                            <Box
                                                sx={{
                                                    width: 28,
                                                    height: 28,
                                                    borderRadius: '6px',
                                                    backgroundColor: step.completed ? COLORS.success : step.active ? COLORS.primary : COLORS.border,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: step.completed || step.active ? 'white' : COLORS.textTertiary,
                                                }}
                                            >
                                                {step.icon}
                                            </Box>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: COLORS.textPrimary, fontSize: '0.875rem' }}>
                                                {step.title}
                                            </Typography>
                                        </Box>
                                        <Typography variant="caption" sx={{ color: COLORS.textSecondary, fontSize: '0.75rem', lineHeight: 1.4 }}>
                                            {step.desc}
                                        </Typography>
                                    </Paper>
                                </Grid>
                            ))}
                        </Grid>
                    </CardContent>
                </Card>

                {/* 메인 컨텐츠 영역 */}
                <Card elevation={0} sx={{ border: `2px solid ${COLORS.border}`, borderRadius: '12px' }}>
                    <Box sx={{ borderBottom: `2px solid ${COLORS.border}` }}>
                        <Tabs 
                            value={tabValue} 
                            onChange={handleTabChange}
                            variant="fullWidth"
                            sx={{
                                '& .MuiTab-root': {
                                    color: COLORS.textSecondary,
                                    fontWeight: 500,
                                    fontSize: '0.9375rem',
                                    py: 2.5,
                                    textTransform: 'none',
                                    '&.Mui-selected': {
                                        color: COLORS.primary,
                                        fontWeight: 600,
                                    },
                                },
                                '& .MuiTabs-indicator': {
                                    backgroundColor: COLORS.primary,
                                    height: '3px',
                                },
                            }}
                        >
                            <Tab 
                                icon={<Shield sx={{ fontSize: 20 }} />} 
                                iconPosition="start"
                                label="보호자 설정" 
                                disabled={hasGuardiansSet || hasUserDataSet}
                            />
                            <Tab 
                                icon={<Person sx={{ fontSize: 20 }} />} 
                                iconPosition="start"
                                label="키 복구 요청" 
                                disabled={!hasPublicKey || (!hasGuardiansSet && !hasUserDataSet)}
                            />
                            <Tab 
                                icon={<VpnKey sx={{ fontSize: 20 }} />} 
                                iconPosition="start"
                                label="키 복구 완료" 
                                disabled={!canComplete}
                            />
                        </Tabs>
                    </Box>

                    {error && (
                        <Box sx={{ p: 3 }}>
                            <Alert severity="error" sx={{ borderRadius: '8px' }}>
                                {error}
                            </Alert>
                        </Box>
                    )}

                    <TabPanel value={tabValue} index={0}>
                        <Box sx={{ p: 3 }}>
                            {!hasPublicKey ? (
                                <Box>
                                    <Alert severity="info" sx={{ mb: 3, borderRadius: '8px' }}>
                                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                                            키 생성 + 보호자 설정
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                            키를 생성하면 자동으로 보호자 설정 다이얼로그가 나타납니다.
                                            보호자 3명을 입력하고 "설정 완료"를 클릭하면 SSS 조각이 블록체인에 저장됩니다.
                                        </Typography>
                                    </Alert>
                                    <KeyGeneration 
                                        currentAccount={currentAccount}
                                        onKeyRegistered={checkUserStatus}
                                    />
                                </Box>
                            ) : hasUserDataSet ? (
                                <Box>
                                    <Alert severity="success" sx={{ mb: 3, borderRadius: '8px' }}>
                                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                                            SSS 키 복구 시스템 설정 완료
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                            보호자 3명이 설정되었고, SSS 조각이 블록체인에 안전하게 저장되어 있습니다.
                                            키 분실 시 보호자 2명의 승인으로 복구할 수 있습니다.
                                        </Typography>
                                    </Alert>
                                    
                                    {guardianInfo && (
                                        <Card elevation={0} sx={{ border: `2px solid ${COLORS.border}`, borderRadius: '12px' }}>
                                            <CardContent sx={{ p: 3 }}>
                                                <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS.textPrimary, mb: 2.5 }}>
                                                    등록된 보호자 목록
                                                </Typography>
                                                <Divider sx={{ mb: 2.5, borderColor: COLORS.border }} />
                                                <Grid container spacing={2}>
                                                    {guardianInfo.addresses.map((address, index) => (
                                                        <Grid item xs={12} md={4} key={index}>
                                                            <Paper
                                                                elevation={0}
                                                                sx={{
                                                                    p: 2.5,
                                                                    border: `2px solid ${COLORS.border}`,
                                                                    borderRadius: '8px',
                                                                    backgroundColor: COLORS.background,
                                                                }}
                                                            >
                                                                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: COLORS.textPrimary, mb: 1 }}>
                                                                    {guardianInfo.names[index]}
                                                                </Typography>
                                                                <Typography variant="caption" sx={{ color: COLORS.textSecondary, display: 'block', mb: 0.5, fontSize: '0.75rem' }}>
                                                                    지갑: {address}
                                                                </Typography>
                                                                <Typography variant="caption" sx={{ color: COLORS.textSecondary, display: 'block', fontSize: '0.75rem' }}>
                                                                    연락처: {guardianInfo.contacts[index]}
                                                                </Typography>
                                                            </Paper>
                                                        </Grid>
                                                    ))}
                                                </Grid>
                                            </CardContent>
                                        </Card>
                                    )}
                                </Box>
                            ) : hasGuardiansSet ? (
                                <Alert severity="warning" sx={{ borderRadius: '8px' }}>
                                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                                        기존 방식으로 설정되어 SSS를 사용할 수 없습니다
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                        현재 계정은 기존 방식으로 보호자가 설정되어 있어, SSS 조각이 블록체인에 저장되지 않았습니다.
                                        새 MetaMask 계정으로 전환하여 키 생성 후 보호자 설정을 완료하세요.
                                    </Typography>
                                </Alert>
                            ) : (
                                <Box>
                                    <Alert severity="info" sx={{ mb: 3, borderRadius: '8px' }}>
                                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                                            키가 있지만 보호자가 설정되지 않았습니다
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontSize: '0.875rem', mb: 2 }}>
                                            이미 키를 생성했지만 보호자를 설정하지 않으셨나요?
                                            두 가지 방법으로 보호자를 설정할 수 있습니다:
                                        </Typography>
                                        <Button
                                            variant="outlined"
                                            onClick={() => setShowLateSetup(!showLateSetup)}
                                            sx={{
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
                                            {showLateSetup ? '취소' : '개인키 업로드해서 보호자 등록'}
                                        </Button>
                                    </Alert>

                                    {showLateSetup ? (
                                        <LateGuardianSetup
                                            currentAccount={currentAccount}
                                            onComplete={() => {
                                                setShowLateSetup(false);
                                                checkUserStatus();
                                            }}
                                        />
                                    ) : (
                                        <Alert severity="info" sx={{ borderRadius: '8px' }}>
                                            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                                새 계정으로 전환하여 키를 생성하면 자동으로 보호자 설정 다이얼로그가 나타납니다.
                                            </Typography>
                                        </Alert>
                                    )}
                                </Box>
                            )}
                        </Box>
                    </TabPanel>

                    <TabPanel value={tabValue} index={1}>
                        <Box sx={{ p: 3 }}>
                            {!hasPublicKey ? (
                                <Alert severity="warning" sx={{ borderRadius: '8px' }}>
                                    먼저 키를 생성해야 키 복구를 요청할 수 있습니다.
                                </Alert>
                            ) : (hasUserDataSet || hasGuardiansSet) ? (
                                <RecoveryRequest 
                                    currentAccount={currentAccount}
                                    onRecoveryComplete={handleRecoveryComplete}
                                />
                            ) : (
                                <Alert severity="warning" sx={{ borderRadius: '8px' }}>
                                    먼저 보호자를 설정해야 키 복구를 요청할 수 있습니다.
                                </Alert>
                            )}
                        </Box>
                    </TabPanel>

                    <TabPanel value={tabValue} index={2}>
                        <Box sx={{ p: 3 }}>
                            {canComplete && activeRequestId ? (
                                <KeyRecoveryProcess 
                                    requestId={activeRequestId}
                                    currentAccount={currentAccount}
                                    onComplete={handleNewKeyComplete}
                                />
                            ) : (
                                <Alert severity="info" sx={{ borderRadius: '8px' }}>
                                    보호자 2명 이상의 승인을 받은 후 키를 복구할 수 있습니다.
                                </Alert>
                            )}
                        </Box>
                    </TabPanel>
                </Card>
            </Container>
        </Box>
    );
};

export default KeyRecoveryPage;
