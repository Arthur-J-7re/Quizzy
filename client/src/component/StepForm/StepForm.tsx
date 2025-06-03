import { InputLabel, TextField, Select, FormControl, MenuItem, Button , Checkbox} from "@mui/material";
import { useState } from "react";

interface Step {
  name: string;
  mode: string;
  quizz: any;
  inputCount: number;
  outputCount: number;
  resetPoint: boolean;
  last: boolean;
  played: boolean;
}

export function StepForm({
  step,
  quizz,
  setStep,
  number,
  onDelete,
  isFirst
}: {
  step: Step;
  quizz: any[];
  setStep: any;
  number: number;
  onDelete: any;
  isFirst: boolean;
}) {
  const [showMore, setShowMore] = useState(true);

  return (
    <div className="stepFormContainer">
      <FormControl fullWidth>
        
        <TextField
        label="nom de l'étape"
          value={step.name}
          onChange={(e) => setStep(number, "name", e.target.value)}
        />
      </FormControl>

      <FormControl fullWidth>
        <InputLabel>Choose a quizz</InputLabel>
        <Select
          value={step.quizz}
          onChange={(e) => setStep(number, "quizz", e.target.value)}
        >
          {quizz?.map((q) => (
            <MenuItem key={q.quizz_id} value={q.quizz_id}>
              {q.title}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <label>reset des points</label>
      <input
        type="checkbox"
        className="checkboxStepForm"
        checked={step.resetPoint}
        onChange={()=>{}}
        onClick={() => setStep(number, "resetPoint", !step.resetPoint)}
      
      />
      <TextField
        label="Entrées"
        type="number"
        value={step.inputCount}
        disabled={!isFirst}
        onChange={(e) => setStep(number, "inputCount", parseInt(e.target.value))}
      />
      <TextField
        label="Sorties"
        type="number"
        value={step.outputCount}
        onChange={(e) => setStep(number, "outputCount", parseInt(e.target.value))}
      />

      <Button onClick={() => onDelete(number)}>Supprimer cette étape</Button>
    </div>
  );
}
