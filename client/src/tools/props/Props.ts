export function getQuestionFilter () {
    return ({
        type: "all",
        possibleType : [
            {value:"all", title: "Tout type de question"},
            /*{value:"QCM", title:"QCM"},
            {value:"FREE", title:"Réponses Libres"},
            {value:"DCC", title:"Duo Carré Cash"},
            {value:"VF", title:"Vrai/Faux"}*/
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