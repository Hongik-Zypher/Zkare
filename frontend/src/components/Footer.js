import React from 'react';
import { Box, Container, Typography, Link } from '@mui/material';

const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: 'auto',
        backgroundColor: (theme) => theme.palette.grey[100]
      }}
    >
      <Container maxWidth="lg">
        <Typography variant="body2" color="text.secondary" align="center">
          {'Copyright © '}
          <Link color="inherit" href="https://github.com/your-username/zkare">
            Zkare
          </Link>{' '}
          {new Date().getFullYear()}
          {'. 영지식증명 기반 의료기록 접근 제어 시스템.'}
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer; 