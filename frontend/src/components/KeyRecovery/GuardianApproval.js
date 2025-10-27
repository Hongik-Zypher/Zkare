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
    getGuardians,
    getMyShare
} from '../../utils/contracts';
import { decryptShareWithPrivateKey } from '../../utils/secretSharing';

const GuardianApproval = ({ currentAccount, requestId }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [recoveryStatus, setRecoveryStatus] = useState(null);
    const [requestUser, setRequestUser] = useState(null);
    const [guardians, setGuardians] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null });
    const [privateKeyFile, setPrivateKeyFile] = useState(null);
    const [showPrivateKeyDialog, setShowPrivateKeyDialog] = useState(false);
    const [processingStep, setProcessingStep] = useState('');

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

    const handleApproveClick = () => {
        setConfirmDialog({ open: false, action: null });
        setShowPrivateKeyDialog(true);
    };

    const handlePrivateKeyUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            setPrivateKeyFile(file);
            setError('');
        }
    };

    const handleApprove = async () => {
        if (!privateKeyFile) {
            setError('개인키 파일을 선택해주세요.');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            console.log('🔐 복구 승인 + 조각 복호화 시작:', requestId);
            
            // 1. 개인키 파일 읽기
            setProcessingStep('개인키 파일 읽는 중...');
            const reader = new FileReader();
            const privateKeyContent = await new Promise((resolve, reject) => {
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (e) => reject(e);
                reader.readAsText(privateKeyFile);
            });
            console.log('✅ 개인키 파일 읽기 완료');
            
            // 2. 블록체인에서 암호화된 조각 가져오기
            setProcessingStep('블록체인에서 암호화된 조각 가져오는 중...');
            const encryptedShare = await getMyShare(requestId);
            console.log('✅ 암호화된 조각 가져오기 완료');
            console.log('   암호화된 조각 길이:', encryptedShare.length);
            
            // 3. 개인키로 조각 복호화
            setProcessingStep('개인키로 조각 복호화 중...');
            const decryptedShare = await decryptShareWithPrivateKey(encryptedShare, privateKeyContent);
            console.log('✅ 조각 복호화 완료');
            console.log('   복호화된 조각 길이:', decryptedShare.length);
            
            // 4. 복호화된 조각과 함께 승인
            setProcessingStep('블록체인에 승인 및 복호화된 조각 제출 중...');
            await approveRecovery(requestId, decryptedShare);
            console.log('✅ 승인 완료 (복호화된 조각 제출됨)');
            
            setSuccess('✨ 키 복구를 승인했습니다! (SSS 조각이 복호화되어 블록체인에 저장되었습니다)');
            setShowPrivateKeyDialog(false);
            setPrivateKeyFile(null);
            
            // 상태 새로고침
            await loadRecoveryStatus();
            
        } catch (error) {
            console.error('❌ 복구 승인 오류:', error);
            setError(`복구 승인 중 오류가 발생했습니다: ${error.message}`);
        } finally {
            setLoading(false);
            setProcessingStep('');
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

                        <Alert severity="info" sx={{ mb: 3 }}>
                            <Typography variant="subtitle1" gutterBottom>
                                🔐 <strong>Shamir's Secret Sharing (SSS)</strong>
                            </Typography>
                            <Typography variant="body2">
                                승인 시 자동으로 다음 작업이 진행됩니다:<br/>
                                1. 보호자의 개인키로 암호화된 조각 복호화<br/>
                                2. 복호화된 조각을 블록체인에 안전하게 저장<br/>
                                3. 2명 이상 승인 시 사용자가 원래 키 복구 가능
                            </Typography>
                        </Alert>

                        <Typography variant="body1" sx={{ mb: 3 }}>
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
                                onClick={handleApproveClick}
                                disabled={loading}
                            >
                                승인 (조각 복호화)
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

            {/* 개인키 업로드 다이얼로그 (승인용) */}
            <Dialog
                open={showPrivateKeyDialog}
                onClose={() => !loading && setShowPrivateKeyDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Security sx={{ mr: 1 }} color="primary" />
                        보호자 개인키 업로드
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Alert severity="info" sx={{ mb: 3 }}>
                        <Typography variant="subtitle2" gutterBottom>
                            🔐 <strong>SSS 조각 복호화</strong>
                        </Typography>
                        <Typography variant="body2">
                            보호자의 개인키로 암호화된 조각을 자동으로 복호화하여 블록체인에 저장합니다.
                        </Typography>
                    </Alert>

                    {processingStep && (
                        <Alert severity="info" sx={{ mb: 3 }}>
                            {processingStep}
                        </Alert>
                    )}
                    
                    <Typography variant="body1" gutterBottom sx={{ mb: 2 }}>
                        키 생성 시 다운로드한 보호자 개인키 파일을 선택해주세요:
                    </Typography>
                    
                    <input
                        type="file"
                        accept=".txt,.pem"
                        onChange={handlePrivateKeyUpload}
                        style={{ display: 'none' }}
                        id="guardian-private-key-upload"
                        disabled={loading}
                    />
                    <label htmlFor="guardian-private-key-upload">
                        <Button
                            variant="outlined"
                            component="span"
                            fullWidth
                            disabled={loading}
                            startIcon={<Security />}
                        >
                            개인키 파일 선택
                        </Button>
                    </label>
                    
                    {privateKeyFile && (
                        <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
                            <Typography variant="body2">
                                선택된 파일: {privateKeyFile.name}
                            </Typography>
                        </Paper>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={() => setShowPrivateKeyDialog(false)}
                        disabled={loading}
                    >
                        취소
                    </Button>
                    <Button 
                        onClick={handleApprove}
                        variant="contained"
                        color="success"
                        disabled={!privateKeyFile || loading}
                        startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
                    >
                        {loading ? '처리 중...' : '승인하기'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* 거부 확인 다이얼로그 */}
            <Dialog
                open={confirmDialog.open && confirmDialog.action === 'reject'}
                onClose={() => setConfirmDialog({ open: false, action: null })}
            >
                <DialogTitle>복구 거부 확인</DialogTitle>
                <DialogContent>
                    <Typography>
                        정말로 이 키 복구 요청을 거부하시겠습니까?
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
                        onClick={handleReject}
                        color="error"
                        variant="contained"
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={20} /> : '거부'}
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
