/** Liste de réponses (ajout au Enter) partagée par CreateFreeForm et la section Cash de CreateDccForm. */
export default function AnswerListEditor({
    answers,
    addAnswer,
    removeAnswer,
    placeholder = "Ajouter une réponse",
}: {
    answers: string[];
    addAnswer: (answer: string) => void;
    removeAnswer: (answer: string) => void;
    placeholder?: string;
}) {
    return (
        <div className="answersList">
            <div className="tagSpanDispencer">
                {answers.map((answer) => (
                    <span key={answer} onClick={() => removeAnswer(answer)} className="answer">
                        {answer} ❌
                    </span>
                ))}
            </div>
            <input
                type="text"
                className="answerInput"
                onKeyDown={(e) => {
                    const inputElement = e.target as HTMLInputElement;
                    if (e.key === "Enter" && inputElement.value.trim()) {
                        addAnswer(inputElement.value.trim());
                        inputElement.value = "";
                    }
                }}
                placeholder={placeholder}
            />
        </div>
    );
}
