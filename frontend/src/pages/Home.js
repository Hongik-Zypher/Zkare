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
} from "../utils/contracts";

const Home = () => {
  const [account, setAccount] = useState("");
  const [isUserDoctor, setIsUserDoctor] = useState(false);
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

  useEffect(() => {
    // 페이지 로드 시 연결된 계정 확인
    checkExistingConnection();
  }, []);

  const checkExistingConnection = async () => {
    try {
      if (window.ethereum && window.ethereum.selectedAddress) {
        console.log("🔍 기존 연결 확인 중...");
        const account = window.ethereum.selectedAddress;
        setAccount(account);

        console.log("👨‍⚕️ 의사 상태 확인 중...");
        const doctorStatus = await isDoctor(account);
        console.log("👨‍⚕️ 의사 상태 결과:", doctorStatus);
        setIsUserDoctor(doctorStatus);

        if (doctorStatus) {
          showAlert("의사 계정으로 로그인되었습니다!", "success");
        } else {
          showAlert("일반 사용자로 로그인되었습니다.", "info");
        }
      }
    } catch (error) {
      console.error("기존 연결 확인 중 오류:", error);
      showAlert("연결 확인 중 오류가 발생했습니다.", "error");
    }
  };

  // 지갑 연결
  const handleConnectWallet = async () => {
    try {
      setLoading(true);
      const account = await connectWallet();
      setAccount(account);

      // 의사 여부 확인
      const doctorStatus = await isDoctor(account);
      setIsUserDoctor(doctorStatus);

      showAlert("지갑이 성공적으로 연결되었습니다.", "success");
    } catch (error) {
      console.error("지갑 연결 중 오류:", error);
      showAlert(`지갑 연결에 실패했습니다: ${error.message}`, "error");
    } finally {
      setLoading(false);
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
        doctor: account,
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
      showAlert("의료 기록 조회에 실패했습니다.", "error");
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
      showAlert("의사가 성공적으로 추가되었습니다.", "success");
      setNewDoctorAddress("");
    } catch (error) {
      console.error("의사 추가 중 오류:", error);
      showAlert("의사 추가에 실패했습니다. Owner 권한이 필요합니다.", "error");
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

      const currentAccount = account || window.ethereum.selectedAddress;
      if (!currentAccount) {
        showAlert("지갑을 먼저 연결해주세요.", "error");
        return;
      }

      const doctorStatus = await isDoctor(currentAccount);
      console.log("🔄 재확인 결과:", doctorStatus);
      setIsUserDoctor(doctorStatus);

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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* 헤더 */}
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          🏥 Zkare 의료기록 관리 시스템
        </Typography>
        <Typography variant="h6" color="text.secondary">
          블록체인 기반의 안전한 의료기록 관리
        </Typography>
      </Box>

      {/* 알림 */}
      <Dialog
        open={alert.open}
        onClose={handleCloseAlert}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            position: "fixed",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            margin: 0,
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
            overflow: "hidden",
          },
        }}
        TransitionProps={{
          onExited: () => setAlert({ ...alert, open: false }),
        }}
      >
        <Alert
          onClose={handleCloseAlert}
          severity={alert.severity}
          variant="filled"
          sx={{
            width: "100%",
            padding: "12px 16px",
            "& .MuiAlert-message": {
              fontSize: "0.95rem",
              fontWeight: 500,
            },
            "& .MuiAlert-icon": {
              fontSize: "1.25rem",
            },
            "& .MuiAlert-action": {
              padding: "0 0 0 12px",
            },
          }}
        >
          {alert.message}
        </Alert>
      </Dialog>

      {/* 지갑 연결 */}
      {!account ? (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ textAlign: "center" }}>
            <Typography variant="h5" gutterBottom>
              지갑을 연결해주세요
            </Typography>
            <Button
              variant="contained"
              onClick={handleConnectWallet}
              disabled={loading}
              size="large"
            >
              {loading ? <CircularProgress size={24} /> : "MetaMask 연결"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {/* 계정 정보 */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  {isUserDoctor ? (
                    <LocalHospitalIcon color="primary" />
                  ) : (
                    <PersonIcon color="secondary" />
                  )}
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6">
                      {isUserDoctor ? "의사 계정" : "일반 사용자"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {account}
                    </Typography>
                  </Box>
                  {isUserDoctor && (
                    <Chip label="의사" color="primary" variant="outlined" />
                  )}
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleRefreshDoctorStatus}
                    disabled={loading}
                    sx={{ ml: 1 }}
                  >
                    {loading ? <CircularProgress size={16} /> : "상태 재확인"}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* 의사 기능 */}
          {isUserDoctor && (
            <>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      의료 기록 추가
                    </Typography>
                    <TextField
                      fullWidth
                      label="환자 주소"
                      value={patientAddress}
                      onChange={(e) => setPatientAddress(e.target.value)}
                      margin="normal"
                      placeholder="0x..."
                    />
                    <Button
                      variant="contained"
                      onClick={() => setAddRecordDialogOpen(true)}
                      disabled={!patientAddress || loading}
                      fullWidth
                      sx={{ mt: 2 }}
                    >
                      의료 기록 추가
                    </Button>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      의사 관리
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Owner만 의사를 추가/제거할 수 있습니다
                    </Typography>
                    <Button
                      variant="outlined"
                      onClick={() => setDoctorManagementOpen(true)}
                      startIcon={<AdminPanelSettingsIcon />}
                      fullWidth
                    >
                      의사 관리
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </>
          )}

          {/* 의료 기록 조회 */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  의료 기록 조회
                </Typography>
                <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                  <TextField
                    fullWidth
                    label="환자 주소"
                    value={patientAddress}
                    onChange={(e) => setPatientAddress(e.target.value)}
                    placeholder="0x..."
                  />
                  <Button
                    variant="contained"
                    onClick={handleGetRecords}
                    disabled={!patientAddress || loading}
                  >
                    조회
                  </Button>
                </Box>

                {/* 조회된 기록 표시 */}
                {records.length > 0 && (
                  <Paper sx={{ p: 2, mt: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      의료 기록 ({records.length}개)
                    </Typography>
                    <List>
                      {records.map((record, index) => (
                        <ListItem key={index} divider>
                          <ListItemText
                            primary={`진단: ${
                              record.parsedData.diagnosis || "정보 없음"
                            }`}
                            secondary={
                              <Box>
                                <Typography variant="body2">
                                  처방:{" "}
                                  {record.parsedData.prescription ||
                                    "정보 없음"}
                                </Typography>
                                <Typography variant="body2">
                                  날짜:{" "}
                                  {new Date(
                                    parseInt(record.timestamp) * 1000
                                  ).toLocaleString()}
                                </Typography>
                                <Typography variant="body2" color="primary">
                                  담당의: {record.hospital}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 의료 기록 추가 다이얼로그 */}
      <Dialog
        open={addRecordDialogOpen}
        onClose={() => setAddRecordDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>의료 기록 추가</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="진단"
            value={newRecord.diagnosis}
            onChange={(e) =>
              setNewRecord({ ...newRecord, diagnosis: e.target.value })
            }
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="처방"
            value={newRecord.prescription}
            onChange={(e) =>
              setNewRecord({ ...newRecord, prescription: e.target.value })
            }
            margin="normal"
            multiline
            rows={2}
          />
          <TextField
            fullWidth
            label="진료 날짜"
            type="date"
            value={newRecord.date}
            onChange={(e) =>
              setNewRecord({ ...newRecord, date: e.target.value })
            }
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            fullWidth
            label="추가 메모"
            value={newRecord.notes}
            onChange={(e) =>
              setNewRecord({ ...newRecord, notes: e.target.value })
            }
            margin="normal"
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddRecordDialogOpen(false)}>취소</Button>
          <Button
            onClick={handleAddRecord}
            variant="contained"
            disabled={!newRecord.diagnosis || loading}
          >
            {loading ? <CircularProgress size={20} /> : "추가"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 의사 관리 다이얼로그 */}
      <Dialog
        open={doctorManagementOpen}
        onClose={() => setDoctorManagementOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>의사 관리</DialogTitle>
        <DialogContent>
          <Typography variant="h6" gutterBottom>
            의사 추가
          </Typography>
          <TextField
            fullWidth
            label="의사 주소"
            value={newDoctorAddress}
            onChange={(e) => setNewDoctorAddress(e.target.value)}
            margin="normal"
            placeholder="0x..."
          />
          <Button
            variant="contained"
            onClick={handleAddDoctor}
            disabled={!newDoctorAddress || loading}
            fullWidth
            sx={{ mt: 1, mb: 3 }}
          >
            의사 추가
          </Button>

          <Typography variant="h6" gutterBottom>
            의사 제거
          </Typography>
          <TextField
            fullWidth
            label="제거할 의사 주소"
            value={removeDoctorAddress}
            onChange={(e) => setRemoveDoctorAddress(e.target.value)}
            margin="normal"
            placeholder="0x..."
          />
          <Button
            variant="outlined"
            color="error"
            onClick={handleRemoveDoctor}
            disabled={!removeDoctorAddress || loading}
            fullWidth
            sx={{ mt: 1 }}
          >
            의사 제거
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDoctorManagementOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Home;
