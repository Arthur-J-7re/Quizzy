import User from "../../Interface/User";

export default class LeaderBoard {
    private players: {[name : string] : User};
    private orders: string[];

    public constructor(players: {[name : string] : User}) {
        this.players = players;
        this.orders = Object.keys(players);
    }

    public getOrders(): string[] {
        return this.orders;
    }

    public setOrders(orders: string[]): void {
        this.orders = orders;
    }

    public getPlayers(): {[name : string] : User} {
        var result: {[name : string] : User} = {};
        for (let name of this.orders) {
            result[name] = this.players[name];
        }
        return result;
    }
}