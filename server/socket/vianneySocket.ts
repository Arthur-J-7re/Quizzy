import { Socket } from "socket.io";

//const animal = ["girafe", "croco", "lion", "baleine", "colibri", "hiboux", "poisson","koala","singe", "papillon"]
const animal = ["girafe", "colibri", "baleine", "croco", "hiboux"]
let participants:  { name:string,credits: number, grid: string[][], combi : string[], amise : boolean , mission : {minus: string, plus: string}} [] = [];
let copyParticipants : { name:string,credits: number, grid: string[][], combi : string[], amise : boolean,  mission : {minus: string, plus: string} } [] = [];
let grid = Array.from({ length: 5 }, () => Array(5).fill(""));
let leftJar: string[] = [];
let rightJar: string[] = [];
let tour = 1;
let mise = {
    "left":[{mise: 0, grid : []}],
    "right":[{mise : 0, grid : []}]
}
let countMise = 0;

let image : any = {};

function deepCopyGrid(grid: string[][]): string[][] {
    return grid.map(row => [...row]);
}

function getMission(){
    let lst = drawAnimalsWithReplacement(animal, 2);
    while(lst[0]===lst[1]){
        lst = drawAnimalsWithReplacement(animal,2);
    }
    return ({minus : lst[0], plus : lst[1]})
}

function shuffleArray<T>(array: T[]): T[] {
    const result = [...array]; // on clone pour éviter les effets de bord
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

function drawAnimalsWithReplacement(animal: string[], count: number): string[] {
    const result = [];
    for (let i = 0; i < count; i++) {
        const index = Math.floor(Math.random() * animal.length);
        result.push(animal[index]);
    }
    return result;
}

export default function vianneysocket(io: any, socket: Socket & { user_id: number }) {
    socket.on("startvianney", (list: string[]) => {
        console.log("on recoit");
        participants = [];
        tour = 1;
        grid = Array.from({ length: 5 }, () => Array(5).fill(""));
        list.forEach((name: string) => {
            participants = [...participants, {name:name, credits: 60, grid: deepCopyGrid(grid),combi : drawAnimalsWithReplacement(animal, 3), amise : false , mission : getMission()}];
        });
        image = {}
        rightJar = animal.flatMap((anim: string) => Array(6).fill(anim));
        rightJar = shuffleArray(rightJar);
        leftJar = animal.flatMap((anim: string) => Array(6).fill(anim));
        leftJar = shuffleArray(leftJar); 
        mise = {
            "left":[{mise: 0, grid : []}],
            "right":[{mise : 0, grid : []}]
        }
        countMise = 0;

        socket.emit("started", ({participants : participants, grid : grid, leftJar : leftJar.slice(4*tour - 4, 4*tour), rightJar: rightJar.slice(4*tour-4,4*tour)}))
        console.log("on a envoyé")
    });

    socket.on("enchere",(data)=>{
        console.log("enchere", data);
        let tmpmise = data.mise;
        let tmpgrid = data.grid;
        let side = data.jar;
        countMise +=1;
        participants.forEach((parti)=>{
            if (parti.name === data.joueur){
                parti.amise = true;
                parti.credits -=tmpmise 
                const tmp = {grid : tmpgrid, mise : tmpmise}
                if (side === "leftJar"){
                    mise.left = [...mise.left, tmp]
                } else {
                    mise.right = [...mise.right, tmp]
                }
                console.log(mise)
            }
        })
    });

    socket.on("refresh", ()=>{
        if (participants.length === 0){
            return
        }
        socket.emit("refresh", {
            participants, 
            turn:tour,
            leftJar : leftJar.slice(4*tour - 4, 4*tour),
            rightJar: rightJar.slice(4*tour-4,4*tour),
            grid,
            image
        })
    });

    const refaire = ()=>{
        participants = copyParticipants;
        socket.emit("remake", ({participants}))
    }

    const fin = () => {
        socket.emit("fin")
    }

    socket.on("image", ({nom, animal})=>{
        image[nom] = animal
    })

    socket.on("EndTurn",()=>{
        tour +=1;
        let miseLeft = 0;
        let miseRight = 0;
        let miseMaxL = 0;
        let gridLeft = [[""]];
        let miseMaxR = 0;
        let gridRight = [[""]];
        let redoL = true;
        let redoR = true
        mise.left.forEach((elem)=>{
            miseLeft += elem.mise;
            if (miseMaxL < elem.mise){
                redoL = false;
                miseMaxL = elem.mise;
                gridLeft = elem.grid;
                console.log("max mise à gauche : ", miseMaxL, gridLeft);
            } else if (miseMaxR === elem.mise){
                redoR = true;
            }
            console.log(miseLeft)
        })
        mise.right.forEach((elem)=>{
            miseRight += elem.mise;
            if (miseMaxR < elem.mise){
                redoR = false;
                miseMaxR = elem.mise;
                gridRight = elem.grid;
                console.log("mise max à droite : ", miseMaxR, gridRight)
            } else if (miseMaxL === elem.mise){
                redoL = true;
            }
            console.log(miseRight)
        })

        console.log("mise droite ;", miseRight, "mise gauche : ", miseLeft);

        if (miseLeft<miseRight && !(redoL) && miseLeft > 0 && countMise > 1){
            console.log("on choisit la grille gauche")
            grid = gridLeft
        } else if (miseRight < miseLeft && !(redoR) && miseRight > 0 && countMise > 1){
            console.log("on choisit la grille droite")
            grid = gridRight
        } else if (countMise === 0){
            return fin()
        } else if (countMise === 1){
            if (miseLeft > miseRight){
                grid = gridLeft
            } else {
                grid = gridRight
            }
        } else {
            refaire();
            return;
        }

        participants.forEach((elem) => {
            if (elem.credits > 0){
                elem.amise = false;
            }
        })

        if (tour<7){
            console.log("la grille gauche : ", gridLeft, "la grille droite", gridRight, "la grille qu'on envoie : ", grid)
            socket.emit("NewTurn",({
                participants:participants,
                grid:grid,
                leftJar : leftJar.slice(4*tour - 4, 4*tour),
                rightJar: rightJar.slice(4*tour-4,4*tour)
            }));
            mise = {
                "left":[{mise: 0, grid : []}],
                "right":[{mise : 0, grid : []}]
            }
            copyParticipants = participants;
        } else {
            return fin()
        }


    })
}
