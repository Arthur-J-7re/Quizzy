export type Step = {
  name: string;
  mode: string;
  quizz: any;
  inputCount: number;
  outputCount: number;
  resetPoint: boolean;
  last: boolean;
  played: boolean;
}