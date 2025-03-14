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
      {/* Bouton Avatar qui ouvre le menu */}
      <Button className="profilButton"onClick={handleClick} >
        Profil
      </Button>

      {/* Menu déroulant */}
      <Menu className="profilMenu"anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem className="profilMenuItem" onClick={() => navigate("/profil")}>Voir Profil</MenuItem>
        {/*<MenuItem className="profilMenuItem" onClick={handleClose}>Paramètres</MenuItem>*/}
        <MenuItem className="profilMenuItem" onClick={() => {navigate("/home");auth?.logout()}}>Déconnexion</MenuItem>
      </Menu>
    </div>
  );
};

export default ProfileMenu;
