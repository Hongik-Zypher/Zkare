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
    cancelRecovery
} from '../../utils/contracts';

const RecoveryRequest = ({ currentAccount, onRecoveryComplete }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [guardians, setGuardians] = useState(null);
    const [activeRequest, setActiveRequest] = useState(null);
    const [recoveryStatus, setRecoveryStatus] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(0);

    useEffect(() => {
        loadGuardians();
        checkActiveRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentAccount]);

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
            console.log('🔐 키 복구 요청 시작');
            const result = await requestRecovery();
            
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
            <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    등록된 보호자 목록
                </Typography>
                <List>
                    {guardians.addresses.map((address, index) => (
                        <React.Fragment key={index}>
                            <ListItem>
                                <ListItemIcon>
                                    <Person color="primary" />
                                </ListItemIcon>
                                <ListItemText
                                    primary={guardians.names[index]}
                                    secondary={
                                        <React.Fragment>
                                            <Typography variant="body2" color="text.secondary" component="span" display="block">
                                                지갑: {address}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" component="span" display="block">
                                                연락처: {guardians.contacts[index]}
                                            </Typography>
                                        </React.Fragment>
                                    }
                                />
                            </ListItem>
                            {index < guardians.addresses.length - 1 && <Divider />}
                        </React.Fragment>
                    ))}
                </List>
            </Paper>
        );
    };

    const renderActiveRequest = () => {
        if (!activeRequest || !recoveryStatus) return null;

        const progressValue = (recoveryStatus.approvalCount / 2) * 100;
        const isExpired = timeRemaining <= 0;
        const isCompleted = recoveryStatus.isCompleted;
        const isCancelled = recoveryStatus.isCancelled;

        return (
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Security color="primary" sx={{ mr: 1 }} />
                        <Typography variant="h6">
                            키 복구 진행 상황
                        </Typography>
                        <Box sx={{ ml: 'auto' }}>
                            {isCompleted && <Chip label="완료" color="success" />}
                            {isCancelled && <Chip label="취소됨" color="default" />}
                            {isExpired && !isCompleted && !isCancelled && <Chip label="만료됨" color="error" />}
                            {!isExpired && !isCompleted && !isCancelled && <Chip label="진행중" color="primary" />}
                        </Box>
                    </Box>

                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <CheckCircle color={getIconColor(recoveryStatus.approvalCount)} sx={{ mr: 1 }} />
                                <Typography variant="body1">
                                    승인 진행률: {recoveryStatus.approvalCount}/2
                                </Typography>
                            </Box>
                            <LinearProgress 
                                variant="determinate" 
                                value={progressValue} 
                                color={getStatusColor(recoveryStatus.approvalCount)}
                                sx={{ height: 8, borderRadius: 4 }}
                            />
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Schedule color={isExpired ? 'error' : 'primary'} sx={{ mr: 1 }} />
                                <Typography variant="body1">
                                    {isExpired ? '만료됨' : `남은 시간: ${formatTime(timeRemaining)}`}
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>

                    <Alert 
                        severity={recoveryStatus.approvalCount >= 2 ? 'success' : 'info'} 
                        sx={{ mb: 2 }}
                    >
                        {recoveryStatus.approvalCount >= 2 
                            ? '✅ 충분한 승인을 받았습니다! 이제 새 키를 생성하여 복구를 완료할 수 있습니다.'
                            : '📞 보호자들에게 연락하여 Zkare 사이트에서 승인을 요청하세요.'
                        }
                    </Alert>

                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        요청 ID: {activeRequest}
                    </Typography>

                    <Box sx={{ mt: 2 }}>
                        {recoveryStatus.approvalCount >= 2 && !isCompleted && !isCancelled && !isExpired && (
                            <Button
                                variant="contained"
                                color="success"
                                onClick={() => onRecoveryComplete && onRecoveryComplete(activeRequest)}
                                sx={{ mr: 1 }}
                            >
                                새 키 생성하여 복구 완료
                            </Button>
                        )}
                        
                        {!isCompleted && !isCancelled && (
                            <Button
                                variant="outlined"
                                color="error"
                                onClick={handleCancelRecovery}
                                disabled={loading}
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
        <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
            <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Security color="primary" sx={{ mr: 2 }} />
                키 복구 시스템
            </Typography>

            {renderGuardianList()}
            {renderActiveRequest()}
            {renderRequestForm()}

            {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                </Alert>
            )}
            
            {success && (
                <Alert severity="success" sx={{ mt: 2 }}>
                    {success}
                </Alert>
            )}
        </Box>
    );
};

export default RecoveryRequest;
