import logger from "../utils/logger";
import { FORCED_TYPE_ALLOWED_MODES, ForcedQuestionType } from "../../shared-types/scoring";

export function verify (name : string, question : any, answer : any){
    logger.debug("ça verifie la réponse de : ", name);

    switch (question.mode){
        case "QCM" : 
            return (answer === question.answer)
        case "FREE" : 
            let success = false;
            let normalizedUserAnswer = normalizeText(String(answer));
    
            question.answers.forEach((answer: string) => {
                const normalizedExpectedAnswer = normalizeText(answer);
    
                if (normalizedUserAnswer === normalizedExpectedAnswer) {
                    success = true;
                }
            });
    
            return success;

        case "VF" : 
            return ((answer === "vrai" && question.truth) || (answer === "faux" && (!question.truth)))
            
        case "DCC" :  
            return verifyDcc(name,question, answer);
        default:
            return false;
    }
}

export function verifyDcc (name : string, question: any,answer : any){
    const mode = answer.mode;
    if (mode){
        switch(mode){
            case "CASH":
                let success = false;
                let normalizedUserAnswer = normalizeText(String(answer.value));
        
                question.cash.forEach((answer: string) => {
                    const normalizedExpectedAnswer = normalizeText(answer);
        
                    if (normalizedUserAnswer === normalizedExpectedAnswer) {
                        success = true;
                    }
                });
        
                return success;
            case "DUO":
            case "CARRE":
                return (answer.value === question.answer)
            default :
                return false;
        }
    } else {
        return false
    }
}

export function filterQuestionsByForcedType(questions: any[], forcedType: ForcedQuestionType | undefined): any[] {
    const allowed = FORCED_TYPE_ALLOWED_MODES[forcedType ?? "ALL"];
    return questions.filter((question) => allowed.includes(question?.mode));
}

/**
 * Sous-mode DCC réellement joué pour une question donnée : QCM/CASH forcent
 * toujours le même sous-mode (Carré/Cash) ; en ALL (pas de contrainte), tirage
 * 50/50 Carré/Cash déterministe à partir du seed (même mécanisme que
 * `shuffledChoiceOrder`/`shuffledPairOrder`) — identique pour tous les
 * joueurs de la manche, jamais un choix laissé individuellement à chacun. En
 * DCC (contrainte "DCC uniquement", pensée pour un barème gradué par
 * sous-mode), renvoie `undefined` : le joueur choisit librement entre
 * Duo/Carré/Cash, rien n'est forcé — les appelants ne doivent alors PAS
 * écraser le choix réel du joueur (cf. enforceDccMode dans chaque moteur).
 */
export function resolveDccMode(seed: string, forcedType: ForcedQuestionType | undefined): "CARRE" | "CASH" | undefined {
    if (forcedType === "QCM") return "CARRE";
    if (forcedType === "CASH") return "CASH";
    if (forcedType === "DCC") return undefined;
    return seededRandom(seed)() < 0.5 ? "CARRE" : "CASH";
}

/** PRNG déterministe (mulberry32) seedé à partir d'une chaîne (xmur3). */
function seededRandom(seed: string): () => number {
    let h = 1779033703 ^ seed.length;
    for (let i = 0; i < seed.length; i++) {
        h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return function () {
        h = Math.imul(h ^ (h >>> 16), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        h ^= h >>> 16;
        return (h >>> 0) / 4294967296;
    };
}

/**
 * Ordre d'affichage des 4 propositions d'une question QCM, mélangé de façon
 * déterministe à partir du seed (room + question) : même ordre pour tous les
 * joueurs d'une room, stable en cas de ré-émission (reconnexion, requeue).
 */
export function shuffledChoiceOrder(seed: string): number[] {
    const rand = seededRandom(seed);
    const order = [1, 2, 3, 4];
    for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
}

/**
 * Ordre d'affichage des 2 propositions du mode Duo (a, b), mélangé de façon
 * déterministe à partir du seed — même principe que `shuffledChoiceOrder`.
 */
export function shuffledPairOrder<T>(seed: string, a: T, b: T): [T, T] {
    const rand = seededRandom(seed);
    return rand() < 0.5 ? [a, b] : [b, a];
}

export function normalizeText(str: string): string {
    return str
        .normalize("NFD")                  // décompose les caractères accentués
        .replace(/[\u0300-\u036f]/g, "")   // enlève les diacritiques (accents)
        .replace(/\s+/g, "")               // enlève tous les espaces
        .toLowerCase();                    // met tout en minuscule
}
