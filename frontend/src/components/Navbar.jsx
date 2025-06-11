import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  Chip
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import HomeIcon from '@mui/icons-material/Home';

const Navbar = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // 지갑 연결 상태 확인
    const checkConnection = async () => {
      if (window.ethereum && window.ethereum.selectedAddress) {
        setWalletAddress(window.ethereum.selectedAddress);
        setIsConnected(true);
      }
    };

    checkConnection();

    // 계정 변경 이벤트 리스너
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setIsConnected(true);
        } else {
          setWalletAddress('');
          setIsConnected(false);
        }
      });
    }
  }, []);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        });
        setWalletAddress(accounts[0]);
        setIsConnected(true);
      } catch (error) {
        console.error('지갑 연결 오류:', error);
      }
    } else {
      alert('MetaMask가 설치되어 있지 않습니다. MetaMask를 설치해주세요.');
    }
  };

  return (
    <AppBar position="static">
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          {/* 로고 */}
          <AccountBalanceIcon sx={{ display: { xs: 'flex', md: 'flex' }, mr: 1 }} />
          <Typography
            variant="h6"
            noWrap
            component={RouterLink}
            to="/"
            sx={{
              mr: 2,
              display: { xs: 'flex', md: 'flex' },
              fontWeight: 700,
              color: 'inherit',
              textDecoration: 'none',
              flexGrow: 1,
            }}
          >
            Zkare 의료기록 관리 시스템
          </Typography>

          {/* 홈 버튼 */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, mr: 2 }}>
            <Button
              component={RouterLink}
              to="/"
              sx={{ 
                my: 2, 
                color: 'white', 
                display: 'flex', 
                alignItems: 'center',
                backgroundColor: location.pathname === '/' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                },
                borderRadius: 1,
              }}
              startIcon={<HomeIcon />}
            >
              홈
            </Button>
          </Box>

          {/* 지갑 연결 버튼 */}
          <Box sx={{ flexGrow: 0 }}>
            {isConnected ? (
              <Chip
                label={`${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`}
                color="secondary"
                variant="outlined"
                sx={{ color: 'white', borderColor: 'white' }}
              />
            ) : (
              <Button
                color="inherit"
                variant="outlined"
                onClick={connectWallet}
                sx={{ 
                  borderColor: 'white',
                  '&:hover': {
                    borderColor: 'white',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  }
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