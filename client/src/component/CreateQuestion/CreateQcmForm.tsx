import { Button } from '@mui/material';
import "./CreateQuestionCss.css"
import TagEditor from './TagEditor';
import QcmChoiceGrid from './QcmChoiceGrid';
import submitQuestion from './submitQuestion';
import validateBase from './validateBase';

interface CreateQCMFormProps {
    question_id: number,
    endTask : () => void;
    setMessageInfo : (message : string) => void;
    setShowMessage : (bool : boolean) => void;
    tags: string[];
    addTag: (tag: string) => void;
    removeTag: (tag: string) => void;
    carre: { ans1: string; ans2: string; ans3: string; ans4: string };
    setCarre: React.Dispatch<React.SetStateAction<{ ans1: string; ans2: string; ans3: string; ans4: string }>>;
    qcmData: {creator: number;mode : string;title: string;level: number; tags: string[]; choices: { ans1: string; ans2: string; ans3: string; ans4: string }; answer: number };
    setQcmData: React.Dispatch<React.SetStateAction<CreateQCMFormProps["qcmData"]>>;
}


export function CreateQCMForm({
    question_id,
    endTask,
    setMessageInfo,
    setShowMessage,
    tags,
    addTag,
    removeTag,
    carre,
    setCarre,
    qcmData,
    setQcmData,
  }: CreateQCMFormProps) {

    const validateQcm = () => {
        if (!validateBase(qcmData.title, tags, setMessageInfo, setShowMessage)) {
            return false;
        }

        if (!qcmData.choices.ans1.trim() ||
            !qcmData.choices.ans2.trim() ||
            !qcmData.choices.ans3.trim() ||
            !qcmData.choices.ans4.trim()) {
            setMessageInfo("Toutes les réponses doivent être remplies !");
            setShowMessage(true);
            return false;
        }

        return true;
    };

    const sendQcm = () => {
        if (validateQcm()) {
            submitQuestion(question_id, qcmData, endTask);
        }
    };

    return (
        <div className='formContainer'>
            <div className='carre'>
                <h3 className='questionCreationIndication'>Complétez les différentes propositions et cochez la bonne réponse</h3>
                <QcmChoiceGrid
                    carre={carre}
                    setCarre={setCarre}
                    selectedAnswer={qcmData.answer}
                    onSelectAnswer={(n) => setQcmData({ ...qcmData, answer: n })}
                />
            </div>
            <TagEditor tags={tags} addTag={addTag} removeTag={removeTag} />
            <Button className='SendButton' onClick={()=>sendQcm()}>{question_id === 0 ? "Finaliser la création de" : "Sauvegarder"} la question</Button>
        </div>
    )
}
