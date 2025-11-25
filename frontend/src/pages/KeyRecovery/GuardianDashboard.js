import React, { useState, useEffect } from 'react';
import {
    Container,
    Box,
    Typography,
    Card,
    CardContent,
    Alert,
    CircularProgress,
    Button,
    Paper,
    Chip,
    Grid,
    Divider,
} from '@mui/material';
import { Security, Schedule, CheckCircle, Warning, Person, AccessTime } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { getKeyRecoveryContract, getGuardians } from '../../utils/contracts';
import { COLORS } from '../../utils/constants';

const GuardianDashboard = ({ currentAccount }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [pendingRequests, setPendingRequests] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        if (currentAccount) {
            loadPendingRequests();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentAccount]);

    // MetaMask 계정 변경 감지
    useEffect(() => {
        if (window.ethereum) {
            const handleAccountsChanged = async (accounts) => {
                if (accounts.length > 0) {
                    // 계정이 변경되면 요청 목록 새로고침
                    await loadPendingRequests();
                } else {
                    // 계정 연결 해제
                    setPendingRequests([]);
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

    const loadPendingRequests = async () => {
        setLoading(true);
        setError('');

        try {
            const contract = await getKeyRecoveryContract();
            const provider = new ethers.providers.Web3Provider(window.ethereum, {
                chainId: 31337,
                name: 'localhost',
                ensAddress: null
            });

            const currentBlock = await provider.getBlockNumber();
            const fromBlock = Math.max(0, currentBlock - 10000);
            
            const filter = contract.filters.RecoveryRequested();
            const events = await contract.queryFilter(filter, fromBlock, currentBlock);

            const requests = [];
            for (const event of events) {
                const requestUser = event.args.user;
                const requestId = event.args.requestId;
                const expiryTime = event.args.expiryTime.toNumber();

                try {
                    const guardianData = await getGuardians(requestUser);
                    
                    const isGuardian = guardianData.addresses.some(addr => 
                        addr.toLowerCase() === currentAccount.toLowerCase()
                    );

                    if (isGuardian) {
                        const status = await contract.getRecoveryStatus(requestId);
                        
                        const now = Math.floor(Date.now() / 1000);
                        if (now <= expiryTime && !status.isCompleted && !status.isCancelled) {
                            const response = await contract.getGuardianResponse(requestId, currentAccount);
                            
                            requests.push({
                                requestId: requestId,
                                user: requestUser,
                                timestamp: status.timestamp.toNumber(),
                                expiryTime: expiryTime,
                                approvalCount: status.approvalCount.toNumber(),
                                isCompleted: status.isCompleted,
                                isCancelled: status.isCancelled,
                                hasApproved: response.hasApproved,
                                hasRejected: response.hasRejected,
                                blockNumber: event.blockNumber
                            });
                        }
                    }
                } catch (err) {
                    console.error('요청 처리 오류:', err);
                }
            }

            requests.sort((a, b) => b.blockNumber - a.blockNumber);
            setPendingRequests(requests);

        } catch (error) {
            console.error('❌ 복구 요청 로드 오류:', error);
            setError('복구 요청을 불러오는 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const formatAddress = (address) => {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const formatDate = (timestamp) => {
        return new Date(timestamp * 1000).toLocaleString('ko-KR');
    };

    const formatTime = (seconds) => {
        const now = Math.floor(Date.now() / 1000);
        const remaining = Math.max(0, seconds - now);
        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        return `${hours}시간 ${minutes}분`;
    };

    const handleApprovalClick = (requestId) => {
        navigate(`/guardian-approval/${requestId}`);
    };

    if (!currentAccount) {
        return (
            <Box sx={{ minHeight: '100vh', backgroundColor: COLORS.background }}>
                <Container maxWidth="lg" sx={{ py: 4 }}>
                    <Card elevation={0} sx={{ border: `2px solid ${COLORS.border}`, borderRadius: '12px' }}>
                        <CardContent sx={{ p: 4, textAlign: 'center' }}>
                            <Alert severity="warning" sx={{ borderRadius: '8px' }}>
                                보호자 대시보드를 사용하려면 먼저 MetaMask를 연결해주세요.
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
                        복구 요청을 확인하는 중...
                    </Typography>
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={{ minHeight: '100vh', backgroundColor: COLORS.background }}>
            <Container maxWidth="xl" sx={{ py: 4 }}>
                {/* 헤더 섹션 */}
                <Box sx={{ mb: 4, pb: 3, borderBottom: `2px solid ${COLORS.border}` }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
                                    보호자 대시보드
                                </Typography>
                                <Typography variant="body2" sx={{ color: COLORS.textSecondary, fontSize: '0.875rem', mt: 0.5 }}>
                                    승인 대기 중인 키 복구 요청 관리
                                </Typography>
                            </Box>
                        </Box>
                        <Button
                            variant="outlined"
                            onClick={loadPendingRequests}
                            disabled={loading}
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
                            새로고침
                        </Button>
                    </Box>
                </Box>

                {/* 계정 정보 카드 */}
                <Card elevation={0} sx={{ mb: 4, border: `2px solid ${COLORS.border}`, borderRadius: '12px' }}>
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Person sx={{ color: COLORS.primary, fontSize: 24 }} />
                            <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS.textPrimary }}>
                                연결된 보호자 계정
                            </Typography>
                        </Box>
                        <Divider sx={{ mb: 2, borderColor: COLORS.border }} />
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', color: COLORS.textSecondary, fontSize: '0.875rem' }}>
                            {currentAccount}
                        </Typography>
                    </CardContent>
                </Card>

                {/* 통계 섹션 */}
                <Grid container spacing={2} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={4}>
                        <Card elevation={0} sx={{ border: `2px solid ${COLORS.border}`, borderRadius: '12px' }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Typography variant="caption" sx={{ color: COLORS.textSecondary, fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    대기 중인 요청
                                </Typography>
                                <Typography variant="h4" sx={{ color: COLORS.primary, fontWeight: 700, mt: 0.5 }}>
                                    {pendingRequests.filter(r => !r.hasApproved && !r.hasRejected).length}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Card elevation={0} sx={{ border: `2px solid ${COLORS.border}`, borderRadius: '12px' }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Typography variant="caption" sx={{ color: COLORS.textSecondary, fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    승인한 요청
                                </Typography>
                                <Typography variant="h4" sx={{ color: COLORS.success, fontWeight: 700, mt: 0.5 }}>
                                    {pendingRequests.filter(r => r.hasApproved).length}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Card elevation={0} sx={{ border: `2px solid ${COLORS.border}`, borderRadius: '12px' }}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Typography variant="caption" sx={{ color: COLORS.textSecondary, fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    전체 요청
                                </Typography>
                                <Typography variant="h4" sx={{ color: COLORS.textPrimary, fontWeight: 700, mt: 0.5 }}>
                                    {pendingRequests.length}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {error && (
                    <Alert severity="error" sx={{ mb: 3, borderRadius: '8px' }}>
                        {error}
                    </Alert>
                )}

                {/* 요청 목록 섹션 */}
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h5" sx={{ fontWeight: 600, color: COLORS.textPrimary, mb: 3 }}>
                        승인 대기 중인 복구 요청
                    </Typography>

                    {pendingRequests.length === 0 ? (
                        <Card elevation={0} sx={{ border: `2px solid ${COLORS.border}`, borderRadius: '12px' }}>
                            <CardContent sx={{ p: 6, textAlign: 'center' }}>
                                <CheckCircle sx={{ fontSize: 64, color: COLORS.success, mb: 2 }} />
                                <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS.textPrimary, mb: 1 }}>
                                    승인 대기 중인 요청이 없습니다
                                </Typography>
                                <Typography variant="body2" sx={{ color: COLORS.textSecondary, fontSize: '0.875rem' }}>
                                    귀하가 보호자로 등록된 사용자로부터 복구 요청이 오면 여기에 표시됩니다.
                                </Typography>
                            </CardContent>
                        </Card>
                    ) : (
                        <Grid container spacing={2}>
                            {pendingRequests.map((request) => (
                                <Grid item xs={12} key={request.requestId}>
                                    <Card elevation={0} sx={{ border: `2px solid ${COLORS.border}`, borderRadius: '12px', transition: 'all 0.3s ease', '&:hover': { borderColor: COLORS.primary } }}>
                                        <CardContent sx={{ p: 3 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
                                                <Box>
                                                    <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS.textPrimary, mb: 1 }}>
                                                        키 복구 요청
                                                    </Typography>
                                                    <Typography variant="caption" sx={{ color: COLORS.textSecondary, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                                        요청 ID: {formatAddress(request.requestId)}
                                                    </Typography>
                                                </Box>
                                                <Box>
                                                    {request.hasApproved && (
                                                        <Chip label="승인함" size="small" sx={{ backgroundColor: COLORS.successBg, color: COLORS.success, fontWeight: 600, fontSize: '0.75rem' }} />
                                                    )}
                                                    {request.hasRejected && (
                                                        <Chip label="거부함" size="small" sx={{ backgroundColor: COLORS.errorBg, color: COLORS.error, fontWeight: 600, fontSize: '0.75rem' }} />
                                                    )}
                                                    {!request.hasApproved && !request.hasRejected && (
                                                        <Chip label="대기 중" size="small" sx={{ backgroundColor: COLORS.warningBg, color: COLORS.warningText, fontWeight: 600, fontSize: '0.75rem' }} />
                                                    )}
                                                </Box>
                                            </Box>

                                            <Divider sx={{ my: 2.5, borderColor: COLORS.border }} />

                                            <Grid container spacing={2} sx={{ mb: 2.5 }}>
                                                <Grid item xs={12} sm={6} md={3}>
                                                    <Paper elevation={0} sx={{ p: 2, backgroundColor: COLORS.background, border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
                                                        <Typography variant="caption" sx={{ color: COLORS.textSecondary, fontWeight: 600, fontSize: '0.75rem', display: 'block', mb: 0.5 }}>
                                                            요청자
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ fontFamily: 'monospace', color: COLORS.textPrimary, fontSize: '0.875rem' }}>
                                                            {formatAddress(request.user)}
                                                        </Typography>
                                                    </Paper>
                                                </Grid>
                                                <Grid item xs={12} sm={6} md={3}>
                                                    <Paper elevation={0} sx={{ p: 2, backgroundColor: COLORS.background, border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
                                                        <Typography variant="caption" sx={{ color: COLORS.textSecondary, fontWeight: 600, fontSize: '0.75rem', display: 'block', mb: 0.5 }}>
                                                            요청 시간
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ color: COLORS.textPrimary, fontSize: '0.875rem' }}>
                                                            {formatDate(request.timestamp)}
                                                        </Typography>
                                                    </Paper>
                                                </Grid>
                                                <Grid item xs={12} sm={6} md={3}>
                                                    <Paper elevation={0} sx={{ p: 2, backgroundColor: COLORS.background, border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
                                                        <Typography variant="caption" sx={{ color: COLORS.textSecondary, fontWeight: 600, fontSize: '0.75rem', display: 'block', mb: 0.5 }}>
                                                            현재 승인 수
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ color: COLORS.textPrimary, fontSize: '0.875rem', fontWeight: 600 }}>
                                                            {request.approvalCount} / 2
                                                        </Typography>
                                                    </Paper>
                                                </Grid>
                                                <Grid item xs={12} sm={6} md={3}>
                                                    <Paper elevation={0} sx={{ p: 2, backgroundColor: COLORS.background, border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                                            <AccessTime sx={{ fontSize: 16, color: COLORS.textSecondary }} />
                                                            <Typography variant="caption" sx={{ color: COLORS.textSecondary, fontWeight: 600, fontSize: '0.75rem' }}>
                                                                남은 시간
                                                            </Typography>
                                                        </Box>
                                                        <Typography variant="body2" sx={{ color: COLORS.textPrimary, fontSize: '0.875rem', fontWeight: 600 }}>
                                                            {formatTime(request.expiryTime)}
                                                        </Typography>
                                                    </Paper>
                                                </Grid>
                                            </Grid>

                                            {!request.hasApproved && !request.hasRejected && (
                                                <Box>
                                                    <Alert severity="warning" sx={{ mb: 2, borderRadius: '8px' }}>
                                                        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                                            요청자에게 직접 연락하여 본인이 맞는지 확인한 후 승인해주세요.
                                                        </Typography>
                                                    </Alert>
                                                    <Button
                                                        variant="contained"
                                                        fullWidth
                                                        onClick={() => handleApprovalClick(request.requestId)}
                                                        sx={{
                                                            borderRadius: '8px',
                                                            background: COLORS.gradientPrimary,
                                                            fontWeight: 600,
                                                            py: 1.5,
                                                            textTransform: 'none',
                                                            boxShadow: `0 2px 8px ${COLORS.primary}30`,
                                                            '&:hover': {
                                                                background: COLORS.gradientPrimary,
                                                                boxShadow: `0 4px 12px ${COLORS.primary}40`,
                                                            },
                                                        }}
                                                    >
                                                        승인/거부하기
                                                    </Button>
                                                </Box>
                                            )}

                                            {(request.hasApproved || request.hasRejected) && (
                                                <Button
                                                    variant="outlined"
                                                    fullWidth
                                                    onClick={() => handleApprovalClick(request.requestId)}
                                                    sx={{
                                                        borderRadius: '8px',
                                                        borderColor: COLORS.borderDark,
                                                        color: COLORS.textPrimary,
                                                        fontWeight: 600,
                                                        py: 1.5,
                                                        textTransform: 'none',
                                                        '&:hover': {
                                                            borderColor: COLORS.primary,
                                                            backgroundColor: COLORS.primaryBg,
                                                        },
                                                    }}
                                                >
                                                    상세 정보 보기
                                                </Button>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    )}
                </Box>

                {/* 안내 섹션 */}
                <Card elevation={0} sx={{ border: `2px solid ${COLORS.border}`, borderRadius: '12px' }}>
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Warning sx={{ color: COLORS.warningText, fontSize: 24 }} />
                            <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS.textPrimary }}>
                                보호자 역할 안내
                            </Typography>
                        </Box>
                        <Divider sx={{ mb: 2.5, borderColor: COLORS.border }} />
                        <Box component="ul" sx={{ m: 0, pl: 3, color: COLORS.textSecondary }}>
                            <Typography component="li" variant="body2" sx={{ mb: 1.5, fontSize: '0.875rem' }}>
                                보호자로 등록된 사용자가 개인키를 분실했을 때 복구를 도와주는 역할입니다.
                            </Typography>
                            <Typography component="li" variant="body2" sx={{ mb: 1.5, fontSize: '0.875rem' }}>
                                3명의 보호자 중 2명의 승인이 있어야 키 복구가 가능합니다.
                            </Typography>
                            <Typography component="li" variant="body2" sx={{ mb: 1.5, fontSize: '0.875rem' }}>
                                복구 요청이 오면 반드시 요청자에게 <strong>직접 연락</strong>하여 본인이 맞는지 확인하세요.
                            </Typography>
                            <Typography component="li" variant="body2" sx={{ mb: 1.5, fontSize: '0.875rem' }}>
                                승인 후에는 취소할 수 없으니 신중하게 결정해주세요.
                            </Typography>
                            <Typography component="li" variant="body2" sx={{ fontSize: '0.875rem' }}>
                                복구 요청은 24시간 내에 처리해야 합니다.
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>
            </Container>
        </Box>
    );
};

export default GuardianDashboard;
