import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Tab,
    Tabs,
    Alert,
    CircularProgress,
    Paper,
    Button
} from '@mui/material';
import { Security, Shield, Person, VpnKey } from '@mui/icons-material';
import GuardianSetup from '../../components/KeyRecovery/GuardianSetup';
import RecoveryRequest from '../../components/KeyRecovery/RecoveryRequest';
import NewKeyGeneration from '../../components/KeyRecovery/NewKeyGeneration';
import { hasGuardians, getActiveRecoveryRequest, isPublicKeyRegistered } from '../../utils/contracts';

function TabPanel({ children, value, index, ...other }) {
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`key-recovery-tabpanel-${index}`}
            aria-labelledby={`key-recovery-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

const KeyRecoveryPage = ({ currentAccount }) => {
    const [tabValue, setTabValue] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [hasGuardiansSet, setHasGuardiansSet] = useState(false);
    const [activeRequestId, setActiveRequestId] = useState(null);
    const [canComplete, setCanComplete] = useState(false);
    const [hasPublicKey, setHasPublicKey] = useState(false);

    useEffect(() => {
        if (currentAccount) {
            checkUserStatus();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentAccount]);

    const checkUserStatus = async () => {
        setLoading(true);
        setError('');

        try {
            // 공개키 등록 여부 확인
            const publicKeyRegistered = await isPublicKeyRegistered(currentAccount);
            setHasPublicKey(publicKeyRegistered);

            if (!publicKeyRegistered) {
                setTabValue(0); // 공개키 등록 안내로 이동
                setLoading(false);
                return;
            }

            // 보호자 설정 여부 확인
            const guardiansSet = await hasGuardians(currentAccount);
            setHasGuardiansSet(guardiansSet);

            if (guardiansSet) {
                // 활성 복구 요청 확인
                const requestId = await getActiveRecoveryRequest(currentAccount);
                if (requestId && requestId !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
                    setActiveRequestId(requestId);
                    setTabValue(1); // 복구 요청 탭으로 이동
                } else {
                    setActiveRequestId(null);
                    setCanComplete(false);
                    setTabValue(1); // 복구 요청 탭으로 이동
                }
            } else {
                setTabValue(0); // 보호자 설정 탭으로 이동
            }

        } catch (error) {
            console.error('사용자 상태 확인 오류:', error);
            setError('사용자 상태를 확인할 수 없습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    const handleGuardianSetupComplete = () => {
        setHasGuardiansSet(true);
        setTabValue(1);
    };

    const handleRecoveryComplete = (requestId) => {
        setActiveRequestId(requestId);
        setCanComplete(true);
        setTabValue(2);
    };

    const handleNewKeyComplete = () => {
        // 복구 완료 후 상태 새로고침
        checkUserStatus();
    };

    if (!currentAccount) {
        return (
            <Box sx={{ maxWidth: 600, mx: 'auto', p: 3, textAlign: 'center' }}>
                <Alert severity="warning">
                    키 복구 시스템을 사용하려면 먼저 MetaMask를 연결해주세요.
                </Alert>
            </Box>
        );
    }

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
            <Typography variant="h3" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                <Security color="primary" sx={{ mr: 2 }} />
                키 복구 시스템
            </Typography>

            <Paper sx={{ mb: 3 }}>
                <Tabs 
                    value={tabValue} 
                    onChange={handleTabChange}
                    variant="fullWidth"
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab 
                        icon={<Shield />} 
                        label="보호자 설정" 
                        disabled={hasGuardiansSet}
                        sx={{ 
                            opacity: hasGuardiansSet ? 0.5 : 1
                        }}
                    />
                    <Tab 
                        icon={<Person />} 
                        label="키 복구 요청" 
                        disabled={!hasPublicKey || !hasGuardiansSet}
                    />
                    <Tab 
                        icon={<VpnKey />} 
                        label="새 키 생성" 
                        disabled={!canComplete}
                    />
                </Tabs>
            </Paper>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            <TabPanel value={tabValue} index={0}>
                {!hasPublicKey ? (
                    <Alert severity="warning" sx={{ mb: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            먼저 키를 생성해야 합니다
                        </Typography>
                        <Typography variant="body1" gutterBottom>
                            키 복구 시스템을 사용하려면 먼저 공개키를 등록해야 합니다.
                        </Typography>
                        <Button 
                            variant="contained" 
                            href="/encrypted" 
                            sx={{ mt: 2 }}
                        >
                            키 생성하러 가기
                        </Button>
                    </Alert>
                ) : !hasGuardiansSet ? (
                    <GuardianSetup 
                        currentAccount={currentAccount}
                        onComplete={handleGuardianSetupComplete}
                    />
                ) : (
                    <Alert severity="success">
                        보호자 설정이 이미 완료되었습니다.
                    </Alert>
                )}
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
                {!hasPublicKey ? (
                    <Alert severity="warning">
                        먼저 키를 생성해야 키 복구를 요청할 수 있습니다.
                    </Alert>
                ) : hasGuardiansSet ? (
                    <RecoveryRequest 
                        currentAccount={currentAccount}
                        onRecoveryComplete={handleRecoveryComplete}
                    />
                ) : (
                    <Alert severity="warning">
                        먼저 보호자를 설정해야 키 복구를 요청할 수 있습니다.
                    </Alert>
                )}
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
                {canComplete && activeRequestId ? (
                    <NewKeyGeneration 
                        requestId={activeRequestId}
                        onComplete={handleNewKeyComplete}
                    />
                ) : (
                    <Alert severity="info">
                        충분한 보호자 승인을 받은 후에 새 키를 생성할 수 있습니다.
                    </Alert>
                )}
            </TabPanel>
        </Box>
    );
};

export default KeyRecoveryPage;
