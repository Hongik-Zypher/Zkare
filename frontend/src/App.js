import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import EncryptedMedical from "./pages/EncryptedMedical";
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
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/encrypted" element={<EncryptedMedical />} />
          {/* 추후 필요한 페이지들을 여기에 추가 */}
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
