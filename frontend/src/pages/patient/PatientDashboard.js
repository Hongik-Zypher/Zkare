import React, { useState, useEffect } from 'react';
import { Card, Grid, Typography, Box, Button } from '@mui/material';
import { Link } from 'react-router-dom';

function PatientDashboard() {
  const [myRecords, setMyRecords] = useState([]);
  const [patientInfo, setPatientInfo] = useState({
    address: '',
    totalRecords: 0,
    lastVisit: null
  });

  useEffect(() => {
    // 데이터 로딩 로직 구현 필요
    // 임시 데이터
    setMyRecords([
      {
        id: 1,
        date: '2024-03-20',
        doctor: '0xabc...',
        diagnosis: '감기',
        prescription: '해열제'
      },
      {
        id: 2,
        date: '2024-03-15',
        doctor: '0xdef...',
        diagnosis: '위염',
        prescription: '소화제'
      }
    ]);

    setPatientInfo({
      address: '0x123...',
      totalRecords: 15,
      lastVisit: '2024-03-20'
    });
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        내 의료 기록
      </Typography>

      {/* 환자 정보 카드 */}
      <Card sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1">내 지갑 주소</Typography>
            <Typography variant="body1">{patientInfo.address}</Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1">전체 진료 기록</Typography>
            <Typography variant="h4">{patientInfo.totalRecords}</Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1">최근 진료일</Typography>
            <Typography variant="body1">{patientInfo.lastVisit}</Typography>
          </Grid>
        </Grid>
      </Card>

      {/* 빠른 작업 버튼 */}
      <Box sx={{ mb: 4 }}>
        <Button
          variant="contained"
          color="primary"
          component={Link}
          to="/patient/records"
        >
          전체 진료 기록 보기
        </Button>
      </Box>

      {/* 최근 진료 기록 */}
      <Typography variant="h5" gutterBottom>
        최근 진료 기록
      </Typography>
      <Grid container spacing={2}>
        {myRecords.map((record) => (
          <Grid item xs={12} key={record.id}>
            <Card sx={{ p: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <Typography variant="subtitle2">진료일</Typography>
                  <Typography variant="body1">{record.date}</Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="subtitle2">담당 의사</Typography>
                  <Typography variant="body1">{record.doctor}</Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="subtitle2">진단</Typography>
                  <Typography variant="body1">{record.diagnosis}</Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="subtitle2">처방</Typography>
                  <Typography variant="body1">{record.prescription}</Typography>
                </Grid>
              </Grid>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export default PatientDashboard; 