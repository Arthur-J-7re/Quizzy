import type { Server } from "socket.io";

export interface PhaseTimerEngineEvents {
    error: string;
}

/**
 * Socle commun aux moteurs de jeu à "timer de phase partagé" (List, Points,
 * BR, Grid, PickBan, Timer) : chrono de manche unique, diffusion d'erreur,
 * résolution joueur → socket, et cycle de vie (fin de partie / dispose).
 *
 * Duel n'en hérite pas : son chrono est par joueur actif (setInterval, pas de
 * "phase" qui expire globalement), une différence de design réelle et non un
 * oubli — cf. ROADMAP.md, Phase 1.
 *
 * Extrait de CODE_QUALITY.md, point 1 : `startPhaseTimer`/`clearPhaseTimer`,
 * `emitTo`/`socketIdResolver`, `onFinished`/`dispose`/`getPhase` étaient
 * réimplémentés à l'identique dans les 6 fichiers.
 */
export default abstract class PhaseTimerEngine<TPhase extends string, TRanking> {
    protected phase: TPhase;
    protected phaseEndsAt = 0;
    private phaseTimer?: NodeJS.Timeout;
    private socketIdResolver: ((name: string) => string | undefined) | null = null;
    private onFinishedCallback: ((ranking: TRanking[]) => void) | null = null;

    constructor(
        protected readonly roomId: string,
        protected readonly io: Server,
        initialPhase: TPhase,
        private readonly events: PhaseTimerEngineEvents
    ) {
        this.phase = initialPhase;
    }

    // ------------------------------------------------------------- lifecycle

    /** Permet à l'orchestrateur (Thread) de savoir quand passer à l'étape suivante. */
    public onFinished(callback: (ranking: TRanking[]) => void): void {
        this.onFinishedCallback = callback;
    }

    protected finishWith(ranking: TRanking[]): void {
        this.onFinishedCallback?.(ranking);
    }

    public dispose(): void {
        this.clearPhaseTimer();
    }

    public getPhase(): TPhase {
        return this.phase;
    }

    // ------------------------------------------------------------- diffusion

    protected emitError(message: string): void {
        this.io.to(this.roomId).emit(this.events.error, { message });
    }

    protected emitTo(username: string, event: string, payload: unknown): void {
        const socketId = this.socketIdResolver?.(username);
        if (socketId) {
            this.io.to(socketId).emit(event, payload);
        }
    }

    /** Injecté par la Room, qui seule connaît la table joueur → socket. */
    public setSocketIdResolver(resolver: (name: string) => string | undefined): void {
        this.socketIdResolver = resolver;
    }

    // --------------------------------------------------------------- timers

    protected startPhaseTimer(durationMs: number, onEnd: () => void): void {
        this.clearPhaseTimer();
        this.phaseEndsAt = Date.now() + durationMs;
        this.phaseTimer = setTimeout(() => {
            this.phaseEndsAt = 0;
            onEnd();
        }, durationMs);
    }

    protected clearPhaseTimer(): void {
        if (this.phaseTimer) {
            clearTimeout(this.phaseTimer);
            this.phaseTimer = undefined;
        }
        this.phaseEndsAt = 0;
    }

    protected remainingMs(): number | undefined {
        return this.phaseEndsAt > 0 ? Math.max(0, this.phaseEndsAt - Date.now()) : undefined;
    }
}
