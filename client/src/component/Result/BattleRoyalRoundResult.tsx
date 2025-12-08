import "./result.css"
import { BRRRBlock } from "./BRRRBlock";
import { Answers, LifeBoard } from "../../../../shared-types/type";

export function BattleRoyalRoundResult ({lifeboard, answers, username} : {lifeboard:LifeBoard,answers:Answers, username : string}) {
    return (
        <div className="BRRR-container">
        {Object.entries(lifeboard).map(([name, lp]) => {
            const isYou = name === username;
            const success = answers[name];
            return (
            <BRRRBlock
                key={name}
                name={name}
                lp={lp}
                success={success}
                isYou={isYou}
            />
            );
        })}
        </div>
  );

}