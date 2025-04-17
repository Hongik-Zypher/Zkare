import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  IconButton,
  Menu,
  MenuItem,
  Chip
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import PersonIcon from '@mui/icons-material/Person';
import MedicalInformationIcon from '@mui/icons-material/MedicalInformation';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import HomeIcon from '@mui/icons-material/Home';

// 네비게이션 링크 정의
const pages = [
  { title: '홈', path: '/', icon: <HomeIcon /> },
  { title: '환자', path: '/patient', icon: <PersonIcon /> },
  { title: '병원', path: '/hospital', icon: <LocalHospitalIcon /> },
  { title: '요청자', path: '/requester', icon: <MedicalInformationIcon /> },
  { title: '데모', path: '/demo', icon: <PlayCircleIcon /> }
];

const Navbar = () => {
  const [anchorElNav, setAnchorElNav] = useState(null);
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

  const handleOpenNavMenu = (event) => {
    setAnchorElNav(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  // 현재 활성화된 페이지 확인
  const isActive = (path) => location.pathname === path;

  return (
    <AppBar position="static">
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          {/* 로고 (큰 화면) */}
          <AccountBalanceIcon sx={{ display: { xs: 'none', md: 'flex' }, mr: 1 }} />
          <Typography
            variant="h6"
            noWrap
            component={RouterLink}
            to="/"
            sx={{
              mr: 2,
              display: { xs: 'none', md: 'flex' },
              fontWeight: 700,
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            ZKare
          </Typography>

          {/* 모바일 메뉴 */}
          <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              size="large"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleOpenNavMenu}
              color="inherit"
            >
              <MenuIcon />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorElNav}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
              open={Boolean(anchorElNav)}
              onClose={handleCloseNavMenu}
              sx={{
                display: { xs: 'block', md: 'none' },
              }}
            >
              {pages.map((page) => (
                <MenuItem 
                  key={page.title} 
                  component={RouterLink} 
                  to={page.path}
                  onClick={handleCloseNavMenu}
                  selected={isActive(page.path)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {page.icon}
                    <Typography sx={{ ml: 1 }}>{page.title}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </Menu>
          </Box>

          {/* 로고 (작은 화면) */}
          <AccountBalanceIcon sx={{ display: { xs: 'flex', md: 'none' }, mr: 1 }} />
          <Typography
            variant="h5"
            noWrap
            component={RouterLink}
            to="/"
            sx={{
              mr: 2,
              display: { xs: 'flex', md: 'none' },
              flexGrow: 1,
              fontWeight: 700,
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            ZKare
          </Typography>

          {/* 데스크톱 메뉴 */}
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
            {pages.map((page) => (
              <Button
                key={page.title}
                component={RouterLink}
                to={page.path}
                onClick={handleCloseNavMenu}
                sx={{ 
                  my: 2, 
                  color: 'white', 
                  display: 'flex', 
                  alignItems: 'center',
                  backgroundColor: isActive(page.path) ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  },
                  mx: 0.5,
                  borderRadius: 1,
                }}
                startIcon={page.icon}
              >
                {page.title}
              </Button>
            ))}
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
                sx={{ borderColor: 'white', '&:hover': { borderColor: 'white', backgroundColor: 'rgba(255, 255, 255, 0.08)' } }}
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