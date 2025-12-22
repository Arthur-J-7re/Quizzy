import LeaderBoard from "./LeaderBoard";
import User from "../../Interface/User";

export default class ScoreBoard extends LeaderBoard {
    private scores: {[name : string] : number};
    
    constructor(players: {[name : string] : User}) {
        super(players);
        this.scores = {};
        for (let name of Object.keys(players)) {
            this.scores[name] = 0;
        }
    }

    public getScores(): {[name : string] : number} {
        return this.scores;
    }

    public setScore(name: string, score: number): void {
        if (name in this.scores) {
            this.scores[name] = score;
        }   
        this.updateOrders();
    }

    public incrementScore(name: string, increment: number): void {
        if (name in this.scores) {
            this.scores[name] += increment;
        }
        this.updateOrders();
    }

    private updateOrders(): void {
        const sortedNames = Object.keys(this.scores).sort((a, b) => this.scores[b] - this.scores[a]);
        this.setOrders(sortedNames);
    }
}