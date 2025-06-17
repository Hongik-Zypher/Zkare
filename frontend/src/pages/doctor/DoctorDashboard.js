import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Grid, 
  Typography, 
  Box, 
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
} from '@mui/material';
import { Link } from 'react-router-dom';
import { getPatientInfo } from '../../utils/contracts';
import PatientLookup from '../../components/PatientLookup';

function DoctorDashboard() {
  const [recentPatients, setRecentPatients] = useState([]);
  const [stats, setStats] = useState({
    totalPatients: 0,
    todayRecords: 0,
    pendingRecords: 0
  });
  const [openViewRecords, setOpenViewRecords] = useState(false);
  const [patientAddress, setPatientAddress] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // 데이터 로딩 로직 구현 필요
    // 임시 데이터
    setRecentPatients([
      { address: '0x123...', name: '환자1', lastVisit: '2024-03-20' },
      { address: '0x456...', name: '환자2', lastVisit: '2024-03-19' }
    ]);

    setStats({
      totalPatients: 150,
      todayRecords: 8,
      pendingRecords: 3
    });
  }, []);

  const handleViewRecords = () => {
    setOpenViewRecords(true);
  };

  const handleCloseViewRecords = () => {
    setOpenViewRecords(false);
    setPatientAddress('');
    setError('');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Doctor Portal
      </Typography>

      {/* 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 2 }}>
            <Typography variant="h6">Total Patients</Typography>
            <Typography variant="h3">{stats.totalPatients}</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 2 }}>
            <Typography variant="h6">Today's Medical Records</Typography>
            <Typography variant="h3">{stats.todayRecords}</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 2 }}>
            <Typography variant="h6">Pending Records</Typography>
            <Typography variant="h3">{stats.pendingRecords}</Typography>
          </Card>
        </Grid>
      </Grid>

      {/* 빠른 작업 버튼 */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2}>
          <Grid item>
            <Button
              variant="contained"
              color="primary"
              component={Link}
              to="/doctor/record/create"
            >
              Create New Medical Record
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              color="primary"
              onClick={handleViewRecords}
            >
              View Patient Records
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* 최근 환자 목록 */}
      <Typography variant="h5" gutterBottom>
        Recent Patients
      </Typography>
      <Grid container spacing={2}>
        {recentPatients.map((patient, index) => (
          <Grid item xs={12} md={6} key={index}>
            <Card sx={{ p: 2 }}>
              <Typography variant="subtitle1">{patient.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                Address: {patient.address}
              </Typography>
              <Typography variant="body2">
                Last Visit: {patient.lastVisit}
              </Typography>
              <Button
                size="small"
                color="primary"
                onClick={() => {
                  setPatientAddress(patient.address);
                  handleViewRecords();
                }}
              >
                View Records
              </Button>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 환자 기록 조회 다이얼로그 */}
      <Dialog
        open={openViewRecords}
        onClose={handleCloseViewRecords}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>View Patient Records</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <PatientLookup />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewRecords}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default DoctorDashboard; 