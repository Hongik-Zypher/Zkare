import React from "react";
import { AppBar, Toolbar, Typography, Button, Box } from "@mui/material";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography
          variant="h6"
          component={Link}
          to="/"
          sx={{
            flexGrow: 1,
            textDecoration: "none",
            color: "inherit",
            fontWeight: "bold",
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
            🔐 암호화 시스템
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
