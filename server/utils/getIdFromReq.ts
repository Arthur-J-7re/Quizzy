export default function getIdFromReq (req:any) : number {
    let newReq : any= req;
    return Number(newReq.user.id);
}