import { useEffect, useState } from "react";
import { Box, Typography, Grid as MuiGrid, Button } from "@mui/material";
import { useSocket } from "../../../context/socketContext";
import {Croupier} from "./Croupier"

interface Participant { name:string,credits: number, grid: string[][], combi : string[],amise : boolean}

export function VianneyGame(data: any) {
    const socket = useSocket();
    const [turn, setTurn] = useState(data.data.turn || 1);
    const [participants, setParticipants] = useState(data.data.participants || []);
    const [grid, setGrid] = useState<string[][]>(data.data.grid); // ← optionnel si tu veux afficher la grille commune
    const [leftChoice, setLeftChoice] = useState(data.data.leftJar);
    const [rightChoice, setRightChoice] = useState(data.data.rightJar);

    const half = Math.ceil(participants.length / 2);
    const leftSide = participants.slice(0, half);
    const rightSide = participants.slice(half);
    const [count, setCount] = useState(0);
    const [showChoices, setShowChoices] = useState(false);

    const [croupier, setCroupier] = useState(false);
    const [participantChezCroupier, setParticipantsChezCroupier] = useState(participants[0])

    const [image, setImage] = useState<Record<string, string>>(data.data.image || {});

    const showImage = (nom : string) => {
        return (
            nom!== "" && (
                <img
                    src={`/images/${nom}.png`}
                    alt={nom}
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        maxHeight: "50px"
                    }}
                />
            ))
    }

    const SetImage = (nom : string, animal : string)=>{
        setImage({...image,[nom]:animal})
    }

    const displayName = (participant : Participant) => {
        return <div className="flex-center border row innergap gap">
            {image[participant.name] && showImage(image[participant.name])}
            {participant.name}
            {participant.amise ?"": <Button onClick={() => {setCroupier(true);setParticipantsChezCroupier(participant)}}>Voter</Button>}
        </div>
    }

    const endTurn = () => {
        if(socket){
            socket.emit("EndTurn");
        }
    }

    useEffect(() => {
        participants.forEach((element: Participant) => {
            console.log(image[element.name], image[element.name] === null)
        });
        let size = participants.filter((elem: Participant) => image[elem.name] != null)

        if (size.length === participants.length){
            setShowChoices(true)
        } else {
            console.log(size)
        }
    },[image])

    useEffect(()=>{
        if (socket){
            socket.on("NewTurn",(data)=>{
                setParticipants(data.participants);
                setGrid(data.grid);
                setLeftChoice(data.leftJar);
                setRightChoice(data.rightJar);
                setCount(0);
                setTurn(turn+1)
            });
            socket.on("remake", ({participants})=>{
                setParticipants(participants)
            })
        }
    },[socket])

    if (croupier){
        return(
            <Croupier onClose={() => {setCroupier(false)}} onValidate={()=>{setCount(count+1);participantChezCroupier.amise = true}} setImage={SetImage} participant={participantChezCroupier} socket={socket} grid={grid} image={image}leftChoice={leftChoice} rightChoice={rightChoice}/>
        )
    }

    return (
        <Box sx={{ p: 4, textAlign: "center" }}>
            <Box sx={{ display: "flex", justifyContent: "space-around", alignItems: "center", mb: 4 }}>
                {/* Choix gauche (leftJarChoices) */}
                {showChoices && <Box sx={{ display: "flex", gap: 2 }}>
                    {leftChoice.map((animal : string, index : number) => (
                        <Box key={index} sx={{ width: 50, height: 50 }}>
                            <img
                                src={`/images/${animal}.png`}
                                alt={animal}
                                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                            />
                        </Box>
                    ))}
                </Box>}

                {/* Tour au centre */}
                <Typography variant="h4">Tour {turn}</Typography>

                {/* Choix droit (rightJarChoices) */}
                {showChoices && <Box sx={{ display: "flex", gap: 2 }}>
                    {rightChoice.map((animal : string, index: number) => (
                        <Box key={index} sx={{ width: 50, height: 50 }}>
                            <img
                                src={`/images/${animal}.png`}
                                alt={animal}
                                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                            />
                        </Box>
                    ))}
                </Box>}
            </Box>

            <MuiGrid container spacing={2} justifyContent="center" alignItems="center">
                {/* Participants à gauche */}
                <MuiGrid item>
                    <Box>
                        <div className="flex-center column">{leftSide.map((name : any, index:number) => (
                            displayName(name)
                        ))}</div>
                    </Box>
                </MuiGrid>

                {/* Grille centrale 7x7 */}
                <MuiGrid item>
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: "repeat(5, 80px)",
                            gridTemplateRows: "repeat(5, 80px)",
                            gap: "4px",
                            backgroundColor: "#ddd",
                            padding: "4px",
                        }}
                    >
                        {grid.map((row: string[], rowIndex: number) =>
                            row.map((cell: string, colIndex: number) => (
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
                                    }}
                                >
                                    {cell !== "" && (
                                        <img
                                            src={`/images/${cell}.png`}
                                            alt={cell}
                                            style={{
                                                width: "100%",
                                                height: "100%",
                                                objectFit: "contain",
                                            }}
                                        />
                                    )}
                                </Box>
                            ))
                        )}
                    </Box>
                </MuiGrid>

                {/* Participants à droite */}
                <MuiGrid item>
                    <Box>
                        <div className="flex-center column">{rightSide.map((name : any, index : number) => (
                            displayName(name)
                        ))}</div>
                    </Box>
                </MuiGrid>
            </MuiGrid>
            {count === participants.length ? <Button onClick={() => {endTurn()}}>Finir le tour</Button> : ""}
        </Box>
    );
}
