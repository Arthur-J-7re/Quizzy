import Button from '@mui/material/Button';
import "./CreateQuestionCss.css"
import TagEditor from './TagEditor';
import AnswerListEditor from './AnswerListEditor';
import submitQuestion from './submitQuestion';
import validateBase from './validateBase';

interface CreatefreeFormProps {
    question_id: number,
    endTask : () => void;
    setMessageInfo : (message : string) => void;
    setShowMessage : (bool : boolean) => void;
    tags: string[];
    addTag: (tag: string) => void;
    removeTag: (tag: string) => void;
    answers: string[];
    addAnswer: (answer: string) => void;
    removeAnswer: (answer: string) => void;
    freeData: {creator: number; mode : string; title: string; level: number;tags: string[]; answers: string[] };
  }

export function CreateFreeForm({
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
    freeData,
  }: CreatefreeFormProps)  {

    const validateFree = () => {
        if (!validateBase(freeData.title, tags, setMessageInfo, setShowMessage)) {
            return false;
        }

        if (freeData.answers.length === 0) {
            setMessageInfo("Il faut au moins une réponse !");
            setShowMessage(true);
            return false;
        }

        if (freeData.answers.some(answer => answer.trim() === "")) {
            setMessageInfo("Toutes les réponses doivent être remplies !");
            setShowMessage(true)
            return false;
        }

        return true;
    }

    const sendFree = () => {
        if (validateFree()) {
            submitQuestion(question_id, freeData, endTask);
        }
    };

    return (
    <div className='formContainer'>
        <AnswerListEditor answers={answers} addAnswer={addAnswer} removeAnswer={removeAnswer} />
        <TagEditor tags={tags} addTag={addTag} removeTag={removeTag} />
        <Button className='SendButton' onClick={()=>sendFree()}>{question_id === 0 ? "Finaliser la création de" : "Sauvegarder"} la question</Button>
    </div>
    )
}
