import React, { useState } from "react";
import { Menu, MenuItem, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../context/authentContext";

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
    <>
      {/* Bouton Avatar qui ouvre le menu */}
      <Button onClick={handleClick}>
        Profil
      </Button>

      {/* Menu déroulant */}
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem onClick={() => navigate("/profil")}>Voir Profil</MenuItem>
        <MenuItem onClick={handleClose}>Paramètres</MenuItem>
        <MenuItem onClick={() => auth?.logout()}>Déconnexion</MenuItem>
      </Menu>
    </>
  );
};

export default ProfileMenu;
