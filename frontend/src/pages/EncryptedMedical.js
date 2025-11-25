import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import {
    Container,
    Typography,
    Box,
    Tabs,
    Tab,
    Paper,
    Button,
    Card,
    CardContent,
    Chip,
    Grid,
    Alert,
    Divider
} from '@mui/material';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import PersonIcon from '@mui/icons-material/Person';
import { AccountBalanceWallet as WalletIcon, VpnKey as KeyIcon } from '@mui/icons-material';
import KeyGeneration from '../components/KeyGeneration';
import PatientLookup from '../components/PatientLookup';
import MedicalRecordViewer from '../components/MedicalRecordViewer';
import { testEncryptionDecryption } from '../utils/encryption';
import { isDoctor as checkIsDoctor, isPublicKeyRegistered as checkIsPublicKeyRegistered } from '../utils/contracts';
import { COLORS, ROLE_CONFIG } from '../utils/constants';
import '../components/EncryptedMedical.css';

// ABI imports (실제 컨트랙트 배포 후 ABI 파일들을 추가해야 함)
// import KeyRegistryABI from '../abis/KeyRegistry.json';
// import EncryptedMedicalRecordABI from '../abis/EncryptedMedicalRecord.json';

// 임시 ABI (실제 배포 시 교체 필요)
const KeyRegistryABI = [
    "function registerPublicKey(string memory _publicKey, bool _isDoctor) external",
    "function getPublicKey(address _user) external view returns (string memory, uint256, bool)",
    "function isPublicKeyRegistered(address _user) external view returns (bool)",
    "function isDoctor(address _user) external view returns (bool)",
    "function isPatient(address _user) external view returns (bool)",
    "event PublicKeyRegistered(address indexed user, string publicKey)",
    "event DoctorCertified(address indexed doctor)",
    "event PatientRegistered(address indexed patient)"
];

const EncryptedMedicalRecordABI = [
    "function registerPatient(address _patient, string memory _name, string memory _encryptedBasicInfo, string memory _encryptedDoctorKey, string memory _encryptedPatientKey) external",
    "function addMedicalRecord(address _patient, string memory _encryptedData, string memory _encryptedDoctorKey, string memory _encryptedPatientKey) external",
    "function getPatientInfo(address _patient) external view returns (string memory name, string memory encryptedBasicInfo, string memory encryptedDoctorKey, string memory encryptedPatientKey, uint256 timestamp, bool isRegistered)",
    "function getMedicalRecord(address _patient, uint256 _recordId) external view returns (string memory encryptedData, string memory encryptedDoctorKey, string memory encryptedPatientKey, address doctor, uint256 timestamp)",
    "function isPatientRegistered(address _patient) external view returns (bool)",
    "function getRecordCount(address _patient) external view returns (uint256)",
    "function isPatientPublicKeyRegistered(address _patient) external view returns (bool)",
    "event PatientRegistered(address indexed patient, string name)",
    "event MedicalRecordAdded(address indexed patient, address indexed doctor, uint256 indexed recordId)"
];

// 컨트랙트 주소 (실제 배포 후 업데이트 필요)
const KEY_REGISTRY_ADDRESS = process.env.REACT_APP_KEY_REGISTRY_ADDRESS || "0x...";
const ENCRYPTED_MEDICAL_RECORD_ADDRESS = process.env.REACT_APP_ENCRYPTED_MEDICAL_RECORD_ADDRESS || "0x...";

