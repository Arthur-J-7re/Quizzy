import React, { useState } from "react";
import { Menu, MenuItem, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../context/authentContext";
import "./CreateMenu.css";

const CreateMenu = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const auth = useContext(AuthContext);
  const navigate = useNavigate();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNavigate = (path: string) => {
    handleClose();
    navigate(auth?.user ? path : "/login");
  };

  return (
    <div className="createMenuContainer">
      <Button 
        className="createMenuButton"
        onClick={handleClick}
        variant="outlined"
        endIcon={<span className={`arrow ${open ? 'open' : ''}`}>▼</span>}
      >
        ✨ Créer
      </Button>

      <Menu 
        className="createMenu"
        anchorEl={anchorEl} 
        open={open} 
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 4px 20px rgba(0,0,0,0.12))',
            mt: 1.5,
            borderRadius: '12px',
            minWidth: '220px',
            '& .MuiList-root': {
              padding: '8px',
            },
          },
        }}
      >
        <MenuItem 
          className="createMenuItem" 
          onClick={() => handleNavigate("/create-a-question")}
        >
          <span className="menuItemIcon">❓</span>
          <span className="menuItemText">Créer une Question</span>
        </MenuItem>
        <MenuItem
          className="createMenuItem"
          onClick={() => handleNavigate("/create-a-quizz")}
        >
          <span className="menuItemIcon">📝</span>
          <span className="menuItemText">Créer un Quizz</span>
        </MenuItem>
        <MenuItem
          className="createMenuItem" 
          onClick={() => handleNavigate("/create-a-theme")}
        >
          <span className="menuItemIcon">🏷️</span>
          <span className="menuItemText">Créer un Thème</span>
        </MenuItem>
        <MenuItem
          className="createMenuItem"
          onClick={() => handleNavigate("/create-an-emission")}
        >
          <span className="menuItemIcon">📺</span>
          <span className="menuItemText">Créer une Émission</span>
        </MenuItem>
      </Menu>
    </div>
  );
};

export default CreateMenu;