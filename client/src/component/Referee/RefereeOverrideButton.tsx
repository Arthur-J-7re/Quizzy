import { Socket } from "socket.io-client";
import { REFEREE_ACTIONS } from "shared-types";
import "./RefereeOverrideButton.css";

/**
 * Une réponse libre (FREE, ou DCC joué en Cash) est la seule éligible à une
 * correction d'arbitre — QCM/VF/DCC-Carré/DCC-Duo sont déjà déterministes
 * (comparaison exacte), aucune ambiguïté à trancher humainement.
 */
export function isRefereeEligible(questionMode: string | undefined, given: unknown): boolean {
    if (questionMode === "FREE") return true;
    if (questionMode !== "DCC") return false;
    const mode = given && typeof given === "object" ? (given as any).mode : undefined;
    return mode === "CASH";
}

/**
 * Bouton de correction affiché à côté de la réponse d'un joueur pendant la
 * pause "reveal" — seul l'arbitre le voit, et seulement sur une réponse
 * libre. `playerName` est la cible de la correction, jamais l'arbitre
 * lui-même (il ne joue pas).
 */
export default function RefereeOverrideButton({
    socket,
    isReferee,
    eligible,
    playerName,
    currentCorrect,
}: {
    socket: Socket;
    isReferee: boolean;
    eligible: boolean;
    playerName: string;
    currentCorrect: boolean;
}) {
    if (!isReferee || !eligible) return null;

    const override = () => {
        socket.emit(REFEREE_ACTIONS.override, { target: playerName, correct: !currentCorrect });
    };

    return (
        <button type="button" className="refereeOverrideButton" onClick={override}>
            {currentCorrect ? "Marquer faux ✗" : "Marquer juste ✓"}
        </button>
    );
}
