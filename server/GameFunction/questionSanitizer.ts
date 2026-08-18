import { resolveDccMode, shuffledChoiceOrder, shuffledPairOrder } from "./threadHelper";
import { ForcedQuestionType } from "../../shared-types/scoring";

export interface QuestionSanitizerContext {
    roomId: string;
    forcedType?: ForcedQuestionType;
}

/**
 * Retire la bonne réponse avant de diffuser la question aux joueurs.
 *
 * Extrait à l'identique de List/Points/BR/Grid/PickBan/TimerGame (les 6
 * moteurs qui la réimplémentaient mot pour mot) — cf. CODE_QUALITY.md, point
 * 1. Duel n'utilise pas cette fonction : sa version est un sous-ensemble
 * volontairement plus simple (pas de forcedType), ce n'est pas un oubli.
 */
export function sanitizeQuestionForBroadcast(question: any, ctx: QuestionSanitizerContext): any {
    const { answer, answers, truth, ...safe } = question?.toObject?.() ?? question ?? {};
    if (safe.mode === "DCC") {
        safe.forcedDccMode = resolveDccMode(`${ctx.roomId}:${safe.question_id}:dccmode`, ctx.forcedType);
    }
    if (safe.mode === "QCM" || safe.mode === "DCC") {
        safe.choiceOrder = shuffledChoiceOrder(`${ctx.roomId}:${safe.question_id}`);
    }
    if (safe.mode === "DCC") {
        const duoPair = shuffledPairOrder(`${ctx.roomId}:${safe.question_id}:duo`, answer, safe.duo);
        safe.duoChoices = duoPair.map((id: number) => ({ id, value: safe.carre?.[`ans${id}`] }));
    }
    return safe;
}

/** Le serveur impose le sous-mode DCC (Carré/Cash, jamais laissé au choix du joueur). */
export function enforceDccMode(question: any, given: unknown, ctx: QuestionSanitizerContext): unknown {
    if (question?.mode !== "DCC" || !given || typeof given !== "object") return given;
    const forcedDccMode = resolveDccMode(`${ctx.roomId}:${question.question_id}:dccmode`, ctx.forcedType);
    return forcedDccMode ? { ...given, mode: forcedDccMode } : given;
}
