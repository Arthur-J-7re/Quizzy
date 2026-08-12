// Dossier libre pour ranger des questions (à plat, pas d'imbrication). Une
// question appartient à 0 ou 1 dossier (cf. IQuestionBase.folder_id).
export interface IFolder {
  folder_id: number;
  creator: number;
  name: string;
}
