// Le contrat des thèmes vit dans shared-types/ pour que serveur et client
// parlent bien du même objet. Ce fichier ne fait que le ré-exporter sous les
// noms historiquement utilisés côté serveur (cf. Interface/Question.ts).
export {
    type ITheme as Theme,
    type ThemeFolder,
    THEME_FOLDER_VALUES,
} from "../../shared-types/theme";
