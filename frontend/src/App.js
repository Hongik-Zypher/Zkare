import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
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