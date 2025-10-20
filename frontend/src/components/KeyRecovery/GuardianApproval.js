import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Alert,
    CircularProgress,
    Grid,
    Paper,
    Chip,
    List,
    ListItem,
    ListItemText,
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import {
    Security,
    CheckCircle,
    Cancel,
    Schedule,
    Person,
    Warning,
    Phone
} from '@mui/icons-material';
import {
    approveRecovery,
    rejectRecovery,
    getRecoveryStatus,
    getGuardians
} from '../../utils/contracts';

const GuardianApproval = ({ currentAccount, requestId }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [recoveryStatus, setRecoveryStatus] = useState(null);
    const [requestUser, setRequestUser] = useState(null);
    const [guardians, setGuardians] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null });

    useEffect(() => {
        if (requestId) {
            loadRecoveryStatus();
        }
    }, [requestId]);

    useEffect(() => {
        let interval;
        if (recoveryStatus && !recoveryStatus.isCompleted && !recoveryStatus.isCancelled) {
            interval = setInterval(() => {
                const now = Math.floor(Date.now() / 1000);
                const remaining = recoveryStatus.expiryTime - now;
                setTimeRemaining(Math.max(0, remaining));
                
                if (remaining <= 0) {
                    loadRecoveryStatus(); // 만료되면 상태 새로고침
                }
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [recoveryStatus]);

    const loadRecoveryStatus = async () => {
        try {
            const status = await getRecoveryStatus(requestId);
            setRecoveryStatus(status);
            setRequestUser(status.user);
            
            const now = Math.floor(Date.now() / 1000);
            setTimeRemaining(Math.max(0, status.expiryTime - now));

            // 요청자의 보호자 정보 로드
            if (status.user) {
                const guardianData = await getGuardians(status.user);
                setGuardians(guardianData);
            }
        } catch (error) {
            console.error('복구 상태 로드 오류:', error);
            setError('복구 요청 정보를 불러올 수 없습니다.');
        }
    };

    const handleApprove = async () => {
        setConfirmDialog({ open: false, action: null });
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            console.log('✅ 복구 승인 시작:', requestId);
            await approveRecovery(requestId);
            
            setSuccess('키 복구를 승인했습니다.');
            
            // 상태 새로고침
            await loadRecoveryStatus();
            
        } catch (error) {
            console.error('❌ 복구 승인 오류:', error);
            setError(`복구 승인 중 오류가 발생했습니다: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async () => {
        setConfirmDialog({ open: false, action: null });
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            console.log('❌ 복구 거부 시작:', requestId);
            await rejectRecovery(requestId);
            
            setSuccess('키 복구를 거부했습니다.');
            
            // 상태 새로고침
            await loadRecoveryStatus();
            
        } catch (error) {
            console.error('❌ 복구 거부 오류:', error);
            setError(`복구 거부 중 오류가 발생했습니다: ${error.message}`);
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

    const formatDate = (timestamp) => {
        return new Date(timestamp * 1000).toLocaleString('ko-KR');
    };

    const isGuardian = () => {
        if (!guardians || !currentAccount) return false;
        return guardians.addresses.some(addr => 
            addr.toLowerCase() === currentAccount.toLowerCase()
        );
    };

    const getGuardianName = () => {
        if (!guardians || !currentAccount) return '';
        const index = guardians.addresses.findIndex(addr => 
            addr.toLowerCase() === currentAccount.toLowerCase()
        );
        return index >= 0 ? guardians.names[index] : '';
    };

    const hasUserResponded = () => {
        // 실제로는 컨트랙트에서 getGuardianResponse를 호출해야 하지만
        // 여기서는 단순화하여 처리
        return false; // 실제 구현에서는 컨트랙트 호출 결과 반환
    };

    if (!requestId) {
        return (
            <Box sx={{ maxWidth: 600, mx: 'auto', p: 3, textAlign: 'center' }}>
                <Warning color="warning" sx={{ fontSize: 64, mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                    복구 요청을 찾을 수 없습니다
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    올바른 복구 요청 링크를 통해 접근해주세요.
                </Typography>
            </Box>
        );
    }

    if (!recoveryStatus) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
            </Box>
        );
    }

    const isExpired = timeRemaining <= 0;
    const isCompleted = recoveryStatus.isCompleted;
    const isCancelled = recoveryStatus.isCancelled;
    const userIsGuardian = isGuardian();

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
            <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Security color="primary" sx={{ mr: 2 }} />
                키 복구 승인 요청
            </Typography>

            {/* 요청 정보 */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        복구 요청 정보
                    </Typography>
                    
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    요청자
                                </Typography>
                                <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                                    {requestUser}
                                </Typography>
                            </Paper>
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    요청 시간
                                </Typography>
                                <Typography variant="body1">
                                    {formatDate(recoveryStatus.timestamp)}
                                </Typography>
                            </Paper>
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    현재 승인 수
                                </Typography>
                                <Typography variant="body1">
                                    {recoveryStatus.approvalCount} / 2
                                </Typography>
                            </Paper>
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    상태
                                </Typography>
                                <Box>
                                    {isCompleted && <Chip label="완료" color="success" />}
                                    {isCancelled && <Chip label="취소됨" color="default" />}
                                    {isExpired && !isCompleted && !isCancelled && <Chip label="만료됨" color="error" />}
                                    {!isExpired && !isCompleted && !isCancelled && <Chip label="진행중" color="primary" />}
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>

                    {!isExpired && !isCompleted && !isCancelled && (
                        <Alert severity="info" sx={{ mt: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Schedule sx={{ mr: 1 }} />
                                남은 시간: {formatTime(timeRemaining)}
                            </Box>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* 보호자 확인 */}
            {!userIsGuardian && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        접근 권한이 없습니다
                    </Typography>
                    <Typography>
                        현재 연결된 계정({currentAccount})은 이 복구 요청의 보호자가 아닙니다.
                        보호자로 등록된 계정으로 접속해주세요.
                    </Typography>
                </Alert>
            )}

            {/* 보호자인 경우 승인/거부 버튼 */}
            {userIsGuardian && !isExpired && !isCompleted && !isCancelled && (
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            보호자 승인
                        </Typography>
                        
                        <Alert severity="warning" sx={{ mb: 3 }}>
                            <Typography variant="subtitle1" gutterBottom>
                                ⚠️ 중요한 결정입니다
                            </Typography>
                            <Typography>
                                {getGuardianName()}님, 위 사용자가 직접 키 복구를 요청한 것이 확실한가요?
                                확실하지 않다면 본인에게 직접 연락하여 확인한 후 승인해주세요.
                            </Typography>
                        </Alert>

                        <Typography variant="body1" sx={{ mb: 3 }}>
                            승인하면 해당 사용자가 새로운 개인키를 생성할 수 있게 됩니다.
                            3명 중 2명의 승인이 필요합니다.
                        </Typography>

                        {guardians && (
                            <Paper sx={{ p: 2, mb: 3 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    확인이 필요하면 다른 보호자들에게도 연락해보세요:
                                </Typography>
                                <List dense>
                                    {guardians.names.map((name, index) => (
                                        guardians.addresses[index].toLowerCase() !== currentAccount.toLowerCase() && (
                                            <ListItem key={index}>
                                                <ListItemText
                                                    primary={name}
                                                    secondary={guardians.contacts[index]}
                                                />
                                            </ListItem>
                                        )
                                    ))}
                                </List>
                            </Paper>
                        )}

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button
                                variant="contained"
                                color="success"
                                size="large"
                                startIcon={<CheckCircle />}
                                onClick={() => setConfirmDialog({ open: true, action: 'approve' })}
                                disabled={loading}
                            >
                                승인
                            </Button>
                            
                            <Button
                                variant="contained"
                                color="error"
                                size="large"
                                startIcon={<Cancel />}
                                onClick={() => setConfirmDialog({ open: true, action: 'reject' })}
                                disabled={loading}
                            >
                                거부
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            )}

            {/* 확인 다이얼로그 */}
            <Dialog
                open={confirmDialog.open}
                onClose={() => setConfirmDialog({ open: false, action: null })}
            >
                <DialogTitle>
                    {confirmDialog.action === 'approve' ? '복구 승인 확인' : '복구 거부 확인'}
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        {confirmDialog.action === 'approve' 
                            ? '정말로 이 키 복구 요청을 승인하시겠습니까? 승인 후에는 취소할 수 없습니다.'
                            : '정말로 이 키 복구 요청을 거부하시겠습니까?'
                        }
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={() => setConfirmDialog({ open: false, action: null })}
                        disabled={loading}
                    >
                        취소
                    </Button>
                    <Button
                        onClick={confirmDialog.action === 'approve' ? handleApprove : handleReject}
                        color={confirmDialog.action === 'approve' ? 'success' : 'error'}
                        variant="contained"
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={20} /> : '확인'}
                    </Button>
                </DialogActions>
            </Dialog>

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

export default GuardianApproval;
