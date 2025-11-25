import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Chip,
  Container,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  useTheme,
  useMediaQuery,
  Divider,
} from "@mui/material";
import { Link, useLocation } from "react-router-dom";
import {
  LocalHospital as HospitalIcon,
  Security as SecurityIcon,
  Shield as ShieldIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  AccountBalanceWallet as WalletIcon,
  Dashboard as DashboardIcon,
  VpnKey as KeyIcon,
} from "@mui/icons-material";
import { COLORS } from "../utils/constants";

const Navbar = ({ currentAccount, setCurrentAccount }) => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const navItems = [
    { path: '/', label: '홈', icon: <DashboardIcon /> },
    { path: '/encrypted', label: '의료기록 관리', icon: <HospitalIcon /> },
    { path: '/key-recovery', label: '키 복구', icon: <KeyIcon /> },
    { path: '/guardian-dashboard', label: '보호자 대시보드', icon: <ShieldIcon /> },
  ];

  const drawer = (
    <Box sx={{ width: 280, height: '100%', background: COLORS.cardBg }}>
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `2px solid ${COLORS.border}` }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              background: COLORS.gradientPrimary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}
          >
            <HospitalIcon />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.textPrimary, fontSize: '1.125rem' }}>
            Zkare
          </Typography>
        </Box>
        <IconButton onClick={handleDrawerToggle} sx={{ color: COLORS.textPrimary }}>
          <CloseIcon />
        </IconButton>
      </Box>
      <List sx={{ pt: 2 }}>
        {navItems.map((item) => (
          <ListItem
            key={item.path}
            component={Link}
            to={item.path}
            onClick={handleDrawerToggle}
            sx={{
              mx: 2,
              mb: 1,
              borderRadius: '8px',
              backgroundColor: location.pathname === item.path ? COLORS.primaryBg : 'transparent',
              border: location.pathname === item.path ? `2px solid ${COLORS.primary}` : `2px solid transparent`,
              color: location.pathname === item.path ? COLORS.primary : COLORS.textSecondary,
              '&:hover': {
                backgroundColor: COLORS.primaryBg,
                borderColor: COLORS.primary,
              },
            }}
          >
            <ListItemIcon sx={{ color: location.pathname === item.path ? COLORS.primary : COLORS.textSecondary, minWidth: 40 }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.label}
              primaryTypographyProps={{
                fontWeight: location.pathname === item.path ? 600 : 500,
                fontSize: '0.9375rem',
              }}
            />
          </ListItem>
        ))}
      </List>
      <Divider sx={{ my: 2, borderColor: COLORS.border }} />
      <Box sx={{ px: 3, pb: 3 }}>
        {currentAccount ? (
          <Chip
            label={`${currentAccount.substring(0, 6)}...${currentAccount.substring(38)}`}
            sx={{
              width: '100%',
              justifyContent: 'flex-start',
              height: 40,
              backgroundColor: COLORS.primaryBg,
              color: COLORS.primary,
              fontWeight: 600,
              fontSize: '0.875rem',
              border: `1px solid ${COLORS.primary}30`,
            }}
          />
        ) : (
          <Button
            fullWidth
            variant="contained"
            onClick={connectWallet}
            startIcon={<WalletIcon />}
            sx={{
              borderRadius: '8px',
              background: COLORS.gradientPrimary,
              fontWeight: 600,
              py: 1.5,
              textTransform: 'none',
            }}
          >
            지갑 연결
          </Button>
        )}
      </Box>
    </Box>
  );

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          backgroundColor: COLORS.cardBg,
          borderBottom: `2px solid ${COLORS.border}`,
        }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ py: 1.5 }}>
            {/* 로고 */}
            <Box
              component={Link}
              to="/"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                textDecoration: 'none',
                mr: { xs: 2, md: 4 },
              }}
            >
              <Box
                sx={{
                  width: { xs: 40, md: 48 },
                  height: { xs: 40, md: 48 },
                  borderRadius: '10px',
                  background: COLORS.gradientPrimary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  boxShadow: `0 2px 8px ${COLORS.primary}30`,
                }}
              >
                <HospitalIcon sx={{ fontSize: { xs: 20, md: 24 } }} />
              </Box>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  color: COLORS.textPrimary,
                  display: { xs: 'none', sm: 'block' },
                  fontSize: { xs: '1.125rem', md: '1.25rem' },
                  letterSpacing: '-0.02em',
                }}
              >
                Zkare
              </Typography>
            </Box>

            {/* 데스크탑 네비게이션 */}
            <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, gap: 1 }}>
              {navItems.map((item) => (
                <Button
                  key={item.path}
                  component={Link}
                  to={item.path}
                  startIcon={item.icon}
                  sx={{
                    px: 2.5,
                    py: 1.25,
                    borderRadius: '8px',
                    fontWeight: location.pathname === item.path ? 600 : 500,
                    fontSize: '0.9375rem',
                    textTransform: 'none',
                    color: location.pathname === item.path ? COLORS.primary : COLORS.textSecondary,
                    backgroundColor: location.pathname === item.path ? COLORS.primaryBg : 'transparent',
                    border: location.pathname === item.path ? `2px solid ${COLORS.primary}` : `2px solid transparent`,
                    '&:hover': {
                      backgroundColor: COLORS.primaryBg,
                      borderColor: COLORS.primary,
                      color: COLORS.primary,
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>

            {/* 지갑 연결 / 계정 표시 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {currentAccount ? (
                <Chip
                  icon={<WalletIcon />}
                  label={`${currentAccount.substring(0, 6)}...${currentAccount.substring(38)}`}
                  sx={{
                    backgroundColor: COLORS.primaryBg,
                    color: COLORS.primary,
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    border: `1px solid ${COLORS.primary}30`,
                    display: { xs: 'none', sm: 'flex' },
                    '&:hover': {
                      backgroundColor: `${COLORS.primary}15`,
                    },
                  }}
                />
              ) : (
                <Button
                  variant="contained"
                  onClick={connectWallet}
                  startIcon={<WalletIcon />}
                  sx={{
                    borderRadius: '8px',
                    background: COLORS.gradientPrimary,
                    fontWeight: 600,
                    px: 2.5,
                    py: 1.25,
                    fontSize: '0.875rem',
                    textTransform: 'none',
                    boxShadow: `0 2px 8px ${COLORS.primary}30`,
                    '&:hover': {
                      background: COLORS.gradientPrimary,
                      boxShadow: `0 4px 12px ${COLORS.primary}40`,
                    },
                    transition: 'all 0.2s ease',
                    display: { xs: 'none', sm: 'flex' },
                  }}
                >
                  지갑 연결
                </Button>
              )}
              <IconButton
                onClick={handleDrawerToggle}
                sx={{
                  display: { md: 'none' },
                  color: COLORS.textPrimary,
                }}
              >
                <MenuIcon />
              </IconButton>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: 280,
            borderRight: `2px solid ${COLORS.border}`,
          },
        }}
      >
        {drawer}
      </Drawer>
    </>
  );
};

export default Navbar;
