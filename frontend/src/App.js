import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import EncryptedMedical from "./pages/EncryptedMedical";
import KeyRecoveryPage from "./pages/KeyRecovery/KeyRecoveryPage";
import GuardianApprovalPage from "./pages/KeyRecovery/GuardianApprovalPage";
import GuardianDashboard from "./pages/KeyRecovery/GuardianDashboard";
import "./App.css";

const theme = createTheme({
  palette: {
    primary: {
      main: "#2e7d32", // 의료 관련 녹색
    },
    secondary: {
      main: "#1976d2", // 파란색
    },
  },
  typography: {
    fontFamily: '"Noto Sans KR", "Roboto", "Helvetica", "Arial", sans-serif',
  },
});

function App() {
  const [currentAccount, setCurrentAccount] = useState("");

  useEffect(() => {
    checkExistingConnection();
    
    // MetaMask 계정 변경 감지
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setCurrentAccount(accounts[0]);
        } else {
          setCurrentAccount("");
        }
      });
    }
  }, []);

  const checkExistingConnection = async () => {
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setCurrentAccount(accounts[0]);
        }
      }
    } catch (error) {
      console.error("연결 상태 확인 중 오류:", error);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Navbar currentAccount={currentAccount} setCurrentAccount={setCurrentAccount} />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/encrypted" element={<EncryptedMedical currentAccount={currentAccount} />} />
          <Route path="/key-recovery" element={<KeyRecoveryPage currentAccount={currentAccount} />} />
          <Route path="/guardian-dashboard" element={<GuardianDashboard currentAccount={currentAccount} />} />
          <Route path="/guardian-approval/:requestId?" element={<GuardianApprovalPage currentAccount={currentAccount} />} />
          {/* 추후 필요한 페이지들을 여기에 추가 */}
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
