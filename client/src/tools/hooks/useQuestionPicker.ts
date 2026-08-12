import { useCallback, useEffect, useRef, useState } from "react";
import makeRequest from "../requestScheme";

export interface QuestionPickerFilter {
    scope: "mine" | "public" | "all";
    folderId: number | "none" | "";
    tags: string;
    search: string;
    type: string;
}

export function defaultQuestionPickerFilter(): QuestionPickerFilter {
    return { scope: "all", folderId: "", tags: "", search: "", type: "all" };
}

/**
 * Fetch + filtre des questions disponibles (GET /question/search), poussé
 * côté serveur — remplace le pattern dupliqué "charge tout puis filtre en
 * useMemo" présent dans CreateThemeForm/QuizzCreation/GridQuizzCreation.
 *
 * Ne connaît rien de la sélection : chaque formulaire appelant garde la
 * sienne (GridQuizzCreation a deux pools de questions indépendants sur les
 * mêmes résultats, donc la sélection ne peut pas vivre ici).
 */
export function useQuestionPicker() {
    const [filter, setFilter] = useState<QuestionPickerFilter>(defaultQuestionPickerFilter());
    const [results, setResults] = useState<any[]>([]);
    const [folders, setFolders] = useState<{ folder_id: number; name: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        makeRequest("/folder").then((list) => setFolders(list ?? [])).catch(() => {});
    }, []);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            const params = new URLSearchParams();
            params.set("scope", filter.scope);
            if (filter.folderId !== "") params.set("folder_id", String(filter.folderId));
            const tags = filter.tags.split(",").map((t) => t.trim()).filter(Boolean);
            if (tags.length > 0) params.set("tags", tags.join(","));
            if (filter.type !== "all") params.set("mode", filter.type);
            if (filter.search) params.set("search", filter.search);
            params.set("limit", "200");
            try {
                const { items } = await makeRequest(`/question/search?${params.toString()}`);
                setResults(items ?? []);
            } catch (e) {
                console.error("Erreur lors de la recherche de questions", e);
            } finally {
                setLoading(false);
            }
        }, 250);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [filter]);

    return { filter, setFilter, results, folders, loading };
}

/**
 * Cache accumulé (jamais purgé quand une question sort du filtre courant)
 * des questions déjà vues, pour que la liste "questions sélectionnées" reste
 * affichable même quand l'id n'est plus dans `results` (autre dossier, autre
 * scope, autre page...). Peuplé au montage pour les ids déjà sélectionnés
 * (mode édition) puis à chaque nouvelle page de résultats.
 */
export function useSelectedQuestionsCache(initialIds: number[]) {
    const [cache, setCache] = useState<Record<number, any>>({});

    const merge = useCallback((questions: any[]) => {
        if (questions.length === 0) return;
        setCache((prev) => {
            let changed = false;
            const next = { ...prev };
            for (const q of questions) {
                if (!next[q.question_id]) {
                    next[q.question_id] = q;
                    changed = true;
                }
            }
            return changed ? next : prev;
        });
    }, []);

    // Une seule fois au montage : résout les ids déjà sélectionnés (édition)
    // qui ne sortiront peut-être jamais dans `results` selon le filtre actif.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (initialIds.length === 0) return;
        makeRequest(`/question/by-ids?ids=${initialIds.join(",")}`)
            .then((qs) => merge(qs ?? []))
            .catch(() => {});
    }, []);

    return { cache, merge };
}
