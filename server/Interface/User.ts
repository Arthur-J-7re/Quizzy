export default interface User {
    name:string,
    role : string,
    socketId:string,
    id?:number,
    hasAnswered:boolean,
    answer:any,
    score:number,
    life : number,
    connected: boolean
}
