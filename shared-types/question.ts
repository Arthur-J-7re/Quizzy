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
  author: number;
  mode: Mode;
  title: string;
  private: boolean;
  quizz: number[];
  playlist: number[];
  level: number;
  report?: { date: Date; reporter: number }[];
  played?: number;
  succeed?: number;
  tags?: string[];
}

export interface IQCMQuestion extends IQuestionBase {
  mode: Mode.QCM;
  choices: { ans1: string; ans2: string; ans3: string; ans4: string };
  answer: number;
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
}

export interface IVFQuestion extends IQuestionBase {
  mode: Mode.VF;
  truth: boolean;
}

export type Question = IQCMQuestion | IFreeQuestion | IDCCQuestion | IVFQuestion;
