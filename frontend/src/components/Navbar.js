import React from "react";
import { AppBar, Toolbar, Typography, Button, Box, Chip } from "@mui/material";
import { Link } from "react-router-dom";
import { LocalHospital, Security, Shield } from '@mui/icons-material';
import { Container } from "@mui/material";

const Navbar = ({ currentAccount, setCurrentAccount }) => {
  
  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        });
        setCurrentAccount(accounts[0]);
      } else {
        alert('MetaMask가 설치되어 있지 않습니다.');
      }
    } catch (error) {
      console.error('지갑 연결 오류:', error);
    }
  };
  return (
    <AppBar position="static" sx={{ backgroundColor: '#2E7D32' }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <LocalHospital sx={{ display: { xs: 'none', md: 'flex' }, mr: 1 }} />
          <Typography
            variant="h6"
            noWrap
            component="a"
            href="/"
            sx={{
              mr: 2,
              display: { xs: 'none', md: 'flex' },
              fontFamily: 'monospace',
              fontWeight: 700,
              letterSpacing: '.3rem',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            Medical Records
          </Typography>
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            <Button
              color="inherit"
              component={Link}
              to="/"
              sx={{ fontWeight: "medium" }}
            >
              홈
            </Button>
            <Button
              color="inherit"
              component={Link}
              to="/encrypted"
              sx={{ 
                fontWeight: "medium",
                ml: 2,
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.3)"
              }}
            >
              🏥 의료기록 관리
            </Button>
            <Button
              color="inherit"
              component={Link}
              to="/key-recovery"
              startIcon={<Security />}
              sx={{ 
                fontWeight: "medium",
                ml: 2,
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.3)"
              }}
            >
              키 복구
            </Button>
            <Button
              color="inherit"
              component={Link}
              to="/guardian-dashboard"
              startIcon={<Shield />}
              sx={{ 
                fontWeight: "medium",
                ml: 2,
                background: "rgba(255,165,0,0.2)",
                border: "1px solid rgba(255,255,255,0.5)"
              }}
            >
              보호자 대시보드
            </Button>
          </Box>
          
          <Box>
            {currentAccount ? (
              <Chip
                label={`${currentAccount.substring(0, 6)}...${currentAccount.substring(38)}`}
                variant="outlined"
                sx={{ 
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.5)',
                  '& .MuiChip-label': { color: 'white' }
                }}
              />
            ) : (
              <Button
                color="inherit"
                onClick={connectWallet}
                variant="outlined"
                sx={{ 
                  borderColor: 'rgba(255,255,255,0.5)',
                  '&:hover': { borderColor: 'white' }
                }}
              >
                지갑 연결
              </Button>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar;
