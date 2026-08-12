export function getQuestionFilter () {
    return ({
        type: "all",
        possibleType : [
            {value:"all", title: "Tout type de question"},
            {value:"QCM", title:"QCM"},
            {value:"FREE", title:"Réponses Libres"},
            {value:"DCC", title:"Duo Carré Cash"},
            {value:"VF", title:"Vrai/Faux"}
        ],
        searchText:'',
        scope:"all",
        possibleScope : [
            {value:"all", title: "Chercher dans toute la question"},
            {value:"tags", title:"Charcher dans les tags"},
            {value:"statement", title:"Chercher dans l'énoncer et les réponses"},
        ]
    });
}

/**
 * `withDcc` : réservé au mode Points dynamique (barème gradué 5-3-1 par
 * sous-mode) — pas ajouté aux autres quizz (Grid/Timer/PickBan/List) dont le
 * schéma Mongoose (`quizz.ts` ForcedTypeField) n'accepte pas encore "DCC".
 */
export function getForcedQuestionTypeOptions (withDcc: boolean = false) {
    const options = [
        {value:"ALL", title: "Aucune contrainte"},
        {value:"QCM", title: "QCM"},
        {value:"CASH", title: "Cash"},
    ];
    if (withDcc) {
        options.push({value:"DCC", title: "DCC uniquement"});
    }
    return options;
}

/**
 * Facet de filtre fixe des thèmes (pas un dossier libre comme pour les
 * questions) : indique pour quel usage le thème est destiné, purement
 * indicatif (cf. shared-types/theme.ts, ThemeFolder).
 */
export function getThemeFolderOptions () {
    return [
        {value:"", title: "Sans dossier"},
        {value:"PICKANDBAN", title: "Pick & Ban"},
        {value:"GRID", title: "Grid"},
        {value:"TIMER", title: "Timer"},
        {value:"PLAYER", title: "Joueur (émission)"},
    ];
}

export function getDefaultFilter () {
    return ({
        type: "all",
        possibleType : [
            {value:"all", title: "Tout type"},
        ],
        searchText:'',
        scope:"all",
        possibleScope : [
            {value:"all", title: "Chercher dans toute les données"},
        ]
    });
}