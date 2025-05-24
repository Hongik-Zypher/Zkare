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
  Alert,
  CircularProgress,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from "@mui/material";
import { ethers } from "ethers";
import {
  connectWallet,
  isDoctor,
  addMedicalRecord,
  getMedicalRecord,
  addDoctor,
  requestAccess,
  grantAccess,
  hasAccess,
  getAccessRequests,
  revokeAccess,
} from "../utils/contracts";

const Home = () => {
  const [account, setAccount] = useState("");
  const [isUserDoctor, setIsUserDoctor] = useState(false);
  const [patientAddress, setPatientAddress] = useState("");
  const [recordId, setRecordId] = useState("");
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [alert, setAlert] = useState({
    open: false,
    message: "",
    severity: "info",
  });
  const [newDoctorAddress, setNewDoctorAddress] = useState("");
  const [addRecordDialogOpen, setAddRecordDialogOpen] = useState(false);
  const [accessRequests, setAccessRequests] = useState([]);
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [accessDuration, setAccessDuration] = useState(3600); // 1시간
  const [newRecord, setNewRecord] = useState({
    diagnosis: "",
    prescription: "",
    notes: "",
    bloodType: "",
    height: "",
    weight: "",
    allergies: "",
  });
  const [signatureStatus, setSignatureStatus] = useState(null);

  // 지갑 연결 및 의사 여부 확인
  const handleConnectWallet = async () => {
    try {
      setLoading(true);
      const account = await connectWallet();
      setAccount(account);

      // 의사 여부 확인
      const isUserDoctor = await isDoctor(account);
      setIsUserDoctor(isUserDoctor);

      setAlert({
        open: true,
        message: "지갑이 성공적으로 연결되었습니다.",
        severity: "success",
      });
    } catch (error) {
      console.error("지갑 연결 중 오류:", error);
      setAlert({
        open: true,
        message: `지갑 연결에 실패했습니다: ${error.message}`,
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // 의료 기록 추가 다이얼로그 열기
  const handleOpenAddRecordDialog = () => {
    setAddRecordDialogOpen(true);
  };

  // 의료 기록 추가 다이얼로그 닫기
  const handleCloseAddRecordDialog = () => {
    setAddRecordDialogOpen(false);
    setNewRecord({
      diagnosis: "",
      prescription: "",
      notes: "",
      bloodType: "",
      height: "",
      weight: "",
      allergies: "",
    });
  };

  // 의료 기록 추가
  const handleAddRecord = async () => {
    try {
      setLoading(true);
      const recordData = {
        patientId: patientAddress,
        ...newRecord,
        timestamp: Date.now(),
      };

      const result = await addMedicalRecord(patientAddress, recordData);
      setAlert({
        open: true,
        message: "의료 기록이 추가되었습니다.",
        severity: "success",
      });
      setPatientAddress("");
      handleCloseAddRecordDialog();
    } catch (error) {
      setError(error.message);
      setAlert({
        open: true,
        message: "의료 기록 추가에 실패했습니다.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // 의료 기록 조회
  const handleGetRecord = async () => {
    try {
      setLoading(true);
      setSignatureStatus(null);
      const record = await getMedicalRecord(patientAddress, recordId);
      setRecord(record);
      setSignatureStatus({
        isValid: true,
        message: "서명이 유효합니다.",
      });
      setAlert({
        open: true,
        message: "의료 기록을 조회했습니다.",
        severity: "success",
      });
    } catch (error) {
      setError(error.message);
      if (error.message.includes("서명 검증")) {
        setSignatureStatus({
          isValid: false,
          message: "서명이 유효하지 않습니다.",
        });
      }
      setAlert({
        open: true,
        message: "의료 기록 조회에 실패했습니다.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // 의사 추가
  const handleAddDoctor = async () => {
    try {
      setLoading(true);
      const tx = await addDoctor(newDoctorAddress);
      setAlert({
        open: true,
        message: "의사가 추가되었습니다.",
        severity: "success",
      });
      setNewDoctorAddress("");
    } catch (error) {
      setError(error.message);
      setAlert({
        open: true,
        message: "의사 추가에 실패했습니다.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // 접근 요청 목록 조회
  const handleGetAccessRequests = async () => {
    try {
      setLoading(true);
      const requests = await getAccessRequests(account);
      setAccessRequests(requests);
    } catch (error) {
      setError(error.message);
      setAlert({
        open: true,
        message: "접근 요청 목록 조회에 실패했습니다.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // 접근 요청
  const handleRequestAccess = async () => {
    try {
      setLoading(true);
      const result = await requestAccess(patientAddress, recordId);
      setAlert({
        open: true,
        message: "접근 요청이 완료되었습니다.",
        severity: "success",
      });
    } catch (error) {
      setError(error.message);
      setAlert({
        open: true,
        message: "접근 요청에 실패했습니다.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // 접근 권한 부여
  const handleGrantAccess = async (request) => {
    try {
      setLoading(true);
      const result = await grantAccess(
        request.requester,
        request.recordId,
        accessDuration,
        request.requestId
      );
      setAlert({
        open: true,
        message: "접근 권한이 부여되었습니다.",
        severity: "success",
      });
      handleGetAccessRequests(); // 목록 새로고침
    } catch (error) {
      setError(error.message);
      setAlert({
        open: true,
        message: "접근 권한 부여에 실패했습니다.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // 접근 권한 취소
  const handleRevokeAccess = async (requester, recordId) => {
    try {
      setLoading(true);
      await revokeAccess(requester, recordId);
      setAlert({
        open: true,
        message: "접근 권한이 취소되었습니다.",
        severity: "success",
      });
    } catch (error) {
      setError(error.message);
      setAlert({
        open: true,
        message: "접근 권한 취소에 실패했습니다.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // 접근 권한 확인
  const handleCheckAccess = async () => {
    try {
      setLoading(true);
      const access = await hasAccess(account, recordId);
      if (access.hasAccess) {
        setAlert({
          open: true,
          message: `접근 권한이 있습니다. (만료: ${new Date(
            access.expiresAt * 1000
          ).toLocaleString()})`,
          severity: "success",
        });
      } else {
        setAlert({
          open: true,
          message: "접근 권한이 없습니다.",
          severity: "error",
        });
      }
    } catch (error) {
      setError(error.message);
      setAlert({
        open: true,
        message: "접근 권한 확인에 실패했습니다.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          의료 기록 관리 시스템
        </Typography>

        {!account ? (
          <Button
            variant="contained"
            color="primary"
            onClick={handleConnectWallet}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : "지갑 연결하기"}
          </Button>
        ) : (
          <Box>
            <Typography variant="body1" gutterBottom>
              연결된 계정: {account}
            </Typography>
            <Typography variant="body1" gutterBottom>
              권한: {isUserDoctor ? "의사" : "일반 사용자"}
            </Typography>

            {isUserDoctor && (
              <>
                <Card sx={{ mt: 2, mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      의사 추가
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="의사 주소"
                          value={newDoctorAddress}
                          onChange={(e) => setNewDoctorAddress(e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={handleAddDoctor}
                          disabled={loading || !newDoctorAddress}
                        >
                          의사 추가
                        </Button>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                <Card sx={{ mt: 2, mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      접근 요청 관리
                    </Typography>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleGetAccessRequests}
                      disabled={loading}
                      sx={{ mb: 2 }}
                    >
                      접근 요청 목록 조회
                    </Button>
                    <List>
                      {accessRequests.map((request) => (
                        <ListItem key={request.requestId}>
                          <ListItemText
                            primary={`요청자: ${request.requester}`}
                            secondary={`기록 ID: ${
                              request.recordId
                            } | 시간: ${new Date(
                              request.timestamp * 1000
                            ).toLocaleString()}`}
                          />
                          <ListItemSecondaryAction>
                            <Button
                              variant="contained"
                              color="primary"
                              onClick={() => handleGrantAccess(request)}
                              disabled={loading}
                            >
                              권한 부여
                            </Button>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </>
            )}

            <Card sx={{ mt: 2, mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  의료 기록 관리
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="환자 주소"
                      value={patientAddress}
                      onChange={(e) => setPatientAddress(e.target.value)}
                    />
                  </Grid>
                  {isUserDoctor && (
                    <Grid item xs={12}>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleOpenAddRecordDialog}
                        disabled={loading || !patientAddress}
                      >
                        의료 기록 추가
                      </Button>
                    </Grid>
                  )}
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="기록 ID"
                      value={recordId}
                      onChange={(e) => setRecordId(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleGetRecord}
                      disabled={loading || !patientAddress || !recordId}
                    >
                      의료 기록 조회
                    </Button>
                  </Grid>
                  {!isUserDoctor && (
                    <>
                      <Grid item xs={12}>
                        <Button
                          variant="contained"
                          color="secondary"
                          onClick={handleRequestAccess}
                          disabled={loading || !patientAddress || !recordId}
                        >
                          접근 요청
                        </Button>
                      </Grid>
                      <Grid item xs={12}>
                        <Button
                          variant="contained"
                          color="info"
                          onClick={handleCheckAccess}
                          disabled={loading || !recordId}
                        >
                          접근 권한 확인
                        </Button>
                      </Grid>
                    </>
                  )}
                </Grid>
              </CardContent>
            </Card>

            {record && (
              <Card sx={{ mt: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    의료 기록 상세
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Alert
                      severity={signatureStatus?.isValid ? "success" : "error"}
                      sx={{ mb: 2 }}
                    >
                      {signatureStatus?.message}
                    </Alert>
                  </Box>
                  <Typography variant="body1">CID: {record.cid}</Typography>
                  <Typography variant="body1">
                    병원: {record.hospital}
                  </Typography>
                  <Typography variant="body1">
                    서명: {record.signature.substring(0, 20)}...
                  </Typography>
                  <Typography variant="body1">
                    시간: {new Date(record.timestamp * 1000).toLocaleString()}
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body1">
                    진단: {record.diagnosis}
                  </Typography>
                  <Typography variant="body1">
                    처방: {record.prescription}
                  </Typography>
                  <Typography variant="body1">비고: {record.notes}</Typography>
                  {record.bloodType && (
                    <Typography variant="body1">
                      혈액형: {record.bloodType}
                    </Typography>
                  )}
                  {record.height && (
                    <Typography variant="body1">
                      키: {record.height}cm
                    </Typography>
                  )}
                  {record.weight && (
                    <Typography variant="body1">
                      체중: {record.weight}kg
                    </Typography>
                  )}
                  {record.allergies && (
                    <Typography variant="body1">
                      알레르기: {record.allergies}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            )}
          </Box>
        )}

        {/* 의료 기록 추가 다이얼로그 */}
        <Dialog
          open={addRecordDialogOpen}
          onClose={handleCloseAddRecordDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>의료 기록 추가</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="진단"
                  value={newRecord.diagnosis}
                  onChange={(e) =>
                    setNewRecord({ ...newRecord, diagnosis: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="처방"
                  value={newRecord.prescription}
                  onChange={(e) =>
                    setNewRecord({ ...newRecord, prescription: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="비고"
                  multiline
                  rows={3}
                  value={newRecord.notes}
                  onChange={(e) =>
                    setNewRecord({ ...newRecord, notes: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="혈액형"
                  value={newRecord.bloodType}
                  onChange={(e) =>
                    setNewRecord({ ...newRecord, bloodType: e.target.value })
                  }
                >
                  <MenuItem value="A">A형</MenuItem>
                  <MenuItem value="B">B형</MenuItem>
                  <MenuItem value="AB">AB형</MenuItem>
                  <MenuItem value="O">O형</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="키 (cm)"
                  type="number"
                  value={newRecord.height}
                  onChange={(e) =>
                    setNewRecord({ ...newRecord, height: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="체중 (kg)"
                  type="number"
                  value={newRecord.weight}
                  onChange={(e) =>
                    setNewRecord({ ...newRecord, weight: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="알레르기"
                  value={newRecord.allergies}
                  onChange={(e) =>
                    setNewRecord({ ...newRecord, allergies: e.target.value })
                  }
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseAddRecordDialog}>취소</Button>
            <Button
              onClick={handleAddRecord}
              variant="contained"
              color="primary"
              disabled={loading || !newRecord.diagnosis}
            >
              {loading ? <CircularProgress size={24} /> : "추가"}
            </Button>
          </DialogActions>
        </Dialog>

        {alert.open && (
          <Alert
            severity={alert.severity}
            onClose={() => setAlert({ ...alert, open: false })}
            sx={{ mt: 2 }}
          >
            {alert.message}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Box>
    </Container>
  );
};

export default Home;
