import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Card,
  CardContent,
  Grid,
  Snackbar,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Chip,
  Paper,
} from "@mui/material";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import PersonIcon from "@mui/icons-material/Person";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import {
  connectWallet,
  isDoctor,
  addMedicalRecord,
  getAllMedicalRecords,
  addDoctor,
  removeDoctor,
  getContractOwner,
  isOwner,
  getEncryptedMedicalRecordContract,
} from "../utils/contracts";
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';

const Home = () => {
  const [currentAccount, setCurrentAccount] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [userRole, setUserRole] = useState(null); // 'doctor' | 'patient' | 'owner' | null
  const [isOwnerAccount, setIsOwnerAccount] = useState(false);
  const [patientAddress, setPatientAddress] = useState("");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  // 의료기록 추가 관련 상태
  const [addRecordDialogOpen, setAddRecordDialogOpen] = useState(false);
  const [newRecord, setNewRecord] = useState({
    diagnosis: "",
    prescription: "",
    notes: "",
    date: "",
  });

  // 의사 관리 관련 상태
  const [doctorManagementOpen, setDoctorManagementOpen] = useState(false);
  const [newDoctorAddress, setNewDoctorAddress] = useState("");
  const [removeDoctorAddress, setRemoveDoctorAddress] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    checkExistingConnection();
  }, []);

  const checkExistingConnection = async () => {
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setCurrentAccount(accounts[0]);
          setIsConnected(true);
          await checkUserRole(accounts[0]);
        }
      }
    } catch (error) {
      console.error("연결 상태 확인 중 오류:", error);
    }
  };

  const checkUserRole = async (account) => {
    try {
      console.log('🔍 계정 권한 확인 시작:', account);
      
      if (!window.ethereum) {
        throw new Error("MetaMask가 설치되어 있지 않습니다.");
      }

      // contracts.js의 함수 사용 (ENS 에러 없음)
      const doctorStatus = await isDoctor(account);
      console.log('👨‍⚕️ 의사 여부:', doctorStatus);
      
      // 오너 여부 확인
      const owner = await getContractOwner();
      console.log('👑 컨트랙트 오너:', owner);
      console.log('👤 현재 계정:', account);
      
      const ownerStatus = owner.toLowerCase() === account.toLowerCase();
      console.log('🔑 오너 여부:', ownerStatus);
      
      setIsOwnerAccount(ownerStatus);
      setUserRole(ownerStatus ? 'owner' : (doctorStatus ? 'doctor' : 'patient'));
      
      console.log('✅ 최종 사용자 역할:', ownerStatus ? 'owner' : (doctorStatus ? 'doctor' : 'patient'));
    } catch (error) {
      console.error('❌ 사용자 역할 확인 중 오류:', error);
      setIsOwnerAccount(false);
      setUserRole('patient');
    }
  };

  const handleConnectWallet = async () => {
    try {
      const account = await connectWallet();
      setCurrentAccount(account);
      setIsConnected(true);
      await checkUserRole(account);
    } catch (error) {
      console.error("지갑 연결 중 오류:", error);
      showAlert("지갑 연결 중 오류가 발생했습니다.", "error");
    }
  };

  // 알림 표시
  const showAlert = (message, severity) => {
    setAlert({ open: true, message, severity });
    // 3초 후 자동으로 닫기
    setTimeout(() => {
      setAlert((prev) => ({ ...prev, open: false }));
    }, 3000);
  };

  // 알림 닫기
  const handleCloseAlert = () => {
    setAlert({ ...alert, open: false });
  };

  // 의료 기록 추가
  const handleAddRecord = async () => {
    if (!patientAddress || !newRecord.diagnosis) {
      showAlert("환자 주소와 진단 내용을 입력해주세요.", "error");
      return;
    }

    try {
      setLoading(true);
      const recordData = {
        ...newRecord,
        timestamp: new Date().toISOString(),
        doctor: currentAccount,
      };

      await addMedicalRecord(patientAddress, recordData);
      showAlert("의료 기록이 성공적으로 추가되었습니다.", "success");

      // 폼 초기화
      setPatientAddress("");
      setNewRecord({ diagnosis: "", prescription: "", notes: "", date: "" });
      setAddRecordDialogOpen(false);
    } catch (error) {
      console.error("의료 기록 추가 중 오류:", error);
      showAlert("의료 기록 추가에 실패했습니다.", "error");
    } finally {
      setLoading(false);
    }
  };

  // 환자의 모든 의료 기록 조회
  const handleGetRecords = async () => {
    if (!patientAddress) {
      showAlert("환자 주소를 입력해주세요.", "error");
      return;
    }

    try {
      setLoading(true);
      const patientRecords = await getAllMedicalRecords(patientAddress);
      setRecords(patientRecords);

      if (patientRecords.length === 0) {
        showAlert("해당 환자의 의료 기록이 없습니다.", "info");
      } else {
        showAlert(
          `${patientRecords.length}개의 의료 기록을 조회했습니다.`,
          "success"
        );
      }
    } catch (error) {
      console.error("의료 기록 조회 중 오류:", error);

      if (error.message === "permission_denied") {
        showAlert(
          "권한이 없습니다. 환자 본인 또는 의사만 조회할 수 있습니다.",
          "error"
        );
        setRecords([]); // 권한이 없는 경우 기록 목록 초기화
      } else {
        showAlert("의료 기록 조회에 실패했습니다.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  // 의사 추가
  const handleAddDoctor = async () => {
    if (!newDoctorAddress) {
      showAlert("의사 주소를 입력해주세요.", "error");
      return;
    }

    try {
      setLoading(true);
      await addDoctor(newDoctorAddress);
      showAlert("의사가 성공적으로 등록되었습니다.", "success");
      setNewDoctorAddress("");
      setDoctorManagementOpen(false);
    } catch (error) {
      console.error("의사 등록 중 오류:", error);
      showAlert("의사 등록에 실패했습니다.", "error");
    } finally {
      setLoading(false);
    }
  };

  // 의사 제거
  const handleRemoveDoctor = async () => {
    if (!removeDoctorAddress) {
      showAlert("제거할 의사 주소를 입력해주세요.", "error");
      return;
    }

    try {
      setLoading(true);
      await removeDoctor(removeDoctorAddress);
      showAlert("의사가 성공적으로 제거되었습니다.", "success");
      setRemoveDoctorAddress("");
    } catch (error) {
      console.error("의사 제거 중 오류:", error);
      showAlert("의사 제거에 실패했습니다. Owner 권한이 필요합니다.", "error");
    } finally {
      setLoading(false);
    }
  };

  // 의사 상태 강제 재확인
  const handleRefreshDoctorStatus = async () => {
    try {
      setLoading(true);
      console.log("🔄 의사 상태 강제 재확인 중...");

      const currentAccount = this.currentAccount || window.ethereum.selectedAddress;
      if (!currentAccount) {
        showAlert("지갑을 먼저 연결해주세요.", "error");
        return;
      }

      const doctorStatus = await isDoctor(currentAccount);
      console.log("🔄 재확인 결과:", doctorStatus);
      setUserRole(doctorStatus ? 'doctor' : 'patient');

      if (doctorStatus) {
        showAlert("✅ 의사 계정으로 확인되었습니다!", "success");
      } else {
        showAlert("❌ 의사 계정이 아닙니다.", "warning");
      }
    } catch (error) {
      console.error("의사 상태 재확인 중 오류:", error);
      showAlert("상태 확인 중 오류가 발생했습니다.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Typography 
          variant="h2" 
          component="h1" 
          gutterBottom 
          align="center"
          sx={{ 
            fontWeight: 700,
            color: '#1a5f7a',
            mb: 3
          }}
        >
          안전한 의료정보 관리 시스템
        </Typography>
        <Typography 
          variant="h5" 
          align="center" 
          color="text.secondary"
          sx={{ mb: 6 }}
        >
          블록체인 기반 암호화로 안전하게 보호되는 의료정보
        </Typography>

        {!isConnected ? (
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleConnectWallet}
              sx={{
                backgroundColor: '#2E7D32',
                '&:hover': {
                  backgroundColor: '#1b5e20',
                },
              }}
            >
              MetaMask 연결하기
            </Button>
          </Box>
        ) : (
          <Paper 
            elevation={3} 
            sx={{ 
              p: 4, 
              mt: 4, 
              backgroundColor: 'rgba(46, 125, 50, 0.1)',
              borderRadius: 2
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              {isOwnerAccount && (
                <Chip 
                  label="관리자" 
                  color="secondary" 
                  variant="outlined" 
                  sx={{ ml: 'auto' }}
                />
              )}
              {(userRole === 'doctor' || isOwnerAccount) && (
                <>
                  <LocalHospitalIcon color="primary" sx={{ fontSize: 30 }} />
                  <Typography variant="h6">
                    의사 계정으로 로그인되었습니다
                  </Typography>
                  <Chip 
                    label="의사" 
                    color="primary" 
                    variant="outlined" 
                    sx={{ ml: 'auto' }}
                  />
                </>
              )}
              {userRole === 'patient' && !isOwnerAccount && (
                <>
                  <PersonIcon color="secondary" sx={{ fontSize: 30 }} />
                  <Typography variant="h6">
                    환자 계정으로 로그인되었습니다
                  </Typography>
                  <Chip 
                    label="환자" 
                    color="secondary" 
                    variant="outlined" 
                    sx={{ ml: 'auto' }}
                  />
                </>
              )}
            </Box>
            <Typography variant="body1" gutterBottom>
              연결된 계정: {currentAccount}
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              {userRole === 'doctor' 
                ? '환자의 의료기록을 생성하고 관리할 수 있습니다.' 
                : '본인의 의료기록을 안전하게 확인할 수 있습니다.'}
            </Typography>
            <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => navigate('/encrypted')}
                fullWidth
              >
                의료기록 관리로 이동
              </Button>
              
              {isOwnerAccount && (
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => setDoctorManagementOpen(true)}
                  startIcon={<AdminPanelSettingsIcon />}
                  fullWidth
                >
                  의사 등록하기
                </Button>
              )}
            </Box>
          </Paper>
        )}
      </Box>

      {/* 의사 등록 다이얼로그 */}
      <Dialog 
        open={doctorManagementOpen} 
        onClose={() => setDoctorManagementOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>새로운 의사 등록</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              등록할 의사의 지갑 주소를 입력해주세요.
            </Typography>
            <TextField
              autoFocus
              margin="dense"
              label="의사 지갑 주소"
              type="text"
              fullWidth
              variant="outlined"
              value={newDoctorAddress}
              onChange={(e) => setNewDoctorAddress(e.target.value)}
              placeholder="0x..."
              helperText="올바른 이더리움 주소를 입력해주세요"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDoctorManagementOpen(false)}>
            취소
          </Button>
          <Button 
            onClick={handleAddDoctor} 
            variant="contained" 
            color="primary"
            disabled={!newDoctorAddress || newDoctorAddress.length !== 42}
          >
            등록하기
          </Button>
        </DialogActions>
      </Dialog>

      {/* 알림 스낵바 */}
      <Snackbar 
        open={alert.open} 
        autoHideDuration={6000} 
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseAlert} 
          severity={alert.severity}
          sx={{ width: '100%' }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Home;
