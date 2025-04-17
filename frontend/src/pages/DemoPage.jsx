import React from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import PlayCircleFilledIcon from '@mui/icons-material/PlayCircleFilled';
import FavoriteIcon from '@mui/icons-material/Favorite';
import AssignmentIcon from '@mui/icons-material/Assignment';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import { Link } from 'react-router-dom';

const DemoPage = () => {
  return (
    <Container maxWidth="md" sx={{ mt: 5, mb: 5 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box display="flex" alignItems="center" mb={3}>
          <PlayCircleFilledIcon fontSize="large" color="primary" sx={{ mr: 2 }} />
          <Typography variant="h4" component="h1">
            ZKare 데모 페이지
          </Typography>
        </Box>
        
        <Typography variant="body1" paragraph>
          ZKare는 영지식 증명(Zero-Knowledge Proof)을 활용하여 의료 정보의 프라이버시를 보호하면서
          필요한 정보만 공개할 수 있는 블록체인 기반 의료 정보 시스템입니다.
        </Typography>
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="h5" gutterBottom>
          데모 시나리오
        </Typography>
        
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" color="primary" gutterBottom>
                  <FavoriteIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  혈액형 증명 데모
                </Typography>
                
                <Typography variant="body2" paragraph>
                  환자의 실제 혈액형 정보를 공개하지 않고, 특정 혈액형과 일치하는지 여부만 증명할 수 있습니다.
                </Typography>
                
                <List dense>
                  <ListItem>
                    <ListItemIcon>1</ListItemIcon>
                    <ListItemText primary="환자 페이지에서 지갑 연결" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>2</ListItemIcon>
                    <ListItemText primary="혈액형 정보 확인" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>3</ListItemIcon>
                    <ListItemText primary="영지식 증명 생성" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>4</ListItemIcon>
                    <ListItemText primary="블록체인에서 검증" />
                  </ListItem>
                </List>
                
                <Button 
                  variant="contained" 
                  color="primary" 
                  fullWidth 
                  component={Link} 
                  to="/patient"
                  sx={{ mt: 2 }}
                >
                  환자 페이지로 이동
                </Button>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" color="primary" gutterBottom>
                  <AssignmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  의료 정보 접근 요청 데모
                </Typography>
                
                <Typography variant="body2" paragraph>
                  의료 전문가가 환자의 의료 정보에 접근하기 위한 요청을 생성하고, 환자가 이를 승인하는 과정을 시연합니다.
                </Typography>
                
                <List dense>
                  <ListItem>
                    <ListItemIcon>1</ListItemIcon>
                    <ListItemText primary="요청자 페이지에서 정보 접근 요청 생성" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>2</ListItemIcon>
                    <ListItemText primary="환자 페이지에서 요청 확인 및 승인" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>3</ListItemIcon>
                    <ListItemText primary="영지식 증명을 통한 정보 공유" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>4</ListItemIcon>
                    <ListItemText primary="블록체인에 접근 권한 기록" />
                  </ListItem>
                </List>
                
                <Button 
                  variant="contained" 
                  color="primary" 
                  fullWidth
                  component={Link}
                  to="/requester"
                  sx={{ mt: 2 }}
                >
                  요청자 페이지로 이동
                </Button>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" color="primary" gutterBottom>
                  <LocalHospitalIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  병원 페이지 - 환자 정보 등록
                </Typography>
                
                <Typography variant="body2" paragraph>
                  병원에서 환자의 기본 의료 정보(이름, 키, 몸무게, 혈액형)을 등록할 수 있습니다.
                  등록된 정보는 블록체인에 안전하게 저장됩니다.
                </Typography>
                
                <Button 
                  variant="contained" 
                  color="primary"
                  component={Link}
                  to="/hospital"
                  sx={{ mt: 2 }}
                >
                  병원 페이지로 이동
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        <Box mt={4} p={2} bgcolor="rgba(46, 125, 50, 0.1)" borderRadius={1}>
          <Typography variant="subtitle1" color="primary" gutterBottom>
            데모 시작하기 전에:
          </Typography>
          <Typography variant="body2">
            1. MetaMask 지갑 설치 및 연결이 필요합니다.<br />
            2. 백엔드 서버가 실행 중이어야 합니다.<br />
            3. 테스트를 위해서는 각 페이지에서 지갑을 연결해주세요.
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default DemoPage; 