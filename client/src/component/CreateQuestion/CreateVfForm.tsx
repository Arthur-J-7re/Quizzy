import { Button } from '@mui/material';
import "./CreateQuestionCss.css"
import TagEditor from './TagEditor';
import submitQuestion from './submitQuestion';
import validateBase from './validateBase';

interface CreateVfFormProps {
    question_id: number,
    endTask : ()=>void;
    setMessageInfo : (message : string) => void;
    setShowMessage : (bool : boolean) => void;
    tags: string[];
    addTag: (tag: string) => void;
    removeTag: (tag: string) => void;
    truth: boolean,
    setTruth: (bool : boolean)=>void;
    vfData: { creator: number;mode : string;title: string; level: number;tags: string[]; truth: boolean };
  }


export function CreateVfForm({
    question_id,
    endTask,
    setMessageInfo,
    setShowMessage,
    tags,
    addTag,
    removeTag,
    truth,
    setTruth,
    vfData,
  }: CreateVfFormProps) {

    const validateVf = () => validateBase(vfData.title, tags, setMessageInfo, setShowMessage);

    const sendVF = () => {
        if (validateVf()) {
            submitQuestion(question_id, vfData, endTask);
        }
    };

    return (
        <div className='formContainer'>
            <div className='VraiFaux'>
                <Button onClick={()=>setTruth(true)} className={truth ? "VFButtonchecked":"VFButton"} >Vrai</Button>
                <Button onClick={()=>setTruth(false)} className={truth ? "VFButton" : "VFButtonchecked"}>Faux</Button>
            </div>
            <TagEditor tags={tags} addTag={addTag} removeTag={removeTag} />
            <Button className='SendButton' onClick={()=>sendVF()}>{question_id === 0 ? "Finaliser la création de" : "Sauvegarder"} la question</Button>
        </div>
    )
}
