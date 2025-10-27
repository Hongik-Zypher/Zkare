import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Tab,
    Tabs,
    Alert,
    CircularProgress,
    Paper,
    Button,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Divider
} from '@mui/material';
import { Security, Shield, Person, VpnKey } from '@mui/icons-material';
import GuardianSetup from '../../components/KeyRecovery/GuardianSetup';
import RecoveryRequest from '../../components/KeyRecovery/RecoveryRequest';
import KeyRecoveryProcess from '../../components/KeyRecovery/KeyRecoveryProcess';
import KeyGeneration from '../../components/KeyGeneration';
import LateGuardianSetup from '../../components/KeyRecovery/LateGuardianSetup';
import { hasGuardians, getActiveRecoveryRequest, isPublicKeyRegistered, hasUserData, getGuardians } from '../../utils/contracts';

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
    const [hasUserDataSet, setHasUserDataSet] = useState(false);
    const [guardianInfo, setGuardianInfo] = useState(null);
    const [showLateSetup, setShowLateSetup] = useState(false);

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

            // UserData 설정 여부 확인 (새 방식)
            const userDataSet = await hasUserData(currentAccount);
            setHasUserDataSet(userDataSet);

            // 보호자 설정 여부 확인 (기존 방식 - 하위 호환성)
            const guardiansSet = await hasGuardians(currentAccount);
            setHasGuardiansSet(guardiansSet);

            // 보호자 정보 조회
            if (userDataSet || guardiansSet) {
                try {
                    const guardians = await getGuardians(currentAccount);
                    setGuardianInfo(guardians);
                } catch (error) {
                    console.error('보호자 정보 조회 오류:', error);
                }
            }

            if (userDataSet || guardiansSet) {
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
                        disabled={hasGuardiansSet || hasUserDataSet}
                        sx={{ 
                            opacity: (hasGuardiansSet || hasUserDataSet) ? 0.5 : 1
                        }}
                    />
                    <Tab 
                        icon={<Person />} 
                        label="키 복구 요청" 
                        disabled={!hasPublicKey || (!hasGuardiansSet && !hasUserDataSet)}
                    />
                    <Tab 
                        icon={<VpnKey />} 
                        label="키 복구 완료 (SSS)" 
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
                    <>
                        <Alert severity="info" sx={{ mb: 3 }}>
                            <Typography variant="h6" gutterBottom>
                                🔐 키 생성 + 보호자 설정
                            </Typography>
                            <Typography variant="body2">
                                키를 생성하면 자동으로 보호자 설정 다이얼로그가 나타납니다.<br/>
                                보호자 3명을 입력하고 "설정 완료"를 클릭하면 SSS 조각이 블록체인에 저장됩니다.
                            </Typography>
                        </Alert>
                        <KeyGeneration 
                            currentAccount={currentAccount}
                            onKeyRegistered={checkUserStatus}
                        />
                    </>
                ) : hasUserDataSet ? (
                    <>
                        <Alert severity="success" sx={{ mb: 3 }}>
                            <Typography variant="h6" gutterBottom>
                                ✅ SSS 키 복구 시스템 설정 완료!
                            </Typography>
                            <Typography variant="body2">
                                보호자 3명이 설정되었고, SSS 조각이 블록체인에 안전하게 저장되어 있습니다.<br/>
                                키 분실 시 보호자 2명의 승인으로 복구할 수 있습니다.
                            </Typography>
                        </Alert>
                        
                        {guardianInfo && (
                            <Paper sx={{ p: 2 }}>
                                <Typography variant="h6" gutterBottom>
                                    📋 등록된 보호자 목록
                                </Typography>
                                <List>
                                    {guardianInfo.addresses.map((address, index) => (
                                        <React.Fragment key={index}>
                                            <ListItem>
                                                <ListItemIcon>
                                                    <Person color="primary" />
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={guardianInfo.names[index]}
                                                    secondary={
                                                        <React.Fragment>
                                                            <Typography variant="body2" color="text.secondary" component="span" display="block">
                                                                지갑: {address}
                                                            </Typography>
                                                            <Typography variant="body2" color="text.secondary" component="span" display="block">
                                                                연락처: {guardianInfo.contacts[index]}
                                                            </Typography>
                                                        </React.Fragment>
                                                    }
                                                />
                                            </ListItem>
                                            {index < guardianInfo.addresses.length - 1 && <Divider />}
                                        </React.Fragment>
                                    ))}
                                </List>
                            </Paper>
                        )}
                    </>
                ) : hasGuardiansSet ? (
                    <>
                        <Alert severity="warning" sx={{ mb: 3 }}>
                            <Typography variant="h6" gutterBottom>
                                ⚠️ 기존 방식으로 설정되어 SSS를 사용할 수 없습니다
                            </Typography>
                            <Typography variant="body2" paragraph>
                                현재 계정은 기존 방식으로 보호자가 설정되어 있어, SSS 조각이 블록체인에 저장되지 않았습니다.
                            </Typography>
                            <Typography variant="body2" component="div">
                                <strong>해결 방법:</strong>
                                <ol style={{ marginTop: '8px' }}>
                                    <li>새 MetaMask 계정으로 전환</li>
                                    <li>이 페이지를 새로고침</li>
                                    <li>키 생성 후 보호자 설정 완료</li>
                                </ol>
                            </Typography>
                        </Alert>
                        
                        {guardianInfo && (
                            <Paper sx={{ p: 2 }}>
                                <Typography variant="h6" gutterBottom>
                                    📋 등록된 보호자 목록 (기존 방식)
                                </Typography>
                                <List>
                                    {guardianInfo.addresses.map((address, index) => (
                                        <React.Fragment key={index}>
                                            <ListItem>
                                                <ListItemIcon>
                                                    <Person color="warning" />
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={guardianInfo.names[index]}
                                                    secondary={
                                                        <React.Fragment>
                                                            <Typography variant="body2" color="text.secondary" component="span" display="block">
                                                                지갑: {address}
                                                            </Typography>
                                                            <Typography variant="body2" color="text.secondary" component="span" display="block">
                                                                연락처: {guardianInfo.contacts[index]}
                                                            </Typography>
                                                        </React.Fragment>
                                                    }
                                                />
                                            </ListItem>
                                            {index < guardianInfo.addresses.length - 1 && <Divider />}
                                        </React.Fragment>
                                    ))}
                                </List>
                            </Paper>
                        )}
                    </>
                ) : (
                    <>
                        <Alert severity="info" sx={{ mb: 3 }}>
                            <Typography variant="h6" gutterBottom>
                                🔐 키가 있지만 보호자가 설정되지 않았습니다
                            </Typography>
                            <Typography variant="body2" paragraph>
                                이미 키를 생성했지만 보호자를 설정하지 않으셨나요?<br/>
                                두 가지 방법으로 보호자를 설정할 수 있습니다:
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                <Button
                                    variant="outlined"
                                    onClick={() => setShowLateSetup(!showLateSetup)}
                                    size="large"
                                >
                                    {showLateSetup ? '취소' : '📤 개인키 업로드해서 보호자 등록'}
                                </Button>
                                <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                                    또는 새 계정으로 전환하여 처음부터 시작하세요
                                </Typography>
                            </Box>
                        </Alert>

                        {showLateSetup ? (
                            <LateGuardianSetup
                                currentAccount={currentAccount}
                                onComplete={() => {
                                    setShowLateSetup(false);
                                    checkUserStatus();
                                }}
                            />
                        ) : (
                            <>
                                <Alert severity="info" sx={{ mb: 3 }}>
                                    <Typography variant="h6" gutterBottom>
                                        🔐 또는 키 생성 + 보호자 설정 (권장)
                                    </Typography>
                                    <Typography variant="body2">
                                        새 계정으로 전환하여 키를 생성하면 자동으로 보호자 설정 다이얼로그가 나타납니다.<br/>
                                        보호자 3명을 입력하고 "설정 완료"를 클릭하면 SSS 조각이 블록체인에 저장됩니다.
                                    </Typography>
                                </Alert>
                                <KeyGeneration 
                                    currentAccount={currentAccount}
                                    onKeyRegistered={checkUserStatus}
                                />
                            </>
                        )}
                    </>
                )}
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
                {!hasPublicKey ? (
                    <Alert severity="warning">
                        먼저 키를 생성해야 키 복구를 요청할 수 있습니다.
                    </Alert>
                ) : (hasUserDataSet || hasGuardiansSet) ? (
                    <RecoveryRequest 
                        currentAccount={currentAccount}
                        onRecoveryComplete={handleRecoveryComplete}
                    />
                ) : (
                    <Alert severity="warning">
                        먼저 보호자를 설정해야 키 복구를 요청할 수 있습니다.<br/>
                        키 생성 페이지에서 "키 생성하기"를 한 후 보호자 설정을 완료하세요.
                    </Alert>
                )}
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
                {canComplete && activeRequestId ? (
                    <KeyRecoveryProcess 
                        requestId={activeRequestId}
                        currentAccount={currentAccount}
                        onComplete={handleNewKeyComplete}
                    />
                ) : (
                    <Alert severity="info">
                        보호자 2명 이상의 승인을 받은 후 키를 복구할 수 있습니다.
                    </Alert>
                )}
            </TabPanel>
        </Box>
    );
};

export default KeyRecoveryPage;
