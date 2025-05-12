import {useState, useEffect} from "react"

export default function Clock ({time, action} : {time : number, action : any}) {
    const [timer, setTimer] = useState(time);
    const [number, setNumber] = useState(time/1000);

    return (
        <div>
            {number}
        </div>
    )

}