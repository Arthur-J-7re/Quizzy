import Button from '@mui/material/Button';
import "./CreateQuestionCss.css"
import TagEditor from './TagEditor';
import AnswerListEditor from './AnswerListEditor';
import QcmChoiceGrid from './QcmChoiceGrid';
import submitQuestion from './submitQuestion';
import validateBase from './validateBase';

interface CreateDccFormProps {
    question_id : number;
    endTask : () => void;
    setMessageInfo : (message : string) => void;
    setShowMessage : (bool : boolean) => void;
    tags: string[];
    addTag: (tag: string) => void;
    removeTag: (tag: string) => void;
    answers: string[];
    addAnswer: (answer: string) => void;
    removeAnswer: (answer: string) => void;
    carre: { ans1: string; ans2: string; ans3: string; ans4: string };
    setCarre: React.Dispatch<React.SetStateAction<{ ans1: string; ans2: string; ans3: string; ans4: string }>>;
    duoContain: (nombre: number) => boolean;
    manageDuo: (nombre: number) => void;
    dccData:{creator: number; mode : string;title: string;level: number; tags: string[]; carre: { ans1: string; ans2: string; ans3: string; ans4: string };duo: number, answer: number; cash : string[] };
    setDccData: React.Dispatch<React.SetStateAction<CreateDccFormProps["dccData"]>>;
  }

export function CreateDCCForm({
    question_id,
    endTask,
    setMessageInfo,
    setShowMessage,
    tags,
    addTag,
    removeTag,
    answers,
    addAnswer,
    removeAnswer,
    carre,
    setCarre,
    duoContain,
    manageDuo,
    dccData,
    setDccData,
  }: CreateDccFormProps)   {

    const validateDcc = () => {
        if (!validateBase(dccData.title, tags, setMessageInfo, setShowMessage)) {
            return false;
        }

        if (answers.length === 0) {
            setMessageInfo("Il faut au moins une réponse !");
            setShowMessage(true);
            return false;
        }

        if (dccData.cash.some(answer => answer.trim() === "")) {
            setMessageInfo("Toutes les réponses Cash doivent être remplies !");
            setShowMessage(true);
            return false;
        }

        if (!dccData.carre.ans1.trim() ||
            !dccData.carre.ans2.trim() ||
            !dccData.carre.ans3.trim() ||
            !dccData.carre.ans4.trim()) {
            setMessageInfo("Toutes les réponses Carre doivent être remplies !");
            setShowMessage(true);
            return false;
        }
        return true;
    }

    const sendDcc = () => {
        if (validateDcc()) {
            submitQuestion(question_id, dccData, endTask);
        }
    };

    return (
    <div className='formContainer'>
        <div className='carre'>
            <h3 className='questionCreationIndication'>Complétez les différentes propositions et cochez la bonne réponse (à gauche) <br/>
                et la réponse complétant le duo (à droite) </h3>
            <QcmChoiceGrid
                carre={carre}
                setCarre={setCarre}
                selectedAnswer={dccData.answer}
                onSelectAnswer={(n) => setDccData({ ...dccData, answer: n })}
                renderExtra={(n) => (
                    <input
                        type='checkbox'
                        checked={duoContain(n)}
                        className='coloredAnswer duoCheckbox'
                        readOnly
                        onClick={(e) => { e.stopPropagation(); manageDuo(n); }}
                    />
                )}
            />
        </div>
        <AnswerListEditor answers={answers} addAnswer={addAnswer} removeAnswer={removeAnswer} />
        <TagEditor tags={tags} addTag={addTag} removeTag={removeTag} />
        <Button className='SendButton' onClick={()=>sendDcc()}>{question_id === 0 ? "Finaliser la création de" : "Sauvegarder"} la question</Button>
    </div>
    )
}
