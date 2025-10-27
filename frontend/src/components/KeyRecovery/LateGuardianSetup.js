import React, { useState } from 'react';
import {
    Box,
    Button,
    Typography,
    Alert,
    Stepper,
    Step,
    StepLabel,
    StepContent,
    TextField,
    Grid,
    Card,
    CardContent,
    CircularProgress,
    Paper
} from '@mui/material';
import { Person, Phone, AccountBalanceWallet, Upload } from '@mui/icons-material';
import { setGuardiansWithShares, getPublicKey } from '../../utils/contracts';
import { encryptAndSplitKey, encryptShareForGuardian } from '../../utils/secretSharing';

const LateGuardianSetup = ({ currentAccount, onComplete }) => {
    const [activeStep, setActiveStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [privateKeyFile, setPrivateKeyFile] = useState(null);
    const [privateKey, setPrivateKey] = useState('');
    const [guardians, setGuardians] = useState([
        { name: '', address: '', contact: '' },
        { name: '', address: '', contact: '' },
        { name: '', address: '', contact: '' }
    ]);
    const [processingSSS, setProcessingSSS] = useState(false);
    const [sssStep, setSssStep] = useState('');

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setPrivateKeyFile(file);
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            setPrivateKey(content);
            setError('');
        };
        reader.onerror = () => {
            setError('파일을 읽는 중 오류가 발생했습니다.');
        };
        reader.readAsText(file);
    };

    const handleGuardianChange = (index, field, value) => {
        const newGuardians = [...guardians];
        newGuardians[index][field] = value;
        setGuardians(newGuardians);
        setError('');
    };

    const validateGuardians = () => {
        for (let i = 0; i < 3; i++) {
            const guardian = guardians[i];
            if (!guardian.name.trim()) {
                setError(`보호자 ${i + 1}의 이름을 입력해주세요.`);
                return false;
            }
            if (!guardian.address.trim()) {
                setError(`보호자 ${i + 1}의 지갑 주소를 입력해주세요.`);
                return false;
            }
            if (!guardian.address.match(/^0x[a-fA-F0-9]{40}$/)) {
                setError(`보호자 ${i + 1}의 지갑 주소 형식이 올바르지 않습니다.`);
                return false;
            }
            if (guardian.address.toLowerCase() === currentAccount.toLowerCase()) {
                setError(`자기 자신을 보호자로 설정할 수 없습니다.`);
                return false;
            }
            if (!guardian.contact.trim()) {
                setError(`보호자 ${i + 1}의 연락처를 입력해주세요.`);
                return false;
            }
        }

        // 중복 주소 확인
        const addresses = guardians.map(g => g.address.toLowerCase());
        const uniqueAddresses = [...new Set(addresses)];
        if (addresses.length !== uniqueAddresses.length) {
            setError('중복된 지갑 주소가 있습니다.');
            return false;
        }

        return true;
    };

    const handleComplete = async () => {
        if (!privateKey) {
            setError('개인키 파일을 업로드해주세요.');
            return;
        }

        if (!validateGuardians()) {
            return;
        }

        setProcessingSSS(true);
        setError('');
        setActiveStep(2); // 처리 중 단계

        try {
            console.log('🔐 [나중 등록] 보호자 설정 + SSS 분할 시작');

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
                await encryptAndSplitKey(privateKey, 3, 2);
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
            await setGuardiansWithShares(
                guardians.map(g => g.address),
                guardians.map(g => g.name),
                guardians.map(g => g.contact),
                encryptedPrivateKey,
                iv,
                encryptedShares
            );
            console.log('✅ 블록체인 저장 완료');

            setActiveStep(3); // 완료 단계

            if (onComplete) {
                setTimeout(() => {
                    onComplete();
                }, 2000);
            }

        } catch (error) {
            console.error('❌ 보호자 설정 + SSS 오류:', error);
            setError(`오류가 발생했습니다: ${error.message}`);
            setActiveStep(1); // 입력 단계로 돌아가기
        } finally {
            setProcessingSSS(false);
            setSssStep('');
        }
    };

    return (
        <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
                📤 개인키 업로드 + 보호자 등록
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
                키를 생성할 때 보호자를 설정하지 않으셨나요?<br/>
                개인키 파일을 업로드하고 보호자를 등록하면 SSS 조각이 블록체인에 저장됩니다.
            </Alert>

            <Stepper activeStep={activeStep} orientation="vertical">
                {/* Step 0: 개인키 업로드 */}
                <Step>
                    <StepLabel>개인키 파일 업로드</StepLabel>
                    <StepContent>
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            ⚠️ 개인키 파일은 브라우저 메모리에서만 처리되며, 서버로 전송되지 않습니다.
                        </Alert>
                        
                        <Button
                            variant="contained"
                            component="label"
                            startIcon={<Upload />}
                            sx={{ mb: 2 }}
                        >
                            개인키 파일 선택
                            <input
                                type="file"
                                hidden
                                accept=".txt,.pem"
                                onChange={handleFileUpload}
                            />
                        </Button>

                        {privateKeyFile && (
                            <Alert severity="success" sx={{ mb: 2 }}>
                                ✅ 파일: {privateKeyFile.name}
                            </Alert>
                        )}

                        {error && activeStep === 0 && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {error}
                            </Alert>
                        )}

                        <Box sx={{ mt: 2 }}>
                            <Button
                                variant="contained"
                                onClick={() => {
                                    if (!privateKey) {
                                        setError('개인키 파일을 업로드해주세요.');
                                        return;
                                    }
                                    setError('');
                                    setActiveStep(1);
                                }}
                                disabled={!privateKey}
                            >
                                다음
                            </Button>
                        </Box>
                    </StepContent>
                </Step>

                {/* Step 1: 보호자 정보 입력 */}
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

                        {error && activeStep === 1 && (
                            <Alert severity="error" sx={{ mt: 2 }}>
                                {error}
                            </Alert>
                        )}

                        <Box sx={{ mt: 2 }}>
                            <Button
                                variant="contained"
                                onClick={handleComplete}
                                disabled={processingSSS}
                                sx={{ mr: 1 }}
                            >
                                설정 완료
                            </Button>
                            <Button
                                onClick={() => setActiveStep(0)}
                                disabled={processingSSS}
                            >
                                이전
                            </Button>
                        </Box>
                    </StepContent>
                </Step>

                {/* Step 2: SSS 처리 중 */}
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

                {/* Step 3: 완료 */}
                <Step>
                    <StepLabel>완료</StepLabel>
                    <StepContent>
                        <Alert severity="success">
                            ✨ 보호자 설정이 완료되었습니다!<br/>
                            SSS 조각이 안전하게 블록체인에 저장되었습니다.
                        </Alert>
                    </StepContent>
                </Step>
            </Stepper>
        </Paper>
    );
};

export default LateGuardianSetup;

