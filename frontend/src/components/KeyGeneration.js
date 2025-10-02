import React, { useState, useEffect } from "react";
import { Box, Button, Typography, CircularProgress } from "@mui/material";
import { generateKeyPair } from "../utils/encryption";
import { isDoctor } from "../utils/contracts";

const KeyGeneration = ({ keyRegistryContract, currentAccount }) => {
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    checkUserRole();
  }, [currentAccount]);

  const checkUserRole = async () => {
    if (!currentAccount) return;
    try {
      const doctorStatus = await isDoctor(currentAccount);
      setUserRole(doctorStatus ? "doctor" : "patient");
    } catch (error) {
      console.error("사용자 역할 확인 중 오류:", error);
    }
  };

  const handleGenerateKeys = async () => {
    if (!keyRegistryContract || !currentAccount) {
      alert("컨트랙트 또는 계정이 준비되지 않았습니다.");
      return;
    }

    setLoading(true);
    try {
      console.log("🔑 [키 생성] 시작");
      console.log("📋 현재 계정:", currentAccount);
      console.log("📋 사용자 역할:", userRole);

      // 1단계: RSA 키 쌍 생성
      console.log("🔑 [1단계] RSA 키 쌍 생성 중...");
      const { publicKey, privateKey } = await generateKeyPair();
      console.log("✅ RSA 키 쌍 생성 완료");
      console.log("📋 공개키 길이:", publicKey.length);
      console.log("📋 개인키 길이:", privateKey.length);

      // 2단계: 공개키 등록
      console.log("🔑 [2단계] 공개키 등록 중...");
      console.log("📋 의사로 등록할지 여부:", userRole === "doctor");

      const tx = await keyRegistryContract.registerPublicKey(
        publicKey,
        userRole === "doctor"
      );
      console.log("📋 트랜잭션 해시:", tx.hash);

      console.log("🔑 [3단계] 트랜잭션 확인 대기 중...");
      await tx.wait();
      console.log("✅ 트랜잭션 확인 완료");

      // 3단계: 개인키 다운로드
      console.log("🔑 [4단계] 개인키 다운로드 준비 중...");
      const blob = new Blob([privateKey], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `private_key_${currentAccount}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      console.log("✅ [키 생성] 완료");
      alert("키 생성이 완료되었습니다. 개인키를 안전하게 보관해주세요.");
    } catch (error) {
      console.error("❌ [키 생성] 상세 오류:", error);
      console.error("❌ 오류 메시지:", error.message);
      console.error("❌ 오류 스택:", error.stack);

      // 구체적인 오류 메시지 표시
      let errorMessage = "키 생성 중 오류가 발생했습니다.";

      if (error.message.includes("user rejected")) {
        errorMessage = "사용자가 트랜잭션을 거부했습니다.";
      } else if (error.message.includes("insufficient funds")) {
        errorMessage = "가스비가 부족합니다.";
      } else if (error.message.includes("already registered")) {
        errorMessage = "이미 공개키가 등록되어 있습니다.";
      } else if (error.message.includes("Public key cannot be empty")) {
        errorMessage = "공개키가 비어있습니다.";
      }

      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        p: 3,
        border: "1px solid #e0e0e0",
        borderRadius: 2,
        bgcolor: "#f5f5f5",
      }}
    >
      <Typography variant="h6" gutterBottom>
        🔑 암호화 키 생성
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        {userRole === "doctor"
          ? "의사용 RSA 키 쌍을 생성하여 환자 기록을 안전하게 관리하세요."
          : "환자용 RSA 키 쌍을 생성하여 의료 기록을 안전하게 보호하세요."}
      </Typography>
      <Button
        variant="contained"
        onClick={handleGenerateKeys}
        disabled={loading || !userRole}
        sx={{
          mt: 2,
          backgroundColor: "#2E7D32",
          "&:hover": {
            backgroundColor: "#1b5e20",
          },
        }}
      >
        {loading ? <CircularProgress size={24} /> : "키 생성하기"}
      </Button>
    </Box>
  );
};

export default KeyGeneration;
