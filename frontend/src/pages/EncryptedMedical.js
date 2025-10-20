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
    Chip
} from '@mui/material';
import KeyGeneration from '../components/KeyGeneration';
import PatientLookup from '../components/PatientLookup';
import MedicalRecordViewer from '../components/MedicalRecordViewer';
import { testEncryptionDecryption } from '../utils/encryption';
import { isDoctor as checkIsDoctor, isPublicKeyRegistered as checkIsPublicKeyRegistered } from '../utils/contracts';
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

                if (isRegistered) {
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
            
            // contracts.js의 함수 사용 (ENS 없음)
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
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Typography variant="h3" component="h1" gutterBottom align="center">
                    🔐 암호화된 의료기록 관리 시스템
                </Typography>
                
                <Typography variant="subtitle1" align="center" sx={{ mb: 4 }}>
                    블록체인 기반 의료기록의 안전한 암호화 저장 및 관리
                </Typography>

                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="h5" gutterBottom>
                        지갑을 연결해주세요
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 3 }}>
                        시스템을 사용하려면 MetaMask 지갑 연결이 필요합니다.
                    </Typography>
                    <Button 
                        onClick={connectWallet} 
                        variant="contained" 
                        size="large"
                        sx={{ 
                            background: 'linear-gradient(45deg, #2e7d32 30%, #4caf50 90%)',
                            color: 'white',
                            fontSize: '18px',
                            padding: '15px 30px'
                        }}
                    >
                        지갑 연결
                    </Button>
                </Paper>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h3" component="h1" gutterBottom align="center">
                🔐 암호화된 의료기록 관리 시스템
            </Typography>
            
            <Typography variant="subtitle1" align="center" sx={{ mb: 4 }}>
                블록체인 기반 의료기록의 안전한 암호화 저장 및 관리
            </Typography>

            {/* 계정 정보 */}
            <Paper sx={{ p: 2, mb: 3, backgroundColor: '#f5f5f5' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                        <Typography variant="h6">
                            연결된 계정: {formatAddress(currentAccount)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {currentAccount}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        {userRole && (
                            <Chip 
                                label={userRole === 'doctor' ? '👨‍⚕️ 의사' : '👤 환자'} 
                                color={userRole === 'doctor' ? 'primary' : 'secondary'}
                                variant="filled"
                            />
                        )}
                        <Button 
                            onClick={handleRoleRefresh} 
                            variant="outlined" 
                            size="small"
                        >
                            상태 새로고침
                        </Button>
                        <Button 
                            onClick={handleEncryptionTest} 
                            variant="contained" 
                            size="small"
                            color="warning"
                            sx={{ ml: 1 }}
                        >
                            🧪 암호화 테스트
                        </Button>
                    </Box>
                </Box>
            </Paper>

            {/* 키 등록 필요 */}
            {!isPublicKeyRegistered && (
                <Card sx={{ mb: 3, border: '2px solid #ff9800' }}>
                    <CardContent>
                        <Typography variant="h5" gutterBottom color="warning">
                            🔑 암호화 키 등록이 필요합니다
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 2 }}>
                            시스템을 사용하기 전에 먼저 RSA 키 쌍을 생성하고 공개키를 등록해주세요.
                        </Typography>
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
                <Paper sx={{ mb: 3 }}>
                    <Box sx={{ p: 2, backgroundColor: '#e3f2fd', borderBottom: 1, borderColor: 'divider' }}>
                        <Typography variant="h5" color="primary">
                            👨‍⚕️ 의사 전용 시스템
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            환자 진료기록 작성 및 조회 기능
                        </Typography>
                    </Box>
                    
                    <Tabs
                        value={doctorTabValue}
                        onChange={handleDoctorTabChange}
                        indicatorColor="primary"
                        textColor="primary"
                        variant="fullWidth"
                    >
                        <Tab label="📝 환자 진료기록 작성" />
                        <Tab label="📋 진료기록 조회" />
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
                <Paper sx={{ mb: 3 }}>
                    <Box sx={{ p: 2, backgroundColor: '#e8f5e8', borderBottom: 1, borderColor: 'divider' }}>
                        <Typography variant="h5" color="secondary">
                            👤 환자 전용 시스템
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            본인의 진료기록 조회 기능
                        </Typography>
                    </Box>
                    
                    <Tabs
                        value={patientTabValue}
                        onChange={handlePatientTabChange}
                        indicatorColor="secondary"
                        textColor="secondary"
                        variant="fullWidth"
                    >
                        <Tab label="📋 내 진료기록 조회" />
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
            <Box sx={{ mt: 4, p: 3, backgroundColor: '#f9f9f9', borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom>
                    📖 시스템 사용 방법
                </Typography>
                <Typography variant="body2" component="div">
                    <Box component="div" sx={{ mb: 2 }}>
                        <strong>👨‍⚕️ 의사 권한:</strong>
                        <ul>
                            <li>RSA 키 쌍 생성 및 공개키 등록 (의사로 등록)</li>
                            <li>환자 주소로 조회하여 공개키 등록 여부 확인</li>
                            <li>신규 환자: 기본정보(이름, 키, 몸무게, 혈액형, 주민번호) + 진료기록 작성</li>
                            <li>기존 환자: 진료기록(증상, 진단, 치료, 처방, 메모) 추가</li>
                            <li>작성한 진료기록 조회 및 복호화</li>
                        </ul>
                    </Box>
                    <Box component="div">
                        <strong>👤 환자 권한:</strong>
                        <ul>
                            <li>RSA 키 쌍 생성 및 공개키 등록 (환자로 등록)</li>
                            <li>본인의 진료기록 조회 및 복호화</li>
                            <li>의사가 작성한 모든 진료기록 열람</li>
                        </ul>
                    </Box>
                </Typography>
                <Typography variant="body2" color="error" sx={{ mt: 2 }}>
                    ⚠️ <strong>중요:</strong> 개인키는 절대 타인에게 공개하지 마세요. 개인키를 분실하면 데이터를 복구할 수 없습니다.
                </Typography>
            </Box>
        </Container>
    );
};

export default EncryptedMedical; 