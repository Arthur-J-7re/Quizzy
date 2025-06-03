import { Table } from "@mui/material";


export function PointResult ({list} : any) {
    console.log(list);
    if (list.length  && list.length > 0){

        return (
            <Table>
                {list.map((row : any)=>{
                    console.log(row, row[0], row[1])
                    return(
                        <tr>
                        <td>{row[0]}</td>
                        <td>{row[1]}</td>
                        </tr>
                    )
                })}
            </Table>
        )
    }
}