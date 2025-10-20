import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { generateKeyPair } from '../utils/encryption';
import { isDoctor, getKeyRegistryContract, isPublicKeyRegistered } from '../utils/contracts';

const KeyGeneration = ({ currentAccount, onKeyRegistered }) => {
    const [loading, setLoading] = useState(false);
    const [userRole, setUserRole] = useState(null);
    const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
    const [hasExistingKey, setHasExistingKey] = useState(false);
    const [checkingKey, setCheckingKey] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        checkUserStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentAccount]);

    const checkUserStatus = async () => {
        if (!currentAccount) {
            setCheckingKey(false);
            return;
        }
        
        setCheckingKey(true);
        try {
            // 사용자 역할 확인
            const doctorStatus = await isDoctor(currentAccount);
            setUserRole(doctorStatus ? 'doctor' : 'patient');
            
            // 키 존재 여부 확인
            const keyExists = await isPublicKeyRegistered(currentAccount);
            setHasExistingKey(keyExists);
            
        } catch (error) {
            console.error('사용자 상태 확인 중 오류:', error);
        } finally {
            setCheckingKey(false);
        }
    };

    const handleGenerateKeys = async () => {
        if (!currentAccount) {
            alert('계정이 연결되지 않았습니다.');
            return;
        }

        setLoading(true);
        try {
            console.log('🔑 [키 생성] 시작');
            
            // KeyRegistry 컨트랙트 가져오기
            const contract = await getKeyRegistryContract();
            if (!contract) {
                throw new Error('KeyRegistry 컨트랙트를 초기화할 수 없습니다.');
            }
            
            const { publicKey, privateKey } = await generateKeyPair();
            
            // 공개키 등록
            const tx = await contract.registerPublicKey(
                publicKey,
                userRole === 'doctor'
            );
            await tx.wait();
            
            // 개인키 다운로드
            const blob = new Blob([privateKey], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `private_key_${currentAccount}.txt`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            console.log('✅ [키 생성] 완료');
            
            // 키 상태 업데이트
            setHasExistingKey(true);
            
            // 부모 컴포넌트에 키 등록 완료 알림
            if (onKeyRegistered) {
                onKeyRegistered();
            }
            
            // 키 복구 시스템 설정 제안
            setShowRecoveryDialog(true);
            
        } catch (error) {
            console.error('❌ [키 생성] 오류:', error);
            alert('키 생성 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleSetupRecovery = () => {
        setShowRecoveryDialog(false);
        navigate('/key-recovery');
    };

    const handleSkipRecovery = () => {
        setShowRecoveryDialog(false);
        alert('키 생성이 완료되었습니다. 개인키를 안전하게 보관해주세요.');
    };

    // 로딩 중일 때
    if (checkingKey) {
        return (
            <Box sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: '#f5f5f5', textAlign: 'center' }}>
                <CircularProgress size={24} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    키 상태 확인 중...
                </Typography>
            </Box>
        );
    }

    // 키가 이미 존재할 때
    if (hasExistingKey) {
        return (
            <Box sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: '#f5f5f5' }}>
                <Typography variant="h6" gutterBottom>
                    ✅ 암호화 키 등록 완료
                </Typography>
                <Alert severity="success" sx={{ mb: 2 }}>
                    이미 암호화 키가 등록되어 있습니다.
                </Alert>
                <Typography variant="body2" color="text.secondary" paragraph>
                    {userRole === 'doctor' 
                        ? '의사용 RSA 키가 이미 등록되어 있어 환자 기록을 안전하게 관리할 수 있습니다.' 
                        : '환자용 RSA 키가 이미 등록되어 있어 의료 기록이 안전하게 보호됩니다.'}
                </Typography>
                <Button
                    variant="outlined"
                    onClick={() => navigate('/key-recovery')}
                    sx={{ mt: 1, mr: 1 }}
                >
                    키 복구 시스템
                </Button>
                <Button
                    variant="text"
                    onClick={checkUserStatus}
                    sx={{ mt: 1 }}
                >
                    상태 새로고침
                </Button>
            </Box>
        );
    }

    // 키가 없을 때 (기존 키 생성 UI)
    return (
        <Box sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: '#f5f5f5' }}>
            <Typography variant="h6" gutterBottom>
                🔑 암호화 키 생성
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
                {userRole === 'doctor' 
                    ? '의사용 RSA 키 쌍을 생성하여 환자 기록을 안전하게 관리하세요.' 
                    : '환자용 RSA 키 쌍을 생성하여 의료 기록을 안전하게 보호하세요.'}
            </Typography>
            <Button
                variant="contained"
                onClick={handleGenerateKeys}
                disabled={loading || !userRole}
                sx={{
                    mt: 2,
                    backgroundColor: '#2E7D32',
                    '&:hover': {
                        backgroundColor: '#1b5e20',
                    }
                }}
            >
                {loading ? <CircularProgress size={24} /> : '키 생성하기'}
            </Button>
            
            {/* 키 복구 시스템 설정 다이얼로그 */}
            <Dialog open={showRecoveryDialog} onClose={() => setShowRecoveryDialog(false)}>
                <DialogTitle>키 복구 시스템 설정</DialogTitle>
                <DialogContent>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        키 생성이 완료되었습니다!
                    </Alert>
                    <Typography variant="body1" gutterBottom>
                        개인키를 분실할 경우를 대비하여 키 복구 시스템을 설정하시겠습니까?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        • 신뢰할 수 있는 보호자 3명을 설정<br/>
                        • 키 분실 시 2명의 승인으로 복구 가능<br/>
                        • 완전 온체인 기반으로 안전함
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleSkipRecovery} color="inherit">
                        나중에 설정
                    </Button>
                    <Button onClick={handleSetupRecovery} variant="contained" color="primary">
                        지금 설정
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default KeyGeneration; 