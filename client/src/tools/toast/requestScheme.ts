export async function makeRequest(url : string, data : object = {}, method : string = "GET"){
    if (method === "GET"){
        fetch("http://localhost:3000" + url)
        .then((response) => {
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            return response.json();
        });
    }
    else if(method === "DELETE" && Object.keys(data).length > 0){
        fetch("http://localhost:3000" + url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            mode: "cors",
            body : JSON.stringify(data)
        });
    }
    else {
        fetch("http://localhost:3000" + url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            mode: "cors",
            body : JSON.stringify(data)
        })
        .then((response) => {
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            return response.json();
        });
    }
}