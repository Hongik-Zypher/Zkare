import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Alert,
    CircularProgress,
    Stepper,
    Step,
    StepLabel,
    StepContent,
    Paper
} from '@mui/material';
import {
    VpnKey,
    Download,
    Security,
    CheckCircle,
    Warning
} from '@mui/icons-material';
import { generateKeyPair } from '../../utils/encryption';
import { completeRecovery, getKeyRegistryContract } from '../../utils/contracts';

const NewKeyGeneration = ({ requestId, onComplete }) => {
    const [activeStep, setActiveStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [keyPair, setKeyPair] = useState(null);

    const steps = [
        '새 키 쌍 생성',
        '개인키 다운로드',
        '복구 완료'
    ];

    const handleGenerateKeys = async () => {
        setLoading(true);
        setError('');

        try {
            console.log('🔑 새 키 쌍 생성 시작');
            const newKeyPair = await generateKeyPair();
            setKeyPair(newKeyPair);
            setActiveStep(1);
            
        } catch (error) {
            console.error('❌ 키 생성 오류:', error);
            setError(`키 생성 중 오류가 발생했습니다: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadKey = () => {
        if (!keyPair) return;

        try {
            // 개인키를 파일로 다운로드
            const blob = new Blob([keyPair.privateKey], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `recovered_private_key_${Date.now()}.txt`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setActiveStep(2);
            
        } catch (error) {
            console.error('❌ 키 다운로드 오류:', error);
            setError('키 다운로드 중 오류가 발생했습니다.');
        }
    };

    const handleCompleteRecovery = async () => {
        if (!keyPair || !requestId) return;

        setLoading(true);
        setError('');

        try {
            console.log('🔐 키 복구 완료 시작');
            
            // 복구 완료 (새 공개키로 업데이트)
            await completeRecovery(requestId, keyPair.publicKey);
            
            setSuccess('키 복구가 완료되었습니다! 이제 새로운 키로 의료기록에 접근할 수 있습니다.');
            
            // 완료 콜백 호출
            if (onComplete) {
                onComplete();
            }
            
        } catch (error) {
            console.error('❌ 키 복구 완료 오류:', error);
            setError(`키 복구 완료 중 오류가 발생했습니다: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const renderKeyGeneration = () => (
        <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <VpnKey color="primary" sx={{ mr: 1 }} />
                새로운 키 쌍 생성
            </Typography>
            
            <Alert severity="info" sx={{ mb: 3 }}>
                기존 키를 대체할 새로운 RSA 키 쌍을 생성합니다. 
                생성된 개인키는 안전한 곳에 보관해주세요.
            </Alert>

            <Button
                variant="contained"
                size="large"
                onClick={handleGenerateKeys}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <VpnKey />}
            >
                {loading ? '키 생성 중...' : '새 키 쌍 생성'}
            </Button>
        </Box>
    );

    const renderKeyDownload = () => (
        <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Download color="primary" sx={{ mr: 1 }} />
                개인키 다운로드
            </Typography>
            
            <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                    ⚠️ 중요: 개인키를 안전하게 보관하세요
                </Typography>
                <Typography>
                    • 개인키를 분실하면 의료기록에 접근할 수 없습니다<br/>
                    • 다른 사람과 공유하지 마세요<br/>
                    • 안전한 저장소에 백업해두세요
                </Typography>
            </Alert>

            {keyPair && (
                <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
                    <Typography variant="subtitle2" gutterBottom>
                        생성된 공개키 (미리보기):
                    </Typography>
                    <Typography 
                        variant="body2" 
                        sx={{ 
                            fontFamily: 'monospace', 
                            wordBreak: 'break-all',
                            fontSize: '0.75rem'
                        }}
                    >
                        {keyPair.publicKey.substring(0, 100)}...
                    </Typography>
                </Paper>
            )}

            <Button
                variant="contained"
                size="large"
                onClick={handleDownloadKey}
                startIcon={<Download />}
                color="success"
            >
                개인키 다운로드
            </Button>
        </Box>
    );

    const renderRecoveryComplete = () => (
        <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Security color="primary" sx={{ mr: 1 }} />
                복구 완료
            </Typography>
            
            <Alert severity="success" sx={{ mb: 3 }}>
                개인키 다운로드가 완료되었습니다. 이제 블록체인에 새 공개키를 등록하여 복구를 완료하세요.
            </Alert>

            <Typography variant="body1" sx={{ mb: 3 }}>
                복구 완료 버튼을 클릭하면:
            </Typography>
            
            <Box component="ul" sx={{ mb: 3 }}>
                <li>새 공개키가 블록체인에 등록됩니다</li>
                <li>기존 의료기록에 새 키로 접근할 수 있게 됩니다</li>
                <li>복구 요청이 완료 처리됩니다</li>
            </Box>

            <Button
                variant="contained"
                size="large"
                onClick={handleCompleteRecovery}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
                color="success"
            >
                {loading ? '복구 완료 중...' : '복구 완료'}
            </Button>
        </Box>
    );

    const renderSuccess = () => (
        <Box textAlign="center">
            <CheckCircle color="success" sx={{ fontSize: 64, mb: 2 }} />
            <Typography variant="h5" color="success" gutterBottom>
                키 복구 완료!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                새로운 키로 의료기록 시스템을 이용할 수 있습니다.
            </Typography>
            
            <Alert severity="info">
                다운로드받은 개인키 파일을 안전한 곳에 보관하고, 
                의료기록 조회 시 새로운 개인키를 사용해주세요.
            </Alert>
        </Box>
    );

    return (
        <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
            <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <VpnKey color="primary" sx={{ mr: 2 }} />
                키 복구 - 새 키 생성
            </Typography>

            {success ? (
                renderSuccess()
            ) : (
                <Stepper activeStep={activeStep} orientation="vertical">
                    <Step>
                        <StepLabel>새 키 쌍 생성</StepLabel>
                        <StepContent>
                            {renderKeyGeneration()}
                        </StepContent>
                    </Step>
                    
                    <Step>
                        <StepLabel>개인키 다운로드</StepLabel>
                        <StepContent>
                            {renderKeyDownload()}
                        </StepContent>
                    </Step>
                    
                    <Step>
                        <StepLabel>복구 완료</StepLabel>
                        <StepContent>
                            {renderRecoveryComplete()}
                        </StepContent>
                    </Step>
                </Stepper>
            )}

            {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                </Alert>
            )}
        </Box>
    );
};

export default NewKeyGeneration;
