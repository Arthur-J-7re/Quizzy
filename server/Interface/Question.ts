export enum QuestionMode {
    QCM = "QCM",
    FREE = "FREE",
    DCC = "DCC",
    VF = "VF",
}

export interface Question {
    question_id: number;
    creator: number;
    mode: QuestionMode;
    title: string;
    private: boolean;
    quizz: number[];
    playlist: number[];
    level?: number;
    report?: { date: Date; reporter: number }[];
    played?: number;
    succeed?: number;
    tags?: string[];
}

export interface QCMQuestion extends Question {
    choices: {
        ans1: string;
        ans2: string;
        ans3: string;
        ans4: string;
    };
    answer: number;
};

export interface FreeQuestion extends Question {
    answers: string[];
}

export interface DCCQuestion extends Question {
    carre: {
        ans1: string;
        ans2: string;
        ans3: string;
        ans4: string;
    };
    cash: string[];
    duo: number;
    answer: number;
}

export interface VFQuestion extends Question {
    truth: boolean;
};