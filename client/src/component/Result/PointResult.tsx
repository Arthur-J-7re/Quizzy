import { Table } from "@mui/material";
import "./result.css"


export function PointResult ({list} : any) {
    console.log(list);
    if (list.length  && list.length > 0){

        return (
            <div>
            <Table className="flex-center curved-border border qv gap innergap">
                {list.map((row : any)=>{
                    console.log(row, row[0], row[1])
                    return(
                        <tr className="flex-center row innergap underline">
                            <td className="half flex-center left-column">{row[0]}</td>
                            <td className="half flex-center">{row[1]}</td>
                        </tr>
                    )
                })}
            </Table>
            </div>
        )
    }
}