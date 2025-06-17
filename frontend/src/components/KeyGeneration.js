import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, CircularProgress } from '@mui/material';
import { generateKeyPair } from '../utils/encryption';
import { isDoctor } from '../utils/contracts';

const KeyGeneration = ({ keyRegistryContract, currentAccount }) => {
    const [loading, setLoading] = useState(false);
    const [userRole, setUserRole] = useState(null);

    useEffect(() => {
        checkUserRole();
    }, [currentAccount]);

    const checkUserRole = async () => {
        if (!currentAccount) return;
        try {
            const doctorStatus = await isDoctor(currentAccount);
            setUserRole(doctorStatus ? 'doctor' : 'patient');
        } catch (error) {
            console.error('사용자 역할 확인 중 오류:', error);
        }
    };

    const handleGenerateKeys = async () => {
        if (!keyRegistryContract || !currentAccount) {
            alert('컨트랙트 또는 계정이 준비되지 않았습니다.');
            return;
        }

        setLoading(true);
        try {
            console.log('🔑 [키 생성] 시작');
            const { publicKey, privateKey } = await generateKeyPair();
            
            // 공개키 등록
            const tx = await keyRegistryContract.registerPublicKey(
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
            alert('키 생성이 완료되었습니다. 개인키를 안전하게 보관해주세요.');
        } catch (error) {
            console.error('❌ [키 생성] 오류:', error);
            alert('키 생성 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

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
        </Box>
    );
};

export default KeyGeneration; 