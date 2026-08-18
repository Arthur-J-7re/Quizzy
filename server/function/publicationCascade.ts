import { ThemeModel } from "../Collection/theme";
import { QuizzModel, GridQuizzModel, PickAndBanQuizzModel, BigBucketQuizzModel, TimerQuizzModel } from "../Collection/quizz";
import EmissionModel from "../Collection/emission";
import notificationManager from "./notificationManager";
import { collectQuizzQuestionIds } from "./publicationStatus";
import logger from "../utils/logger";

/**
 * Intégrité de suppression / re-validation en cascade (cf. ROADMAP.md,
 * Phase 4) : contrairement à `publicationStatus.ts` (Phase 3, calcul à la
 * lecture, auto-réparable dès qu'une question est approuvée), ceci écrit
 * réellement `private: true` — un événement destructeur (suppression,
 * privatisation manuelle) ne doit pas se "réparer" tout seul si du contenu
 * revient plus tard, le créateur doit re-confirmer explicitement.
 *
 * "Injouable" = ne référence plus aucune question du tout (cf. décision
 * ROADMAP.md : correspond à l'échec dur déjà présent dans chaque moteur,
 * pas de seuil par thème inventé ici).
 */

/** Émissions publiques dont une étape référence un de ces quizz : repassées privées + notifiées. Couvre suppression de quizz ET privatisation manuelle. */
export async function cascadePrivatizeEmissionsUsingQuizz(quizzIds: number[]): Promise<void> {
    if (quizzIds.length === 0) return;
    try {
        const emissions = await EmissionModel.find({ private: false, "steps.quizz": { $in: quizzIds } });
        for (const emission of emissions) {
            await EmissionModel.updateOne({ emission_id: emission.emission_id }, { $set: { private: true } });
            await notificationManager.create(
                Number(emission.creator),
                "entity_unpublished",
                `Votre émission "${emission.title}" a été repassée en privé : un quizz qu'elle utilise n'est plus public ou a été supprimé.`
            );
        }
    } catch (error) {
        logger.error("erreur lors de la privatisation en cascade des émissions", error);
    }
}

/**
 * À appeler après suppression d'une ou plusieurs questions : nettoie les
 * références mortes (thème bibliothèque, thèmes embarqués dans les quizz,
 * pool neutre Grid), puis repasse en privé + notifie tout thème/quizz
 * public devenu injouable, et cascade vers les émissions qui en dépendent.
 */
export async function cascadeAfterQuestionsDeleted(questionIds: number[]): Promise<void> {
    if (questionIds.length === 0) return;
    try {
        // 1. Nettoyage des références mortes.
        await ThemeModel.updateMany(
            { questions: { $in: questionIds } },
            { $pull: { questions: { $in: questionIds } } }
        );
        // `themes` n'existe que sur les schémas discriminator GRID/PICKANDBAN/
        // BIGBUCKET/TIMER (pas sur le schéma de base `QuizzModel`, ni sur LIST) :
        // passer par le modèle de base ferait ignorer silencieusement le $pull
        // (mode strict Mongoose, champ inconnu du schéma de base).
        for (const Model of [GridQuizzModel, PickAndBanQuizzModel, BigBucketQuizzModel, TimerQuizzModel]) {
            await Model.updateMany(
                { "themes.questions": { $in: questionIds } },
                { $pull: { "themes.$[].questions": { $in: questionIds } } }
            );
        }
        await GridQuizzModel.updateMany(
            { neutralQuestions: { $in: questionIds } },
            { $pull: { neutralQuestions: { $in: questionIds } } }
        );

        // 2. Thèmes publics devenus vides -> privés + notification.
        const brokenThemes = await ThemeModel.find({ private: false, questions: { $size: 0 } });
        for (const theme of brokenThemes) {
            await ThemeModel.updateOne({ theme_id: theme.theme_id }, { $set: { private: true } });
            await notificationManager.create(
                Number(theme.creator),
                "entity_unpublished",
                `Votre thème "${theme.title}" a été repassé en privé : une question qu'il utilisait a été supprimée.`
            );
        }

        // 3. Quizz publics devenus injouables (plus aucune question référencée) -> privés + notification.
        const candidateQuizzes = await QuizzModel.find({ private: false });
        const brokenQuizzIds: number[] = [];
        for (const quizz of candidateQuizzes) {
            if (collectQuizzQuestionIds(quizz).length === 0) {
                await QuizzModel.updateOne({ quizz_id: quizz.quizz_id }, { $set: { private: true } });
                await notificationManager.create(
                    Number(quizz.creator),
                    "entity_unpublished",
                    `Votre quizz "${quizz.title}" a été repassé en privé : il ne contient plus aucune question exploitable.`
                );
                brokenQuizzIds.push(Number(quizz.quizz_id));
            }
        }

        // 4. Émissions qui dépendaient de ces quizz.
        await cascadePrivatizeEmissionsUsingQuizz(brokenQuizzIds);
    } catch (error) {
        logger.error("erreur lors du nettoyage/de la cascade après suppression de question(s)", error);
    }
}
