/** Vérifications communes aux 4 formulaires : chaque validateXxx l'appelle en premier puis enchaîne ses propres règles. */
export default function validateBase(
    title: string,
    tags: string[],
    setMessageInfo: (message: string) => void,
    setShowMessage: (bool: boolean) => void
): boolean {
    if (!title.trim()) {
        setMessageInfo("Il faut un intitulé à la question !");
        setShowMessage(true);
        return false;
    }

    if (tags.length === 0) {
        setMessageInfo("veuillez renseigner au moins une catégorie pour la question.");
        setShowMessage(true);
        return false;
    }

    return true;
}
