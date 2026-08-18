import type { ReactNode } from "react";
import { Fragment } from "react";

type Carre = { ans1: string; ans2: string; ans3: string; ans4: string };
type ChoiceIndex = 1 | 2 | 3 | 4;

const INDICES: ChoiceIndex[] = [1, 2, 3, 4];

/**
 * Les 4 lignes "réponse + case à cocher" de la grille QCM/DCC, partagées par
 * CreateQcmForm et CreateDccForm. Pas de wrapper `.carre` ici : cette classe
 * doit envelopper le `<h3>` d'instructions ET ces lignes ensemble (flex
 * centré commun aux deux), donc c'est aux appelants de le poser.
 * `renderExtra` (utilisé par DCC pour la case "duo") s'affiche à côté du
 * libellé de chaque ligne ; son `onClick` doit appeler `stopPropagation`
 * pour ne pas aussi sélectionner la ligne comme bonne réponse (le clic sur
 * toute la ligne fait déjà ça).
 */
export default function QcmChoiceGrid({
    carre,
    setCarre,
    selectedAnswer,
    onSelectAnswer,
    renderExtra,
}: {
    carre: Carre;
    setCarre: (carre: Carre) => void;
    selectedAnswer: number;
    onSelectAnswer: (n: ChoiceIndex) => void;
    renderExtra?: (n: ChoiceIndex) => ReactNode;
}) {
    return (
        <Fragment>
            {INDICES.map((n) => {
                const key = `ans${n}` as keyof Carre;
                return (
                    <div className="answerQcm" key={n}>
                        <div className="headerAns" onClick={() => onSelectAnswer(n)}>
                            <input type="checkbox" checked={selectedAnswer === n} className="coloredAnswer" readOnly />
                            <label className="questionCreation-label">Réponse {n}</label>
                            {renderExtra?.(n)}
                        </div>
                        <input
                            type="text"
                            autoComplete="off"
                            id={`answer${n}`}
                            value={carre[key] || ""}
                            onChange={(e) => setCarre({ ...carre, [key]: e.target.value })}
                            required
                        />
                    </div>
                );
            })}
        </Fragment>
    );
}
