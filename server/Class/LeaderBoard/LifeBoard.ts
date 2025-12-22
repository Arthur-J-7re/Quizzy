import LeaderBoard from "./LeaderBoard";

export default class LifeBoard extends LeaderBoard {
    private lifes: {[name : string] : number};
    
    constructor(players: {[name : string] : any}, initialLifes: number) {
        super(players);
        this.lifes = {};
        for (let name of Object.keys(players)) {
            this.lifes[name] = initialLifes;
        }
    }

    public getLifes(): {[name : string] : number} {
        return this.lifes;
    }

    public looseLife(name: string, amount: number = 1): void {
        if (name in this.lifes) {
            this.lifes[name] -= amount;
            if (this.lifes[name] < 0) {
                this.lifes[name] = 0;
            }
        }
        this.updateOrders();
    }

    public updateOrders(): void {
        const sortedNames = Object.keys(this.lifes).sort((a, b) => this.lifes[b] - this.lifes[a]);
        this.setOrders(sortedNames);
    }
}