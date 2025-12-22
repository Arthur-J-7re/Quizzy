import User from '../Interface/User';
import RoomInterface from "../Interface/Room";
import Thread from './Thread/_Thread';

export default class Room implements RoomInterface {
    id: string;
    name: string;
    creator: number | string;
    isPrivate: boolean;
    password: string;
    emission: any; //type Emission à rajouter une fois créés
    withRef: boolean;
    withPresentator: boolean;
    numberOfParticipantMax: number;
    players: { [name: string]: User };

    thread : Thread;
    onClose : (id : string) => void;
    private inactivityTimer?: NodeJS.Timeout;
    private readonly INACTIVITY_DELAY = 180_000; // 3 min
    
    constructor(id: string, name: string, creator: number | string, 
        isPrivate: boolean, password: string, emission: any, withRef: boolean, 
        withPresentator: boolean, numberOfParticipantMax: number, players: { [name: string]: User,},onClose: (id : string) => void) {
        this.id = id;
        this.name = name;
        this.creator = creator;
        this.isPrivate = isPrivate;
        this.password = password;
        this.emission = emission;
        this.withRef = withRef;
        this.withPresentator = withPresentator;
        this.numberOfParticipantMax = numberOfParticipantMax;
        this.players = players;
        this.thread = new Thread(this);
        this.resetInactivityTimer();
        this.onClose = onClose;
    }

    public getId(): number | string {
        return this.id;
    }
    
    public getThread(): Thread {
        return this.thread;
    }

    public getPlayers(): { [name: string]: User } {
        return this.players;
    }

    public getCreator(): number | string {
        return this.creator;
    }

    public touch() {
        this.resetInactivityTimer();
    }

    private resetInactivityTimer() {
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
        }

        this.inactivityTimer = setTimeout(() => {
            this.onClose(this.id);
        }, this.INACTIVITY_DELAY);
    }

    public dispose() {
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
        }
    }

    public addPlayer(user: User): void {
        this.players[user.name] = user;
    }



    public sendToAll(message: string): void {
        //send message to all players in the room
    }

    public sendToPlayer(message: string, players : number[]): void {
        for (let playerId of players) {
            
        }
    }

    public getInfo() {
    }
}