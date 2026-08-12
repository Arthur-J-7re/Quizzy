import React, { useState } from "react";
import { Menu, MenuItem, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../context/authentContext";
import "./ProfilMenu.css";

const ProfileMenu = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const auth = useContext(AuthContext);
  const navigate = useNavigate();

  // Ouvrir le menu
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  // Fermer le menu
  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <div className="profilContainer">
      {/* Même recette que CreateMenu (variant + flèche) : les deux boutons de
          la Banner ouvrent un menu déroulant, ils doivent se comporter et se
          voir pareil. */}
      <Button
        className="profilButton"
        onClick={handleClick}
        variant="outlined"
        endIcon={<span className={`arrow ${open ? 'open' : ''}`}>▼</span>}
      >
        👤 Profil
      </Button>

      {/* Menu déroulant */}
      <Menu className="profilMenu"anchorEl={anchorEl} open={open} onClose={handleClose}
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
        <MenuItem className="profilMenuItem" onClick={() => navigate("/profil")}>Voir vos créations</MenuItem>
        <MenuItem className="profilMenuItem" onClick={() => navigate("/modify-account")}>Modifier le compte </MenuItem>
        <MenuItem className="profilMenuItem" onClick={() => {navigate("/");auth?.logout()}}>Déconnexion</MenuItem>
      </Menu>
    </div>
  );
};

export default ProfileMenu;
