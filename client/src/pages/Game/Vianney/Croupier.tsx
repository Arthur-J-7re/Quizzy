import { useEffect, useState } from "react";
import { Box, Typography, Grid as MuiGrid, Button } from "@mui/material";

interface Participant {
  name: string;
  credits: number;
  grid: string[][];
  combi: string[];
  amise: boolean;
  mission:{
    minus:string,
    plus:string
  }
}

function deepCopyGrid(grid: string[][]): string[][] {
  return grid.map((row) => [...row]);
}

export function Croupier({
  onClose,
  onValidate,
  participant,
  socket,
  grid,
  leftChoice,
  rightChoice,
  image,
  setImage,
}: {
  onClose: any;
  onValidate: any;
  participant: Participant;
  socket: any;
  grid: string[][];
  leftChoice: string[];
  rightChoice: string[];
  image: any;
  setImage: any;
}) {
  const [mise, setMise] = useState(0);
  const [selectedJar, setSelectedJar] = useState<"leftJar" | "rightJar">("leftJar");
  const [selectedAnimal, setSelectedAnimal] = useState<string | null>(null);
  const [gridLeft, setGridLeft] = useState<string[][]>([]);
  const [gridRight, setGridRight] = useState<string[][]>([]);
  const [showCombi, setShowCombi] = useState(false);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);

  const [placedLeft, setPlacedLeft] = useState<string[]>([]);
  const [placedRight, setPlacedRight] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<any>();
  const [blockedLeft, setBlockedLeft] = useState([false,false,false,false]);
  const [blockedRight, setBlockedRight] = useState([false,false,false,false]);

  useEffect(() => {
    setGridLeft(deepCopyGrid(grid));
    setGridRight(deepCopyGrid(grid));
  }, [grid]);

  const currentGrid = selectedJar === "leftJar" ? gridLeft : gridRight;
  const setCurrentGrid = selectedJar === "leftJar" ? setGridLeft : setGridRight;
  const currentPlaced = selectedJar === "leftJar" ? placedLeft : placedRight;
  const setCurrentPlaced = selectedJar === "leftJar" ? setPlacedLeft : setPlacedRight;
  const jarChoices = selectedJar === "leftJar" ? leftChoice : rightChoice;

  const handlePlaceAnimal = (animal: string, colIndex: number) => {
    const newGrid = deepCopyGrid(currentGrid);
    for (let row = newGrid.length - 1; row >= 0; row--) {
      if (newGrid[row][colIndex] === "") {
        newGrid[row][colIndex] = animal;
        setCurrentGrid(newGrid);
        setCurrentPlaced([...currentPlaced, animal]);
        setSelectedAnimal(null);
        if(selectedJar === "leftJar"){
          let newblockedLeft = blockedLeft;
          newblockedLeft[selectedIndex] = true;
          setBlockedLeft(newblockedLeft);
        } else {
          let newblockedRight = blockedRight;
          newblockedRight[selectedIndex] = true;
          setBlockedRight(newblockedRight);
        }
        console.log(blockedLeft, blockedRight)
        setSelectedIndex(null)
        return;
      }
    }
  };

  const isColFull = (colIndex: number): boolean => {
    return currentGrid[0][colIndex] !== "";
  };

  const handleJarChange = (jar: "leftJar" | "rightJar") => {
    setSelectedJar(jar);
    setSelectedAnimal(null);
  };

  const handleReset = () => {
    setGridLeft(deepCopyGrid(grid));
    setGridRight(deepCopyGrid(grid));
    setBlockedLeft([false,false,false,false]);
    setBlockedRight([false,false,false,false]);
    setPlacedLeft([]);
    setPlacedRight([]);
    setSelectedAnimal(null);
  };

  const verif = () => {
    if (selectedJar === "leftJar"){
      return(blockedLeft[0] && blockedLeft [1] && blockedLeft[2] && blockedLeft[3])
    } else{
      return(blockedRight[0]&& blockedRight[1] && blockedRight[2] && blockedRight[3])
    }
  }

  const handleEncherir = () => {
    if (!verif()){
      return;
    }
    const finalGrid = selectedJar === "leftJar" ? gridLeft : gridRight;
    if (socket) {
      socket.emit("enchere", {
        joueur: participant.name,
        mise: mise,
        jar: selectedJar,
        grid: finalGrid,
      });
      onValidate();
      onClose();
    }
  };

  const sendImage = (nom : string, animal : string) => {
    if (socket){
      socket.emit("image", ({nom, animal}))
    }
  }

  useEffect(()=>{
    console.log(selectedIndex, blockedLeft,blockedRight, blockedLeft[selectedIndex], blockedRight[selectedIndex])
  }, [selectedIndex])

  const setSide = (index : number, animal : string) => {
    setSelectedIndex(index);
    setSelectedAnimal(animal)
  }

  if (!image[participant.name]) {
    return (
      <div className="flex-center">
        <Typography className="gap" variant="h2" gutterBottom>Votre combinaison et Votre mission</Typography>
        <Typography className="gap" variant="h3" gutterBottom>remplissez la grille par votre motif pour gagner des points</Typography>
        <Typography className="gap" variant="h3" gutterBottom>remplissez la mission pour les doubler</Typography>
        <Typography className="gap" variant="h5">Choisissez un animal à montrer aux autres joueurs</Typography>
        <div className="flex-center row border">
          {participant.combi.map((animal: string) => (
            <img
              key={animal}
              src={`/images/${animal}.png`}
              alt={animal}
              onClick={() => {
                sendImage(participant.name, animal);
                setImage(participant.name, animal);
                onClose();
              }}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                maxHeight: "100px",
                margin: "10px",
              }}
            />
          ))}
        </div>
        <Box className="border gap" sx={{ display: "flex", gap: 1, textAlign:"center", textJustify:"center" }}>
          <img
              src={`/images/${participant.mission.minus}.png`}
              alt={participant.mission.minus}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                maxHeight: "100px",
                margin: "10px",
              }}
              
            /> <div style={{
              width: "100%",
              height:"100%",
              alignSelf:"center"
            }}>{">"}</div>
            <img
              src={`/images/${participant.mission.plus}.png`}
              alt={participant.mission.plus}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                maxHeight: "100px",
                margin: "10px",
              }}
              
            />
        </Box>
      </div>
      
      
                
             
    );
  }



  return (
    <Box>
      {/* Choix d’animaux */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Box>
          <Typography variant="h6" gutterBottom>Left Jar</Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            {leftChoice.map((animal, index) => {
              return (
                <img
                  key={index}
                  src={`/images/${animal}.png`}
                  alt={animal}
                  style={{
                    width: 50,
                    height: 50,
                    border: selectedJar === "leftJar" && selectedAnimal === animal ? "2px solid blue" : "1px solid gray",
                  }}
                  onClick={() => { blockedLeft[index] ? "" :
                    setSide(index, animal)
                    setSelectedJar("leftJar")
                  }}
                />
              );
            })}
          </Box>
        </Box>

        <Box>
          {showCombi && (
            <>
              <Typography variant="h6" gutterBottom>Votre combinaison et Votre mission</Typography>
              <div className="flex-center row">
                <Box sx={{ display: "flex", gap: 1 }}>
                  {participant.combi.map((animal, index) => (
                    <img
                      key={index}
                      src={`/images/${animal}.png`}
                      alt={animal}
                      style={{
                        width: 50,
                        height: 50,
                      }}
                      
                    />
                  ))}
                </Box>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <img
                      src={`/images/${participant.mission.minus}.png`}
                      alt={participant.mission.minus}
                      style={{
                        width: 50,
                        height: 50,
                      }}
                      
                    /> <p>{">"}</p>
                    <img
                      src={`/images/${participant.mission.plus}.png`}
                      alt={participant.mission.plus}
                      style={{
                        width: 50,
                        height: 50,
                      }}
                      
                    />
                </Box>
              </div>
            </>
          )}
        </Box>

        <Box>
          <Typography variant="h6" gutterBottom>Right Jar</Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            {rightChoice.map((animal, index) => {
              return (
                <img
                  key={index}
                  src={`/images/${animal}.png`}
                  alt={animal}
                  style={{
                    width: 50,
                    height: 50,
                    border: selectedJar === "rightJar" && selectedAnimal === animal ? "2px solid blue" : "1px solid gray",
                  }}
                  onClick={() => {blockedRight[index] ? "":  
                    setSide(index, animal)                   
                    setSelectedJar("rightJar");
                  }}
                />
              );
            })}
          </Box>
        </Box>
      </Box>

      {/* Grille interactive */}
      <MuiGrid container justifyContent="center">
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 80px)",
            gridTemplateRows: "repeat(5, 80px)",
            gap: "4px",
            backgroundColor: "#ddd",
            padding: "4px",
            marginBottom: 2,
          }}
        >
          {currentGrid.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const isTop = rowIndex === 0;
              const isHovered = hoveredCol === colIndex;
              const isPlaceholder =
                isTop &&
                selectedAnimal &&
                isHovered &&
                !isColFull(colIndex);

              let displayImage = cell;
              if (isPlaceholder) displayImage = selectedAnimal;

              return (
                <Box
                  key={`${rowIndex}-${colIndex}`}
                  sx={{
                    width: 80,
                    height: 80,
                    backgroundColor: cell === "" ? "#fff" : "transparent",
                    border: "1px solid #999",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: selectedAnimal && !isColFull(colIndex) ? "pointer" : "default",
                    opacity: isColFull(colIndex) && isTop ? 0.3 : 1,
                  }}
                  onClick={() => {
                    if (selectedAnimal && !isColFull(colIndex)) {
                      handlePlaceAnimal(selectedAnimal, colIndex);
                    }
                  }}
                  onMouseEnter={() => setHoveredCol(colIndex)}
                  onMouseLeave={() => setHoveredCol(null)}
                >
                  {displayImage && (
                    <img
                      src={`/images/${displayImage}.png`}
                      alt={displayImage}
                      style={{ width: "100%", height: "100%", objectFit: "contain", opacity: isPlaceholder ? 0.4 : 1 }}
                    />
                  )}
                </Box>
              );
            })
          )}
        </Box>
      </MuiGrid>

      {/* Mise */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, justifyContent: "center", mb: 2 }}>
        <Typography>Votre mise :</Typography>
        <input
          type="number"
          min={0}
          max={participant.credits}
          value={mise}
          onChange={(e) => setMise(parseInt(e.target.value) || 0)}
          style={{ width: "80px", padding: "4px" }}
        />
        <Typography>/ {participant.credits} crédits</Typography>
      </Box>

      {/* Boutons */}
      <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
        <Button variant="outlined" onClick={onClose}>Fermer</Button>
        <Button variant="outlined" color="primary" onClick={handleEncherir}>Enchérir</Button>
        <Button variant="outlined" onClick={() => setShowCombi(!showCombi)}>
          {showCombi ? "Cacher" : "Montrer"} la combinaison
        </Button>
        <Button variant="outlined" color="secondary" onClick={handleReset}>
          Reset grilles
        </Button>
      </Box>
    </Box>
  );
}
