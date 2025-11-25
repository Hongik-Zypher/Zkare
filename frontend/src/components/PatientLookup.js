import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Alert,
  Grid,
  CircularProgress,
  Chip,
  Paper,
  Divider,
  IconButton,
} from "@mui/material";
import {
  Search as SearchIcon,
  Person as PersonIcon,
  LocalHospital as LocalHospitalIcon,
  Delete as DeleteIcon,
  CloudUpload as CloudUploadIcon,
} from "@mui/icons-material";
import {
  isDoctor as checkIsDoctor,
  isPublicKeyRegistered as checkIsPublicKeyRegistered,
  getPublicKey,
  getEncryptedMedicalRecordContract,
  registerPatientWithIPFS,
  addMedicalRecordWithIPFS,
} from "../utils/contracts";
import {
  fileToBase64,
  validateImageFile,
  compressImage,
  base64ToDataURL,
} from "../utils/imageUtils";
import { COLORS } from "../utils/constants";

// 마스터 계정 주소 (환경 변수에서 읽기)
const MASTER_AUTHORITY_ADDRESS = process.env.REACT_APP_MASTER_AUTHORITY_ADDRESS || "0xBcd4042DE499D14e55001CcbB24a551F3b954096";

const PatientLookup = ({
  keyRegistryContract,
  medicalRecordContract,
  currentAccount,
}) => {
  const [patientAddress, setPatientAddress] = useState("");
  const [patientFound, setPatientFound] = useState(null);
  const [patientInfo, setPatientInfo] = useState(null);
  const [isDoctor, setIsDoctor] = useState(false);
  const [isMasterAuthority, setIsMasterAuthority] = useState(false); // 마스터 계정 여부
  const [loading, setLoading] = useState(false);
  const [hasDoctorPublicKey, setHasDoctorPublicKey] = useState(true);
  const [checkingKey, setCheckingKey] = useState(true);

  // 진료기록 양식
  const [medicalRecordForm, setMedicalRecordForm] = useState({
    // 기본정보 (처음 등록 시에만)
    name: "",
    height: "",
    weight: "",
    bloodType: "",
    ssn: "", // 주민번호 (마스킹 처리 필요)

    // 진료기록
    symptoms: "",
    diagnosis: "",
    treatment: "",
    prescription: "",
    notes: "",
  });

  // 이미지 관련 상태
  const [selectedImages, setSelectedImages] = useState([]); // 선택된 이미지 파일들
  const [imagePreviews, setImagePreviews] = useState([]); // 이미지 미리보기 (Data URL)
  const [uploadingImages, setUploadingImages] = useState(false); // 이미지 업로드 중 상태

  // 의사 여부 및 공개키 등록 확인
  useEffect(() => {
    checkDoctorStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAccount]);

  const checkDoctorStatus = async () => {
    if (!currentAccount) {
      setCheckingKey(false);
      return;
    }

    setCheckingKey(true);
    try {
      // 마스터 계정 주소 확인
      const isMaster = currentAccount && 
        currentAccount.toLowerCase() === MASTER_AUTHORITY_ADDRESS.toLowerCase();
      setIsMasterAuthority(isMaster);
      
      // 마스터 계정이면 의사처럼 취급 (환자 조회 가능)
      const doctorStatus = isMaster || await checkIsDoctor(currentAccount);
      setIsDoctor(doctorStatus);

      const keyRegistered = await checkIsPublicKeyRegistered(currentAccount);
      setHasDoctorPublicKey(keyRegistered);

      if (isMaster) {
        console.log("🔑 마스터 계정 (의사 권한으로 취급)");
      } else {
        console.log("👨‍⚕️ 의사 상태:", doctorStatus);
      }
      console.log("🔑 공개키 등록 여부:", keyRegistered);
    } catch (error) {
      console.error("의사 상태 확인 오류:", error);
    } finally {
      setCheckingKey(false);
    }
  };

  const handlePatientLookup = async () => {
    if (!patientAddress) return;

    setLoading(true);
    try {
      // contracts.js의 함수 사용 (ENS 에러 없음)
      const isRegistered = await checkIsPublicKeyRegistered(patientAddress);

      if (!isRegistered) {
        setPatientFound("not_registered");
        setPatientInfo(null);
      } else {
        // EncryptedMedicalRecord 컨트랙트 가져오기 (ENS 설정 포함)
        const contract = await getEncryptedMedicalRecordContract();
        if (!contract) {
          throw new Error("컨트랙트를 초기화할 수 없습니다.");
        }

        // 환자 정보 확인
        const isPatientAlreadyRegistered = await contract.isPatientRegistered(
          patientAddress
        );

        if (isPatientAlreadyRegistered) {
          setPatientFound("existing");
          // 기존 환자 정보 가져오기
          const info = await contract.getPatientInfo(patientAddress);
          setPatientInfo({
            name: info.name,
            isRegistered: info.isRegistered,
          });
        } else {
          setPatientFound("new");
          setPatientInfo(null);
        }
      }
    } catch (error) {
      console.error("환자 조회 오류:", error);
      alert("환자 조회 중 오류가 발생했습니다: " + error.message);
    }
    setLoading(false);
  };

  const handleSubmitMedicalRecord = async () => {
    if (!patientAddress) return;

    console.log("📝 [진료기록 등록 with IPFS] 시작");

    setLoading(true);
    try {
      // contracts.js의 함수 사용 (ENS 에러 없음)
      const patientPublicKeyData = await getPublicKey(patientAddress);
      const doctorPublicKeyData = await getPublicKey(currentAccount);

      if (
        !patientPublicKeyData ||
        !patientPublicKeyData[0] ||
        !doctorPublicKeyData ||
        !doctorPublicKeyData[0]
      ) {
        throw new Error("공개키를 조회할 수 없습니다.");
      }

      const patientPublicKey = patientPublicKeyData[0]; // key
      const doctorPublicKey = doctorPublicKeyData[0]; // key

      // 환자 등록 여부 확인 (실제 컨트랙트 상태 확인)
      const contract = await getEncryptedMedicalRecordContract();
      if (!contract) {
        throw new Error("컨트랙트를 초기화할 수 없습니다.");
      }

      const isPatientAlreadyRegistered = await contract.isPatientRegistered(
        patientAddress
      );

      let result;

      // 환자가 등록되어 있지 않은 경우에만 등록 시도
      if (!isPatientAlreadyRegistered) {
        // 새 환자 등록 (IPFS 사용)
        console.log("👤 [신규 환자] 기본정보 등록 (IPFS)");
        const basicInfo = {
          height: medicalRecordForm.height,
          weight: medicalRecordForm.weight,
          bloodType: medicalRecordForm.bloodType,
          ssn: medicalRecordForm.ssn,
        };

        // IPFS 함수 사용 (암호화 + IPFS 업로드 + 블록체인 저장 자동 처리)
        result = await registerPatientWithIPFS(
          patientAddress,
          medicalRecordForm.name,
          basicInfo, // 원본 데이터 (암호화는 함수 내부에서)
          doctorPublicKey,
          patientPublicKey
        );

        console.log("✅ 환자 등록 완료:", result.transactionHash);
        console.log("📦 IPFS CID:", result.ipfsCid);
      } else {
        console.log("ℹ️ 환자는 이미 등록되어 있습니다. 진료기록만 추가합니다.");
      }

      // 진료기록 추가 (IPFS 사용)
      console.log("📋 [진료기록] 추가 (IPFS)");

      // 이미지를 Base64로 변환
      let imageData = [];
      if (selectedImages.length > 0) {
        setUploadingImages(true);
        try {
          let totalSize = 0;
          const maxTotalSize = 5 * 1024 * 1024; // 5MB 제한 (압축 후)

          for (const file of selectedImages) {
            const base64 = await fileToBase64(file);
            const base64Size = (base64.length * 3) / 4; // Base64 크기 추정

            if (totalSize + base64Size > maxTotalSize) {
              alert(
                `이미지 총 크기가 너무 큽니다. (최대 5MB)\n현재: ${(
                  totalSize /
                  1024 /
                  1024
                ).toFixed(2)}MB\n추가하려는 이미지: ${(
                  base64Size /
                  1024 /
                  1024
                ).toFixed(2)}MB`
              );
              break;
            }

            imageData.push({
              data: base64,
              type: file.type,
              name: file.name,
              size: file.size,
            });
            totalSize += base64Size;
          }
          console.log(
            `✅ ${imageData.length}개 이미지 변환 완료 (총 크기: ${(
              totalSize /
              1024 /
              1024
            ).toFixed(2)}MB)`
          );
        } catch (error) {
          console.error("❌ 이미지 변환 오류:", error);
          alert("이미지 변환 중 오류가 발생했습니다.");
          setUploadingImages(false);
          return;
        } finally {
          setUploadingImages(false);
        }
      }

      const medicalData = {
        symptoms: medicalRecordForm.symptoms,
        diagnosis: medicalRecordForm.diagnosis,
        treatment: medicalRecordForm.treatment,
        prescription: medicalRecordForm.prescription,
        notes: medicalRecordForm.notes,
        date: new Date().toISOString(),
        images: imageData, // 이미지 데이터 포함
      };

      // IPFS 함수 사용 (암호화 + IPFS 업로드 + 블록체인 저장 자동 처리)
      result = await addMedicalRecordWithIPFS(
        patientAddress,
        medicalData, // 원본 데이터 (암호화는 함수 내부에서)
        doctorPublicKey,
        patientPublicKey
      );

      console.log("✅ [진료기록] 저장 완료:", result.transactionHash);
      console.log("📦 IPFS CID:", result.ipfsCid);

      alert(
        `진료기록이 성공적으로 저장되었습니다!\n\n` +
          `트랜잭션: ${result.transactionHash}\n` +
          `IPFS CID: ${result.ipfsCid}`
      );

      // 폼 초기화
      setMedicalRecordForm({
        name: "",
        height: "",
        weight: "",
        bloodType: "",
        ssn: "",
        symptoms: "",
        diagnosis: "",
        treatment: "",
        prescription: "",
        notes: "",
      });
      setSelectedImages([]);
      setImagePreviews([]);
    } catch (error) {
      console.error("❌ 진료기록 저장 오류:", error);
      console.error("🔍 오류 상세:", {
        message: error.message,
        name: error.name,
        code: error.code,
      });
      alert("진료기록 저장 중 오류가 발생했습니다.");
    }
    setLoading(false);
  };

  // 키 확인 중
  if (checkingKey) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <CircularProgress size={48} sx={{ mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          의사 권한 확인 중...
        </Typography>
      </Box>
    );
  }

  // 의사가 아닌 경우
  if (!isDoctor) {
    return (
      <Card 
        elevation={8}
        sx={{ 
          p: 4, 
          textAlign: "center",
          background: `linear-gradient(135deg, #ffebee, #ffcdd2)`,
          border: `3px solid ${COLORS.error}`,
          borderRadius: '20px',
        }}
      >
        <Typography variant="h4" sx={{ color: COLORS.error, fontWeight: 800, mb: 2 }}>
          🚫 접근 권한이 없습니다
        </Typography>
        <Typography variant="body1" sx={{ color: COLORS.textPrimary, mb: 1 }}>
          이 기능은 <strong>의사만</strong> 사용할 수 있습니다.
        </Typography>
        <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>
          의사로 등록된 계정으로 로그인해주세요.
        </Typography>
      </Card>
    );
  }

  // 공개키가 등록되지 않은 경우
  if (!hasDoctorPublicKey) {
    return (
      <Card 
        elevation={12}
        sx={{ 
          p: 4,
          textAlign: "center",
          background: `linear-gradient(135deg, ${COLORS.warningBg}, #FFF9E6)`,
          border: `2px solid ${COLORS.warningText}`,
          borderRadius: '20px',
          boxShadow: `0 8px 24px rgba(180, 83, 9, 0.2)`,
        }}
      >
        <Typography variant="h4" sx={{ 
          color: COLORS.warningText, 
          mb: 2, 
          fontWeight: 800,
        }}>
          ⚠️ 먼저 키를 생성해야 합니다
        </Typography>
        <Typography variant="body1" sx={{ 
          mb: 2, 
          color: COLORS.warningText,
          fontSize: '1.0625rem',
        }}>
          환자 진료기록을 작성하려면 먼저 RSA 키 쌍을 생성하고 공개키를
          등록해야 합니다.
        </Typography>
        <Typography variant="body2" sx={{ 
          color: COLORS.warningText, 
          mb: 4,
        }}>
          의사용 개인키로 환자의 의료기록을 암호화하여 안전하게 저장할 수
          있습니다.
        </Typography>
        <Button
          variant="contained"
          onClick={() => {
            const keySection = document.getElementById('key-generation-section');
            if (keySection) {
              keySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
              setTimeout(() => {
                window.scrollBy(0, -20);
              }, 500);
            } else {
              window.scrollTo({ top: 0, behavior: "smooth" });
              alert(
                '페이지 상단의 "🔑 암호화 키 등록이 필요합니다" 섹션에서 키를 생성해주세요.'
              );
            }
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
          🔑 키 생성 섹션으로 이동
        </Button>
      </Card>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          {isMasterAuthority ? (
            <LocalHospitalIcon sx={{ fontSize: 40, color: COLORS.primary }} />
          ) : (
            <PersonIcon sx={{ fontSize: 40, color: COLORS.primary }} />
          )}
          <Typography variant="h4" sx={{ 
            fontWeight: 800,
            color: COLORS.textPrimary,
          }}>
            {isMasterAuthority ? "환자 조회 및 진료기록 작성 (마스터 계정)" : "환자 조회 및 진료기록 작성"}
          </Typography>
        </Box>

        <Paper 
          elevation={8}
          sx={{ 
            p: 3, 
            borderRadius: '16px',
            background: `linear-gradient(135deg, ${COLORS.cardBg}, ${COLORS.primaryBg})`,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            <TextField
              fullWidth
              label="환자 주소"
              placeholder="0x..."
              value={patientAddress}
              onChange={(e) => setPatientAddress(e.target.value)}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  backgroundColor: COLORS.cardBg,
                },
              }}
            />
            <Button
              variant="contained"
              onClick={handlePatientLookup}
              disabled={loading || !patientAddress}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
              sx={{
                px: 3,
                py: 1.5,
                borderRadius: '12px',
                background: `linear-gradient(45deg, ${COLORS.primary}, ${COLORS.primaryHover})`,
                boxShadow: `0 4px 16px rgba(37, 99, 235, 0.4)`,
                fontWeight: 600,
                fontSize: '0.875rem',
                textTransform: 'none',
                whiteSpace: 'nowrap',
                '&:hover': {
                  boxShadow: `0 6px 20px rgba(37, 99, 235, 0.5)`,
                  transform: 'translateY(-2px)',
                },
                '&:disabled': {
                  background: COLORS.border,
                },
                transition: 'all 0.3s ease',
              }}
            >
              {loading ? "조회 중..." : "환자 조회"}
            </Button>
          </Box>
        </Paper>
      </Box>

      {patientFound === "not_registered" && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 3,
            borderRadius: '16px',
            fontSize: '1rem',
            '& .MuiAlert-icon': {
              fontSize: '2rem',
            },
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            ❌ 등록되지 않은 환자
          </Typography>
          <Typography variant="body1">
            해당 주소의 환자는 공개키가 등록되지 않았습니다.
          </Typography>
        </Alert>
      )}

      {patientFound === "new" && (
        <Card 
          elevation={12}
          sx={{ 
            mb: 4,
            borderRadius: '20px',
            background: `linear-gradient(135deg, ${COLORS.cardBg}, ${COLORS.rolePatient})`,
            border: `2px solid ${COLORS.success}`,
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.2)',
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <PersonIcon sx={{ fontSize: 40, color: COLORS.success }} />
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.textPrimary }}>
                  새 환자 등록
                </Typography>
                <Typography variant="body1" sx={{ color: COLORS.textSecondary }}>
                  처음 등록하는 환자입니다. 기본정보를 포함한 진료기록을 작성해주세요.
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, color: COLORS.textPrimary }}>
              기본정보
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="이름"
                  placeholder="환자 이름"
                  value={medicalRecordForm.name}
                  onChange={(e) =>
                    setMedicalRecordForm({
                      ...medicalRecordForm,
                      name: e.target.value,
                    })
                  }
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="키 (cm)"
                  placeholder="170"
                  value={medicalRecordForm.height}
                  onChange={(e) =>
                    setMedicalRecordForm({
                      ...medicalRecordForm,
                      height: e.target.value,
                    })
                  }
                  variant="outlined"
                  type="number"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="몸무게 (kg)"
                  placeholder="70"
                  value={medicalRecordForm.weight}
                  onChange={(e) =>
                    setMedicalRecordForm({
                      ...medicalRecordForm,
                      weight: e.target.value,
                    })
                  }
                  variant="outlined"
                  type="number"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="혈액형"
                  value={medicalRecordForm.bloodType}
                  onChange={(e) =>
                    setMedicalRecordForm({
                      ...medicalRecordForm,
                      bloodType: e.target.value,
                    })
                  }
                  variant="outlined"
                  SelectProps={{
                    native: true,
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                    },
                  }}
                >
                  <option value="">혈액형 선택</option>
                  <option value="A">A형</option>
                  <option value="B">B형</option>
                  <option value="AB">AB형</option>
                  <option value="O">O형</option>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="주민번호"
                  placeholder="주민번호"
                  value={medicalRecordForm.ssn}
                  onChange={(e) =>
                    setMedicalRecordForm({
                      ...medicalRecordForm,
                      ssn: e.target.value,
                    })
                  }
                  variant="outlined"
                  type="password"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                    },
                  }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {patientFound === "existing" && patientInfo && (
        <Card 
          elevation={8}
          sx={{ 
            mb: 4,
            p: 3,
            borderRadius: '16px',
            background: `linear-gradient(135deg, ${COLORS.cardBg}, ${COLORS.primaryBg})`,
            border: `2px solid ${COLORS.primary}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LocalHospitalIcon sx={{ fontSize: 36, color: COLORS.primary }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: COLORS.textPrimary }}>
                📋 기존 환자
              </Typography>
              <Typography variant="h6" sx={{ color: COLORS.textSecondary, mt: 0.5 }}>
                환자 이름: {patientInfo.name}
              </Typography>
              <Typography variant="body1" sx={{ color: COLORS.textSecondary, mt: 1 }}>
                진료기록을 추가해주세요.
              </Typography>
            </Box>
          </Box>
        </Card>
      )}

      {(patientFound === "new" || patientFound === "existing") && (
        <Card 
          elevation={12}
          sx={{ 
            mb: 4,
            borderRadius: '20px',
            background: `linear-gradient(135deg, ${COLORS.cardBg}, ${COLORS.primaryBg})`,
            border: `2px solid ${COLORS.primary}`,
            boxShadow: '0 8px 24px rgba(37, 99, 235, 0.15)',
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Alert 
              severity="info" 
              sx={{ 
                mb: 4,
                borderRadius: '12px',
                backgroundColor: COLORS.primaryBg,
                border: `2px solid ${COLORS.primary}`,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: COLORS.primary }}>
                📝 진료기록 작성
              </Typography>
              <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>
                모든 정보는 AES-256 암호화되어 저장되며, 의사와 환자만 복호화할 수 있습니다.
              </Typography>
            </Alert>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="🤒 주요 증상 *"
                  placeholder="환자가 호소하는 주요 증상을 상세히 기록해주세요..."
                  value={medicalRecordForm.symptoms}
                  onChange={(e) =>
                    setMedicalRecordForm({
                      ...medicalRecordForm,
                      symptoms: e.target.value,
                    })
                  }
                  multiline
                  rows={4}
                  required
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="🩺 진단 결과 *"
                  placeholder="진단명 및 진단 근거를 기록해주세요..."
                  value={medicalRecordForm.diagnosis}
                  onChange={(e) =>
                    setMedicalRecordForm({
                      ...medicalRecordForm,
                      diagnosis: e.target.value,
                    })
                  }
                  multiline
                  rows={4}
                  required
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="🏥 치료 계획"
                  placeholder="치료 방법, 시술 내용, 후속 치료 계획 등..."
                  value={medicalRecordForm.treatment}
                  onChange={(e) =>
                    setMedicalRecordForm({
                      ...medicalRecordForm,
                      treatment: e.target.value,
                    })
                  }
                  multiline
                  rows={4}
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="💊 처방전"
                  placeholder="처방약물명, 용법, 용량, 복용기간 등..."
                  value={medicalRecordForm.prescription}
                  onChange={(e) =>
                    setMedicalRecordForm({
                      ...medicalRecordForm,
                      prescription: e.target.value,
                    })
                  }
                  multiline
                  rows={4}
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="📋 추가 메모"
                  placeholder="환자 특이사항, 주의사항, 다음 진료 예약 등..."
                  value={medicalRecordForm.notes}
                  onChange={(e) =>
                    setMedicalRecordForm({
                      ...medicalRecordForm,
                      notes: e.target.value,
                    })
                  }
                  multiline
                  rows={3}
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: COLORS.textPrimary }}>
                    📷 이미지 첨부 (선택사항)
                  </Typography>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<CloudUploadIcon />}
                    sx={{
                      mb: 2,
                      borderRadius: '12px',
                      borderColor: COLORS.primary,
                      color: COLORS.primary,
                      fontWeight: 600,
                      '&:hover': {
                        borderColor: COLORS.primaryHover,
                        backgroundColor: COLORS.primaryBg,
                      },
                    }}
                  >
                    이미지 선택
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      hidden
                      onChange={async (e) => {
                        const files = Array.from(e.target.files);
                        const MAX_IMAGES = 10;
                        const MAX_TOTAL_SIZE = 5 * 1024 * 1024;

                        if (selectedImages.length + files.length > MAX_IMAGES) {
                          alert(
                            `최대 ${MAX_IMAGES}개의 이미지만 첨부할 수 있습니다.\n현재: ${selectedImages.length}개, 추가 시도: ${files.length}개`
                          );
                          e.target.value = "";
                          return;
                        }

                        const validFiles = [];
                        const previews = [];
                        let totalSize = 0;

                        for (const file of files) {
                          if (!validateImageFile(file)) {
                            alert(
                              `${file.name}: 지원하지 않는 형식이거나 파일 크기가 너무 큽니다. (최대 10MB)`
                            );
                            continue;
                          }

                          try {
                            const compressedFile = await compressImage(file, 1280, 1280, 0.7);

                            if (totalSize + compressedFile.size > MAX_TOTAL_SIZE) {
                              alert(
                                `이미지 총 크기가 너무 큽니다. (최대 5MB)\n현재: ${(
                                  totalSize / 1024 / 1024
                                ).toFixed(2)}MB`
                              );
                              break;
                            }

                            validFiles.push(compressedFile);
                            totalSize += compressedFile.size;

                            const base64 = await fileToBase64(compressedFile);
                            previews.push({
                              data: base64ToDataURL(base64, file.type),
                              name: file.name,
                            });
                          } catch (error) {
                            console.error("이미지 처리 오류:", error);
                            alert(`${file.name} 처리 중 오류가 발생했습니다.`);
                          }
                        }

                        setSelectedImages((prev) => [...prev, ...validFiles]);
                        setImagePreviews((prev) => [...prev, ...previews]);
                        e.target.value = "";
                      }}
                    />
                  </Button>
                  <Typography variant="caption" sx={{ display: 'block', color: COLORS.textSecondary, mb: 2 }}>
                    이미지는 암호화되어 IPFS에 저장됩니다. (최대 10개, 총 5MB 이하, JPG/PNG/GIF/WebP)
                  </Typography>

                  {imagePreviews.length > 0 && (
                    <Grid container spacing={2} sx={{ mt: 2 }}>
                      {imagePreviews.map((preview, index) => (
                        <Grid item xs={6} sm={4} md={3} key={index}>
                          <Card
                            sx={{
                              position: 'relative',
                              borderRadius: '12px',
                              overflow: 'hidden',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                              '&:hover': {
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                              },
                            }}
                          >
                            <Box
                              sx={{
                                width: '100%',
                                height: '150px',
                                overflow: 'hidden',
                                backgroundColor: COLORS.border,
                              }}
                            >
                              <img
                                src={preview.data}
                                alt={preview.name}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                }}
                              />
                            </Box>
                            <IconButton
                              onClick={() => {
                                setSelectedImages((prev) => prev.filter((_, i) => i !== index));
                                setImagePreviews((prev) => prev.filter((_, i) => i !== index));
                              }}
                              sx={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                backgroundColor: 'rgba(239, 68, 68, 0.9)',
                                color: 'white',
                                '&:hover': {
                                  backgroundColor: COLORS.error,
                                },
                                width: 32,
                                height: 32,
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                            <CardContent sx={{ p: 1 }}>
                              <Typography
                                variant="caption"
                                sx={{
                                  display: 'block',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  fontSize: '0.7rem',
                                }}
                                title={preview.name}
                              >
                                {preview.name}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </Box>
              </Grid>
            </Grid>

            <Divider sx={{ my: 4 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Button
                variant="contained"
                onClick={handleSubmitMedicalRecord}
                disabled={
                  loading ||
                  uploadingImages ||
                  !medicalRecordForm.symptoms ||
                  !medicalRecordForm.diagnosis
                }
                size="large"
                sx={{
                  px: 6,
                  py: 1.75,
                  fontSize: '1rem',
                  fontWeight: 700,
                  borderRadius: '12px',
                  background: `linear-gradient(45deg, ${COLORS.primary}, ${COLORS.primaryHover})`,
                  boxShadow: `0 4px 16px rgba(37, 99, 235, 0.4)`,
                  textTransform: 'none',
                  '&:hover': {
                    boxShadow: `0 6px 20px rgba(37, 99, 235, 0.5)`,
                    transform: 'translateY(-2px)',
                  },
                  '&:disabled': {
                    background: COLORS.border,
                    boxShadow: 'none',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                {uploadingImages
                  ? "📷 이미지 처리 중..."
                  : loading
                  ? "🔐 암호화 및 저장 중..."
                  : "🔒 암호화하여 진료기록 저장"}
              </Button>

              {(!medicalRecordForm.symptoms || !medicalRecordForm.diagnosis) && (
                <Typography variant="body2" sx={{ color: COLORS.error, fontWeight: 600 }}>
                  * 증상과 진단은 필수 항목입니다.
                </Typography>
              )}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default PatientLookup;
