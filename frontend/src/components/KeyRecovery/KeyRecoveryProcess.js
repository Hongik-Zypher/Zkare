import React from 'react';
import {
    Box,
    Typography,
    Button,
    Alert,
    CircularProgress,
    Stepper,
    Step,
    StepLabel,
    StepContent,
    Paper,
    List,
    ListItem,
    ListItemIcon,
    ListItemText
} from '@mui/material';
import {
    VpnKey,
    Download,
    Security,
    CheckCircle
} from '@mui/icons-material';
import { 
    completeRecovery, 
    getRecoveryData,
    getDecryptedShares
} from '../../utils/contracts';
import { 
    combineAndDecryptKey
} from '../../utils/secretSharing';

const KeyRecoveryProcess = ({ requestId, currentAccount, onComplete }) => {
    const [activeStep, setActiveStep] = React.useState(0);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [success, setSuccess] = React.useState('');
    const [recoveredPrivateKey, setRecoveredPrivateKey] = React.useState(null);
    const [processingStep, setProcessingStep] = React.useState('');

    const steps = [
        '블록체인에서 데이터 조회',
        'SSS로 키 복구',
        '복구된 개인키 다운로드',
        '복구 완료'
    ];

    const handleRecoverKey = async () => {
        setLoading(true);
        setError('');
        setProcessingStep('');

        try {
            console.log('🔐 [SSS 키 복구] 시작');
            
            // 1. 블록체인에서 암호화된 개인키와 IV 가져오기
            setProcessingStep('블록체인에서 암호화된 개인키 조회 중...');
            const { encryptedPrivateKey, iv } = await getRecoveryData(requestId);
            console.log('✅ 암호화된 개인키 및 IV 조회 완료');
            console.log('   암호화된 개인키 길이:', encryptedPrivateKey.length);
            console.log('   IV:', iv);
            
            // 2. 블록체인에서 복호화된 조각들 가져오기
            setProcessingStep('보호자들이 복호화한 조각들 조회 중...');
            const decryptedShares = await getDecryptedShares(requestId);
            console.log('✅ 복호화된 조각들 조회 완료');
            console.log('   복호화된 조각 개수:', decryptedShares.length);

            if (decryptedShares.length < 2) {
                throw new Error('최소 2개의 복호화된 조각이 필요합니다.');
            }

            // 3. SSS로 조각들을 조합하여 원래 개인키 복호화
            setProcessingStep('Shamir\'s Secret Sharing으로 키 복구 중...');
            console.log('🔓 [SSS] Lagrange 보간법으로 비밀 복구 시작...');
            
            const originalPrivateKey = await combineAndDecryptKey(
                encryptedPrivateKey, 
                iv, 
                decryptedShares
            );
            
            console.log('✅ [SSS] 원래 개인키 복구 완료!');
            console.log('   복구된 개인키 길이:', originalPrivateKey.length);
            
            setRecoveredPrivateKey(originalPrivateKey);
            setActiveStep(2); // 개인키 다운로드 단계로 이동
            
        } catch (error) {
            console.error('❌ [키 복구] 오류:', error);
            setError(`키 복구 중 오류가 발생했습니다: ${error.message}`);
        } finally {
            setLoading(false);
            setProcessingStep('');
        }
    };

    const handleDownloadRecoveredKey = () => {
        if (!recoveredPrivateKey) return;

        try {
            const blob = new Blob([recoveredPrivateKey], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const accountShort = currentAccount.slice(0, 8);
            a.download = `recovered_private_key_${accountShort}_${timestamp}.txt`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            console.log('✅ 복구된 키 다운로드 완료');
            setActiveStep(3); // 복구 완료 단계로 이동
            
        } catch (error) {
            console.error('❌ 키 다운로드 오류:', error);
            setError('복구된 키 다운로드 중 오류가 발생했습니다.');
        }
    };

    const handleCompleteRecovery = async () => {
        if (!requestId) return;

        setLoading(true);
        setError('');

        try {
            console.log('🔐 키 복구 완료 트랜잭션 전송 시작');
            await completeRecovery(requestId);
            
            setSuccess('🎉 SSS 키 복구가 완료되었습니다! 원래 개인키로 의료기록에 접근할 수 있습니다.');
            
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

    const renderPrepareRecoveryData = () => (
        <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                    💡 <strong>Shamir's Secret Sharing (SSS)</strong> 방식
                </Typography>
                <Typography variant="body2">
                    보호자 2명 이상이 승인했다면, 각 보호자가 자신의 개인키로 복호화한 조각들이 
                    블록체인에 저장되어 있습니다. 이제 이 조각들을 조합하여 원래 개인키를 복구할 수 있습니다.
                </Typography>
            </Alert>
            
            <Alert severity="success" sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                    ✅ <strong>실제 시스템 구현</strong>
                </Typography>
                <Typography variant="body2">
                    • 각 보호자가 자신의 계정으로 로그인하여 조각 복호화<br/>
                    • 복호화된 조각을 블록체인에 안전하게 저장<br/>
                    • 사용자는 블록체인에서 조각들을 가져와서 자동 복구
                </Typography>
            </Alert>

            <Button
                variant="contained"
                size="large"
                onClick={() => setActiveStep(1)}
                sx={{ mr: 1 }}
            >
                다음 단계
            </Button>
        </Box>
    );

    const renderRecoverPrivateKey = () => (
        <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <VpnKey color="primary" sx={{ mr: 1 }} />
                SSS로 키 복구
            </Typography>
            
            <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                    🔐 <strong>Lagrange 보간법</strong>
                </Typography>
                <Typography variant="body2">
                    1. 블록체인에서 암호화된 개인키 + IV 조회<br/>
                    2. 보호자들이 복호화한 조각들 조회<br/>
                    3. Lagrange 보간법으로 AES 키 복구<br/>
                    4. AES 키로 원래 개인키 복호화
                </Typography>
            </Alert>

            {processingStep && (
                <Alert severity="info" sx={{ mb: 3 }}>
                    {processingStep}
                </Alert>
            )}
            
            {recoveredPrivateKey ? (
                <Alert severity="success" sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                        ✅ 원래 개인키 복구 완료!
                    </Typography>
                    <Typography variant="body2">
                        복구된 개인키 길이: {recoveredPrivateKey.length} 자
                    </Typography>
                </Alert>
            ) : (
                <Button
                    variant="contained"
                    size="large"
                    onClick={handleRecoverKey}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : <Security />}
                >
                    {loading ? '복구 중...' : 'SSS로 키 복구하기'}
                </Button>
            )}
        </Box>
    );

    const renderDownloadPrivateKey = () => (
        <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Download color="primary" sx={{ mr: 1 }} />
                복구된 개인키 다운로드
            </Typography>
            
            <Alert severity="success" sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                    🎉 개인키 복구 성공!
                </Typography>
                <Typography variant="body2">
                    Shamir's Secret Sharing 알고리즘으로 원래 개인키를 성공적으로 복구했습니다!<br/>
                    이제 기존 의료기록에 모두 접근할 수 있습니다.
                </Typography>
            </Alert>
            
            <Alert severity="warning" sx={{ mb: 3 }}>
                ⚠️ <strong>개인키 보안 주의사항:</strong><br/>
                1. 복구된 개인키를 안전한 곳에 보관하세요<br/>
                2. 다른 사람과 절대 공유하지 마세요<br/>
                3. 분실 시 다시 키 복구 절차를 진행해야 합니다
            </Alert>

            <List sx={{ mb: 3 }}>
                <ListItem>
                    <ListItemIcon>
                        <CheckCircle color="success" />
                    </ListItemIcon>
                    <ListItemText 
                        primary="SSS 복구 성공"
                        secondary="Lagrange 보간법으로 조각들을 조합했습니다"
                    />
                </ListItem>
                <ListItem>
                    <ListItemIcon>
                        <CheckCircle color="success" />
                    </ListItemIcon>
                    <ListItemText 
                        primary="공개키 변경 없음"
                        secondary="블록체인의 공개키는 그대로 유지됩니다"
                    />
                </ListItem>
                <ListItem>
                    <ListItemIcon>
                        <CheckCircle color="success" />
                    </ListItemIcon>
                    <ListItemText 
                        primary="기존 의료기록 접근 가능"
                        secondary="원래 개인키로 암호화된 모든 기록을 읽을 수 있습니다"
                    />
                </ListItem>
            </List>

            <Button
                variant="contained"
                color="success"
                size="large"
                startIcon={<Download />}
                onClick={handleDownloadRecoveredKey}
                sx={{ mr: 1 }}
            >
                복구된 개인키 다운로드
            </Button>
        </Box>
    );

    const renderCompleteRecovery = () => (
        <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
                복구된 개인키를 다운로드했다면, 블록체인에 복구 완료를 알려주세요.
            </Alert>

            <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={handleCompleteRecovery}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
            >
                {loading ? '복구 완료 중...' : '복구 완료'}
            </Button>
        </Box>
    );

    const renderSuccess = () => (
        <Box textAlign="center">
            <CheckCircle color="success" sx={{ fontSize: 64, mb: 2 }} />
            <Typography variant="h5" color="success" gutterBottom>
                SSS 키 복구 완료! 🎉
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                <strong>Shamir's Secret Sharing</strong>으로 원래 개인키를 성공적으로 복구했습니다!<br/>
                기존 의료기록에 모두 접근할 수 있습니다. ✅
            </Typography>
            
            <Alert severity="success" sx={{ mb: 2 }}>
                ✨ <strong>SSS 알고리즘 성공!</strong><br/>
                • Lagrange 보간법으로 AES 키 복구 완료<br/>
                • 공개키 변경 없음 (원래 키 사용)<br/>
                • 기존 의료기록 100% 접근 가능
            </Alert>
            
            <Alert severity="info">
                다운로드받은 개인키 파일을 안전한 곳에 보관하고, 
                의료기록 조회 시 복구된 개인키를 사용해주세요.
            </Alert>
        </Box>
    );

    if (!requestId) {
        return (
            <Alert severity="error">
                복구 요청 ID가 없습니다.
            </Alert>
        );
    }

    if (!currentAccount) {
        return (
            <Alert severity="warning">
                MetaMask를 연결해주세요.
            </Alert>
        );
    }

    return (
        <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
            <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <VpnKey color="primary" sx={{ mr: 2 }} />
                SSS 키 복구 (실제 시스템)
            </Typography>

            {success ? (
                renderSuccess()
            ) : (
                <Stepper activeStep={activeStep} orientation="vertical">
                    <Step>
                        <StepLabel>블록체인에서 데이터 조회</StepLabel>
                        <StepContent>
                            {renderPrepareRecoveryData()}
                        </StepContent>
                    </Step>
                    
                    <Step>
                        <StepLabel>SSS로 키 복구</StepLabel>
                        <StepContent>
                            {renderRecoverPrivateKey()}
                        </StepContent>
                    </Step>
                    
                    <Step>
                        <StepLabel>복구된 개인키 다운로드</StepLabel>
                        <StepContent>
                            {renderDownloadPrivateKey()}
                        </StepContent>
                    </Step>
                    
                    <Step>
                        <StepLabel>복구 완료</StepLabel>
                        <StepContent>
                            {renderCompleteRecovery()}
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

export default KeyRecoveryProcess;
