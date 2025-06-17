import React from "react";
import { AppBar, Toolbar, Typography, Button, Box } from "@mui/material";
import { Link } from "react-router-dom";
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import { Container } from "@mui/material";

const Navbar = () => {
  return (
    <AppBar position="static" sx={{ backgroundColor: '#2E7D32' }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <LocalHospitalIcon sx={{ display: { xs: 'none', md: 'flex' }, mr: 1 }} />
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
          <Box>
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
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar;
