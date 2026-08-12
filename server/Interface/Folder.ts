// Le contrat des dossiers vit dans shared-types/ pour que serveur et client
// parlent bien du même objet (cf. Interface/Question.ts pour le même pattern).
export { type IFolder as Folder } from "../../shared-types/folder";
