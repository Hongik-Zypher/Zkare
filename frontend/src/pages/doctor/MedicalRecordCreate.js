import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Typography,
  Card,
  Grid,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper
} from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { ethers } from 'ethers';
import { encryptMedicalRecord } from '../../utils/encryption';
import { getPublicKey } from '../../utils/contracts';
import KeyRegistryABI from '../../abis/KeyRegistry.json';
import EncryptedMedicalRecordABI from '../../abis/EncryptedMedicalRecord.json';

function MedicalRecordCreate() {
  const [searchParams] = useSearchParams();
  const patientAddress = searchParams.get('address');
  const [currentAccount, setCurrentAccount] = useState('');
  const [keyRegistryContract, setKeyRegistryContract] = useState(null);
  const [medicalRecordContract, setMedicalRecordContract] = useState(null);
  const [patientExists, setPatientExists] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [showBasicInfoDialog, setShowBasicInfoDialog] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [privateKeyFile, setPrivateKeyFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Basic Info Form State
  const [basicInfoForm, setBasicInfoForm] = useState({
    name: '',
    height: '',
    weight: '',
    bloodType: '',
    ssn: ''
  });

  // Medical Info Form State
  const [medicalInfoForm, setMedicalInfoForm] = useState({
    symptoms: '',
    diagnosis: '',
    treatment: '',
    prescription: '',
    notes: ''
  });

  // 환자 기본 정보
  const [basicInfo, setBasicInfo] = useState({
    height: '',
    weight: '',
    bloodType: '',
    ssn: '',
    allergies: '',
    chronicDiseases: ''
  });

  // 진료 정보
  const [medicalInfo, setMedicalInfo] = useState({
    patientAddress: searchParams.get('patient') || '',
    diagnosis: '',
    prescription: '',
    notes: '',
    recordType: 'general'
  });

  // Form Input Handlers
  const handleBasicInfoChange = (e) => {
    const { name, value } = e.target;
    setBasicInfoForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMedicalInfoChange = (e) => {
    const { name, value } = e.target;
    setMedicalInfoForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Contract Initialization
  useEffect(() => {
    const initializeContracts = async () => {
      try {
        if (typeof window.ethereum === 'undefined') {
          throw new Error('MetaMask is not installed');
        }

        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const account = await signer.getAddress();
        setCurrentAccount(account);

        // Create Contract Instances
        const keyRegistry = new ethers.Contract(
          process.env.REACT_APP_KEY_REGISTRY_ADDRESS,
          KeyRegistryABI,
          signer
        );
        setKeyRegistryContract(keyRegistry);

        const medicalRecord = new ethers.Contract(
          process.env.REACT_APP_ENCRYPTED_MEDICAL_RECORD_ADDRESS,
          EncryptedMedicalRecordABI,
          signer
        );
        setMedicalRecordContract(medicalRecord);
      } catch (error) {
        console.error('Contract initialization error:', error);
        setStatus({
          type: 'error',
          message: 'Error initializing contracts'
        });
      }
    };

    initializeContracts();
  }, []);

  useEffect(() => {
    if (medicalInfo.patientAddress) {
      checkPatientExists();
    }
  }, [medicalInfo.patientAddress]);

  const checkPatientExists = async () => {
    try {
      // TODO: 실제 환자 존재 여부 확인 로직 구현
      const exists = false; // 임시로 false 설정
      setPatientExists(exists);
      if (!exists) {
        setShowBasicInfoDialog(true);
      }
    } catch (error) {
      setStatus({
        type: 'error',
        message: '환자 정보 확인 중 오류가 발생했습니다.'
      });
    }
  };

  const handleBasicInfoSubmit = async () => {
    try {
        setLoading(true);
        setError('');

        if (!medicalRecordContract) {
            throw new Error('컨트랙트가 초기화되지 않았습니다.');
        }

        // contracts.js의 함수 사용 (ENS 에러 없음)
        const patientPublicKeyData = await getPublicKey(medicalInfo.patientAddress);
        const doctorPublicKeyData = await getPublicKey(currentAccount);
        
        if (!patientPublicKeyData[0] || !doctorPublicKeyData[0]) {
            throw new Error('공개키를 찾을 수 없습니다.');
        }

        const patientPublicKey = patientPublicKeyData[0];
        const doctorPublicKey = doctorPublicKeyData[0];

        // 기본 정보를 JSON 형식으로 변환
        const basicInfo = {
            height: basicInfoForm.height,
            weight: basicInfoForm.weight,
            bloodType: basicInfoForm.bloodType,
            ssn: basicInfoForm.ssn
        };

        // 기본 정보 암호화
        const encryptedData = await encryptMedicalRecord(
            basicInfo,
            doctorPublicKey,
            patientPublicKey
        );

        // 환자 등록
        const tx = await medicalRecordContract.registerPatient(
            medicalInfo.patientAddress,
            basicInfoForm.name,
            JSON.stringify(encryptedData.encryptedRecord),
            encryptedData.encryptedDoctorKey,
            encryptedData.encryptedPatientKey
        );

        await tx.wait();
        setShowBasicInfoDialog(false);
        setStatus({
            type: 'success',
            message: '환자가 성공적으로 등록되었습니다.'
        });

        // 기본 정보 폼 초기화
        setBasicInfoForm({
            name: '',
            height: '',
            weight: '',
            bloodType: '',
            ssn: ''
        });

    } catch (error) {
        console.error('환자 등록 중 오류:', error);
        setError('환자 등록에 실패했습니다: ' + error.message);
    } finally {
        setLoading(false);
    }
};

  const handleMedicalInfoSubmit = async () => {
    try {
      if (!privateKeyFile || !medicalRecordContract) {
        throw new Error('Required information missing');
      }

      // Read private key file
      const reader = new FileReader();
      const privateKey = await new Promise((resolve, reject) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(privateKeyFile);
      });

      // contracts.js의 함수 사용 (ENS 에러 없음)
      const patientPublicKeyData = await getPublicKey(patientAddress);
      const doctorPublicKeyData = await getPublicKey(currentAccount);
      
      const patientPublicKey = patientPublicKeyData[0];
      const doctorPublicKey = doctorPublicKeyData[0];

      // Encrypt medical record
      const medicalRecord = {
        symptoms: medicalInfoForm.symptoms,
        diagnosis: medicalInfoForm.diagnosis,
        treatment: medicalInfoForm.treatment,
        prescription: medicalInfoForm.prescription,
        notes: medicalInfoForm.notes,
        date: new Date().toISOString()
      };

      const encryptedMedicalRecord = await encryptMedicalRecord(
        medicalRecord,
        doctorPublicKey,
        patientPublicKey
      );

      // Save medical record
      const tx = await medicalRecordContract.addMedicalRecord(
        patientAddress,
        JSON.stringify({
          encryptedRecord: encryptedMedicalRecord.encryptedRecord,
          iv: encryptedMedicalRecord.iv
        }),
        encryptedMedicalRecord.encryptedAESKeyForDoctor,
        encryptedMedicalRecord.encryptedAESKeyForPatient
      );
      await tx.wait();

      setStatus({
        type: 'success',
        message: 'Medical record saved successfully'
      });
    } catch (error) {
      console.error('Error saving medical record:', error);
      setStatus({
        type: 'error',
        message: 'Error saving medical record'
      });
    }
  };

  const handlePrivateKeyUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setPrivateKeyFile(file);
      setStatus({
        type: 'success',
        message: '개인키 파일이 업로드되었습니다.'
      });
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Create Medical Record
      </Typography>

      {status.message && (
        <Alert severity={status.type} sx={{ mb: 2 }}>
          {status.message}
        </Alert>
      )}

      <Card sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Patient Address"
              value={medicalInfo.patientAddress}
              onChange={(e) => setMedicalInfo({
                ...medicalInfo,
                patientAddress: e.target.value
              })}
              required
            />
          </Grid>

          <Grid item xs={12}>
            <input
              type="file"
              accept=".txt"
              onChange={handlePrivateKeyUpload}
              style={{ display: 'none' }}
              id="private-key-upload"
            />
            <label htmlFor="private-key-upload">
              <Button
                variant="outlined"
                component="span"
                fullWidth
              >
                Upload Private Key File
              </Button>
            </label>
            {privateKeyFile && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Uploaded file: {privateKeyFile.name}
              </Typography>
            )}
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Record Type</InputLabel>
              <Select
                value={medicalInfo.recordType}
                onChange={(e) => setMedicalInfo({
                  ...medicalInfo,
                  recordType: e.target.value
                })}
                label="Record Type"
              >
                <MenuItem value="general">General</MenuItem>
                <MenuItem value="emergency">Emergency</MenuItem>
                <MenuItem value="followup">Follow-up</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Diagnosis"
              multiline
              rows={3}
              value={medicalInfo.diagnosis}
              onChange={(e) => setMedicalInfo({
                ...medicalInfo,
                diagnosis: e.target.value
              })}
              required
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Prescription"
              multiline
              rows={3}
              value={medicalInfo.prescription}
              onChange={(e) => setMedicalInfo({
                ...medicalInfo,
                prescription: e.target.value
              })}
              required
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Notes"
              multiline
              rows={3}
              value={medicalInfo.notes}
              onChange={(e) => setMedicalInfo({
                ...medicalInfo,
                notes: e.target.value
              })}
            />
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={() => window.history.back()}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleMedicalInfoSubmit}
                disabled={!medicalInfo.patientAddress || !medicalInfo.diagnosis}
              >
                Save
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Card>

      {/* 환자 기본 정보 입력 다이얼로그 */}
      <Dialog
        open={showBasicInfoDialog}
        onClose={() => setShowBasicInfoDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Patient Basic Information</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="normal"
            label="Name"
            name="name"
            value={basicInfoForm.name}
            onChange={handleBasicInfoChange}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Height (cm)"
            name="height"
            type="number"
            value={basicInfoForm.height}
            onChange={handleBasicInfoChange}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Weight (kg)"
            name="weight"
            type="number"
            value={basicInfoForm.weight}
            onChange={handleBasicInfoChange}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Blood Type"
            name="bloodType"
            value={basicInfoForm.bloodType}
            onChange={handleBasicInfoChange}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Social Security Number"
            name="ssn"
            value={basicInfoForm.ssn}
            onChange={handleBasicInfoChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowBasicInfoDialog(false)}>Cancel</Button>
          <Button onClick={handleBasicInfoSubmit} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* 진료 정보 입력 폼 */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Medical Record Information
        </Typography>
        <TextField
          fullWidth
          margin="normal"
          label="Symptoms"
          name="symptoms"
          multiline
          rows={3}
          value={medicalInfoForm.symptoms}
          onChange={handleMedicalInfoChange}
        />
        <TextField
          fullWidth
          margin="normal"
          label="Diagnosis"
          name="diagnosis"
          multiline
          rows={2}
          value={medicalInfoForm.diagnosis}
          onChange={handleMedicalInfoChange}
        />
        <TextField
          fullWidth
          margin="normal"
          label="Treatment Plan"
          name="treatment"
          multiline
          rows={2}
          value={medicalInfoForm.treatment}
          onChange={handleMedicalInfoChange}
        />
        <TextField
          fullWidth
          margin="normal"
          label="Prescription"
          name="prescription"
          multiline
          rows={2}
          value={medicalInfoForm.prescription}
          onChange={handleMedicalInfoChange}
        />
        <TextField
          fullWidth
          margin="normal"
          label="Additional Notes"
          name="notes"
          multiline
          rows={2}
          value={medicalInfoForm.notes}
          onChange={handleMedicalInfoChange}
        />
      </Paper>
    </Box>
  );
}

export default MedicalRecordCreate; 