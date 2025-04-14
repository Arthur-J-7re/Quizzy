import React, { useState } from "react";
import { Menu, MenuItem, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../context/authentContext";

const CreateMenu = () => {
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
        Créer
      </Button>

      {/* Menu déroulant */}
      <Menu className="profilMenu"anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem className="profilMenuItem" onClick={() => navigate(auth?.user? "/create-a-question" : "/login")}>Créer une Question</MenuItem>
        <MenuItem className="profilMenuItem" onClick={() => navigate(auth?.user? "/create-a-quizz" : "/login")}>Créer un Quizz </MenuItem>
        {/*<MenuItem className="profilMenuItem" onClick={() => {navigate("/");auth?.logout()}}>Créer une emission</MenuItem>*/}
      </Menu>
    </div>
  );
};

export default CreateMenu;