function TabPanel({ children, value, index, ...other }) {
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`medical-tabpanel-${index}`}
            aria-labelledby={`medical-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

// 마스터 계정 주소 (환경 변수에서 읽기)
const MASTER_AUTHORITY_ADDRESS = process.env.REACT_APP_MASTER_AUTHORITY_ADDRESS || "0xBcd4042DE499D14e55001CcbB24a551F3b954096";

const EncryptedMedical = ({ currentAccount: propCurrentAccount }) => {
    const [currentAccount, setCurrentAccount] = useState(propCurrentAccount || '');
    const [provider, setProvider] = useState(null);
    const [keyRegistryContract, setKeyRegistryContract] = useState(null);
    const [medicalRecordContract, setMedicalRecordContract] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [userRole, setUserRole] = useState(null); // 'doctor' | 'patient' | null
    const [isPublicKeyRegistered, setIsPublicKeyRegistered] = useState(false);
    const [doctorTabValue, setDoctorTabValue] = useState(0);
    const [patientTabValue, setPatientTabValue] = useState(0);

    // App.js에서 전달받은 currentAccount가 변경되면 업데이트
    useEffect(() => {
        if (propCurrentAccount && propCurrentAccount !== currentAccount) {
            setCurrentAccount(propCurrentAccount);
            setIsConnected(true);
        }
    }, [propCurrentAccount, currentAccount]);

    // MetaMask 계정 변경 감지
    useEffect(() => {
        if (window.ethereum) {
            const handleAccountsChanged = async (accounts) => {
                if (accounts.length > 0) {
                    const newAccount = accounts[0];
                    setCurrentAccount(newAccount);
                    setIsConnected(true);
                    // 상태 새로고침
                    await checkUserRole();
                } else {
                    setCurrentAccount("");
                    setIsConnected(false);
                    setUserRole(null);
                }
            };

            window.ethereum.on('accountsChanged', handleAccountsChanged);

            // 클린업 함수
            return () => {
                if (window.ethereum) {
                    window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
                }
            };
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        initializeWeb3();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (currentAccount) {
            checkUserRole();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentAccount]);

    const initializeWeb3 = async () => {
        try {
            console.log('🚀 initializeWeb3 시작');
            if (window.ethereum) {
                // 네트워크 설정을 명시적으로 지정하여 ENS 에러 방지
                const web3Provider = new ethers.providers.Web3Provider(window.ethereum, {
                    chainId: 31337,
                    name: 'localhost',
                    ensAddress: null // ENS 비활성화
                });

                // App.js에서 currentAccount가 전달되었으면 바로 컨트랙트 초기화
                if (propCurrentAccount) {
                    console.log('✅ propCurrentAccount 발견:', propCurrentAccount);
                    await connectWallet();
                } else {
                    const accounts = await web3Provider.listAccounts();
                    console.log('💼 연결된 계정들:', accounts);
                    if (accounts.length > 0) {
                        await connectWallet();
                    } else {
                        console.log('⚠️ 연결된 계정 없음');
                    }
                }
            } else {
                alert('MetaMask를 설치해주세요!');
            }
        } catch (error) {
            console.error('Web3 초기화 오류:', error);
        }
    };

    const connectWallet = async () => {
        try {
            if (!window.ethereum) {
                alert('MetaMask를 설치해주세요!');
                return;
            }

            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const account = accounts[0];
            
            // JsonRpcProvider 사용 - ENS 완전 우회 (network 정보 명시)
            const jsonRpcProvider = new ethers.providers.JsonRpcProvider('http://localhost:8545', {
                name: 'localhost',
                chainId: 31337
            });
            const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
            const web3Signer = web3Provider.getSigner();

            // Provider 저장
            setProvider(jsonRpcProvider);
            setCurrentAccount(account);
            setIsConnected(true);

            // 컨트랙트 인스턴스 생성 - JsonRpcProvider로 읽기, Web3Provider로 쓰기
            const keyRegistryRead = new ethers.Contract(
                KEY_REGISTRY_ADDRESS,
                KeyRegistryABI,
                jsonRpcProvider
            );
            
            const keyRegistryWrite = new ethers.Contract(
                KEY_REGISTRY_ADDRESS,
                KeyRegistryABI,
                web3Signer
            );
            
            const medicalRecordWrite = new ethers.Contract(
                ENCRYPTED_MEDICAL_RECORD_ADDRESS,
                EncryptedMedicalRecordABI,
                web3Signer
            );

            // 쓰기용 컨트랙트 저장 (읽기는 keyRegistryRead 사용)
            setKeyRegistryContract(keyRegistryWrite);
            setMedicalRecordContract(medicalRecordWrite);

            console.log('지갑 연결 성공:', account);
            
            // 키 등록 여부 즉시 확인 - contracts.js의 함수 사용 (ENS 없음)
            try {
                console.log('🔍 키 등록 여부 확인 중...');
                const isRegistered = await checkIsPublicKeyRegistered(account);
                setIsPublicKeyRegistered(isRegistered);
                console.log('🔑 공개키 등록 여부:', isRegistered);

                // 먼저 마스터 계정인지 확인
                const isMaster = account && 
                    account.toLowerCase() === MASTER_AUTHORITY_ADDRESS.toLowerCase();
                
                if (isMaster) {
                    console.log('✅ 마스터 계정 감지됨!');
                    setUserRole('doctor'); // 마스터 계정은 의사 권한으로 취급
                    // 마스터 계정도 실제 공개키 등록 여부 확인
                    const masterKeyRegistered = await checkIsPublicKeyRegistered(account);
                    setIsPublicKeyRegistered(masterKeyRegistered);
                    console.log('👤 사용자 역할: 마스터 계정 (의사 권한)');
                    console.log('📋 마스터 계정 공개키 등록 여부:', masterKeyRegistered);
                } else if (isRegistered) {
                    const isDoctorAccount = await checkIsDoctor(account);
                    setUserRole(isDoctorAccount ? 'doctor' : 'patient');
                    console.log('👤 사용자 역할:', isDoctorAccount ? 'doctor' : 'patient');
                } else {
                    setUserRole(null);
                    console.log('⚠️ 공개키가 등록되지 않았습니다.');
                }
            } catch (roleError) {
                console.error('역할 확인 오류:', roleError);
            }
        } catch (error) {
            console.error('지갑 연결 오류:', error);
            alert('지갑 연결에 실패했습니다.');
        }
    };

    const checkUserRole = async () => {
        try {
            if (!currentAccount) {
                console.log('⚠️ 계정이 없습니다.');
                return;
            }

            console.log('🔍 역할 확인 중:', currentAccount);
            
            // 먼저 마스터 계정인지 확인
            const isMaster = currentAccount && 
                currentAccount.toLowerCase() === MASTER_AUTHORITY_ADDRESS.toLowerCase();
            
            if (isMaster) {
                console.log('✅ 마스터 계정 감지됨!');
                setUserRole('doctor'); // 마스터 계정은 의사 권한으로 취급
                // 마스터 계정도 실제 공개키 등록 여부 확인
                const isRegistered = await checkIsPublicKeyRegistered(currentAccount);
                setIsPublicKeyRegistered(isRegistered);
                console.log('👤 역할: 마스터 계정 (의사 권한)');
                console.log('📋 마스터 계정 공개키 등록 여부:', isRegistered);
                return;
            }
            
            // 일반 사용자의 경우 공개키 등록 여부 확인
            const isRegistered = await checkIsPublicKeyRegistered(currentAccount);
            setIsPublicKeyRegistered(isRegistered);
            console.log('📋 등록 여부:', isRegistered);

            if (isRegistered) {
                const isDoctorAccount = await checkIsDoctor(currentAccount);
                setUserRole(isDoctorAccount ? 'doctor' : 'patient');
                console.log('👤 역할:', isDoctorAccount ? 'doctor' : 'patient');
            } else {
                setUserRole(null);
            }
        } catch (error) {
            console.error('사용자 역할 확인 오류:', error);
        }
    };

    const handleDoctorTabChange = (event, newValue) => {
        setDoctorTabValue(newValue);
    };

    const handlePatientTabChange = (event, newValue) => {
        setPatientTabValue(newValue);
    };

    const formatAddress = (address) => {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const handleRoleRefresh = () => {
        checkUserRole();
    };

    const handleEncryptionTest = async () => {
        try {
            console.log("🧪 암호화/복호화 테스트 시작...");
            const result = await testEncryptionDecryption();
            
            if (result.success) {
                alert(`✅ 암호화/복호화 테스트 성공!\n\n데이터 무결성: ${result.integrityValid ? '✅ 통과' : '❌ 실패'}\n\n콘솔에서 자세한 결과를 확인하세요.`);
            } else {
                alert(`❌ 암호화/복호화 테스트 실패!\n\n오류: ${result.error}`);
            }
        } catch (error) {
            console.error("테스트 실행 오류:", error);
            alert(`❌ 테스트 실행 중 오류 발생: ${error.message}`);
        }
    };

    if (!isConnected) {
        return (
            <Box sx={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                py: 8,
            }}>
                <Container maxWidth="md">
                    <Paper
                        elevation={24}
                        sx={{
                            p: 6,
                            textAlign: 'center',
                            borderRadius: '24px',
                            background: 'rgba(255,255,255,0.98)',
                            backdropFilter: 'blur(10px)',
                        }}
                    >
                        <Box sx={{
                            width: 120,
                            height: 120,
                            borderRadius: '50%',
                            background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryHover})`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mx: 'auto',
                            mb: 4,
                            boxShadow: `0 8px 24px rgba(37, 99, 235, 0.4)`,
                        }}>
                            <LocalHospitalIcon sx={{ fontSize: 60, color: 'white' }} />
                        </Box>
                        <Typography variant="h3" component="h1" gutterBottom sx={{
                            fontWeight: 800,
                            color: COLORS.textPrimary,
                            mb: 2,
                        }}>
                            지갑 연결이 필요합니다
                        </Typography>
                        <Typography variant="h6" sx={{
                            color: COLORS.textSecondary,
                            mb: 4,
                            fontWeight: 400,
                        }}>
                            시스템을 사용하려면 MetaMask 지갑 연결이 필요합니다.
                            <br />
                            지갑을 연결하여 안전한 의료기록 관리를 시작하세요.
                        </Typography>
                        <Button
                            onClick={connectWallet}
                            variant="contained"
                            size="large"
                            startIcon={<WalletIcon />}
                            sx={{
                                px: 6,
                                py: 2,
                                fontSize: '1.125rem',
                                fontWeight: 700,
                                borderRadius: '50px',
                                background: 'linear-gradient(45deg, #FF6B6B, #FF8E53)',
                                boxShadow: '0 8px 24px rgba(255, 107, 107, 0.4)',
                                textTransform: 'none',
                                '&:hover': {
                                    background: 'linear-gradient(45deg, #FF5252, #FF7043)',
                                    boxShadow: '0 12px 32px rgba(255, 107, 107, 0.5)',
                                    transform: 'translateY(-2px)',
                                },
                                transition: 'all 0.3s ease',
                            }}
                        >
                            MetaMask 연결하기
                        </Button>
                    </Paper>
                </Container>
            </Box>
        );
    }

    return (
        <Box sx={{ 
            minHeight: '100vh',
            backgroundColor: COLORS.background,
        }}>
            {/* 대시보드 헤더 - 전문적인 스타일 */}
            <Box sx={{
                backgroundColor: COLORS.cardBg,
                borderBottom: `2px solid ${COLORS.border}`,
                py: 4,
            }}>
                <Container maxWidth="xl">
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4, flexWrap: 'wrap', gap: 3 }}>
                        <Box>
                            <Typography 
                                variant="h3" 
                                sx={{ 
                                    fontSize: { xs: '1.5rem', md: '2rem' },
                                    fontWeight: 700,
                                    color: COLORS.textPrimary,
                                    mb: 1,
                                    letterSpacing: '-0.02em',
                                }}
                            >
                                의료기록 관리 대시보드
                            </Typography>
                            <Typography 
                                variant="body1" 
                                sx={{ 
                                    color: COLORS.textSecondary,
                                    fontSize: '1rem',
                                }}
                            >
                                안전하고 투명한 블록체인 기반 의료정보 관리
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                            {userRole && (
                                <Chip 
                                    icon={userRole === 'doctor' ? <LocalHospitalIcon /> : <PersonIcon />}
                                    label={userRole === 'doctor' ? '의사' : '환자'} 
                                    sx={{
                                        backgroundColor: userRole === 'doctor' ? COLORS.roleDoctor : COLORS.rolePatient,
                                        color: userRole === 'doctor' ? COLORS.primary : COLORS.success,
                                        fontWeight: 600,
                                        height: '36px',
                                        fontSize: '0.875rem',
                                        border: `1px solid ${userRole === 'doctor' ? COLORS.primary : COLORS.success}30`,
                                    }}
                                />
                            )}
                            <Button 
                                onClick={handleRoleRefresh} 
                                variant="outlined"
                                sx={{
                                    borderColor: COLORS.borderDark,
                                    color: COLORS.textPrimary,
                                    borderRadius: '8px',
                                    fontWeight: 600,
                                    px: 2.5,
                                    py: 1.25,
                                    fontSize: '0.875rem',
                                    textTransform: 'none',
                                    '&:hover': {
                                        borderColor: COLORS.primary,
                                        backgroundColor: COLORS.primaryBg,
                                    },
                                }}
                            >
                                새로고침
                            </Button>
                        </Box>
                    </Box>
                    
                    {/* 통계 카드 - 깔끔한 디자인 */}
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card
                                elevation={0}
                                sx={{
                                    border: `2px solid ${COLORS.border}`,
                                    borderRadius: '12px',
                                    backgroundColor: COLORS.cardBg,
                                }}
                            >
                                <CardContent sx={{ p: 2.5 }}>
                                    <Typography variant="caption" sx={{ color: COLORS.textSecondary, fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        연결된 계정
                                    </Typography>
                                    <Typography variant="h6" sx={{ color: COLORS.textPrimary, fontWeight: 700, fontFamily: 'monospace', fontSize: '1rem', mt: 0.5 }}>
                                        {formatAddress(currentAccount)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card
                                elevation={0}
                                sx={{
                                    border: `2px solid ${isPublicKeyRegistered ? COLORS.success : COLORS.border}`,
                                    borderRadius: '12px',
                                    backgroundColor: COLORS.cardBg,
                                }}
                            >
                                <CardContent sx={{ p: 2.5 }}>
                                    <Typography variant="caption" sx={{ color: COLORS.textSecondary, fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        키 등록 상태
                                    </Typography>
                                    <Typography variant="h6" sx={{ color: isPublicKeyRegistered ? COLORS.success : COLORS.error, fontWeight: 700, fontSize: '1rem', mt: 0.5 }}>
                                        {isPublicKeyRegistered ? '등록됨' : '미등록'}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card
                                elevation={0}
                                sx={{
                                    border: `2px solid ${COLORS.border}`,
                                    borderRadius: '12px',
                                    backgroundColor: COLORS.cardBg,
                                }}
                            >
                                <CardContent sx={{ p: 2.5 }}>
                                    <Typography variant="caption" sx={{ color: COLORS.textSecondary, fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        사용자 역할
                                    </Typography>
                                    <Typography variant="h6" sx={{ color: COLORS.textPrimary, fontWeight: 700, fontSize: '1rem', mt: 0.5 }}>
                                        {userRole === 'doctor' ? '의사' : userRole === 'patient' ? '환자' : '미설정'}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card
                                elevation={0}
                                sx={{
                                    border: `2px solid ${COLORS.success}`,
                                    borderRadius: '12px',
                                    backgroundColor: COLORS.cardBg,
                                }}
                            >
                                <CardContent sx={{ p: 2.5 }}>
                                    <Typography variant="caption" sx={{ color: COLORS.textSecondary, fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        시스템 상태
                                    </Typography>
                                    <Typography variant="h6" sx={{ color: COLORS.success, fontWeight: 700, fontSize: '1rem', mt: 0.5 }}>
                                        정상 작동
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </Container>
            </Box>

            <Container maxWidth="xl" sx={{ py: 4, px: { xs: 2, md: 3 } }}>

                {/* 키 등록 필요 */}
                {!isPublicKeyRegistered && (
                    <Card 
                        id="key-generation-section" 
                        elevation={0}
                        sx={{ 
                            mb: 4, 
                            border: `2px solid ${COLORS.warningBorder}`,
                            borderRadius: '12px',
                            backgroundColor: COLORS.warningBg,
                        }}
                    >
                        <CardContent sx={{ p: 4 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                <Box
                                    sx={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: '10px',
                                        backgroundColor: COLORS.warningBorder,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                    }}
                                >
                                    <KeyIcon sx={{ fontSize: 24 }} />
                                </Box>
                                <Box>
                                    <Typography 
                                        variant="h5" 
                                        sx={{ 
                                            color: COLORS.warningText,
                                            fontWeight: 700,
                                            mb: 0.5,
                                        }}
                                    >
                                        암호화 키 등록이 필요합니다
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: COLORS.warningText, fontSize: '0.875rem' }}>
                                        시스템 사용을 위해 먼저 키를 생성해주세요
                                    </Typography>
                                </Box>
                            </Box>
                            <Divider sx={{ mb: 3, borderColor: COLORS.warningBorder }} />
                            <KeyGeneration
                                currentAccount={currentAccount}
                                onKeyRegistered={() => {
                                    console.log('🎉 키 등록 완료! 상태 업데이트 중...');
                                    setIsPublicKeyRegistered(true);
                                    checkUserRole();
                                }}
                            />
                        </CardContent>
                    </Card>
                )}

                {/* 의사 인터페이스 */}
                {userRole === 'doctor' && (
                    <Paper 
                        elevation={0}
                        sx={{ 
                            mb: 4, 
                            backgroundColor: COLORS.cardBg, 
                            borderRadius: '12px', 
                            overflow: 'hidden',
                            border: `2px solid ${COLORS.border}`,
                        }}
                    >
                        <Box sx={{ 
                            p: 3, 
                            backgroundColor: COLORS.primaryBg,
                            borderBottom: `2px solid ${COLORS.border}`,
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box
                                    sx={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: '10px',
                                        backgroundColor: COLORS.primary,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                    }}
                                >
                                    <LocalHospitalIcon sx={{ fontSize: 24 }} />
                                </Box>
                                <Box>
                                    <Typography variant="h5" sx={{ 
                                        color: COLORS.textPrimary, 
                                        fontWeight: 700,
                                        mb: 0.5,
                                    }}>
                                        의사 전용 시스템
                                    </Typography>
                                    <Typography variant="body2" sx={{ 
                                        color: COLORS.textSecondary,
                                        fontSize: '0.875rem',
                                    }}>
                                        환자 진료기록 작성 및 조회 기능
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>
                        
                        <Tabs
                            value={doctorTabValue}
                            onChange={handleDoctorTabChange}
                            variant="fullWidth"
                            sx={{
                                borderBottom: `2px solid ${COLORS.border}`,
                                backgroundColor: COLORS.cardBg,
                                '& .MuiTab-root': {
                                    color: COLORS.textSecondary,
                                    fontWeight: 500,
                                    fontSize: '0.9375rem',
                                    py: 2.5,
                                    textTransform: 'none',
                                    '&.Mui-selected': {
                                        color: COLORS.primary,
                                        fontWeight: 600,
                                    },
                                },
                                '& .MuiTabs-indicator': {
                                    backgroundColor: COLORS.primary,
                                    height: '3px',
                                },
                            }}
                        >
                            <Tab label="환자 진료기록 작성" />
                            <Tab label="진료기록 조회" />
                        </Tabs>

                    <TabPanel value={doctorTabValue} index={0}>
                        <Typography variant="h6" gutterBottom>
                            환자 조회 및 진료기록 작성
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            환자 주소를 입력하여 신규 환자 등록 또는 기존 환자의 진료기록을 추가할 수 있습니다.
                        </Typography>
                        <PatientLookup
                            keyRegistryContract={keyRegistryContract}
                            medicalRecordContract={medicalRecordContract}
                            currentAccount={currentAccount}
                        />
                    </TabPanel>

                    <TabPanel value={doctorTabValue} index={1}>
                        <Typography variant="h6" gutterBottom>
                            진료기록 조회 (의사용)
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            환자 주소를 입력하여 해당 환자의 진료기록을 조회할 수 있습니다.
                        </Typography>
                        <MedicalRecordViewer
                            keyRegistryContract={keyRegistryContract}
                            medicalRecordContract={medicalRecordContract}
                            currentAccount={currentAccount}
                        />
                    </TabPanel>
                </Paper>
            )}

                {/* 환자 인터페이스 */}
                {userRole === 'patient' && (
                    <Paper 
                        elevation={0}
                        sx={{ 
                            mb: 4, 
                            backgroundColor: COLORS.cardBg, 
                            borderRadius: '12px', 
                            overflow: 'hidden',
                            border: `2px solid ${COLORS.border}`,
                        }}
                    >
                        <Box sx={{ 
                            p: 3, 
                            backgroundColor: COLORS.rolePatient,
                            borderBottom: `2px solid ${COLORS.border}`,
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box
                                    sx={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: '10px',
                                        backgroundColor: COLORS.success,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                    }}
                                >
                                    <PersonIcon sx={{ fontSize: 24 }} />
                                </Box>
                                <Box>
                                    <Typography variant="h5" sx={{ 
                                        color: COLORS.textPrimary, 
                                        fontWeight: 700,
                                        mb: 0.5,
                                    }}>
                                        환자 전용 시스템
                                    </Typography>
                                    <Typography variant="body2" sx={{ 
                                        color: COLORS.textSecondary,
                                        fontSize: '0.875rem',
                                    }}>
                                        본인의 진료기록 조회 기능
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>
                        
                        <Tabs
                            value={patientTabValue}
                            onChange={handlePatientTabChange}
                            variant="fullWidth"
                            sx={{
                                borderBottom: `2px solid ${COLORS.border}`,
                                backgroundColor: COLORS.cardBg,
                                '& .MuiTab-root': {
                                    color: COLORS.textSecondary,
                                    fontWeight: 500,
                                    fontSize: '0.9375rem',
                                    py: 2.5,
                                    textTransform: 'none',
                                    '&.Mui-selected': {
                                        color: COLORS.success,
                                        fontWeight: 600,
                                    },
                                },
                                '& .MuiTabs-indicator': {
                                    backgroundColor: COLORS.success,
                                    height: '3px',
                                },
                            }}
                        >
                            <Tab label="내 진료기록 조회" />
                        </Tabs>

                    <TabPanel value={patientTabValue} index={0}>
                        <Typography variant="h6" gutterBottom>
                            내 진료기록 조회
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            개인키를 업로드하여 본인의 암호화된 진료기록을 복호화하여 조회할 수 있습니다.
                        </Typography>
                        <MedicalRecordViewer
                            keyRegistryContract={keyRegistryContract}
                            medicalRecordContract={medicalRecordContract}
                            currentAccount={currentAccount}
                        />
                    </TabPanel>
                </Paper>
            )}

                {/* 시스템 안내 */}
                <Paper 
                    elevation={8}
                    sx={{ 
                        mt: 6, 
                        p: 4, 
                        background: `linear-gradient(135deg, ${COLORS.cardBg}, ${COLORS.primaryBg})`,
                        borderRadius: '20px',
                        border: `1px solid ${COLORS.border}`,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    }}
                >
                    <Typography variant="h5" gutterBottom sx={{ 
                        fontWeight: 800,
                        color: COLORS.textPrimary,
                        mb: 3,
                    }}>
                        📖 시스템 사용 방법
                    </Typography>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <Box sx={{ 
                                p: 3, 
                                backgroundColor: COLORS.cardBg,
                                borderRadius: '16px',
                                border: `2px solid ${COLORS.primary}`,
                                height: '100%',
                            }}>
                                <Typography variant="h6" sx={{ 
                                    fontWeight: 700,
                                    color: COLORS.primary,
                                    mb: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                }}>
                                    <LocalHospitalIcon /> 의사 권한
                                </Typography>
                                <Box component="ul" sx={{ 
                                    pl: 2.5,
                                    '& li': {
                                        mb: 1.5,
                                        color: COLORS.textSecondary,
                                        lineHeight: 1.7,
                                    },
                                }}>
                                    <li>RSA 키 쌍 생성 및 공개키 등록 (의사로 등록)</li>
                                    <li>환자 주소로 조회하여 공개키 등록 여부 확인</li>
                                    <li>신규 환자: 기본정보(이름, 키, 몸무게, 혈액형, 주민번호) + 진료기록 작성</li>
                                    <li>기존 환자: 진료기록(증상, 진단, 치료, 처방, 메모) 추가</li>
                                    <li>작성한 진료기록 조회 및 복호화</li>
                                </Box>
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Box sx={{ 
                                p: 3, 
                                backgroundColor: COLORS.cardBg,
                                borderRadius: '16px',
                                border: `2px solid ${COLORS.success}`,
                                height: '100%',
                            }}>
                                <Typography variant="h6" sx={{ 
                                    fontWeight: 700,
                                    color: COLORS.success,
                                    mb: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                }}>
                                    <PersonIcon /> 환자 권한
                                </Typography>
                                <Box component="ul" sx={{ 
                                    pl: 2.5,
                                    '& li': {
                                        mb: 1.5,
                                        color: COLORS.textSecondary,
                                        lineHeight: 1.7,
                                    },
                                }}>
                                    <li>RSA 키 쌍 생성 및 공개키 등록 (환자로 등록)</li>
                                    <li>본인의 진료기록 조회 및 복호화</li>
                                    <li>의사가 작성한 모든 진료기록 열람</li>
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>
                    <Alert 
                        severity="warning" 
                        sx={{ 
                            mt: 3,
                            borderRadius: '12px',
                            backgroundColor: COLORS.warningBg,
                            border: `2px solid ${COLORS.warningText}`,
                            '& .MuiAlert-icon': {
                                color: COLORS.warningText,
                            },
                        }}
                    >
                        <Typography variant="body1" sx={{ fontWeight: 700, color: COLORS.warningText }}>
                            ⚠️ 중요: 개인키는 절대 타인에게 공개하지 마세요. 개인키를 분실하면 데이터를 복구할 수 없습니다.
                        </Typography>
                    </Alert>
                </Paper>
            </Container>
        </Box>
    );
};

export default EncryptedMedical; 