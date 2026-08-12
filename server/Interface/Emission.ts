import Step from "./Step";

/**
 * Options générales décidées une fois, à la création de l'émission — par
 * opposition aux `steps`, qui décrivent le déroulé épreuve par épreuve.
 */
export interface EmissionOptions {
    numberOfPlayers: number,
    /** Réservé : la logique de jeu par équipe n'est pas encore implémentée. */
    teams: boolean,
    /**
     * Si activé, chaque joueur reçoit un thème personnel en début d'émission
     * (assigné par le MJ dans le salon, avant de pouvoir lancer). Les épreuves
     * qui en ont besoin (Grid aujourd'hui) l'utilisent à la place de leur
     * propre vivier de thèmes — cf. EmissionGridGame.
     */
    playerThemeEnabled: boolean,
    /**
     * Si activé, le créateur du salon devient présentateur : il ne joue pas,
     * juge lui-même les réponses des épreuves Timer (au lieu d'une validation
     * automatique côté serveur), et valide un écran bonus/malus à la fin de
     * chaque épreuve avant de passer à la suivante. Un quizz Timer marqué
     * `hostModeEnabled` exige que l'émission qui le joue ait aussi cette
     * option (cf. validation côté client, EmissionCreation).
     */
    hostModeEnabled: boolean,
}

export default interface Emission {
    emission_id: number,
    creator: number,
    privatte: boolean,
    title: string,
    options: EmissionOptions,
    steps : Step[],
    keepPoint : boolean[],
}
