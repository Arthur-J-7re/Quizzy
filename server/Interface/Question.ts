// Le contrat des questions vit dans shared-types/ pour que serveur et client
// parlent bien du même objet. Ce fichier ne fait que le ré-exporter sous les
// noms historiquement utilisés côté serveur.
export {
    Mode as QuestionMode,
    DCCMode,
    type IQuestionBase as Question,
    type IQCMQuestion as QCMQuestion,
    type IFreeQuestion as FreeQuestion,
    type IDCCQuestion as DCCQuestion,
    type IVFQuestion as VFQuestion,
    type Question as AnyQuestion,
} from "../../shared-types/question";
