// Dossier fixe (facet de filtre) qu'un thème peut porter : indique pour quel
// usage il est destiné, sans que ce soit vérifié contre l'usage réel.
// "PLAYER" = thème destiné à être assigné manuellement à un joueur en
// émission (cf. Room.assignPlayerTheme côté serveur), pas à un pool de quizz.
export type ThemeFolder = "PICKANDBAN" | "GRID" | "TIMER" | "PLAYER";

export const THEME_FOLDER_VALUES: ThemeFolder[] = ["PICKANDBAN", "GRID", "TIMER", "PLAYER"];

export interface ITheme {
  theme_id: number;
  creator: number;
  title: string;
  private: boolean;
  imgOrString: boolean;
  img?: string;
  questions: number[];
  tags: string[];
  // Absent = "sans dossier" (défaut).
  folder?: ThemeFolder;
}
