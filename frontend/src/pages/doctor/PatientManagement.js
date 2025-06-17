import React, { useState } from 'react';
import {
  Box,
  TextField,
  Typography,
  Card,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import { Link } from 'react-router-dom';

function PatientManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [patients] = useState([
    {
      address: '0x123...',
      lastVisit: '2024-03-20',
      recordCount: 5,
      recentDiagnosis: 'Common Cold'
    },
    {
      address: '0x456...',
      lastVisit: '2024-03-19',
      recordCount: 3,
      recentDiagnosis: 'Gastritis'
    }
  ]);

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  const filteredPatients = patients.filter(patient =>
    patient.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Patient Management
      </Typography>

      {/* Search Bar */}
      <Card sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Search by Patient Address"
              variant="outlined"
              value={searchTerm}
              onChange={handleSearch}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Button
              variant="contained"
              color="primary"
              component={Link}
              to="/doctor/record/create"
            >
              Create New Medical Record
            </Button>
          </Grid>
        </Grid>
      </Card>

      {/* Patient List Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Patient Address</TableCell>
              <TableCell>Last Visit</TableCell>
              <TableCell>Record Count</TableCell>
              <TableCell>Recent Diagnosis</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPatients.map((patient, index) => (
              <TableRow key={index}>
                <TableCell>{patient.address}</TableCell>
                <TableCell>{patient.lastVisit}</TableCell>
                <TableCell>{patient.recordCount}</TableCell>
                <TableCell>{patient.recentDiagnosis}</TableCell>
                <TableCell>
                  <Button
                    variant="outlined"
                    size="small"
                    component={Link}
                    to={`/doctor/record/create?patient=${patient.address}`}
                  >
                    Create Record
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default PatientManagement; 