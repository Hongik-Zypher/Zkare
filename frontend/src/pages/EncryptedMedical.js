import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
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
} from "@mui/material";
import KeyGeneration from "../components/KeyGeneration";
import PatientLookup from "../components/PatientLookup";
import MedicalRecordViewer from "../components/MedicalRecordViewer";
import { testEncryptionDecryption } from "../utils/encryption";
import "../components/EncryptedMedical.css";

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
  "event PatientRegistered(address indexed patient)",
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
  "event MedicalRecordAdded(address indexed patient, address indexed doctor, uint256 indexed recordId)",
];

// 컨트랙트 주소
const KEY_REGISTRY_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const ENCRYPTED_MEDICAL_RECORD_ADDRESS =
  "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

// Provider 설정
const getCustomProvider = () => {
  return new ethers.providers.Web3Provider(window.ethereum, {
    name: "hardhat",
    chainId: 31337,
    ensAddress: null, // ENS 비활성화
  });
};

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

const EncryptedMedical = () => {
  const [currentAccount, setCurrentAccount] = useState("");
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [keyRegistryContract, setKeyRegistryContract] = useState(null);
  const [medicalRecordContract, setMedicalRecordContract] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userRole, setUserRole] = useState(null); // 'doctor' | 'patient' | null
  const [isPublicKeyRegistered, setIsPublicKeyRegistered] = useState(false);
  const [doctorTabValue, setDoctorTabValue] = useState(0);
  const [patientTabValue, setPatientTabValue] = useState(0);

  useEffect(() => {
    initializeWeb3();
  }, []);

  useEffect(() => {
    if (isConnected && keyRegistryContract && currentAccount) {
      checkUserRole();
    }
  }, [isConnected, keyRegistryContract, currentAccount]);

  const initializeWeb3 = async () => {
    try {
      if (window.ethereum) {
        const provider = getCustomProvider();
        setProvider(provider);

        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          await connectWallet();
        }
      } else {
        alert("MetaMask를 설치해주세요!");
      }
    } catch (error) {
      console.error("Web3 초기화 오류:", error);
    }
  };

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert("MetaMask를 설치해주세요!");
        return;
      }

      await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = getCustomProvider();
      const signer = provider.getSigner();
      const account = await signer.getAddress();

      setProvider(provider);
      setSigner(signer);
      setCurrentAccount(account);
      setIsConnected(true);

      // 컨트랙트 인스턴스 생성
      const keyRegistry = new ethers.Contract(
        KEY_REGISTRY_ADDRESS,
        KeyRegistryABI,
        signer
      );
      const medicalRecord = new ethers.Contract(
        ENCRYPTED_MEDICAL_RECORD_ADDRESS,
        EncryptedMedicalRecordABI,
        signer
      );

      setKeyRegistryContract(keyRegistry);
      setMedicalRecordContract(medicalRecord);

      console.log("지갑 연결 성공:", account);
    } catch (error) {
      console.error("지갑 연결 오류:", error);
      alert("지갑 연결에 실패했습니다.");
    }
  };

  const checkUserRole = async () => {
    try {
      console.log("🔍 EncryptedMedical - 계정 권한 확인 시작:", currentAccount);

      if (!window.ethereum) {
        throw new Error("MetaMask가 설치되어 있지 않습니다.");
      }

      // Home.js와 동일한 방식으로 provider 생성
      const provider = new ethers.providers.Web3Provider(window.ethereum, {
        name: "hardhat",
        chainId: 31337,
        ensAddress: null, // ENS 비활성화
      });
      const signer = provider.getSigner();

      // KeyRegistry 컨트랙트 초기화 (최신 주소 사용)
      const keyRegistryAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
      console.log("📋 KeyRegistry 주소:", keyRegistryAddress);

      if (!keyRegistryAddress) {
        throw new Error("KeyRegistry 주소가 설정되지 않았습니다.");
      }

      const keyRegistryContract = new ethers.Contract(
        keyRegistryAddress,
        [
          "function isDoctor(address _user) external view returns (bool)",
          "function owner() external view returns (address)",
          "function isPublicKeyRegistered(address _user) external view returns (bool)",
        ],
        signer
      );

      // 공개키 등록 여부 확인
      const isRegistered = await keyRegistryContract.isPublicKeyRegistered(
        currentAccount
      );
      setIsPublicKeyRegistered(isRegistered);
      console.log("🔑 공개키 등록 여부:", isRegistered);

      // 의사 여부 확인
      const doctorStatus = await keyRegistryContract.isDoctor(currentAccount);
      console.log("👨‍⚕️ 의사 여부:", doctorStatus);

      // 오너 여부 확인
      const owner = await keyRegistryContract.owner();
      console.log("👑 컨트랙트 오너:", owner);
      console.log("👤 현재 계정:", currentAccount);

      const ownerStatus = owner.toLowerCase() === currentAccount.toLowerCase();
      console.log("🔑 오너 여부:", ownerStatus);

      // 최종 사용자 역할 설정
      const finalRole = ownerStatus
        ? "owner"
        : doctorStatus
        ? "doctor"
        : "patient";
      setUserRole(finalRole);

      console.log("✅ EncryptedMedical - 최종 사용자 역할:", finalRole);
    } catch (error) {
      console.error("❌ EncryptedMedical - 사용자 역할 확인 중 오류:", error);
      setUserRole("patient");
    }
  };

  const handleDoctorTabChange = (event, newValue) => {
    setDoctorTabValue(newValue);
  };

  const handlePatientTabChange = (event, newValue) => {
    setPatientTabValue(newValue);
  };

  const formatAddress = (address) => {
    if (!address) return "";
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
        alert(
          `✅ 암호화/복호화 테스트 성공!\n\n데이터 무결성: ${
            result.integrityValid ? "✅ 통과" : "❌ 실패"
          }\n\n콘솔에서 자세한 결과를 확인하세요.`
        );
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

        <Paper sx={{ p: 4, textAlign: "center" }}>
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
              background: "linear-gradient(45deg, #2e7d32 30%, #4caf50 90%)",
              color: "white",
              fontSize: "18px",
              padding: "15px 30px",
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
      <Paper sx={{ p: 2, mb: 3, backgroundColor: "#f5f5f5" }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box>
            <Typography variant="h6">
              연결된 계정: {formatAddress(currentAccount)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {currentAccount}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            {userRole && (
              <Chip
                label={
                  userRole === "doctor" || userRole === "owner"
                    ? "👨‍⚕️ 의사"
                    : "👤 환자"
                }
                color={
                  userRole === "doctor" || userRole === "owner"
                    ? "primary"
                    : "secondary"
                }
                variant="filled"
              />
            )}
            <Button onClick={handleRoleRefresh} variant="outlined" size="small">
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
        <Card sx={{ mb: 3, border: "2px solid #ff9800" }}>
          <CardContent>
            <Typography variant="h5" gutterBottom color="warning.main">
              🔑 암호화 키 등록이 필요합니다
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              시스템을 사용하기 전에 먼저 RSA 키 쌍을 생성하고 공개키를
              등록해주세요.
            </Typography>
            <KeyGeneration
              keyRegistryContract={keyRegistryContract}
              currentAccount={currentAccount}
            />
          </CardContent>
        </Card>
      )}

      {/* 의사 인터페이스 */}
      {(() => {
        console.log("🔍 의사 인터페이스 조건 확인:");
        console.log("  - userRole:", userRole);
        console.log("  - userRole === 'doctor':", userRole === "doctor");
        console.log("  - userRole === 'owner':", userRole === "owner");
        console.log("  - isPublicKeyRegistered:", isPublicKeyRegistered);
        return userRole === "doctor" || userRole === "owner";
      })() && (
        <Paper sx={{ mb: 3 }}>
          <Box
            sx={{
              p: 2,
              backgroundColor: "#e3f2fd",
              borderBottom: 1,
              borderColor: "divider",
            }}
          >
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
              환자 주소를 입력하여 신규 환자 등록 또는 기존 환자의 진료기록을
              추가할 수 있습니다.
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
      {(() => {
        console.log("🔍 환자 인터페이스 조건 확인:");
        console.log("  - userRole:", userRole);
        console.log("  - userRole === 'patient':", userRole === "patient");
        return userRole === "patient";
      })() && (
        <Paper sx={{ mb: 3 }}>
          <Box
            sx={{
              p: 2,
              backgroundColor: "#e8f5e8",
              borderBottom: 1,
              borderColor: "divider",
            }}
          >
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
              개인키를 업로드하여 본인의 암호화된 진료기록을 복호화하여 조회할
              수 있습니다.
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
      <Box sx={{ mt: 4, p: 3, backgroundColor: "#f9f9f9", borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          📖 시스템 사용 방법
        </Typography>
        <Typography variant="body2" component="div">
          <Box component="div" sx={{ mb: 2 }}>
            <strong>👨‍⚕️ 의사 권한:</strong>
            <ul>
              <li>RSA 키 쌍 생성 및 공개키 등록 (의사로 등록)</li>
              <li>환자 주소로 조회하여 공개키 등록 여부 확인</li>
              <li>
                신규 환자: 기본정보(이름, 키, 몸무게, 혈액형, 주민번호) +
                진료기록 작성
              </li>
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
          ⚠️ <strong>중요:</strong> 개인키는 절대 타인에게 공개하지 마세요.
          개인키를 분실하면 데이터를 복구할 수 없습니다.
        </Typography>
      </Box>
    </Container>
  );
};

export default EncryptedMedical;
