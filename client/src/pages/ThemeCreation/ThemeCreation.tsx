import { useNavigate, useLocation, useParams } from "react-router-dom"
import { useEffect, useState, useCallback } from "react";
import makeRequest from "../../tools/requestScheme";
import CreateThemeForm from "../../component/CreateTheme/CreateThemeForm"
import { Banner } from "../../component/Banner/Banner";

export function ThemeCreation () {
    const navigate = useNavigate();
    const location = useLocation();
    const { theme_id: themeIdParam } = useParams();
    const isModifying = location.pathname.startsWith("/modify-a-theme");

    // Ouverture directe (nouvel onglet, ctrl/cmd/molette-clic, lien partagé) :
    // pas de location.state dans ce cas, on résout le thème depuis l'id de
    // l'URL plutôt que de rester bloqué sur un formulaire de création vide.
    const [existingTheme, setExistingTheme] = useState<any>(
        (isModifying && location.state?.theme) ? location.state.theme : null
    );
    const [loadingTheme, setLoadingTheme] = useState(false);
    const [themeNotFound, setThemeNotFound] = useState(false);

    useEffect(() => {
        if (existingTheme || !themeIdParam) return;
        setLoadingTheme(true);
        makeRequest(`/theme/by-ids?ids=${themeIdParam}`)
            .then((ts: any[]) => {
                if (ts && ts[0]) setExistingTheme(ts[0]);
                else setThemeNotFound(true);
            })
            .catch(() => setThemeNotFound(true))
            .finally(() => setLoadingTheme(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [themeIdParam]);

    useEffect(() => {
        if (!isModifying || existingTheme) return;
        if (themeIdParam) {
            if (themeNotFound) navigate("/create-a-theme");
            return;
        }
        navigate("/create-a-theme");
    }, [existingTheme, isModifying, themeIdParam, themeNotFound, navigate])

    const [theme, setTheme] = useState(
        {
        theme_id: existingTheme ? existingTheme.theme_id : "",
        title:existingTheme ? existingTheme.title : "",
        private: existingTheme ? existingTheme.private : false,
        imgOrString: existingTheme ? existingTheme.imgOrString : false,
        img :existingTheme ? existingTheme.img : "",
        questions :existingTheme ? existingTheme.questions : [],
        tags: existingTheme ? existingTheme.tags : [],
        folder: existingTheme ? existingTheme.folder : undefined,
    })

    // Le useState ci-dessus ne capture `existingTheme` qu'au premier rendu :
    // si le thème arrive après coup (fetch async ci-dessus), il faut
    // re-remplir le formulaire explicitement une fois les données là.
    useEffect(() => {
        if (!existingTheme) return;
        setTheme({
            theme_id: existingTheme.theme_id,
            title: existingTheme.title,
            private: existingTheme.private,
            imgOrString: existingTheme.imgOrString,
            img: existingTheme.img,
            questions: existingTheme.questions,
            tags: existingTheme.tags,
            folder: existingTheme.folder,
        });
    }, [existingTheme]);

    const [messageInfo, setMessageInfo] = useState("");
    const [showMessage, setShowMessage] = useState(false);
    const [endTaskToast, setEndTaskToast] = useState<() => void>(() => () => {});

    const createTheme = async (newTheme : any) => {
        return await makeRequest("/theme/create", "POST", newTheme)
    }

    const updateTheme = async (newTheme : any) => {
        return await makeRequest("/theme/update", "PUT", newTheme)
    }

    // Ne vérifiait jamais le résultat ni n'affichait le moindre retour :
    // cliquer "Sauvegarder" ne donnait aucun signe (succès ou échec) à l'utilisateur.
    const saveData = useCallback(async (newTheme : any) => {
        if (!newTheme.title?.trim()) {
            setMessageInfo("Il faut un titre pour le thème.");
            setShowMessage(true);
            return;
        }
        try {
            const response = isModifying ? await updateTheme(newTheme) : await createTheme(newTheme);
            if (response?.success) {
                setMessageInfo(isModifying ? "Thème mis à jour avec succès" : "Thème créé avec succès");
                setEndTaskToast(() => () => navigate(-1));
            } else {
                setMessageInfo("La sauvegarde du thème a échoué.");
                setEndTaskToast(() => () => {});
            }
        } catch (err) {
            setMessageInfo(err instanceof Error ? err.message : "Erreur réseau.");
            setEndTaskToast(() => () => {});
        }
        setShowMessage(true);
    },[isModifying, navigate]);

    const deleteTheme = useCallback(async () => {
        if (!existingTheme?.theme_id) return;
        try {
            const response = await makeRequest("/theme/delete", "DELETE", {theme_id : existingTheme.theme_id});
            if (response?.success) {
                setMessageInfo("Thème supprimé");
                setEndTaskToast(() => () => navigate(-1));
            } else {
                setMessageInfo("La suppression a échoué.");
                setEndTaskToast(() => () => {});
            }
        } catch (err) {
            setMessageInfo(err instanceof Error ? err.message : "Erreur réseau.");
            setEndTaskToast(() => () => {});
        }
        setShowMessage(true);
    },[existingTheme, navigate]);

    if (isModifying && themeIdParam && !existingTheme) {
        return (
            <>
                <Banner />
                <div className="themeCreationPage">
                    <div className="themeCreationContent">
                        <h1>{loadingTheme ? "Chargement du thème…" : "Ce thème n'existe pas ou n'est pas accessible."}</h1>
                    </div>
                </div>
            </>
        );
    }

    return (
        <CreateThemeForm
            theme={theme}
            setTheme={setTheme}
            saveData={saveData}
            deleteTheme={existingTheme ? deleteTheme : null}
            messageInfo={messageInfo}
            showMessage={showMessage}
            onCloseToast={() => { setShowMessage(false); endTaskToast(); }}
        />
    )
}
