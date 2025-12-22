import User from "./User"

export default interface RoomInterface { 
    id: string,
    name: string,
    creator:number | string,
    isPrivate: boolean,
    password:string,
    emission:any,//type Emission à rajouter une fois créés
    withRef : boolean,
    withPresentator: boolean,
    numberOfParticipantMax : number,
    players: {[name : string]: User}
}
