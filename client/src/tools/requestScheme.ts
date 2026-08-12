// Si la page n'a pas été chargée en local (accès via un tunnel ngrok ou une IP
// du réseau local), on passe par le proxy Vite (/local-api) qui relaie vers le
// serveur : ça évite d'appeler "localhost:3000", qui pointerait vers la machine
// du joueur distant et non celle de l'hôte.
const isLocalHost = location.hostname === "localhost" || location.hostname === "127.0.0.1";
const baseUrl = isLocalHost ? import.meta.env.VITE_SERVER_URL : "/local-api";

export class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = "ApiError";
    }
}

const getToken = (): string | null => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return null;
    try {
        return JSON.parse(storedUser).token ?? null;
    } catch {
        return null;
    }
};

/**
 * Lève une ApiError si la requête échoue (réseau ou statut non-2xx), avec le
 * message renvoyé par le serveur quand il y en a un. Auparavant on renvoyait
 * `null`, et tous les appelants faisaient `retour.success` dessus : écran blanc
 * dès que le serveur était indisponible.
 */
const makeRequest = async (url: string, method: string = "GET", data: object = {}): Promise<any> => {
    const fullUrl = baseUrl + url;
    const token = getToken();

    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    let response: Response;
    try {
        response = await fetch(fullUrl, {
            method,
            mode: "cors",
            headers,
            // GET et HEAD ne peuvent pas porter de corps.
            ...(method === "GET" || method === "HEAD" ? {} : { body: JSON.stringify(data) }),
        });
    } catch {
        throw new ApiError(0, "Impossible de joindre le serveur.");
    }

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
        throw new ApiError(response.status, payload?.message ?? `Erreur ${response.status}.`);
    }

    return payload;
};

/** Variante tolérante : renvoie `fallback` au lieu de lever. */
export const tryRequest = async <T,>(
    url: string,
    method: string = "GET",
    data: object = {},
    fallback: T | null = null
): Promise<T | null> => {
    try {
        return await makeRequest(url, method, data);
    } catch (error) {
        console.error(`Requête ${method} ${url} échouée :`, error);
        return fallback;
    }
};

export default makeRequest;
