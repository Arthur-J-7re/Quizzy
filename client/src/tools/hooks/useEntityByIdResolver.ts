import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import makeRequest from "../requestScheme";

/**
 * Résout une entité "à modifier" (quizz/émission...) soit depuis
 * `location.state` (navigation SPA normale, rapide, pas de round-trip
 * réseau), soit en la rechargeant par id depuis l'URL (ouverture directe :
 * nouvel onglet, ctrl/cmd/molette-clic, lien partagé) — sans ce repli, ce
 * second cas atterrissait sur un formulaire de création vide au lieu du bon
 * formulaire pré-rempli.
 */
export function useEntityByIdResolver<T = any>({
    isModifying,
    entityKey,
    idParamName,
    byIdsUrl,
    createRoute,
}: {
    isModifying: boolean;
    entityKey: string;
    idParamName: string;
    byIdsUrl: (id: string) => string;
    createRoute: string;
}) {
    const location = useLocation();
    const navigate = useNavigate();
    const params = useParams();
    const idParam = params[idParamName];

    const [entity, setEntity] = useState<T | null>(
        (isModifying && (location.state as any)?.[entityKey]) || null
    );
    const [loading, setLoading] = useState(false);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (entity || !idParam) return;
        setLoading(true);
        makeRequest(byIdsUrl(idParam))
            .then((items: any[]) => {
                if (items && items[0]) setEntity(items[0]);
                else setNotFound(true);
            })
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idParam]);

    useEffect(() => {
        if (!isModifying || entity) return;
        if (idParam) {
            if (notFound) navigate(createRoute);
            return;
        }
        navigate(createRoute);
    }, [entity, isModifying, idParam, notFound, navigate, createRoute]);

    const ready = !isModifying || Boolean(entity);
    return { entity, loading, ready };
}
