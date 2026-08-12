import GetTags from "../Tags/Tags";
import PrivateButton from "../PrivateButton/PrivateButton";
import { Button, FormControl, InputLabel, MenuItem, Select, TextField } from "@mui/material";
import { useEffect } from "react";
import { Banner } from "../Banner/Banner";
import Toast from "../../tools/toast/toast";
import { getThemeFolderOptions } from "../../tools/props/Props";
import { getQuestionModeLabel } from "../../tools/text/text";
import { useQuestionPicker, useSelectedQuestionsCache } from "../../tools/hooks/useQuestionPicker";
import QuestionPicker from "../QuestionPicker/QuestionPicker";
import "../../pages/CommonCss.css";
import "../../pages/ThemeCreation/theme.css";
import "../../pages/QuizzForm/QuizzForm.css";


export default function CreateThemeForm(
    {
        theme,
        setTheme,
        saveData,
        deleteTheme = null,
        messageInfo,
        showMessage,
        onCloseToast,
    } : {
        theme:any,
        setTheme:any,
        saveData:(theme : any) => void,
        deleteTheme:(() => void) | null,
        messageInfo: string,
        showMessage: boolean,
        onCloseToast: () => void,
    }
) {
    const isModifying = deleteTheme != null;

    const picker = useQuestionPicker();
    const { cache, merge } = useSelectedQuestionsCache(theme.questions);
    useEffect(() => { merge(picker.results); }, [picker.results, merge]);

    const selectedQuestions = theme.questions
        .map((id: number) => cache[id])
        .filter((question: any) => question !== undefined);

    const toggleQuestion = (question_id: number) => {
        const exists = theme.questions.includes(question_id);
        setTheme({
            ...theme,
            questions: exists
                ? theme.questions.filter((id: number) => id !== question_id)
                : [...theme.questions, question_id],
        });
    };

    return (
        <div className="themeCreationPage">
            <Banner />
            <div className="themeCreationContent">
                <h1>{isModifying ? "Modifier le thème" : "Créer un thème"}</h1>
                <p className="themeCreationIntro">
                    Regroupez des questions autour d'un même thème pour les réutiliser dans vos quizz Grid.
                </p>

                <section className="themeSection">
                    <h2>Général</h2>
                    <TextField
                        className="themeTitleInput"
                        label="Titre du thème"
                        value={theme.title}
                        onChange={(e) => setTheme({ ...theme, title: e.target.value })}
                        placeholder="ex: Thème cinéma"
                        fullWidth
                    />
                    <PrivateButton entity={theme} setEntity={setTheme} />
                    <FormControl size="small" className="themeFolderSelect">
                        <InputLabel shrink>Dossier</InputLabel>
                        <Select
                            label="Dossier"
                            displayEmpty
                            value={theme.folder ?? ""}
                            onChange={(e) => setTheme({ ...theme, folder: e.target.value || undefined })}
                        >
                            {getThemeFolderOptions().map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>{opt.title}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </section>

                <section className="themeSection">
                    <h2>Questions disponibles</h2>
                    <QuestionPicker
                        results={picker.results}
                        folders={picker.folders}
                        filter={picker.filter}
                        onFilterChange={picker.setFilter}
                        loading={picker.loading}
                        selectedIds={theme.questions}
                        onToggle={toggleQuestion}
                    />
                </section>

                <section className="themeSection">
                    <h2>Questions du thème ({selectedQuestions.length})</h2>
                    {selectedQuestions.length > 0 ? (
                        <div className="quizzQuestionList">
                            {selectedQuestions.map((question: any) => (
                                <button
                                    key={question.question_id}
                                    type="button"
                                    className="quizzQuestionChip picked"
                                    onClick={() => toggleQuestion(question.question_id)}
                                >
                                    {question.title}
                                    <span className={"mode type-" + String(question.mode).toLowerCase()}>
                                        {getQuestionModeLabel(question.mode)}
                                    </span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <h2 className="filler">Sélectionnez des questions pour votre thème !</h2>
                    )}
                </section>

                <section className="themeSection">
                    <h2>Tags ({theme.tags?.length ?? 0}/5)</h2>
                    <GetTags entity={theme} setEntity={setTheme} limit={5}/>
                </section>

                <div className="themeActions">
                    {deleteTheme != null && (
                        <Button className="Button" onClick={()=>deleteTheme()}>Supprimer le thème</Button>
                    )}
                    <Button className="Button" onClick={()=>saveData(theme)}>{isModifying ? "Sauvegarder" : "Créer"} le thème</Button>
                </div>
            </div>
            {showMessage && (
                <Toast message={messageInfo} onClose={onCloseToast} />
            )}
        </div>
    )
}
