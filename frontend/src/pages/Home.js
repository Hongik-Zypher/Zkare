import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Grid,
  Paper,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  CardActions,
  Snackbar,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Chip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import PersonIcon from '@mui/icons-material/Person';
import MedicalInformationIcon from '@mui/icons-material/MedicalInformation';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { 
  initVerificationService, 
  getCurrentAccount,
  registerDoctor,
  registerPatient,
  detectMetaMask,
  getDoctorsList,
  getPatientsList
} from '../utils/medicalVerificationService';

// 혈액형 코드와 이름 매핑
const BLOOD_TYPES = [
  { code: 0, name: '미등록' },
  { code: 1, name: 'A형' },
  { code: 2, name: 'B형' },
  { code: 3, name: 'AB형' },
  { code: 4, name: 'O형' }
];

// 혈액형 코드로 이름 가져오기
const getBloodTypeName = (code) => {
  const bloodType = BLOOD_TYPES.find(bt => bt.code === code);
  return bloodType ? bloodType.name : '미등록';
};

const Home = () => {
  const navigate = useNavigate();
  const [userAddress, setUserAddress] = useState('');
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSeverity, setAlertSeverity] = useState('success');
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingPatients, setLoadingPatients] = useState(false);

  useEffect(() => {
    const init = async () => {
      const hasMM = await detectMetaMask();
      setIsWalletConnected(hasMM);

      if (hasMM) {
        try {
          await initVerificationService();
          const currentAccount = await getCurrentAccount();
          setUserAddress(currentAccount);
          
          // 의사 및 환자 목록 로드
          loadDoctorsList();
          loadPatientsList();
        } catch (error) {
          console.error(error);
          setAlertMessage('블록체인 연결 중 오류가 발생했습니다: ' + error.message);
          setAlertOpen(true);
        }
      }
    };

    init();
  }, []);

  const connectWallet = async () => {
    try {
      await initVerificationService();
      const account = await getCurrentAccount();
      setUserAddress(account);
      setIsWalletConnected(true);
      showAlert('지갑이 연결되었습니다.', 'success');
    } catch (error) {
      console.error('지갑 연결 오류:', error);
      showAlert('지갑 연결에 실패했습니다. MetaMask가 설치되어 있는지 확인하세요.', 'error');
    }
  };

  const handleRegisterAsDoctor = async () => {
    if (!isWalletConnected) {
      showAlert('먼저 지갑을 연결해주세요.', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const result = await registerDoctor(userAddress);
      if (result.success) {
        showAlert(result.message, 'success');
      } else {
        showAlert(result.message, 'error');
      }
    } catch (error) {
      console.error('의사 등록 오류:', error);
      showAlert('의사 계정 등록에 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterAsPatient = async () => {
    if (!isWalletConnected) {
      showAlert('먼저 지갑을 연결해주세요.', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const result = await registerPatient(userAddress);
      if (result.success) {
        showAlert(result.message, 'success');
      } else {
        showAlert(result.message, 'error');
      }
    } catch (error) {
      console.error('환자 등록 오류:', error);
      showAlert('환자 계정 등록에 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const showAlert = (message, severity) => {
    setAlertMessage(message);
    setAlertSeverity(severity);
    setAlertOpen(true);
  };

  const handleAlertClose = () => {
    setAlertOpen(false);
  };

  // 의사 목록 로드 함수
  const loadDoctorsList = async () => {
    setLoadingDoctors(true);
    try {
      const result = await getDoctorsList();
      if (result.success) {
        setDoctors(result.doctors || []);
      } else {
        console.warn('의사 목록 로드 실패:', result.message);
        setDoctors([]);
        showAlert('의사 목록을 가져오는데 문제가 있습니다: ' + result.message, 'warning');
      }
    } catch (error) {
      console.error('의사 목록 로드 오류:', error);
      setDoctors([]);
      showAlert('의사 목록을 가져오는 중 오류가 발생했습니다', 'error');
    } finally {
      setLoadingDoctors(false);
    }
  };

  // 환자 목록 로드 함수
  const loadPatientsList = async () => {
    setLoadingPatients(true);
    try {
      const result = await getPatientsList();
      if (result.success) {
        setPatients(result.patients || []);
      } else {
        console.warn('환자 목록 로드 실패:', result.message);
        setPatients([]);
        showAlert('환자 목록을 가져오는데 문제가 있습니다: ' + result.message, 'warning');
      }
    } catch (error) {
      console.error('환자 목록 로드 오류:', error);
      setPatients([]);
      showAlert('환자 목록을 가져오는 중 오류가 발생했습니다', 'error');
    } finally {
      setLoadingPatients(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 8, mb: 5, textAlign: 'center' }}>
        <Typography variant="h2" gutterBottom component="h1" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
          ZKare
        </Typography>
        <Typography variant="h5" sx={{ mb: 4, color: 'text.secondary' }}>
          블록체인 기반 의료 정보 영지식 증명 시스템
        </Typography>
        
        {!isWalletConnected ? (
          <Button 
            variant="contained" 
            size="large" 
            onClick={connectWallet}
            sx={{ fontSize: '1.1rem', py: 1.5, px: 4, mb: 4 }}
          >
            지갑 연결하기
          </Button>
        ) : (
          <Typography variant="subtitle1" sx={{ mb: 4 }}>
            연결된 지갑: {userAddress.substring(0, 6)}...{userAddress.substring(userAddress.length - 4)}
          </Typography>
        )}
      </Box>

      <Grid container spacing={4} sx={{ mb: 8 }}>
        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <LocalHospitalIcon color="primary" sx={{ fontSize: 40, mr: 2 }} />
                <Typography variant="h5" component="h2">
                  의사 계정 등록
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ mb: 3 }}>
                의사 또는 병원으로 등록하여 환자 의료 데이터를 관리하고 등록할 수 있습니다.
                승인 후에는 의료 정보를 안전하게 기록하고 접근할 수 있습니다.
              </Typography>
            </CardContent>
            <CardActions sx={{ px: 2, pb: 2 }}>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleRegisterAsDoctor}
                startIcon={<PersonAddIcon />}
                fullWidth
                disabled={isLoading || !isWalletConnected}
              >
                의사로 등록하기
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PersonIcon color="primary" sx={{ fontSize: 40, mr: 2 }} />
                <Typography variant="h5" component="h2">
                  환자 계정 등록
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ mb: 3 }}>
                환자로 등록하여 자신의 의료 데이터를 관리하고 영지식 증명을 통해 
                필요한 정보만 선택적으로 공유할 수 있습니다. 개인정보를 안전하게 보호하세요.
              </Typography>
            </CardContent>
            <CardActions sx={{ px: 2, pb: 2 }}>
              <Button 
                variant="contained" 
                color="secondary"
                onClick={handleRegisterAsPatient}
                startIcon={<PersonAddIcon />}
                fullWidth
                disabled={isLoading || !isWalletConnected}
              >
                환자로 등록하기
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>

      <Divider sx={{ mb: 6 }} />

      <Box sx={{ mb: 8 }}>
        <Typography variant="h4" gutterBottom align="center" sx={{ mb: 4 }}>
          ZKare의 주요 특징
        </Typography>
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Paper elevation={2} sx={{ p: 3, height: '100%', borderTop: '4px solid #2e7d32' }}>
              <Typography variant="h6" gutterBottom>
                🔒 프라이버시 보호
              </Typography>
              <Typography variant="body1">
                영지식 증명(ZK Proofs)을 통해 실제 개인 의료 데이터를 공개하지 않고도
                필요한 사항만 선택적으로 증명할 수 있습니다.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper elevation={2} sx={{ p: 3, height: '100%', borderTop: '4px solid #2e7d32' }}>
              <Typography variant="h6" gutterBottom>
                ⛓️ 블록체인 기반 보안
              </Typography>
              <Typography variant="body1">
                의료 정보 접근 승인 내역과 증명 기록이 블록체인에 안전하게 저장되어
                투명하고 변조 불가능한 이력 관리가 가능합니다.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper elevation={2} sx={{ p: 3, height: '100%', borderTop: '4px solid #2e7d32' }}>
              <Typography variant="h6" gutterBottom>
                🔍 선택적 공개
              </Typography>
              <Typography variant="body1">
                환자가 원하는 의료 정보만 선택적으로 승인하고 공개할 수 있어
                개인정보 자기결정권을 강화합니다.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ mb: 8, textAlign: 'center' }}>
        <Button 
          variant="outlined" 
          size="large" 
          color="primary"
          onClick={() => navigate('/demo')}
          startIcon={<MedicalInformationIcon />}
          sx={{ fontSize: '1rem', py: 1, px: 3 }}
        >
          데모 체험하기
        </Button>
      </Box>

      <Box mt={6}>
        <Typography variant="h4" component="h2" gutterBottom>
          시스템 현황
        </Typography>
        <Divider sx={{ mb: 3 }} />
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">
                  등록된 의사 목록 ({doctors.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {loadingDoctors ? (
                  <Box display="flex" justifyContent="center" p={2}>
                    <CircularProgress />
                  </Box>
                ) : doctors.length === 0 ? (
                  <Alert severity="info">등록된 의사가 없습니다.</Alert>
                ) : (
                  <Paper variant="outlined">
                    <List dense>
                      {doctors.map((doctor, index) => (
                        <ListItem key={index} divider={index < doctors.length - 1}>
                          <ListItemText 
                            primary={`${doctor.address.substring(0, 8)}...${doctor.address.substring(36)}`}
                            secondary={doctor.isActive ? '활성 상태' : '비활성 상태'}
                          />
                          <Chip 
                            label={doctor.isActive ? '활성' : '비활성'} 
                            color={doctor.isActive ? 'success' : 'default'} 
                            size="small" 
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                )}
                <Box mt={2} textAlign="right">
                  <Button 
                    size="small" 
                    onClick={loadDoctorsList} 
                    disabled={loadingDoctors}
                  >
                    {loadingDoctors ? <CircularProgress size={20} /> : '새로 고침'}
                  </Button>
                </Box>
              </AccordionDetails>
            </Accordion>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">
                  등록된 환자 목록 ({patients.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {loadingPatients ? (
                  <Box display="flex" justifyContent="center" p={2}>
                    <CircularProgress />
                  </Box>
                ) : patients.length === 0 ? (
                  <Alert severity="info">등록된 환자가 없습니다.</Alert>
                ) : (
                  <Paper variant="outlined">
                    <List dense>
                      {patients.map((patient, index) => (
                        <ListItem key={index} divider={index < patients.length - 1}>
                          <ListItemText 
                            primary={`${patient.address.substring(0, 8)}...${patient.address.substring(36)}`}
                            secondary={
                              <>
                                {`저장된 기록: ${patient.recordCount || 0}개`}
                                <br />
                                {`혈액형: ${getBloodTypeName(patient.bloodType)}`}
                              </>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                )}
                <Box mt={2} textAlign="right">
                  <Button 
                    size="small" 
                    onClick={loadPatientsList} 
                    disabled={loadingPatients}
                  >
                    {loadingPatients ? <CircularProgress size={20} /> : '새로 고침'}
                  </Button>
                </Box>
              </AccordionDetails>
            </Accordion>
          </Grid>
        </Grid>
      </Box>

      <Snackbar open={alertOpen} autoHideDuration={6000} onClose={handleAlertClose}>
        <Alert onClose={handleAlertClose} severity={alertSeverity} sx={{ width: '100%' }}>
          {alertMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Home; 