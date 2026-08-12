import mongoose from "../db";
import {Theme} from "./Theme";
import { BaseScoringConfig, ForcedQuestionType, PickBanScoringConfig, TimerScoringConfig } from "../../shared-types/scoring";

export enum QuizzMode {
    LIST = "LIST",
    GRID = "GRID",
    PICKANDBAN = "PICKANDBAN",
    BIGBUCKET = "BIGBUCKET",
    TIMER = "TIMER",
}

export interface Quizz {
    quizz_id: number, 
    creator: number,
    title : string,
    private : boolean,
    mode: QuizzMode,
    played :{type: Number, default : 0},
    tags :{type : [String], default : []} 
}

export interface ListQuizz extends Quizz {
    questions : number[],
    /** Temps laissé pour répondre à chaque question (ms). */
    answerDurationMs : number,
    scoring?: BaseScoringConfig,
    forcedType?: ForcedQuestionType,
}

/**
 * Mode Grid (mémoire) : une grille width × height. Chaque case cache une
 * question issue d'un thème, chaque thème est attribué à un joueur avec une
 * couleur. Les couleurs sont montrées quelques secondes en début de partie
 * puis masquées : aux joueurs de mémoriser où sont leurs points forts.
 *
 * Les cases excédentaires (width*height - cases distribuées aux thèmes) tirent
 * dans `neutralQuestions` et n'appartiennent à personne.
 */
export interface GridQuizz extends Quizz {
    themes : Theme[],
    width : number,
    height : number,
    /** Nombre de cases attribuées à chaque thème. */
    cellsPerTheme : number,
    /** Pool de questions génériques pour les cases sans thème. */
    neutralQuestions : number[],
    /** Durée d'affichage des couleurs en début de partie (ms). */
    memorizeDurationMs : number,
    /** Temps laissé pour répondre à une question (ms). */
    answerDurationMs : number,
    scoring?: BaseScoringConfig,
    forcedType?: ForcedQuestionType,
}

/**
 * Mode Pick & Ban : un vivier de thèmes (chaque thème = une case avec une
 * image, associée à 2-3 questions), visible de tous dès le départ.
 *
 * Phase de draft : à tour de rôle, chaque joueur choisit un thème disponible
 * pour lui-même, le donne à un autre joueur, ou le bannit (indisponible pour
 * le reste de la partie). La draft se termine quand tous les thèmes ont un
 * statut définitif (possédé ou banni).
 *
 * Phase de jeu : à tour de rôle, chaque joueur choisit un de ses thèmes
 * (pické ou reçu) et répond à toutes ses questions pour marquer des points.
 */
export interface PickAndBanQuizz extends Quizz {
    themes : Theme[],
    /** Colonnes d'affichage de la grille de thèmes (mise en page uniquement). */
    columns : number,
    /** Temps laissé pour choisir une action de draft (ms). */
    draftTurnDurationMs : number,
    /** Temps laissé pour répondre à une question (ms). */
    answerDurationMs : number,
    scoring?: PickBanScoringConfig,
    forcedType?: ForcedQuestionType,
    /** Phase "Ban" présente dans le roulement de draft (Pick, Ban si activé, Give). Défaut : oui. */
    allowBan?: boolean,
}

export interface BigBucketQuizz extends Quizz {
    themes : Theme[],
    width : number,
    height : number,
}

/**
 * Mode Timer : chacun son tour, un décompte personnel (par défaut 100s)
 * tourne pendant le passage d'un joueur, qui répond aux questions de son
 * thème en enchaînant le plus vite possible. Une mauvaise réponse remet la
 * question en fin de file plutôt que de l'écarter.
 */
export interface TimerQuizz extends Quizz {
    themes : Theme[],
    /** Temps laissé à chaque joueur pour son tour (ms). */
    turnDurationMs : number,
    /**
     * Réservé aux émissions "avec un présentateur" : le présentateur juge
     * lui-même chaque réponse (au lieu d'une validation automatique), donc ce
     * quizz ne peut être joué que via une émission ayant elle aussi
     * `options.hostModeEnabled`.
     */
    hostModeEnabled : boolean,
    scoring?: TimerScoringConfig,
    forcedType?: ForcedQuestionType,
}