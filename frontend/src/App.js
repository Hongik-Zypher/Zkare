import React from 'react';
import { BrowserRouter as Router, Routes, Route, createRoutesFromElements } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Home from './pages/Home';
import PatientPage from './pages/PatientPage';
import HospitalPage from './pages/HospitalPage';
import RequesterPage from './pages/RequesterPage';
import DemoPage from './pages/DemoPage';
import Navbar from './components/Navbar';

const theme = createTheme({
  palette: {
    primary: {
      main: '#2e7d32',
    },
    secondary: {
      main: '#1976d2',
    },
  },
});

// React Router v7 향후 플래그 사용
const routerOptions = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router {...routerOptions}>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/patient" element={<PatientPage />} />
          <Route path="/hospital" element={<HospitalPage />} />
          <Route path="/requester" element={<RequesterPage />} />
          <Route path="/demo" element={<DemoPage />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App; 