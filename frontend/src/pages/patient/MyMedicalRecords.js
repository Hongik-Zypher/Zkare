import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Alert,
  CircularProgress
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

function MyMedicalRecords() {
  const [records, setRecords] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [privateKeyFile, setPrivateKeyFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [basicInfo, setBasicInfo] = useState(null);

  const handlePrivateKeyUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setPrivateKeyFile(file);
      loadMedicalRecords(file);
    }
  };

  const loadMedicalRecords = async (keyFile) => {
    try {
      setLoading(true);
      // TODO: 개인키를 사용한 의료 기록 복호화 및 로딩 로직 구현
      
      // 임시 데이터
      setBasicInfo({
        height: '175',
        weight: '70',
        bloodType: 'A',
        ssn: '******-*******',
        allergies: '없음',
        chronicDiseases: '없음'
      });

      setRecords([
        {
          id: 1,
          date: '2024-03-20',
          doctor: '0xabc...',
          type: 'general',
          diagnosis: '감기',
          prescription: '해열제, 종합감기약',
          notes: '3일간 복용'
        },
        {
          id: 2,
          date: '2024-03-15',
          doctor: '0xdef...',
          type: 'followup',
          diagnosis: '위염',
          prescription: '위장약',
          notes: '식사 후 복용'
        }
      ]);

      setStatus({
        type: 'success',
        message: '의료 기록을 성공적으로 불러왔습니다.'
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: '의료 기록을 불러오는 중 오류가 발생했습니다.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (event) => {
    setFilterType(event.target.value);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const filteredRecords = records.filter(record => {
    const matchesType = filterType === 'all' || record.type === filterType;
    const matchesSearch = record.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.prescription.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        내 진료 기록
      </Typography>

      {status.message && (
        <Alert severity={status.type} sx={{ mb: 2 }}>
          {status.message}
        </Alert>
      )}

      {/* 개인키 업로드 섹션 */}
      {!privateKeyFile && (
        <Card sx={{ p: 3, mb: 3, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            진료 기록을 조회하려면 개인키가 필요합니다
          </Typography>
          <input
            type="file"
            accept=".txt"
            onChange={handlePrivateKeyUpload}
            style={{ display: 'none' }}
            id="private-key-upload"
          />
          <label htmlFor="private-key-upload">
            <Button
              variant="contained"
              component="span"
            >
              개인키 파일 업로드
            </Button>
          </label>
        </Card>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {privateKeyFile && !loading && (
        <>
          {/* 기본 정보 카드 */}
          {basicInfo && (
            <Card sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                기본 정보
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2">키</Typography>
                  <Typography>{basicInfo.height} cm</Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2">체중</Typography>
                  <Typography>{basicInfo.weight} kg</Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2">혈액형</Typography>
                  <Typography>{basicInfo.bloodType}형</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">알레르기</Typography>
                  <Typography>{basicInfo.allergies}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">만성 질환</Typography>
                  <Typography>{basicInfo.chronicDiseases}</Typography>
                </Grid>
              </Grid>
            </Card>
          )}

          {/* 필터 및 검색 */}
          <Card sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="진단/처방으로 검색"
                  variant="outlined"
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>진료 유형</InputLabel>
                  <Select
                    value={filterType}
                    onChange={handleFilterChange}
                    label="진료 유형"
                  >
                    <MenuItem value="all">전체</MenuItem>
                    <MenuItem value="general">일반 진료</MenuItem>
                    <MenuItem value="emergency">응급 진료</MenuItem>
                    <MenuItem value="followup">추적 진료</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Card>

          {/* 진료 기록 목록 */}
          {filteredRecords.map((record) => (
            <Accordion key={record.id} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <Typography>{record.date}</Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography>{record.diagnosis}</Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography color="textSecondary">
                      담당의: {record.doctor}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography color="textSecondary">
                      {record.type === 'general' ? '일반 진료' :
                       record.type === 'emergency' ? '응급 진료' : '추적 진료'}
                    </Typography>
                  </Grid>
                </Grid>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1">진단</Typography>
                    <Typography paragraph>{record.diagnosis}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1">처방</Typography>
                    <Typography paragraph>{record.prescription}</Typography>
                  </Grid>
                  {record.notes && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle1">특이사항</Typography>
                      <Typography>{record.notes}</Typography>
                    </Grid>
                  )}
                </Grid>
              </AccordionDetails>
            </Accordion>
          ))}

          {filteredRecords.length === 0 && (
            <Card sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="textSecondary">
                조회된 진료 기록이 없습니다.
              </Typography>
            </Card>
          )}
        </>
      )}
    </Box>
  );
}

export default MyMedicalRecords; 