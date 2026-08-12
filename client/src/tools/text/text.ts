export function getPruralOf(word : string) {
    return word.toLowerCase() != "quizz" ?
    word+"s":
    word
}

const QUESTION_MODE_LABELS: Record<string, string> = {
    QCM: "QCM",
    FREE: "Réponse libre",
    DCC: "Duo/Carré/Cash",
    VF: "Vrai/Faux",
};

export function getQuestionModeLabel(mode : string) {
    return QUESTION_MODE_LABELS[mode] || mode;
}