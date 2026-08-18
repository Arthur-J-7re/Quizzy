import type { QuestionStatus } from "./questionStatus";

export enum Mode {
    QCM = "QCM",
    FREE = "FREE",
    DCC = "DCC",
    VF = "VF",
}

export enum DCCMode {
  CARRE = "Carre",
  DUO = "Duo",
  CASH = "Cash"
}

export interface IQuestionBase {
  question_id: number;
  // Nommé "creator" et non "author" : c'est le nom du champ en base, et c'est
  // la clé que le serveur comme le client manipulent déjà partout.
  creator: number;
  mode: Mode;
  title: string;
  status: QuestionStatus;
  // Motif du dernier refus admin (cf. shared-types/questionStatus.ts) : posé
  // sur "rejected", effacé dès qu'une nouvelle demande de publication part.
  rejectionReason?: string;
  quizz: number[];
  playlist: number[];
  level?: number;
  report?: { date: Date; reporter: number }[];
  played?: number;
  succeed?: number;
  tags?: string[];
  // Absent = "sans dossier" (défaut). Dossier libre, à plat, propre à
  // chaque créateur (cf. shared-types/folder.ts).
  folder_id?: number;
  // Absent sur les documents créés avant la Phase 6 (pas de backfill) :
  // ceux-ci n'apparaissent simplement pas dans le flux d'activité récente.
  createdAt?: Date;
}

export interface IQCMQuestion extends IQuestionBase {
  mode: Mode.QCM;
  choices: { ans1: string; ans2: string; ans3: string; ans4: string };
  answer: number;
  // Posé par le serveur : ordre d'affichage des 4 propositions (index 1-4),
  // identique pour tous les joueurs d'une room. `answer` reste l'index
  // canonique, non affecté par cet ordre d'affichage.
  choiceOrder?: number[];
}

export interface IFreeQuestion extends IQuestionBase {
  mode: Mode.FREE;
  answers: string[];
}

export interface IDCCQuestion extends IQuestionBase {
  mode: Mode.DCC;
  carre: { ans1: string; ans2: string; ans3: string; ans4: string };
  duo: number;
  answer: number;
  cash: string[];
  // Posé par le serveur quand le quizz force un type de question (voir
  // shared-types/scoring.ts) : le client doit jouer ce sous-mode directement
  // au lieu de proposer le sélecteur Duo/Carré/Cash.
  forcedDccMode?: "CARRE" | "DUO" | "CASH";
  // Posé par le serveur : ordre d'affichage des 4 propositions en mode Carré
  // (index 1-4), identique pour tous les joueurs d'une room.
  choiceOrder?: number[];
  // Posé par le serveur : les 2 propositions du mode Duo (la bonne réponse et
  // son "duo"), déjà résolues en texte et mélangées — le client n'a jamais
  // besoin de `answer` (masqué tant que la question n'est pas révélée) pour
  // les afficher, contrairement à l'ancienne implémentation client-only.
  duoChoices?: { id: number; value: string }[];
}

export interface IVFQuestion extends IQuestionBase {
  mode: Mode.VF;
  truth: boolean;
}

export type Question = IQCMQuestion | IFreeQuestion | IDCCQuestion | IVFQuestion;
