const baseUrl = import.meta.env.VITE_SERVER_URL;

const makeRequest = async (url: string, method: string = "GET", data: object = {}): Promise<object | any |null> => {
    try {
        const fullUrl = baseUrl + url;
        let response;

        const storedUser = localStorage.getItem("user");
        const token = storedUser ? JSON.parse(storedUser).token : null;
        console.log(token);

        const headers: HeadersInit = {
            "Content-Type": "application/json",
        };

        // Si un token est présent, on l'ajoute dans l'en-tête Authorization
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
            console.log(headers);
        }

        if (method === "GET") {
            response = await fetch(fullUrl, {
                headers:headers
            });
        } else {
            response = await fetch(fullUrl, {
                method,
                mode: "cors",
                headers: headers,
                body: JSON.stringify(data),
            });
        }
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error("There was a problem with the fetch operation:", error);
        return null;
    }
};

export default makeRequest;