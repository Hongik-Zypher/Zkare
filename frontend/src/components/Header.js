import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  Button,
  Container,
  Chip
} from '@mui/material';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

const Header = ({ account, isConnected, connectWallet }) => {
  // 주소 줄임 함수
  const shortenAddress = (address) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <AppBar position="static">
      <Container maxWidth="lg">
        <Toolbar>
          <HealthAndSafetyIcon sx={{ mr: 1 }} />
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{
              flexGrow: 1,
              textDecoration: 'none',
              color: 'inherit',
              fontWeight: 'bold'
            }}
          >
            Zkare
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Button 
              color="inherit" 
              component={RouterLink} 
              to="/patient"
              sx={{ mr: 1 }}
            >
              환자
            </Button>
            <Button 
              color="inherit" 
              component={RouterLink} 
              to="/requester"
              sx={{ mr: 2 }}
            >
              요청자
            </Button>

            {isConnected ? (
              <Chip
                icon={<AccountBalanceWalletIcon />}
                label={shortenAddress(account)}
                color="secondary"
                variant="filled"
              />
            ) : (
              <Button 
                variant="contained" 
                color="secondary" 
                onClick={connectWallet}
                startIcon={<AccountBalanceWalletIcon />}
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

export default Header; 