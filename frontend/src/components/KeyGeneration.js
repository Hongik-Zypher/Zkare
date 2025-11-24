import React, { useState, useEffect } from 'react';
import { 
    Box, Button, Typography, CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Grid, Card, CardContent, Stepper, Step, StepLabel, StepContent
} from '@mui/material';
import { Person, Phone, AccountBalanceWallet } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { generateKeyPair } from '../utils/encryption';
import { isDoctor, getKeyRegistryContract, isPublicKeyRegistered, getPublicKey, setGuardiansWithShares } from '../utils/contracts';
import { encryptAndSplitKey, encryptShareForGuardian } from '../utils/secretSharing';

const KeyGeneration = ({ currentAccount, onKeyRegistered }) => {
    const [loading, setLoading] = useState(false);
    const [userRole, setUserRole] = useState(null);
    const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
    const [hasExistingKey, setHasExistingKey] = useState(false);
    const [checkingKey, setCheckingKey] = useState(true);
    const navigate = useNavigate();
    
    // 보호자 설정 통합 플로우용 state
    const [showGuardianDialog, setShowGuardianDialog] = useState(false);
    const [generatedPrivateKey, setGeneratedPrivateKey] = useState(null); // ⚠️ 보안: 일시적으로만 저장, 사용 후 즉시 삭제
    const [generatedPublicKey, setGeneratedPublicKey] = useState(null);
    const [guardianStep, setGuardianStep] = useState(0);
    const [guardians, setGuardians] = useState([
        { name: '', address: '', contact: '' },
        { name: '', address: '', contact: '' },
        { name: '', address: '', contact: '' }
    ]);
    const [guardianError, setGuardianError] = useState('');
    const [processingSSS, setProcessingSSS] = useState(false);
    const [sssStep, setSssStep] = useState('');

    useEffect(() => {
        checkUserStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentAccount]);
    
    // 🔒 보안: 컴포넌트 unmount 시 메모리에서 개인키 삭제
    useEffect(() => {
        return () => {
            if (generatedPrivateKey) {
                console.warn('🔒 [보안] 컴포넌트 종료 시 메모리에서 개인키 삭제');
                setGeneratedPrivateKey(null);
            }
        };
    }, [generatedPrivateKey]);
    
    // 🔒 보안: 개인키 생성 후 10분 경과 시 자동 삭제 (타임아웃)
    useEffect(() => {
        if (generatedPrivateKey) {
            console.warn('⏰ [보안] 개인키 10분 타임아웃 설정');
            const timeout = setTimeout(() => {
                console.warn('🔒 [보안] 타임아웃: 메모리에서 개인키 자동 삭제');
                setGeneratedPrivateKey(null);
                setShowGuardianDialog(false);
                alert('⚠️ 보안상 이유로 10분이 경과하여 키 생성 프로세스가 취소되었습니다. 다시 시도해주세요.');
            }, 10 * 60 * 1000); // 10분
            
            return () => clearTimeout(timeout);
        }
    }, [generatedPrivateKey]);

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
            
            console.log('✅ [키 생성] 완료 - 공개키 등록됨');
            
            // 공개키도 콘솔에 출력 (마스터키 설정용)
            console.log('📋 공개키 (PEM 형식):');
            console.log(publicKey);
            console.log('\n📋 frontend/.env에 추가할 내용:');
            console.log(`REACT_APP_MASTER_PUBLIC_KEY="${publicKey.replace(/\n/g, '\\n')}"`);
            
            // 개인키를 state에 저장 (아직 다운로드하지 않음!)
            setGeneratedPrivateKey(privateKey);
            setGeneratedPublicKey(publicKey);
            
            // 보호자 설정 다이얼로그 표시 (키 상태 업데이트 전에!)
            setShowGuardianDialog(true);
            setGuardianStep(0);
            
            // 참고: 키 상태는 보호자 설정 완료 후 자동 업데이트됨
            
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
    
    // 보호자 정보 입력 핸들러
    const handleGuardianChange = (index, field, value) => {
        const newGuardians = [...guardians];
        newGuardians[index][field] = value;
        setGuardians(newGuardians);
        setGuardianError('');
    };
    
    // 보호자 정보 유효성 검증
    const validateGuardians = () => {
        for (let i = 0; i < 3; i++) {
            const guardian = guardians[i];
            if (!guardian.name.trim()) {
                setGuardianError(`보호자 ${i + 1}의 이름을 입력해주세요.`);
                return false;
            }
            if (!guardian.address.trim()) {
                setGuardianError(`보호자 ${i + 1}의 지갑 주소를 입력해주세요.`);
                return false;
            }
            if (!guardian.address.match(/^0x[a-fA-F0-9]{40}$/)) {
                setGuardianError(`보호자 ${i + 1}의 지갑 주소 형식이 올바르지 않습니다.`);
                return false;
            }
            if (guardian.address.toLowerCase() === currentAccount.toLowerCase()) {
                setGuardianError(`자기 자신을 보호자로 설정할 수 없습니다.`);
                return false;
            }
            if (!guardian.contact.trim()) {
                setGuardianError(`보호자 ${i + 1}의 연락처를 입력해주세요.`);
                return false;
            }
        }
        
        // 중복 주소 확인
        const addresses = guardians.map(g => g.address.toLowerCase());
        const uniqueAddresses = [...new Set(addresses)];
        if (addresses.length !== uniqueAddresses.length) {
            setGuardianError('중복된 지갑 주소가 있습니다.');
            return false;
        }
        
        return true;
    };
    
    // 보호자 설정 건너뛰기
    const handleSkipGuardianSetup = () => {
        // 개인키 다운로드
        downloadPrivateKey();
        setShowGuardianDialog(false);
        
        if (onKeyRegistered) {
            onKeyRegistered();
        }
        
        alert('키 생성이 완료되었습니다. 나중에 키 복구 시스템을 설정할 수 있습니다.');
    };
    
    // 🔒 보안: 다이얼로그 강제 닫기 시 개인키 삭제
    const handleCloseGuardianDialog = () => {
        if (processingSSS) {
            alert('⚠️ SSS 처리 중에는 닫을 수 없습니다.');
            return;
        }
        
        if (generatedPrivateKey) {
            const confirm = window.confirm(
                '⚠️ 보호자 설정을 취소하시겠습니까?\n\n' +
                '취소하면 개인키만 다운로드되고 키 복구 시스템은 설정되지 않습니다.\n' +
                '나중에 키 복구 페이지에서 설정할 수 있습니다.'
            );
            
            if (confirm) {
                downloadPrivateKey(); // 개인키 다운로드
                setShowGuardianDialog(false);
                console.warn('🔒 [보안] 사용자가 다이얼로그를 닫아 메모리에서 개인키 삭제');
            }
        } else {
            setShowGuardianDialog(false);
        }
    };
    
    // 개인키 다운로드
    const downloadPrivateKey = () => {
        if (!generatedPrivateKey) {
            console.warn('⚠️ [보안] 다운로드할 개인키가 없습니다');
            return;
        }
        
        console.log('💾 개인키 다운로드 시작');
        
        const blob = new Blob([generatedPrivateKey], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `private_key_${currentAccount}.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        console.log('✅ 개인키 다운로드 완료');
        
        // 공개키도 콘솔에 출력 (마스터키 설정용)
        if (generatedPublicKey) {
            console.log('\n📋 공개키 (PEM 형식):');
            console.log(generatedPublicKey);
            console.log('\n📋 frontend/.env에 추가할 내용:');
            console.log(`REACT_APP_MASTER_PUBLIC_KEY="${generatedPublicKey.replace(/\n/g, '\\n')}"`);
        }
        
        // 🔒 보안: 메모리에서 개인키 즉시 삭제
        console.warn('🔒 [보안] 메모리에서 개인키 삭제');
        setGeneratedPrivateKey(null);
    };
    
    // 공개키 다운로드 (마스터키 설정용)
    const downloadPublicKey = () => {
        if (!generatedPublicKey) {
            console.warn('⚠️ 다운로드할 공개키가 없습니다');
            return;
        }
        
        console.log('💾 공개키 다운로드 시작');
        
        const blob = new Blob([generatedPublicKey], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `public_key_${currentAccount}.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        console.log('✅ 공개키 다운로드 완료');
        console.log('\n📋 frontend/.env에 추가할 내용:');
        console.log(`REACT_APP_MASTER_PUBLIC_KEY="${generatedPublicKey.replace(/\n/g, '\\n')}"`);
    };
    
    // 보호자 설정 + SSS 처리
    const handleCompleteGuardianSetup = async () => {
        if (!validateGuardians()) return;
        
        setProcessingSSS(true);
        setGuardianError('');
        
        try {
            console.log('🔐 보호자 설정 + SSS 분할 시작');
            setGuardianStep(1); // 처리 중 단계로 이동
            
            // 1. 보호자 공개키 조회
            setSssStep('보호자 공개키 확인 중...');
            const guardianPublicKeys = [];
            for (let i = 0; i < 3; i++) {
                const guardianAddr = guardians[i].address;
                const publicKeyData = await getPublicKey(guardianAddr);
                if (!publicKeyData || !publicKeyData[0]) {
                    throw new Error(`보호자 ${i + 1}(${guardians[i].name})의 공개키가 등록되지 않았습니다. 보호자도 먼저 키를 생성해야 합니다.`);
                }
                guardianPublicKeys.push(publicKeyData[0]);
            }
            console.log('✅ 모든 보호자 공개키 확인 완료');
            
            // 2. SSS로 개인키 암호화 + 분할
            setSssStep('개인키 암호화 및 SSS 분할 중...');
            const { encryptedPrivateKey, iv, shares } = 
                await encryptAndSplitKey(generatedPrivateKey, 3, 2);
            console.log('✅ SSS 분할 완료');
            
            // 3. 각 조각을 보호자 공개키로 암호화
            setSssStep('보호자용 조각 암호화 중...');
            const encryptedShares = [];
            for (let i = 0; i < 3; i++) {
                const encryptedShare = await encryptShareForGuardian(shares[i], guardianPublicKeys[i]);
                encryptedShares.push(encryptedShare);
            }
            console.log('✅ 조각 암호화 완료');
            
            // 4. 블록체인에 모두 저장
            setSssStep('블록체인에 저장 중...');
            console.log('📤 [디버깅] setGuardiansWithShares 호출 준비');
            console.log('- 보호자 주소:', guardians.map(g => g.address));
            console.log('- encryptedPrivateKey 길이:', encryptedPrivateKey.length);
            console.log('- iv 길이:', iv.length);
            console.log('- shares 개수:', encryptedShares.length);
            
            await setGuardiansWithShares(
                guardians.map(g => g.address),
                guardians.map(g => g.name),
                guardians.map(g => g.contact),
                encryptedPrivateKey,
                iv,
                encryptedShares
            );
            console.log('✅ 블록체인 저장 완료');
            
            // 5. 개인키 다운로드
            setSssStep('개인키 다운로드 중...');
            downloadPrivateKey();
            
            setGuardianStep(2); // 완료 단계
            
            if (onKeyRegistered) {
                onKeyRegistered();
            }
            
            // 2초 후 다이얼로그 닫기
            setTimeout(() => {
                setShowGuardianDialog(false);
                setGuardianStep(0);
            }, 2000);
            
        } catch (error) {
            console.error('❌ 보호자 설정 + SSS 오류:', error);
            setGuardianError(`오류가 발생했습니다: ${error.message}`);
            setGuardianStep(0);
        } finally {
            setProcessingSSS(false);
            setSssStep('');
        }
    };

    // 렌더링
    let content;
    
    // 로딩 중일 때
    if (checkingKey) {
        content = (
            <Box sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: '#f5f5f5', textAlign: 'center' }}>
                <CircularProgress size={24} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    키 상태 확인 중...
                </Typography>
            </Box>
        );
    }

    
    // 키가 이미 존재할 때
    else if (hasExistingKey) {
        content = (
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
    else {
        content = (
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
    }
    
    return (
        <>
            {content}
            
            {/* 보호자 설정 다이얼로그 (항상 렌더링) */}
            <Dialog 
                open={showGuardianDialog} 
                onClose={handleCloseGuardianDialog}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>🔐 키 복구 시스템 설정 (권장)</DialogTitle>
                <DialogContent>
                    {/* 공개키 표시 (마스터키 설정용) */}
                    {generatedPublicKey && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                📋 공개키 (마스터키 설정용)
                            </Typography>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '10px', wordBreak: 'break-all', mb: 1 }}>
                                {generatedPublicKey}
                            </Typography>
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={downloadPublicKey}
                                sx={{ mt: 1 }}
                            >
                                공개키 다운로드
                            </Button>
                            <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                                💡 행안부 장관으로 설정하려면 이 공개키를 frontend/.env의 REACT_APP_MASTER_PUBLIC_KEY에 설정하세요.
                            </Typography>
                        </Alert>
                    )}
                    <Stepper activeStep={guardianStep} orientation="vertical">
                        {/* Step 0: 보호자 정보 입력 */}
                        <Step>
                            <StepLabel>보호자 3명 설정</StepLabel>
                            <StepContent>
                                <Alert severity="info" sx={{ mb: 2 }}>
                                    키 분실 시 2명의 승인으로 복구할 수 있습니다.
                                </Alert>
                                <Grid container spacing={2}>
                                    {guardians.map((guardian, index) => (
                                        <Grid item xs={12} key={index}>
                                            <Card variant="outlined">
                                                <CardContent>
                                                    <Typography variant="subtitle1" color="primary" gutterBottom>
                                                        보호자 {index + 1}
                                                    </Typography>
                                                    <Grid container spacing={1}>
                                                        <Grid item xs={12} sm={4}>
                                                            <TextField
                                                                fullWidth
                                                                size="small"
                                                                label="이름"
                                                                placeholder="예: 엄마"
                                                                value={guardian.name}
                                                                onChange={(e) => handleGuardianChange(index, 'name', e.target.value)}
                                                                InputProps={{
                                                                    startAdornment: <Person sx={{ mr: 0.5, color: 'text.secondary' }} />
                                                                }}
                                                            />
                                                        </Grid>
                                                        <Grid item xs={12} sm={5}>
                                                            <TextField
                                                                fullWidth
                                                                size="small"
                                                                label="지갑 주소"
                                                                placeholder="0x..."
                                                                value={guardian.address}
                                                                onChange={(e) => handleGuardianChange(index, 'address', e.target.value)}
                                                                InputProps={{
                                                                    startAdornment: <AccountBalanceWallet sx={{ mr: 0.5, color: 'text.secondary' }} />
                                                                }}
                                                            />
                                                        </Grid>
                                                        <Grid item xs={12} sm={3}>
                                                            <TextField
                                                                fullWidth
                                                                size="small"
                                                                label="연락처"
                                                                placeholder="010-1234-5678"
                                                                value={guardian.contact}
                                                                onChange={(e) => handleGuardianChange(index, 'contact', e.target.value)}
                                                                InputProps={{
                                                                    startAdornment: <Phone sx={{ mr: 0.5, color: 'text.secondary' }} />
                                                                }}
                                                            />
                                                        </Grid>
                                                    </Grid>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    ))}
                                </Grid>
                                {guardianError && (
                                    <Alert severity="error" sx={{ mt: 2 }}>
                                        {guardianError}
                                    </Alert>
                                )}
                                <Box sx={{ mt: 2 }}>
                                    <Button
                                        variant="contained"
                                        onClick={handleCompleteGuardianSetup}
                                        disabled={processingSSS}
                                        sx={{ mr: 1 }}
                                    >
                                        설정 완료
                                    </Button>
                                    <Button onClick={handleSkipGuardianSetup} disabled={processingSSS}>
                                        나중에 설정
                                    </Button>
                                </Box>
                            </StepContent>
                        </Step>
                        
                        {/* Step 1: SSS 처리 중 */}
                        <Step>
                            <StepLabel>SSS 처리 중</StepLabel>
                            <StepContent>
                                <Box sx={{ textAlign: 'center', py: 3 }}>
                                    <CircularProgress />
                                    {sssStep && (
                                        <Typography variant="body2" sx={{ mt: 2 }}>
                                            {sssStep}
                                        </Typography>
                                    )}
                                </Box>
                            </StepContent>
                        </Step>
                        
                        {/* Step 2: 완료 */}
                        <Step>
                            <StepLabel>완료</StepLabel>
                            <StepContent>
                                <Alert severity="success">
                                    ✨ 키 생성 및 보호자 설정이 완료되었습니다!<br/>
                                    개인키가 다운로드되었고, SSS 조각이 안전하게 저장되었습니다.
                                </Alert>
                            </StepContent>
                        </Step>
                    </Stepper>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default KeyGeneration; 