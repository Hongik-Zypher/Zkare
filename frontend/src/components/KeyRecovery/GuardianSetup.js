import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Grid,
    Alert,
    CircularProgress,
    Stepper,
    Step,
    StepLabel,
    StepContent,
    Paper
} from '@mui/material';
import { Shield, Person, Phone, AccountBalanceWallet } from '@mui/icons-material';
import { setGuardians } from '../../utils/contracts';

const GuardianSetup = ({ currentAccount, onComplete }) => {
    const [activeStep, setActiveStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    const [guardians, setGuardiansData] = useState([
        { name: '', address: '', contact: '' },
        { name: '', address: '', contact: '' },
        { name: '', address: '', contact: '' }
    ]);

    const steps = [
        '보호자 정보 입력',
        '정보 확인',
        '블록체인에 등록'
    ];

    const handleGuardianChange = (index, field, value) => {
        const newGuardians = [...guardians];
        newGuardians[index][field] = value;
        setGuardiansData(newGuardians);
        setError('');
    };

    const validateStep = (step) => {
        if (step === 0) {
            // 모든 보호자 정보가 입력되었는지 확인
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
                if (!guardian.contact.trim()) {
                    setError(`보호자 ${i + 1}의 연락처를 입력해주세요.`);
                    return false;
                }
                
                // 지갑 주소 형식 검증
                if (!guardian.address.match(/^0x[a-fA-F0-9]{40}$/)) {
                    setError(`보호자 ${i + 1}의 지갑 주소 형식이 올바르지 않습니다.`);
                    return false;
                }
                
                // 자기 자신을 보호자로 설정하지 않았는지 확인
                if (guardian.address.toLowerCase() === currentAccount.toLowerCase()) {
                    setError(`자기 자신을 보호자로 설정할 수 없습니다. (보호자 ${i + 1})`);
                    return false;
                }
            }
            
            // 중복 주소 확인
            const addresses = guardians.map(g => g.address.toLowerCase());
            const uniqueAddresses = [...new Set(addresses)];
            if (addresses.length !== uniqueAddresses.length) {
                setError('중복된 지갑 주소가 있습니다. 각 보호자는 서로 다른 주소를 가져야 합니다.');
                return false;
            }
        }
        return true;
    };

    const handleNext = () => {
        if (validateStep(activeStep)) {
            setActiveStep((prevActiveStep) => prevActiveStep + 1);
        }
    };

    const handleBack = () => {
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
        setError('');
    };

    const handleSubmit = async () => {
        if (!validateStep(0)) return;
        
        setLoading(true);
        setError('');
        
        try {
            const addresses = guardians.map(g => g.address);
            const names = guardians.map(g => g.name);
            const contacts = guardians.map(g => g.contact);
            
            console.log('🔐 보호자 설정 시작:', { addresses, names, contacts });
            
            const receipt = await setGuardians(addresses, names, contacts);
            
            setSuccess('보호자 설정이 완료되었습니다! 이제 키 복구 시스템을 사용할 수 있습니다.');
            setActiveStep(2);
            
            // 3초 후 완료 콜백 호출
            setTimeout(() => {
                if (onComplete) {
                    onComplete();
                }
            }, 3000);
            
        } catch (error) {
            console.error('❌ 보호자 설정 오류:', error);
            setError(`보호자 설정 중 오류가 발생했습니다: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const renderGuardianForm = () => (
        <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Shield color="primary" sx={{ mr: 1 }} />
                키 복구 보호자 3명을 설정해주세요
            </Typography>
            
            <Alert severity="info" sx={{ mb: 3 }}>
                보호자는 키를 분실했을 때 복구를 도와줄 신뢰할 수 있는 사람들입니다. 
                3명 중 2명의 승인이 있어야 키 복구가 가능합니다.
            </Alert>

            <Grid container spacing={3}>
                {guardians.map((guardian, index) => (
                    <Grid item xs={12} key={index}>
                        <Card variant="outlined">
                            <CardContent>
                                <Typography variant="h6" gutterBottom color="primary">
                                    보호자 {index + 1}
                                </Typography>
                                
                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={4}>
                                        <TextField
                                            fullWidth
                                            label="이름"
                                            placeholder="예: 엄마, 형, 친구"
                                            value={guardian.name}
                                            onChange={(e) => handleGuardianChange(index, 'name', e.target.value)}
                                            InputProps={{
                                                startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />
                                            }}
                                        />
                                    </Grid>
                                    
                                    <Grid item xs={12} md={4}>
                                        <TextField
                                            fullWidth
                                            label="지갑 주소"
                                            placeholder="0x..."
                                            value={guardian.address}
                                            onChange={(e) => handleGuardianChange(index, 'address', e.target.value)}
                                            InputProps={{
                                                startAdornment: <AccountBalanceWallet sx={{ mr: 1, color: 'text.secondary' }} />
                                            }}
                                        />
                                    </Grid>
                                    
                                    <Grid item xs={12} md={4}>
                                        <TextField
                                            fullWidth
                                            label="연락처"
                                            placeholder="010-1234-5678"
                                            value={guardian.contact}
                                            onChange={(e) => handleGuardianChange(index, 'contact', e.target.value)}
                                            InputProps={{
                                                startAdornment: <Phone sx={{ mr: 1, color: 'text.secondary' }} />
                                            }}
                                        />
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );

    const renderConfirmation = () => (
        <Box>
            <Typography variant="h6" gutterBottom>
                설정 정보 확인
            </Typography>
            
            <Alert severity="warning" sx={{ mb: 3 }}>
                ⚠️ 보호자 정보는 한 번 설정하면 변경할 수 없습니다. 신중히 확인해주세요.
            </Alert>

            {guardians.map((guardian, index) => (
                <Paper key={index} sx={{ p: 2, mb: 2 }}>
                    <Typography variant="subtitle1" color="primary" gutterBottom>
                        보호자 {index + 1}: {guardian.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        지갑 주소: {guardian.address}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        연락처: {guardian.contact}
                    </Typography>
                </Paper>
            ))}
            
            <Alert severity="info" sx={{ mt: 2 }}>
                키 복구 시 3명 중 2명의 승인이 필요하며, 24시간 내에 완료해야 합니다.
            </Alert>
        </Box>
    );

    const renderSuccess = () => (
        <Box textAlign="center">
            <Shield color="success" sx={{ fontSize: 64, mb: 2 }} />
            <Typography variant="h5" color="success" gutterBottom>
                보호자 설정 완료!
            </Typography>
            <Typography variant="body1" color="text.secondary">
                키 복구 시스템이 활성화되었습니다.
            </Typography>
        </Box>
    );

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
            <Stepper activeStep={activeStep} orientation="vertical">
                <Step>
                    <StepLabel>보호자 정보 입력</StepLabel>
                    <StepContent>
                        {renderGuardianForm()}
                        <Box sx={{ mt: 3 }}>
                            <Button
                                variant="contained"
                                onClick={handleNext}
                                disabled={loading}
                            >
                                다음
                            </Button>
                        </Box>
                    </StepContent>
                </Step>
                
                <Step>
                    <StepLabel>정보 확인</StepLabel>
                    <StepContent>
                        {renderConfirmation()}
                        <Box sx={{ mt: 3 }}>
                            <Button
                                variant="contained"
                                onClick={handleSubmit}
                                disabled={loading}
                                sx={{ mr: 1 }}
                            >
                                {loading ? <CircularProgress size={24} /> : '설정 완료'}
                            </Button>
                            <Button onClick={handleBack} disabled={loading}>
                                이전
                            </Button>
                        </Box>
                    </StepContent>
                </Step>
                
                <Step>
                    <StepLabel>완료</StepLabel>
                    <StepContent>
                        {renderSuccess()}
                    </StepContent>
                </Step>
            </Stepper>

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

export default GuardianSetup;
