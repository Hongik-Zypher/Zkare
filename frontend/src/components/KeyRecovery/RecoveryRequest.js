import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Alert,
    CircularProgress,
    LinearProgress,
    Chip,
    Grid,
    Paper,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Divider
} from '@mui/material';
import {
    Security,
    Schedule,
    Person,
    CheckCircle
} from '@mui/icons-material';
import {
    requestRecovery,
    getRecoveryStatus,
    getGuardians,
    getActiveRecoveryRequest,
    cancelRecovery,
    hasUserData
} from '../../utils/contracts';

const RecoveryRequest = ({ currentAccount, onRecoveryComplete }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [guardians, setGuardians] = useState(null);
    const [activeRequest, setActiveRequest] = useState(null);
    const [recoveryStatus, setRecoveryStatus] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [hasUserDataSet, setHasUserDataSet] = useState(false);
    

    useEffect(() => {
        loadGuardians();
        checkActiveRequest();
        checkUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentAccount]);

    const checkUserData = async () => {
        try {
            console.log('🔍 [디버깅] hasUserData 체크 시작, 계정:', currentAccount);
            const userDataSet = await hasUserData(currentAccount);
            console.log('🔍 [디버깅] hasUserData 결과:', userDataSet);
            setHasUserDataSet(userDataSet);
        } catch (error) {
            console.error('❌ UserData 확인 오류:', error);
        }
    };

    useEffect(() => {
        let interval;
        if (recoveryStatus && !recoveryStatus.isCompleted && !recoveryStatus.isCancelled) {
            interval = setInterval(() => {
                const now = Math.floor(Date.now() / 1000);
                const remaining = recoveryStatus.expiryTime - now;
                setTimeRemaining(Math.max(0, remaining));
                
                if (remaining <= 0) {
                    checkActiveRequest(); // 만료되면 상태 새로고침
                }
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recoveryStatus]);

    const loadGuardians = async () => {
        try {
            const guardianData = await getGuardians(currentAccount);
            setGuardians(guardianData);
        } catch (error) {
            console.error('보호자 정보 로드 오류:', error);
        }
    };

    const checkActiveRequest = async () => {
        try {
            const requestId = await getActiveRecoveryRequest(currentAccount);
            if (requestId && requestId !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
                setActiveRequest(requestId);
                const status = await getRecoveryStatus(requestId);
                setRecoveryStatus(status);
                
                const now = Math.floor(Date.now() / 1000);
                setTimeRemaining(Math.max(0, status.expiryTime - now));
            } else {
                setActiveRequest(null);
                setRecoveryStatus(null);
                setTimeRemaining(0);
            }
        } catch (error) {
            console.error('활성 복구 요청 확인 오류:', error);
        }
    };

    const handleRequestRecovery = async () => {
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            console.log('🔐 키 복구 요청 시작 (개인키 불필요!)');
            
            // 블록체인에 저장된 데이터로 복구 요청 생성
            const { requestId } = await requestRecovery();
            console.log('✅ 복구 요청 생성 완료:', requestId);
            
            setSuccess('키 복구 요청이 생성되었습니다! 이제 보호자들에게 연락하여 승인을 요청하세요.');
            
            // 상태 새로고침
            await checkActiveRequest();
            
        } catch (error) {
            console.error('❌ 키 복구 요청 오류:', error);
            setError(`키 복구 요청 중 오류가 발생했습니다: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelRecovery = async () => {
        if (!window.confirm('정말로 키 복구 요청을 취소하시겠습니까?')) {
            return;
        }

        setLoading(true);
        setError('');

        try {
            await cancelRecovery(activeRequest);
            setSuccess('키 복구 요청이 취소되었습니다.');
            
            // 상태 새로고침
            await checkActiveRequest();
            
        } catch (error) {
            console.error('❌ 키 복구 취소 오류:', error);
            setError(`키 복구 취소 중 오류가 발생했습니다: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours}시간 ${minutes}분 ${secs}초`;
    };

    const getStatusColor = (approvalCount) => {
        if (approvalCount >= 2) return 'success';
        if (approvalCount >= 1) return 'warning';
        return 'info';
    };
    
    const getIconColor = (approvalCount) => {
        if (approvalCount >= 2) return 'success';
        if (approvalCount >= 1) return 'warning';
        return 'action';
    };

    const renderGuardianList = () => {
        if (!guardians) return null;

        return (
            <Card elevation={0} sx={{ height: '100%', border: '2px solid #CBD5E1', borderRadius: '12px' }}>
                <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                        <Person sx={{ color: '#0891B2', fontSize: 20 }} />
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#0F172A' }}>
                            등록된 보호자 목록
                        </Typography>
                    </Box>
                    <Divider sx={{ mb: 2.5, borderColor: '#CBD5E1' }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {guardians.addresses.map((address, index) => (
                            <Paper
                                key={index}
                                elevation={0}
                                sx={{
                                    p: 2,
                                    border: '1px solid #CBD5E1',
                                    borderRadius: '8px',
                                    backgroundColor: '#FAFBFC',
                                }}
                            >
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#0F172A', mb: 1 }}>
                                    {guardians.names[index]}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#475569', display: 'block', mb: 0.5, fontSize: '0.75rem' }}>
                                    지갑: {address}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#475569', display: 'block', fontSize: '0.75rem' }}>
                                    연락처: {guardians.contacts[index]}
                                </Typography>
                            </Paper>
                        ))}
                    </Box>
                </CardContent>
            </Card>
        );
    };

    const renderActiveRequest = () => {
        if (!activeRequest || !recoveryStatus) return null;

        const progressValue = (recoveryStatus.approvalCount / 2) * 100;
        const isExpired = timeRemaining <= 0;
        const isCompleted = recoveryStatus.isCompleted;
        const isCancelled = recoveryStatus.isCancelled;

        return (
            <Card elevation={0} sx={{ height: '100%', border: '2px solid #CBD5E1', borderRadius: '12px' }}>
                <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Security sx={{ color: '#0891B2', fontSize: 20 }} />
                            <Typography variant="h6" sx={{ fontWeight: 600, color: '#0F172A' }}>
                                키 복구 진행 상황
                            </Typography>
                        </Box>
                        <Box>
                            {isCompleted && <Chip label="완료" size="small" sx={{ backgroundColor: '#D1FAE5', color: '#059669', fontWeight: 600, fontSize: '0.75rem' }} />}
                            {isCancelled && <Chip label="취소됨" size="small" sx={{ backgroundColor: '#F3F4F6', color: '#475569', fontWeight: 600, fontSize: '0.75rem' }} />}
                            {isExpired && !isCompleted && !isCancelled && <Chip label="만료됨" size="small" sx={{ backgroundColor: '#FEE2E2', color: '#DC2626', fontWeight: 600, fontSize: '0.75rem' }} />}
                            {!isExpired && !isCompleted && !isCancelled && <Chip label="진행중" size="small" sx={{ backgroundColor: '#E0F2FE', color: '#0891B2', fontWeight: 600, fontSize: '0.75rem' }} />}
                        </Box>
                    </Box>

                    <Divider sx={{ mb: 2.5, borderColor: '#CBD5E1' }} />

                    <Box sx={{ mb: 2.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CheckCircle sx={{ color: recoveryStatus.approvalCount >= 2 ? '#059669' : recoveryStatus.approvalCount >= 1 ? '#D97706' : '#64748B', fontSize: 20 }} />
                                <Typography variant="body1" sx={{ fontWeight: 600, color: '#0F172A', fontSize: '0.9375rem' }}>
                                    승인 진행률: {recoveryStatus.approvalCount}/2
                                </Typography>
                            </Box>
                        </Box>
                        <LinearProgress 
                            variant="determinate" 
                            value={progressValue} 
                            color={getStatusColor(recoveryStatus.approvalCount)}
                            sx={{ height: 8, borderRadius: 4 }}
                        />
                    </Box>

                    <Box sx={{ mb: 2.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Schedule sx={{ color: isExpired ? '#DC2626' : '#0891B2', fontSize: 20 }} />
                            <Typography variant="body1" sx={{ fontWeight: 500, color: '#0F172A', fontSize: '0.9375rem' }}>
                                {isExpired ? '만료됨' : `남은 시간: ${formatTime(timeRemaining)}`}
                            </Typography>
                        </Box>
                    </Box>

                    <Alert 
                        severity={recoveryStatus.approvalCount >= 2 ? 'success' : 'info'} 
                        sx={{ mb: 2.5, borderRadius: '8px' }}
                    >
                        <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                            {recoveryStatus.approvalCount >= 2 
                                ? '충분한 승인을 받았습니다! 이제 새 키를 생성하여 복구를 완료할 수 있습니다.'
                                : '보호자들에게 연락하여 Zkare 사이트에서 승인을 요청하세요.'
                            }
                        </Typography>
                    </Alert>

                    <Paper elevation={0} sx={{ p: 2, mb: 2.5, backgroundColor: '#FAFBFC', border: '1px solid #CBD5E1', borderRadius: '8px' }}>
                        <Typography variant="caption" sx={{ color: '#475569', fontWeight: 600, fontSize: '0.75rem', display: 'block', mb: 0.5 }}>
                            요청 ID
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#0F172A', fontSize: '0.75rem', wordBreak: 'break-all' }}>
                            {activeRequest}
                        </Typography>
                    </Paper>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {recoveryStatus.approvalCount >= 2 && !isCompleted && !isCancelled && !isExpired && (
                            <Button
                                variant="contained"
                                fullWidth
                                onClick={() => onRecoveryComplete && onRecoveryComplete(activeRequest)}
                                sx={{
                                    borderRadius: '8px',
                                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                                    fontWeight: 600,
                                    py: 1.5,
                                    textTransform: 'none',
                                    boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)',
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                                        boxShadow: '0 4px 12px rgba(5, 150, 105, 0.4)',
                                    },
                                }}
                            >
                                새 키 생성하여 복구 완료
                            </Button>
                        )}
                        
                        {isExpired && !isCompleted && !isCancelled && (
                            <>
                                <Alert severity="warning" sx={{ mb: 2, borderRadius: '8px' }}>
                                    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                        복구 요청이 만료되었습니다. 다시 신청해주세요.
                                    </Typography>
                                </Alert>
                                <Button
                                    variant="contained"
                                    fullWidth
                                    onClick={async () => {
                                        // 먼저 취소하고
                                        await handleCancelRecovery();
                                        // 그 다음 새로 신청
                                        await handleRequestRecovery();
                                    }}
                                    disabled={loading}
                                    sx={{
                                        borderRadius: '8px',
                                        background: 'linear-gradient(135deg, #0891B2 0%, #0E7490 100%)',
                                        fontWeight: 600,
                                        py: 1.5,
                                        textTransform: 'none',
                                        boxShadow: '0 2px 8px rgba(8, 145, 178, 0.3)',
                                        '&:hover': {
                                            background: 'linear-gradient(135deg, #0891B2 0%, #0E7490 100%)',
                                            boxShadow: '0 4px 12px rgba(8, 145, 178, 0.4)',
                                        },
                                    }}
                                >
                                    {loading ? '처리 중...' : '다시 신청하기'}
                                </Button>
                                <Button
                                    variant="outlined"
                                    fullWidth
                                    onClick={handleCancelRecovery}
                                    disabled={loading}
                                    sx={{
                                        borderRadius: '8px',
                                        borderColor: '#DC2626',
                                        color: '#DC2626',
                                        fontWeight: 600,
                                        py: 1.5,
                                        textTransform: 'none',
                                        '&:hover': {
                                            borderColor: '#DC2626',
                                            backgroundColor: '#FEE2E2',
                                        },
                                    }}
                                >
                                    복구 요청 취소
                                </Button>
                            </>
                        )}
                        
                        {!isExpired && !isCompleted && !isCancelled && (
                            <Button
                                variant="outlined"
                                fullWidth
                                onClick={handleCancelRecovery}
                                disabled={loading}
                                sx={{
                                    borderRadius: '8px',
                                    borderColor: '#DC2626',
                                    color: '#DC2626',
                                    fontWeight: 600,
                                    py: 1.5,
                                    textTransform: 'none',
                                    '&:hover': {
                                        borderColor: '#DC2626',
                                        backgroundColor: '#FEE2E2',
                                    },
                                }}
                            >
                                복구 요청 취소
                            </Button>
                        )}
                    </Box>
                </CardContent>
            </Card>
        );
    };

    const renderRequestForm = () => {
        if (activeRequest) return null;

        // UserData가 설정되지 않은 경우 (기존 방식으로만 guardian 설정됨)
        if (!hasUserDataSet) {
            return (
                <Card>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <Security color="warning" sx={{ mr: 1 }} />
                            <Typography variant="h6">
                                키 복구를 사용할 수 없습니다
                            </Typography>
                        </Box>

                        <Alert severity="warning" sx={{ mb: 2 }}>
                            <Typography variant="h6" gutterBottom>
                                ⚠️ 새로운 키 생성이 필요합니다
                            </Typography>
                            <Typography variant="body2" paragraph>
                                현재 계정은 기존 방식으로 보호자가 설정되어 있어, SSS(Shamir's Secret Sharing) 조각이 블록체인에 저장되지 않았습니다.
                            </Typography>
                            <Typography variant="body2" paragraph>
                                키 복구 기능을 사용하려면 다음 단계를 따라주세요:
                            </Typography>
                            <Typography variant="body2" component="div">
                                1. "암호화된 의료 기록" 페이지로 이동<br/>
                                2. "키 생성하기" 버튼 클릭<br/>
                                3. 새 키 생성 시 보호자 정보 입력<br/>
                                4. SSS 조각이 자동으로 블록체인에 저장됨
                            </Typography>
                        </Alert>

                        <Button
                            variant="contained"
                            color="primary"
                            size="large"
                            href="/encrypted"
                            sx={{ mr: 2 }}
                        >
                            키 생성 페이지로 이동
                        </Button>
                        
                        <Button
                            variant="outlined"
                            onClick={checkUserData}
                        >
                            상태 새로고침
                        </Button>
                    </CardContent>
                </Card>
            );
        }

        return (
            <Card>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Security color="primary" sx={{ mr: 1 }} />
                        <Typography variant="h6">
                            키 복구 요청
                        </Typography>
                    </Box>

                    <Alert severity="info" sx={{ mb: 3 }}>
                        키 복구를 요청하면 24시간 내에 보호자 3명 중 2명의 승인을 받아야 합니다.
                    </Alert>

                    <Typography variant="body1" sx={{ mb: 3 }}>
                        복구 요청 후 다음 보호자들에게 직접 연락하여 승인을 요청하세요:
                    </Typography>

                    {guardians && (
                        <List sx={{ mb: 3 }}>
                            {guardians.names.map((name, index) => (
                                <ListItem key={index}>
                                    <ListItemIcon>
                                        <Person color="primary" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={`${name} (${guardians.contacts[index]})`}
                                        secondary="Zkare 사이트에서 키 복구 승인해달라고 요청하세요"
                                    />
                                </ListItem>
                            ))}
                        </List>
                    )}

                    <Button
                        variant="contained"
                        size="large"
                        onClick={handleRequestRecovery}
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={20} /> : <Security />}
                    >
                        {loading ? '요청 중...' : '키 복구 요청'}
                    </Button>
                </CardContent>
            </Card>
        );
    };

    if (!guardians) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            {activeRequest && recoveryStatus ? (
                <Grid container spacing={3} sx={{ mb: 3 }}>
                    <Grid item xs={12} md={5}>
                        {renderGuardianList()}
                    </Grid>
                    <Grid item xs={12} md={7}>
                        {renderActiveRequest()}
                    </Grid>
                </Grid>
            ) : (
                <>
                    {renderGuardianList()}
                    <Box sx={{ mb: 3 }} />
                </>
            )}

            {renderRequestForm()}

            {error && (
                <Alert severity="error" sx={{ mt: 2, borderRadius: '8px' }}>
                    {error}
                </Alert>
            )}
            
            {success && (
                <Alert severity="success" sx={{ mt: 2, borderRadius: '8px' }}>
                    {success}
                </Alert>
            )}
        </Box>
    );
};

export default RecoveryRequest;
