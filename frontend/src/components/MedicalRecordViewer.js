import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  Paper,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  Stack,
} from "@mui/material";
import {
  VpnKey as KeyIcon,
  Upload as UploadIcon,
  Delete as DeleteIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  VerifiedUser as VerifiedIcon,
  Person as PersonIcon,
  LocalHospital as HospitalIcon,
  Image as ImageIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import {
  isDoctor as checkIsDoctor,
  isPublicKeyRegistered as checkIsPublicKeyRegistered,
  getEncryptedMedicalRecordContract,
  getPatientInfoWithIPFS,
  getMedicalRecordWithIPFS,
  verifyEncryptionStatus,
} from "../utils/contracts";
import { base64ToDataURL } from "../utils/imageUtils";
import { COLORS } from "../utils/constants";

// 마스터 계정 주소 (환경 변수에서 읽기)
const MASTER_AUTHORITY_ADDRESS = process.env.REACT_APP_MASTER_AUTHORITY_ADDRESS || "0xBcd4042DE499D14e55001CcbB24a551F3b954096";

const MedicalRecordViewer = ({
  keyRegistryContract,
  medicalRecordContract,
  currentAccount,
}) => {
  const [records, setRecords] = useState([]);
  const [patientInfo, setPatientInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [privateKey, setPrivateKey] = useState("");
  const [isDoctor, setIsDoctor] = useState(false);
  const [isMasterAuthority, setIsMasterAuthority] = useState(false); // 마스터 계정 여부
  const [selectedPatient, setSelectedPatient] = useState("");
  const [decryptedRecords, setDecryptedRecords] = useState([]);
  const [hasPublicKey, setHasPublicKey] = useState(true);
  const [checkingKey, setCheckingKey] = useState(true);
  const [encryptionStatus, setEncryptionStatus] = useState({});
  const [checkingEncryption, setCheckingEncryption] = useState({});

  useEffect(() => {
    checkUserStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAccount]);

  const checkUserStatus = async () => {
    if (!currentAccount) {
      setCheckingKey(false);
      return;
    }

    setCheckingKey(true);
    try {
      console.log("🔍 사용자 상태 확인 중...", currentAccount);
      console.log("🔍 마스터 계정 주소:", MASTER_AUTHORITY_ADDRESS);

      // 먼저 마스터 계정인지 확인 (공개키 등록 여부와 무관하게)
      const currentAccountLower = currentAccount ? currentAccount.toLowerCase() : "";
      const masterAddressLower = MASTER_AUTHORITY_ADDRESS.toLowerCase();
      const isMaster = currentAccountLower === masterAddressLower;
      
      console.log("🔍 주소 비교:", {
        currentAccount: currentAccountLower,
        masterAddress: masterAddressLower,
        isMatch: isMaster
      });
      
      setIsMasterAuthority(isMaster);
      
      if (isMaster) {
        console.log("✅ 마스터 계정 감지됨!");
        // 마스터 계정이면 바로 의사 권한으로 설정
        setIsDoctor(true);
        setHasPublicKey(true); // 마스터 계정은 공개키 등록 여부와 무관하게 접근 가능
        console.log("👤 사용자 역할: 마스터 계정 (의사 권한으로 취급)");
        console.log("✅ isDoctor = true로 설정됨");
        setCheckingKey(false);
        return;
      } else {
        console.log("ℹ️ 일반 사용자 계정");
      }

      // 일반 사용자의 경우 공개키 등록 여부 확인
      const keyRegistered = await checkIsPublicKeyRegistered(currentAccount);
      setHasPublicKey(keyRegistered);
      console.log("🔑 공개키 등록 여부:", keyRegistered);

      if (!keyRegistered) {
        console.log("⚠️ 공개키가 등록되지 않았습니다. 키 생성이 필요합니다.");
        setCheckingKey(false);
        return;
      }

      // 의사 여부 확인
      const doctorStatus = await checkIsDoctor(currentAccount);
      setIsDoctor(doctorStatus);
      console.log("👤 사용자 역할:", doctorStatus ? "의사" : "환자");
    } catch (error) {
      console.error("❌ 사용자 상태 확인 오류:", error);
    } finally {
      setCheckingKey(false);
    }
  };

  const handlePrivateKeyUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      console.log("🔑 [개인키] 업로드 →", file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const key = e.target.result;
        setPrivateKey(key);
        console.log("✅ [개인키] 로드 완료 → 메모리에만 저장");
      };
      reader.readAsText(file);
    }
  };

  const loadPatientRecords = async (patientAddress = null) => {
    const targetAddress = patientAddress || currentAccount;

    if (!targetAddress) return;

    console.log("📋 [기록 조회] 시작");
    setLoading(true);
    try {
      const contract = await getEncryptedMedicalRecordContract();
      if (!contract) {
        throw new Error("컨트랙트가 초기화되지 않았습니다.");
      }

      // 환자 정보 가져오기 (메타데이터만 - IPFS CID와 Hash)
      const info = await contract.getPatientInfo(targetAddress);

      setPatientInfo({
        name: info.name,
        ipfsCid: info.ipfsCid,
        dataHash: info.dataHash,
        encryptedDoctorKey: info.encryptedDoctorKey,
        encryptedPatientKey: info.encryptedPatientKey,
        timestamp: info.timestamp.toString(),
        isRegistered: info.isRegistered,
      });

      // 진료기록 수 가져오기
      const recordCount = await contract.getRecordCount(targetAddress);

      const loadedRecords = [];

      // 메타데이터만 먼저 로드 (IPFS CID와 Hash)
      for (let i = 0; i < recordCount; i++) {
        const record = await contract.getMedicalRecord(targetAddress, i);
        loadedRecords.push({
          id: i,
          ipfsCid: record.ipfsCid,
          dataHash: record.dataHash,
          encryptedDoctorKey: record.encryptedDoctorKey,
          encryptedPatientKey: record.encryptedPatientKey,
          doctor: record.doctor,
          timestamp: record.timestamp.toString(),
        });
      }

      setRecords(loadedRecords);
      console.log("✅ [기록 조회] 완료 → 총", recordCount.toString(), "건");
    } catch (error) {
      console.error("❌ 기록 로드 오류:", error);
      alert("진료기록을 불러오는 중 오류가 발생했습니다: " + error.message);
    }
    setLoading(false);
  };

  const decryptRecord = async (record) => {
    if (!privateKey) {
      alert("개인키를 먼저 업로드해주세요.");
      return;
    }

    console.log(`🔓 [기록 ${record.id + 1}] 복호화 시작`);

    try {
      // IPFS에서 데이터를 가져와서 복호화
      const targetAddress = selectedPatient || currentAccount;
      
      // 마스터키인지 확인 (행안부 장관 주소)
      const isMasterKey = currentAccount && 
        currentAccount.toLowerCase() === MASTER_AUTHORITY_ADDRESS.toLowerCase();
      
      const decryptionRole = isMasterKey ? "master" : (isDoctor ? "doctor" : "patient");
      console.log("🔓 복호화 역할:", decryptionRole, isMasterKey ? "(마스터 계정)" : "");
      
      const decryptedData = await getMedicalRecordWithIPFS(
        targetAddress,
        record.id,
        privateKey,
        isDoctor,
        decryptionRole
      );

      return {
        ...record,
        decryptedData: decryptedData.record,
        isDecrypted: true,
      };
    } catch (error) {
      console.error("❌ [복호화] 실패:", error.message);
      alert("기록 복호화 중 오류가 발생했습니다: " + error.message);
      return null;
    }
  };

  const decryptPatientInfo = async () => {
    if (!privateKey || !patientInfo) {
      alert("개인키와 환자 정보가 필요합니다.");
      return;
    }

    try {
      const targetAddress = selectedPatient || currentAccount;
      
      // 마스터키인지 확인 (행안부 장관 주소)
      const isMasterKey = currentAccount && 
        currentAccount.toLowerCase() === MASTER_AUTHORITY_ADDRESS.toLowerCase();
      
      const decryptionRole = isMasterKey ? "master" : (isDoctor ? "doctor" : "patient");
      console.log("🔓 복호화 역할:", decryptionRole, isMasterKey ? "(마스터 계정)" : "");
      
      const decryptedInfo = await getPatientInfoWithIPFS(
        targetAddress,
        privateKey,
        isDoctor,
        decryptionRole
      );

      setPatientInfo({
        ...patientInfo,
        decryptedBasicInfo: decryptedInfo.basicInfo,
        isBasicInfoDecrypted: true,
      });
    } catch (error) {
      console.error("환자 정보 복호화 오류:", error);
      alert("환자 정보 복호화 중 오류가 발생했습니다: " + error.message);
    }
  };

  const handleDecryptAllRecords = async () => {
    if (!privateKey) {
      alert("개인키를 먼저 업로드해주세요.");
      return;
    }

    setLoading(true);
    const decrypted = [];

    for (const record of records) {
      const decryptedRecord = await decryptRecord(record);
      if (decryptedRecord) {
        decrypted.push(decryptedRecord);
      }
    }

    setDecryptedRecords(decrypted);
    setLoading(false);
  };

  const formatDate = (timestamp) => {
    return new Date(parseInt(timestamp) * 1000).toLocaleString("ko-KR");
  };

  // 키 확인 중
  if (checkingKey) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <CircularProgress size={48} sx={{ mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          키 상태 확인 중...
        </Typography>
      </Box>
    );
  }

  // 공개키가 등록되지 않은 경우
  if (!hasPublicKey) {
    return (
      <Card
        elevation={12}
        sx={{
          p: 4,
          textAlign: "center",
          background: `linear-gradient(135deg, ${COLORS.warningBg}, #FFF9E6)`,
          border: `2px solid ${COLORS.warningText}`,
          borderRadius: '20px',
        }}
      >
        <KeyIcon sx={{ fontSize: 64, color: COLORS.warningText, mb: 2 }} />
        <Typography variant="h4" sx={{ color: COLORS.warningText, mb: 2, fontWeight: 800 }}>
          ⚠️ 먼저 키를 생성해야 합니다
        </Typography>
        <Typography variant="body1" sx={{ mb: 2, color: COLORS.warningText, fontSize: '1.0625rem' }}>
          진료기록을 조회하려면 먼저 RSA 키 쌍을 생성하고 공개키를 등록해야 합니다.
        </Typography>
        <Typography variant="body2" sx={{ mb: 4, color: COLORS.warningText }}>
          개인키는 안전하게 다운로드되며, 이 키로만 암호화된 의료기록을 복호화할 수 있습니다.
        </Typography>
        <Button
          variant="contained"
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
            alert(
              '페이지 상단의 "🔑 암호화 키 등록이 필요합니다" 섹션에서 키를 생성해주세요.'
            );
          }}
          sx={{
            px: 4,
            py: 1.5,
            fontSize: '1rem',
            fontWeight: 700,
            borderRadius: '12px',
            background: `linear-gradient(45deg, ${COLORS.primary}, ${COLORS.primaryHover})`,
            boxShadow: `0 4px 16px rgba(37, 99, 235, 0.4)`,
            '&:hover': {
              boxShadow: `0 6px 20px rgba(37, 99, 235, 0.5)`,
              transform: 'translateY(-2px)',
            },
            transition: 'all 0.3s ease',
          }}
        >
          키 생성 섹션으로 이동
        </Button>
      </Card>
    );
  }

  // 디버깅: 렌더링 시점의 상태 확인
  console.log("🔍 [렌더링] 현재 상태:", {
    currentAccount,
    isDoctor,
    isMasterAuthority,
    hasPublicKey,
    checkingKey
  });

  return (
    <Box>
      <Box sx={{ mb: 4, pb: 3, borderBottom: `2px solid ${COLORS.border}` }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: COLORS.textPrimary, letterSpacing: '-0.02em' }}>
          진료기록 조회
        </Typography>
        <Typography variant="body2" sx={{ color: COLORS.textSecondary, fontSize: '0.875rem' }}>
          개인키를 업로드하여 암호화된 진료기록을 복호화하고 조회할 수 있습니다
        </Typography>
      </Box>

      {/* 상단 섹션들 - 가로 배치 */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', md: 'row' },
        gap: 3,
        mb: 4,
        alignItems: 'stretch',
      }}>
        {/* 개인키 업로드 섹션 */}
        <Card
          elevation={0}
          sx={{
            flex: 1,
            borderRadius: '12px',
            backgroundColor: COLORS.cardBg,
            border: `2px solid ${COLORS.border}`,
          }}
        >
        <CardContent sx={{ p: 3 }}>
          {/* 헤더 */}
          <Box sx={{ mb: 3, pb: 2.5, borderBottom: `2px solid ${COLORS.border}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '8px',
                  backgroundColor: COLORS.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                }}
              >
                <KeyIcon sx={{ fontSize: 20 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS.textPrimary }}>
                개인키 업로드 {isMasterAuthority && "(마스터 계정)"}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: COLORS.textSecondary, fontSize: '0.875rem', pl: 6 }}>
              암호화된 기록을 복호화하기 위해 개인키가 필요합니다
            </Typography>
          </Box>

          {isMasterAuthority && (
            <Alert 
              severity="warning" 
              sx={{ 
                mb: 3, 
                borderRadius: '8px',
                backgroundColor: COLORS.warningBg,
                border: `2px solid ${COLORS.warningBorder}`,
                '& .MuiAlert-icon': {
                  color: COLORS.warningText,
                },
              }}
            >
              <Typography variant="body2" sx={{ fontSize: '0.875rem', color: COLORS.warningText }}>
                마스터 계정의 개인키를 업로드하여 환자 기록을 복호화할 수 있습니다.
              </Typography>
            </Alert>
          )}

          {/* 업로드 영역 */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              border: `2px dashed ${privateKey ? COLORS.success : COLORS.borderDark}`,
              borderRadius: '8px',
              backgroundColor: privateKey ? COLORS.successBg : COLORS.background,
              textAlign: 'center',
              transition: 'all 0.3s ease',
              '&:hover': {
                borderColor: privateKey ? COLORS.success : COLORS.primary,
                backgroundColor: privateKey ? COLORS.successBg : COLORS.primaryBg,
              },
            }}
          >
            <Button
              variant="contained"
              component="label"
              startIcon={<UploadIcon />}
              fullWidth
              sx={{
                mb: 2,
                borderRadius: '8px',
                background: privateKey ? COLORS.gradientSuccess : COLORS.gradientPrimary,
                fontWeight: 600,
                py: 1.75,
                fontSize: '0.9375rem',
                textTransform: 'none',
                boxShadow: `0 2px 8px ${privateKey ? COLORS.success : COLORS.primary}30`,
                '&:hover': {
                  background: privateKey ? COLORS.gradientSuccess : COLORS.gradientPrimary,
                  boxShadow: `0 4px 12px ${privateKey ? COLORS.success : COLORS.primary}40`,
                },
              }}
            >
              개인키 파일 선택
              <input
                type="file"
                accept=".txt"
                hidden
                onChange={handlePrivateKeyUpload}
              />
            </Button>
            
            <Chip
              icon={privateKey ? <VerifiedIcon /> : <LockIcon />}
              label={privateKey ? "개인키 로드됨" : "개인키 파일을 업로드하세요"}
              color={privateKey ? "success" : "error"}
              fullWidth
              sx={{
                mb: 2,
                fontWeight: 600,
                fontSize: '0.875rem',
                height: '40px',
                backgroundColor: privateKey ? COLORS.successBg : COLORS.errorBg,
                color: privateKey ? COLORS.success : COLORS.error,
                border: `1px solid ${privateKey ? COLORS.success : COLORS.error}30`,
                justifyContent: 'flex-start',
                '& .MuiChip-label': {
                  width: '100%',
                  textAlign: 'center',
                },
              }}
            />
            
            {privateKey && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                fullWidth
                onClick={() => {
                  setPrivateKey("");
                  console.log("🗑️ 개인키가 메모리에서 삭제되었습니다.");
                  alert("개인키가 메모리에서 삭제되었습니다.");
                }}
                sx={{
                  borderRadius: '8px',
                  fontWeight: 600,
                  py: 1.5,
                  fontSize: '0.875rem',
                  textTransform: 'none',
                  borderColor: COLORS.error,
                  color: COLORS.error,
                  '&:hover': {
                    borderColor: COLORS.error,
                    backgroundColor: COLORS.errorBg,
                  },
                }}
              >
                개인키 삭제
              </Button>
            )}
          </Paper>
          
          <Typography variant="caption" sx={{ 
            display: "block", 
            mt: 2.5, 
            color: COLORS.textTertiary, 
            textAlign: 'center',
            fontSize: '0.75rem',
            lineHeight: 1.6,
          }}>
            * 개인키는 메모리에만 저장되며, 페이지 새로고침 시 자동으로 삭제됩니다.
          </Typography>
        </CardContent>
      </Card>

        {/* 환자 선택 섹션 */}
        {isDoctor && (
          <Card
            elevation={0}
            sx={{
              flex: 1,
              borderRadius: '12px',
              backgroundColor: COLORS.cardBg,
              border: `2px solid ${COLORS.border}`,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ mb: 3, pb: 2.5, borderBottom: `2px solid ${COLORS.border}` }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '8px',
                      backgroundColor: COLORS.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                    }}
                  >
                    {isMasterAuthority ? <KeyIcon sx={{ fontSize: 20 }} /> : <HospitalIcon sx={{ fontSize: 20 }} />}
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS.textPrimary }}>
                    {isMasterAuthority ? "환자 선택 (마스터 계정)" : "환자 선택 (의사용)"}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: COLORS.textSecondary, fontSize: '0.875rem', pl: 6 }}>
                  환자 주소를 입력하여 기록을 조회하세요
                </Typography>
              </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="환자 주소"
                placeholder="0x..."
                value={selectedPatient}
                onChange={(e) => setSelectedPatient(e.target.value)}
                variant="outlined"
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    '& fieldset': {
                      borderColor: COLORS.border,
                    },
                    '&:hover fieldset': {
                      borderColor: COLORS.borderDark,
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: COLORS.primary,
                    },
                  },
                }}
              />
              <Button
                variant="contained"
                onClick={() => loadPatientRecords(selectedPatient)}
                disabled={loading || !selectedPatient}
                fullWidth
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PersonIcon />}
                sx={{
                  py: 1.75,
                  borderRadius: '8px',
                  background: COLORS.gradientPrimary,
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  textTransform: 'none',
                  boxShadow: `0 2px 8px ${COLORS.primary}30`,
                  '&:hover': {
                    background: COLORS.gradientPrimary,
                    boxShadow: `0 4px 12px ${COLORS.primary}40`,
                  },
                  '&:disabled': {
                    backgroundColor: COLORS.border,
                    color: COLORS.textTertiary,
                  },
                }}
              >
                {loading ? "로딩 중..." : "환자 기록 로드"}
              </Button>
            </Box>
          </CardContent>
        </Card>
        )}

        {!isDoctor && (
          <Card
            elevation={0}
            sx={{
              flex: 1,
              borderRadius: '12px',
              backgroundColor: COLORS.cardBg,
              border: `2px solid ${COLORS.border}`,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ mb: 3, pb: 2.5, borderBottom: `2px solid ${COLORS.border}` }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '8px',
                      backgroundColor: COLORS.success,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                    }}
                  >
                    <PersonIcon sx={{ fontSize: 20 }} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS.textPrimary }}>
                    내 진료기록 조회
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: COLORS.textSecondary, fontSize: '0.875rem', pl: 6 }}>
                  본인의 진료기록을 불러옵니다
                </Typography>
              </Box>
              <Button
                variant="contained"
                onClick={() => loadPatientRecords()}
                disabled={loading}
                fullWidth
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PersonIcon />}
                sx={{
                  py: 1.75,
                  borderRadius: '8px',
                  background: COLORS.gradientSuccess,
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  textTransform: 'none',
                  boxShadow: `0 2px 8px ${COLORS.success}30`,
                  '&:hover': {
                    background: COLORS.gradientSuccess,
                    boxShadow: `0 4px 12px ${COLORS.success}40`,
                  },
                  '&:disabled': {
                    backgroundColor: COLORS.border,
                    color: COLORS.textTertiary,
                  },
                }}
              >
                {loading ? "로딩 중..." : "내 진료기록 로드"}
              </Button>
            </CardContent>
          </Card>
        )}
      </Box>

      {/* 환자 정보 섹션 */}
      {patientInfo && (
        <Card
          elevation={0}
          sx={{
            mb: 4,
            borderRadius: '12px',
            backgroundColor: COLORS.cardBg,
            border: `2px solid ${COLORS.border}`,
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ mb: 3, pb: 2.5, borderBottom: `2px solid ${COLORS.border}` }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '8px',
                    backgroundColor: COLORS.success,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                  }}
                >
                  <PersonIcon sx={{ fontSize: 20 }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS.textPrimary }}>
                  환자 정보
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: COLORS.textSecondary, fontSize: '0.875rem', pl: 6 }}>
                환자의 기본 정보 및 진료 기록
              </Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                mb: 3,
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: '8px',
                  backgroundColor: COLORS.background,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <Typography variant="caption" sx={{ 
                  color: COLORS.textSecondary, 
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  mb: 1,
                  display: 'block',
                  fontSize: '0.75rem',
                }}>
                  이름
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.textPrimary, fontSize: '1.125rem' }}>
                  {patientInfo.name}
                </Typography>
              </Paper>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: '8px',
                  backgroundColor: COLORS.background,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <Typography variant="caption" sx={{ 
                  color: COLORS.textSecondary, 
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  mb: 1,
                  display: 'block',
                  fontSize: '0.75rem',
                }}>
                  등록일
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: COLORS.textPrimary }}>
                  {formatDate(patientInfo.timestamp)}
                </Typography>
              </Paper>
            </Box>
            <Divider sx={{ my: 3, borderColor: COLORS.border }} />
            {!patientInfo.isBasicInfoDecrypted ? (
              <Box sx={{ textAlign: 'center' }}>
                <Button
                  variant="contained"
                  onClick={decryptPatientInfo}
                  disabled={!privateKey}
                  startIcon={<LockOpenIcon />}
                  sx={{
                    borderRadius: '8px',
                    background: COLORS.gradientPrimary,
                    fontWeight: 600,
                    px: 4,
                    py: 1.75,
                    fontSize: '0.9375rem',
                    textTransform: 'none',
                    boxShadow: `0 2px 8px ${COLORS.primary}30`,
                    '&:hover': {
                      background: COLORS.gradientPrimary,
                      boxShadow: `0 4px 12px ${COLORS.primary}40`,
                    },
                    '&:disabled': {
                      backgroundColor: COLORS.border,
                      color: COLORS.textTertiary,
                    },
                  }}
                >
                  기본정보 복호화
                </Button>
              </Box>
            ) : (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <VerifiedIcon sx={{ color: COLORS.success, fontSize: 20 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS.textPrimary }}>
                    기본정보
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                  }}
                >
                  {[
                    { label: '키', value: `${patientInfo.decryptedBasicInfo.height} cm`, color: COLORS.primary },
                    { label: '몸무게', value: `${patientInfo.decryptedBasicInfo.weight} kg`, color: COLORS.success },
                    { label: '혈액형', value: patientInfo.decryptedBasicInfo.bloodType, color: COLORS.warningText },
                    { label: '주민번호', value: patientInfo.decryptedBasicInfo.ssn.replace(/(\d{6})-?(\d{7})/, "$1-*******"), color: COLORS.textSecondary, mono: true },
                  ].map((item, idx) => (
                    <Paper
                      key={idx}
                      elevation={0}
                      sx={{
                        p: 2,
                        borderRadius: '8px',
                        backgroundColor: COLORS.background,
                        border: `1px solid ${COLORS.border}`,
                        borderLeft: `4px solid ${item.color}`,
                      }}
                    >
                      <Typography variant="caption" sx={{ 
                        color: COLORS.textSecondary, 
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        mb: 0.5,
                        display: 'block',
                        fontSize: '0.75rem',
                      }}>
                        {item.label}
                      </Typography>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          fontWeight: 600, 
                          color: COLORS.textPrimary,
                          fontFamily: item.mono ? 'monospace' : 'inherit',
                          fontSize: '0.9375rem',
                        }}
                      >
                        {item.value}
                      </Typography>
                    </Paper>
                  ))}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* 진료기록 섹션 */}
      {records.length > 0 && (
        <Box>
          <Box sx={{ mb: 3, pb: 2.5, borderBottom: `2px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: COLORS.textPrimary, mb: 0.5, letterSpacing: '-0.02em' }}>
                진료기록
              </Typography>
              <Typography variant="body2" sx={{ color: COLORS.textSecondary, fontSize: '0.875rem' }}>
                총 {records.length}건의 진료기록이 등록되어 있습니다
              </Typography>
            </Box>
            <Button
              variant="contained"
              onClick={handleDecryptAllRecords}
              disabled={loading || !privateKey}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LockOpenIcon />}
              sx={{
                borderRadius: '8px',
                background: COLORS.gradientSuccess,
                fontWeight: 600,
                px: 3,
                py: 1.5,
                fontSize: '0.875rem',
                textTransform: 'none',
                boxShadow: `0 2px 8px ${COLORS.success}30`,
                '&:hover': {
                  background: COLORS.gradientSuccess,
                  boxShadow: `0 4px 12px ${COLORS.success}40`,
                },
                '&:disabled': {
                  backgroundColor: COLORS.border,
                  color: COLORS.textTertiary,
                },
              }}
            >
              {loading ? "복호화 중..." : "모든 기록 복호화"}
            </Button>
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {(decryptedRecords.length > 0 ? decryptedRecords : records).map(
              (record, index) => {
                return (
                  <Card
                    key={record.id}
                    elevation={0}
                    sx={{
                      width: '100%',
                      borderRadius: '12px',
                      backgroundColor: COLORS.cardBg,
                      border: `2px solid ${record.isDecrypted ? COLORS.success : COLORS.border}`,
                      borderLeft: `4px solid ${record.isDecrypted ? COLORS.success : COLORS.primary}`,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: `0 4px 16px ${record.isDecrypted ? COLORS.success : COLORS.primary}20`,
                        borderColor: record.isDecrypted ? COLORS.success : COLORS.primary,
                      },
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'flex-start', 
                        mb: 2.5, 
                        flexWrap: 'wrap', 
                        gap: 2,
                      }}>
                        <Box sx={{ flex: 1, minWidth: '200px' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                            <Box
                              sx={{
                                width: 32,
                                height: 32,
                                borderRadius: '6px',
                                backgroundColor: record.isDecrypted ? COLORS.success : COLORS.primary,
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '0.875rem',
                              }}
                            >
                              #{record.id + 1}
                            </Box>
                            <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS.textPrimary, fontSize: '1.125rem' }}>
                              진료기록
                            </Typography>
                            {record.isDecrypted && (
                              <Chip
                                icon={<VerifiedIcon sx={{ fontSize: 14 }} />}
                                label="복호화됨"
                                size="small"
                                sx={{ 
                                  height: 24,
                                  fontSize: '0.75rem',
                                  backgroundColor: COLORS.successBg,
                                  color: COLORS.success,
                                  fontWeight: 600,
                                  border: `1px solid ${COLORS.success}30`,
                                }}
                              />
                            )}
                          </Box>
                          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
                            <Chip
                              label={formatDate(record.timestamp)}
                              size="small"
                              sx={{ 
                                height: 24,
                                fontSize: '0.75rem',
                                backgroundColor: COLORS.background,
                                color: COLORS.textSecondary,
                                fontWeight: 500,
                                border: `1px solid ${COLORS.border}`,
                              }}
                            />
                            <Chip
                              icon={<HospitalIcon sx={{ fontSize: 14 }} />}
                              label={`의사: ${record.doctor.slice(0, 6)}...${record.doctor.slice(-4)}`}
                              size="small"
                              sx={{ 
                                height: 24,
                                fontSize: '0.75rem',
                                backgroundColor: COLORS.roleDoctor,
                                color: COLORS.primary,
                                fontWeight: 500,
                                border: `1px solid ${COLORS.primary}30`,
                              }}
                            />
                          </Stack>
                        </Box>
                        <Button
                          size="small"
                          onClick={async () => {
                            const recordId = record.id;
                            const patientAddress = selectedPatient || currentAccount;
                            if (!patientAddress) {
                              alert("환자 주소를 선택하거나 입력해주세요.");
                              return;
                            }
                            setCheckingEncryption((prev) => ({ ...prev, [recordId]: true }));
                            try {
                              const status = await verifyEncryptionStatus(patientAddress, recordId);
                              setEncryptionStatus((prev) => ({ ...prev, [recordId]: status }));
                            } catch (error) {
                              console.error("암호화 확인 오류:", error);
                              setEncryptionStatus((prev) => ({
                                ...prev,
                                [recordId]: { isEncrypted: false, reason: error.message },
                              }));
                            } finally {
                              setCheckingEncryption((prev) => ({ ...prev, [recordId]: false }));
                            }
                          }}
                          disabled={checkingEncryption[record.id]}
                          startIcon={checkingEncryption[record.id] ? <CircularProgress size={16} /> : <LockIcon />}
                          sx={{
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          {checkingEncryption[record.id] ? "확인 중..." : "암호화 확인"}
                        </Button>
                      </Box>
                      {encryptionStatus[record.id] && (
                        <Alert
                          severity={encryptionStatus[record.id].isEncrypted ? "success" : "error"}
                          sx={{ mt: 2, borderRadius: '12px' }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {encryptionStatus[record.id].isEncrypted ? "✅ 암호화됨" : "❌ 암호화되지 않음"}
                          </Typography>
                          {encryptionStatus[record.id].reason && (
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              {encryptionStatus[record.id].reason}
                            </Typography>
                          )}
                        </Alert>
                      )}
                      <Divider sx={{ my: 2.5, borderColor: COLORS.border }} />
                      {record.isDecrypted ? (
                        <Box>
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 1.5,
                              mb: 2.5,
                            }}
                          >
                            <Paper
                              elevation={0}
                              sx={{
                                p: 2,
                                borderRadius: '8px',
                                backgroundColor: COLORS.background,
                                border: `1px solid ${COLORS.border}`,
                                borderLeft: `4px solid ${COLORS.primary}`,
                              }}
                            >
                              <Typography variant="caption" sx={{ 
                                color: COLORS.textSecondary, 
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                mb: 0.5,
                                display: 'block',
                                fontSize: '0.75rem',
                              }}>
                                증상
                              </Typography>
                              <Typography variant="body1" sx={{ fontWeight: 500, color: COLORS.textPrimary, fontSize: '0.9375rem' }}>
                                {record.decryptedData.symptoms}
                              </Typography>
                            </Paper>
                            <Paper
                              elevation={0}
                              sx={{
                                p: 2,
                                borderRadius: '8px',
                                backgroundColor: COLORS.background,
                                border: `1px solid ${COLORS.border}`,
                                borderLeft: `4px solid ${COLORS.success}`,
                              }}
                            >
                              <Typography variant="caption" sx={{ 
                                color: COLORS.textSecondary, 
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                mb: 0.5,
                                display: 'block',
                                fontSize: '0.75rem',
                              }}>
                                진단
                              </Typography>
                              <Typography variant="body1" sx={{ fontWeight: 500, color: COLORS.textPrimary, fontSize: '0.9375rem' }}>
                                {record.decryptedData.diagnosis}
                              </Typography>
                            </Paper>
                            {record.decryptedData.treatment && (
                              <Paper
                                elevation={0}
                                sx={{
                                  p: 2,
                                  borderRadius: '8px',
                                  backgroundColor: COLORS.background,
                                  border: `1px solid ${COLORS.border}`,
                                  borderLeft: `4px solid ${COLORS.warningText}`,
                                }}
                              >
                                <Typography variant="caption" sx={{ 
                                  color: COLORS.textSecondary, 
                                  fontWeight: 600,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px',
                                  mb: 0.5,
                                  display: 'block',
                                  fontSize: '0.75rem',
                                }}>
                                  치료
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500, color: COLORS.textPrimary, fontSize: '0.9375rem' }}>
                                  {record.decryptedData.treatment}
                                </Typography>
                              </Paper>
                            )}
                            {record.decryptedData.prescription && (
                              <Paper
                                elevation={0}
                                sx={{
                                  p: 2,
                                  borderRadius: '8px',
                                  backgroundColor: COLORS.background,
                                  border: `1px solid ${COLORS.border}`,
                                  borderLeft: `4px solid ${COLORS.info}`,
                                }}
                              >
                                <Typography variant="caption" sx={{ 
                                  color: COLORS.textSecondary, 
                                  fontWeight: 600,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px',
                                  mb: 0.5,
                                  display: 'block',
                                  fontSize: '0.75rem',
                                }}>
                                  처방
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 500, color: COLORS.textPrimary, fontSize: '0.9375rem' }}>
                                  {record.decryptedData.prescription}
                                </Typography>
                              </Paper>
                            )}
                          </Box>
                          {record.decryptedData.notes && (
                            <Paper
                              elevation={0}
                              sx={{
                                p: 2,
                                borderRadius: '8px',
                                backgroundColor: COLORS.background,
                                border: `1px solid ${COLORS.border}`,
                                mb: 2.5,
                              }}
                            >
                              <Typography variant="caption" sx={{ 
                                color: COLORS.textSecondary, 
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                mb: 0.5,
                                display: 'block',
                                fontSize: '0.75rem',
                              }}>
                                메모
                              </Typography>
                              <Typography variant="body1" sx={{ fontWeight: 500, color: COLORS.textPrimary, fontSize: '0.9375rem' }}>
                                {record.decryptedData.notes}
                              </Typography>
                            </Paper>
                          )}
                          <Box
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 1,
                              p: 1.5,
                              borderRadius: '8px',
                              backgroundColor: COLORS.background,
                              border: `1px solid ${COLORS.border}`,
                            }}
                          >
                            <Typography variant="caption" sx={{ 
                              color: COLORS.textSecondary, 
                              fontWeight: 600,
                              fontSize: '0.75rem',
                            }}>
                              진료일:
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 500, color: COLORS.textPrimary, fontSize: '0.875rem' }}>
                              {new Date(record.decryptedData.date).toLocaleString("ko-KR")}
                            </Typography>
                          </Box>
                          {record.decryptedData.images &&
                            Array.isArray(record.decryptedData.images) &&
                            record.decryptedData.images.length > 0 && (
                              <Box sx={{ mt: 3, pt: 3, borderTop: `2px solid ${COLORS.border}` }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                                  <ImageIcon sx={{ color: COLORS.primary, fontSize: 20 }} />
                                  <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS.textPrimary, fontSize: '1rem' }}>
                                    첨부 이미지 ({record.decryptedData.images.length}개)
                                  </Typography>
                                </Box>
                                <Box
                                  sx={{
                                    display: 'grid',
                                    gridTemplateColumns: {
                                      xs: 'repeat(2, 1fr)',
                                      sm: 'repeat(3, 1fr)',
                                      md: 'repeat(4, 1fr)',
                                    },
                                    gap: 1.5,
                                  }}
                                >
                                  {record.decryptedData.images.map((image, imgIndex) => {
                                    return (
                                      <Card
                                        key={imgIndex}
                                        elevation={0}
                                        sx={{
                                          borderRadius: '8px',
                                          overflow: 'hidden',
                                          cursor: 'pointer',
                                          border: `2px solid ${COLORS.border}`,
                                          transition: 'all 0.3s ease',
                                          '&:hover': {
                                            boxShadow: `0 4px 16px ${COLORS.primary}30`,
                                            borderColor: COLORS.primary,
                                            transform: 'translateY(-2px)',
                                          },
                                        }}
                                        onClick={() => {
                                          const newWindow = window.open();
                                          if (newWindow) {
                                            newWindow.document.write(`
                                              <html>
                                                <head>
                                                  <title>${image.name || "이미지"}</title>
                                                  <style>
                                                    body {
                                                      margin: 0;
                                                      padding: 20px;
                                                      background: #000;
                                                      display: flex;
                                                      justify-content: center;
                                                      align-items: center;
                                                      min-height: 100vh;
                                                    }
                                                    img {
                                                      max-width: 100%;
                                                      max-height: 100vh;
                                                      object-fit: contain;
                                                    }
                                                  </style>
                                                </head>
                                                <body>
                                                  <img src="${base64ToDataURL(image.data, image.type)}" alt="${image.name || "이미지"}" />
                                                </body>
                                              </html>
                                            `);
                                          }
                                        }}
                                      >
                                        <Box
                                          sx={{
                                            width: '100%',
                                            height: '180px',
                                            overflow: 'hidden',
                                            backgroundColor: COLORS.border,
                                            position: 'relative',
                                            '&::after': {
                                              content: '""',
                                              position: 'absolute',
                                              top: 0,
                                              left: 0,
                                              right: 0,
                                              bottom: 0,
                                              background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.1) 100%)',
                                              opacity: 0,
                                              transition: 'opacity 0.3s ease',
                                            },
                                            '&:hover::after': {
                                              opacity: 1,
                                            },
                                          }}
                                        >
                                          <img
                                            src={base64ToDataURL(image.data, image.type)}
                                            alt={image.name || `이미지 ${imgIndex + 1}`}
                                            style={{
                                              width: '100%',
                                              height: '100%',
                                              objectFit: 'cover',
                                            }}
                                            onError={(e) => {
                                              e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23ddd' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999'%3E이미지 로드 실패%3C/text%3E%3C/svg%3E";
                                            }}
                                          />
                                        </Box>
                                        {image.name && (
                                          <CardContent sx={{ p: 1.5, backgroundColor: COLORS.cardBg }}>
                                            <Typography
                                              variant="caption"
                                              sx={{
                                                display: 'block',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                fontSize: '0.7rem',
                                                fontWeight: 600,
                                                color: COLORS.textSecondary,
                                              }}
                                              title={image.name}
                                            >
                                              {image.name}
                                            </Typography>
                                          </CardContent>
                                        )}
                                      </Card>
                                    );
                                  })}
                                </Box>
                              </Box>
                            )}
                        </Box>
                      ) : (
                        <Box 
                          sx={{ 
                            textAlign: 'center', 
                            py: 4,
                            px: 3,
                            backgroundColor: COLORS.background,
                            borderRadius: '8px',
                            border: `2px dashed ${COLORS.borderDark}`,
                          }}
                        >
                          <Box
                            sx={{
                              width: 56,
                              height: 56,
                              borderRadius: '8px',
                              backgroundColor: COLORS.primaryBg,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              mx: 'auto',
                              mb: 2,
                            }}
                          >
                            <LockIcon sx={{ fontSize: 28, color: COLORS.primary }} />
                          </Box>
                          <Typography variant="h6" sx={{ mb: 2.5, color: COLORS.textPrimary, fontWeight: 600, fontSize: '1rem' }}>
                            암호화된 데이터
                          </Typography>
                          <Button
                            variant="contained"
                            onClick={() =>
                              decryptRecord(record).then((decrypted) => {
                                if (decrypted) {
                                  const updated = [...decryptedRecords];
                                  updated[index] = decrypted;
                                  setDecryptedRecords(updated);
                                }
                              })
                            }
                            disabled={!privateKey}
                            startIcon={<LockOpenIcon />}
                            sx={{
                              borderRadius: '8px',
                              background: COLORS.gradientPrimary,
                              fontWeight: 600,
                              px: 3,
                              py: 1.5,
                              fontSize: '0.875rem',
                              textTransform: 'none',
                              boxShadow: `0 2px 8px ${COLORS.primary}30`,
                              '&:hover': {
                                background: COLORS.gradientPrimary,
                                boxShadow: `0 4px 12px ${COLORS.primary}40`,
                              },
                              '&:disabled': {
                                backgroundColor: COLORS.border,
                                color: COLORS.textTertiary,
                              },
                            }}
                          >
                            이 기록 복호화
                          </Button>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                );
              }
            )}
          </Box>
        </Box>
      )}

      {records.length === 0 && patientInfo && (
        <Card
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: '12px',
            backgroundColor: COLORS.cardBg,
            border: `2px solid ${COLORS.border}`,
          }}
        >
          <Typography variant="body1" sx={{ color: COLORS.textSecondary, fontSize: '0.9375rem' }}>
            진료기록이 없습니다.
          </Typography>
        </Card>
      )}
    </Box>
  );
};

export default MedicalRecordViewer;
