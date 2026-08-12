/**
 * Équipe formée dynamiquement en cours d'émission (étape TEAM_FORMATION),
 * jamais persistée dans le document Emission — c'est un état de session au
 * même titre que les thèmes par joueur (Room.playerThemes).
 */
export default interface Team {
    id: string;
    name: string;
    members: [string, string];
    score: number;
}
