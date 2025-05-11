import React, { useState, useEffect } from "react";
import {
  getMyPendingRequests,
  respondToVerification,
  generateBloodTypeProof,
  getPatientData,
  submitProof,
  getCurrentAccount,
} from "../utils/medicalVerificationService";
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  Card,
  CardContent,
  CardActions,
  Divider,
  CircularProgress,
  Chip,
  Grid,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

// 혈액형 코드를 텍스트로 변환
const getBloodTypeName = (code) => {
  const types = {
    1: "A형",
    2: "B형",
    3: "AB형",
    4: "O형",
  };
  return types[code] || "알 수 없음";
};

/**
 * 환자의 대기 중인 요청 목록 및 응답 컴포넌트
 */
const PendingRequests = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessages, setStatusMessages] = useState({});
  const [actualData, setActualData] = useState({});
  const [globalAlert, setGlobalAlert] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [resultDialog, setResultDialog] = useState({
    open: false,
    title: "",
    message: "",
    severity: "success",
  });

  // 페이지 로드 시 대기 중인 요청 조회
  useEffect(() => {
    fetchPendingRequests();
  }, []);

  // 대기 중인 요청 목록 조회
  const fetchPendingRequests = async () => {
    setIsLoading(true);
    setGlobalAlert(null);

    try {
      const result = await getMyPendingRequests();
      if (result.success) {
        setPendingRequests(result.requests);

        // 각 요청 유형에 대한 실제 데이터 로드
        const dataMap = {};
        // 현재 로그인한 사용자(환자) 주소 가져오기
        const patientAddress = await getCurrentAccount();
        
        for (const request of result.requests) {
          if (request.verificationType === "bloodType") {
            try {
              // 환자 본인의 데이터 가져오기 (request.requester가 아님)
              const dataResult = await getPatientData(
                patientAddress, // 환자 본인 주소 사용
                "bloodType"
              );
              if (dataResult.success) {
                dataMap[`${request.verificationType}_${request.requestId}`] =
                  dataResult.value;
              }
            } catch (e) {
              console.error("환자 데이터 로드 오류:", e);
              // 개별 데이터 로드 실패는 무시하고 계속 진행
            }
          }
        }
        setActualData(dataMap);

        if (result.requests.length === 0) {
          setGlobalAlert({
            severity: "info",
            message: result.message || "대기 중인 요청이 없습니다.",
          });
        }
      } else {
        setGlobalAlert({
          severity: "warning",
          message: result.message || "요청 목록을 불러오는 데 실패했습니다.",
        });
      }
    } catch (error) {
      console.error("요청 조회 오류:", error);
      setGlobalAlert({
        severity: "error",
        message: "서버 연결 오류가 발생했습니다. 다시 시도해주세요.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 요청 응답 처리 (승인/거부)
  const handleResponse = async (requestId, isApprove) => {
    try {
      setIsLoading(true);
      setGlobalAlert(null);

      const request = pendingRequests.find(
        (req) => req.requestId === requestId
      );
      if (!request) {
        throw new Error("요청을 찾을 수 없습니다.");
      }

      setStatusMessages((prev) => ({
        ...prev,
        [requestId]: {
          text: isApprove ? "승인 중..." : "거부 중...",
          severity: "info",
        },
      }));

      const response = isApprove
        ? await respondToVerification(requestId, true)
        : await respondToVerification(requestId, false);

      if (!response.success) {
        throw new Error(response.message || "요청 처리 중 오류가 발생했습니다.");
      }

      // 승인된 경우에만 증명 생성 및 제출 진행
      if (isApprove) {
        setStatusMessages((prev) => ({
          ...prev,
          [requestId]: { text: "증명 생성 중...", severity: "info" },
        }));
        
        // 요청 유형에 따른 처리
        if (request.verificationType === "bloodType") {
          try {
            // 환자 데이터 가져오기
            const bloodTypeCode = actualData[`bloodType_${requestId}`] || 0;
            
            if (bloodTypeCode <= 0) {
              throw new Error("환자 혈액형 데이터를 찾을 수 없습니다.");
            }
            
            // 증명 생성
            const proofResult = await generateBloodTypeProof(
              bloodTypeCode, // 실제 혈액형
              request.requestedValue // 요청자가 추측한 혈액형
            );
            
            if (!proofResult.success) {
              throw new Error(proofResult.message || "증명 생성에 실패했습니다.");
            }
            
            setStatusMessages((prev) => ({
              ...prev,
              [requestId]: { text: "증명 제출 중...", severity: "info" },
            }));
            
            // 증명 제출
            const submitResult = await submitProof(
              await getCurrentAccount(), // 환자 주소
              requestId, 
              proofResult.proofData
            );
            
            if (!submitResult.success) {
              throw new Error(submitResult.message || "증명 제출에 실패했습니다.");
            }
            
            // 증명 생성 및 제출 결과 설정
            setResultDialog({
              open: true,
              title: "요청 승인 및 증명 완료",
              message: "요청을 승인하고 ZK 증명이 성공적으로 생성되었습니다. 요청자가 이제 결과를 확인할 수 있습니다.",
              severity: "success",
            });
          } catch (proofError) {
            console.error("증명 생성 오류:", proofError);
            // 증명 생성 실패 메시지 표시 (하지만 승인은 이미 완료됨)
            setResultDialog({
              open: true,
              title: "요청 승인 완료 (증명 생성 실패)",
              message: `요청은 승인되었지만 증명 생성에 실패했습니다: ${proofError.message}`,
              severity: "warning",
            });
          }
        } else {
          // 다른 유형의 요청 처리
          setResultDialog({
            open: true,
            title: "요청 승인 완료",
            message: "요청이 성공적으로 승인되었습니다.",
            severity: "success",
          });
        }
      } else {
        // 요청 거부 처리
        setResultDialog({
          open: true,
          title: "요청 거부 완료",
          message: "요청이 성공적으로 거부되었습니다.",
          severity: "info",
        });
      }

      // 요청 목록 새로고침
      await fetchPendingRequests();
    } catch (error) {
      console.error("요청 처리 오류:", error);
      setGlobalAlert({
        severity: "error",
        message: error.message || "요청 처리 중 오류가 발생했습니다.",
      });
    } finally {
      setIsLoading(false);
      // 상태 메시지 초기화 (나중에 모든 요청 처리 후)
      setTimeout(() => {
        setStatusMessages((prev) => {
          const newMessages = { ...prev };
          delete newMessages[requestId];
          return newMessages;
        });
      }, 3000);
    }
  };

  // Snackbar 핸들러 대신 다이얼로그 핸들러 추가
  const handleCloseDialog = () => {
    setResultDialog((prev) => ({
      ...prev,
      open: false,
    }));
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 700, mx: "auto", mt: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        대기 중인 검증 요청
      </Typography>

      {globalAlert && (
        <Alert severity={globalAlert.severity} sx={{ my: 2 }}>
          {globalAlert.message}
        </Alert>
      )}

      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Button
          variant="contained"
          color="primary"
          startIcon={<RefreshIcon />}
          onClick={fetchPendingRequests}
          disabled={isLoading}
        >
          {isLoading ? "불러오는 중..." : "새로고침"}
        </Button>

        {isLoading && <CircularProgress size={24} sx={{ ml: 2 }} />}
      </Box>

      {pendingRequests.length === 0 && !isLoading ? (
        <Box sx={{ py: 4, textAlign: "center" }}>
          {globalAlert ? null : (
            <Typography>대기 중인 요청이 없습니다.</Typography>
          )}
        </Box>
      ) : (
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            {pendingRequests.map((request) => (
              <Grid item xs={12} key={request.requestId}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      요청 #{request.requestId}
                    </Typography>

                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        요청자
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ wordBreak: "break-all" }}
                      >
                        {request.requester}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        검증 유형
                      </Typography>
                      <Chip
                        label={
                          request.verificationType === "bloodType"
                            ? "혈액형"
                            : request.verificationType
                        }
                        color="primary"
                        size="small"
                        sx={{ mt: 0.5 }}
                      />
                    </Box>

                    {request.verificationType === "bloodType" && (
                      <>
                        <Divider sx={{ my: 1.5 }} />
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              추측 혈액형
                            </Typography>
                            <Typography variant="body1">
                              {getBloodTypeName(request.requestedValue)}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">
                              실제 혈액형
                            </Typography>
                            <Typography variant="body1">
                              {getBloodTypeName(
                                actualData[`bloodType_${request.requestId}`] ||
                                  0
                              )}
                            </Typography>
                          </Grid>
                        </Grid>
                      </>
                    )}

                    {statusMessages[request.requestId] && (
                      <Alert
                        severity={statusMessages[request.requestId].severity}
                        sx={{ mt: 2 }}
                      >
                        {statusMessages[request.requestId].text}
                      </Alert>
                    )}
                  </CardContent>

                  {!statusMessages[request.requestId] && (
                    <CardActions sx={{ px: 2, pb: 2 }}>
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<CheckCircleIcon />}
                        onClick={() => handleResponse(request.requestId, true)}
                        sx={{ mr: 1 }}
                      >
                        승인
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        startIcon={<CancelIcon />}
                        onClick={() => handleResponse(request.requestId, false)}
                      >
                        거부
                      </Button>
                    </CardActions>
                  )}
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      <Divider sx={{ my: 2 }} />

      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          승인을 선택하면 자동으로 영지식 증명을 생성하여 검증 결과를 요청자에게
          전송합니다. 이 과정에서 실제 의료 데이터가 직접 공개되지 않습니다.
        </Typography>
      </Box>

      {/* 증명 결과 다이얼로그 */}
      <Dialog
        open={resultDialog.open}
        onClose={handleCloseDialog}
        aria-labelledby="result-dialog-title"
        aria-describedby="result-dialog-description"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="result-dialog-title">{resultDialog.title}</DialogTitle>
        <DialogContent>
          <Alert severity={resultDialog.severity} sx={{ mb: 2 }}>
            {resultDialog.message}
          </Alert>
          <DialogContentText id="result-dialog-description">
            {resultDialog.severity === "success"
              ? "영지식 증명을 통해 데이터를 검증했습니다. 실제 데이터는 공개되지 않았습니다."
              : "증명 과정에 문제가 발생했습니다. 다시 시도하거나 관리자에게 문의하세요."}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} variant="contained" autoFocus>
            확인
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default PendingRequests;
