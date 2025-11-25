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
      main: "#2563EB", // 블루 600
      dark: "#1E40AF", // 호버 색상
    },
    secondary: {
      main: "#10B981", // 성공 색상
    },
    error: {
      main: "#EF4444",
    },
    warning: {
      main: "#B45309",
      light: "#FFF7D6",
    },
    background: {
      default: "#F9FAFB",
      paper: "#FFFFFF",
    },
  },
  typography: {
    fontFamily: 'Inter, "Noto Sans KR", sans-serif',
    h1: {
      color: "#1F2937",
    },
    h2: {
      color: "#1F2937",
    },
    h3: {
      color: "#1F2937",
    },
    body1: {
      color: "#1F2937",
    },
    body2: {
      color: "#6B7280",
    },
  },
  spacing: 8,
  shape: {
    borderRadius: 8,
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
