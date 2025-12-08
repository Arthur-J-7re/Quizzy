import Thread from "../Thread/Thread";

export default interface Helper {
    receive : (c: any)=>void,
    send : (c: any)=>void,
    master : Thread,
}