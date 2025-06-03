import { Button, InputLabel } from "@mui/material";
import { Add } from "@mui/icons-material";
import { Banner } from "../../component/Banner/Banner";
import { useNavigate, useLocation } from "react-router-dom";
import { useContext, useEffect, useState, useRef } from "react";
import { AuthContext } from "../../context/authentContext";
import Toast from "../../tools/toast/toast";
import { StepForm } from "../../component/StepForm/StepForm";
import makeRequest from "../../tools/requestScheme";
import "../CommonCss.css";

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

export function EmissionCreation() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useContext(AuthContext);

  const isModifying = location.pathname === "/modify-an-emission";
  const [emission, setEmission] = useState(
    (location.state?.quizz && isModifying) || {
      title: "",
      Private: false,
      questions: [],
      tags: [],
    }
  );
  const [title, setTitle] = useState(emission?.title || "");
  const [quizzList, setQuizzList] = useState<any[]>([]);
  const [steps, setSteps] = useState<Step[]>([
    {
      name: "",
      mode: "Points",
      quizz: "",
      inputCount: 10,
      outputCount: 4,
      resetPoint: false,
      last: false,
      played: false,
    },
  ]);

  const [messageInfo, setMessageInfo] = useState("");
  const [showMessage, setShowMessage] = useState(false);
  const [endTaskToast, setEndTaskToast] = useState(() => () => {});
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    const fetchData = async () => {
      if (auth?.user?.id) {
        try {
          const res = await makeRequest(
            `/quizz/available-quizz?id=${auth.user.id}`
          );
          setQuizzList(res);
        } catch (error) {
          console.error("Erreur lors du fetch :", error);
        }
      }
    };

    fetchData();

    if (location.state?.quizz) {
      setEmission(location.state.emission);
    }
  }, [auth?.user?.id, location.state?.emission]);

  useEffect(() => {
    if (!emission?.title?.length && isModifying) {
      navigate("/create-an-emission");
    }
  }, [emission?.title, isModifying]);

  const validateEmission = () => {
    if (!title.trim()) {
      setMessageInfo("Il faut un nom pour l'Émission !");
      setShowMessage(true);
      return false;
    }
    return true;
  };

  const deleteEmission = async () => {
    const confirmation = window.confirm(
      "Êtes-vous sûr de vouloir supprimer définitivement l'émission ?"
    );
    if (confirmation) {
      const response = await makeRequest("/emission", "DELETE", {
        emission_id: emission.emission_id,
      });
      if (response.success) {
        navigate("/profil");
      }
    }
  };

  const endTask = () => {
    setMessageInfo("Émission créée avec succès");
    setShowMessage(true);
    setEndTaskToast(() => navigate(-1));
  };

  const setStep = (index: number, field: keyof Step, value: any) => {
    console.log(index, field, value)
    const updatedSteps = [...steps];
    let newValue = value;

    if (field === "inputCount") {
        // Interdire les valeurs négatives
        if (newValue < 2) newValue = 2;

        updatedSteps[index].inputCount = newValue;

        // Réduire outputCount si nécessaire
        if (updatedSteps[index].outputCount > newValue) {
        updatedSteps[index].outputCount = newValue;
        }

        // Propager à l'étape suivante
        if (index + 1 < updatedSteps.length) {
        updatedSteps[index + 1].inputCount = updatedSteps[index].outputCount;

        // Et ajuster aussi son outputCount si besoin
        if (updatedSteps[index + 1].outputCount > updatedSteps[index + 1].inputCount) {
            updatedSteps[index + 1].outputCount = updatedSteps[index + 1].inputCount;
        }
        }

    } else if (field === "outputCount") {
        const inputCount = updatedSteps[index].inputCount;

        // Forcer à ne pas dépasser inputCount ni être négatif
        if (newValue > inputCount) newValue = inputCount;
        if (newValue < 1) newValue = 1;

        updatedSteps[index].outputCount = newValue;

        // Propager vers inputCount de l'étape suivante
        if (index + 1 < updatedSteps.length) {
        updatedSteps[index + 1].inputCount = newValue;

        // Ajuster outputCount si nécessaire
        if (updatedSteps[index + 1].outputCount > newValue) {
            updatedSteps[index + 1].outputCount = newValue;
        }
        }

    } else {
        (updatedSteps[index] as any)[field] = newValue;

    }

    setSteps(updatedSteps);
    };

  const sendData = async () => {
    if (!validateEmission()) return;

    // Exemple simplifié d'envoi
    const payload = {
      title,
      user_id: auth?.user?.id,
      steps,
    };

    console.log("Payload à envoyer :", payload);

    try {
      const response = await makeRequest("/emission", "POST", payload);
      if (response.success) {
        endTask();
      } else {
        setMessageInfo("Erreur lors de la création");
        setShowMessage(true);
      }
    } catch (err) {
      console.error(err);
      setMessageInfo("Erreur réseau");
      setShowMessage(true);
    }
  };

  if (!auth?.user) {
    return (
      <div>
        <Banner />
        <div className="PleaseLogin">
          <h1>Veuillez-vous inscrire pour pouvoir créer une Émission</h1>
          <Button className="linkLogin" onClick={() => navigate("/login")}>
            Page de connexion !
          </Button>
        </div>
      </div>
    );
  }

  return (

    <div>
      <Banner />
      <div className="quizzFormContainer">
        <div>
          <InputLabel id="title-label">Nom de l'Émission</InputLabel>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          {steps.map((step, index) => (
            <StepForm
              key={index}
              step={step}
              quizz={quizzList}
              number={index}
              setStep={setStep}
              onDelete={(i: number) => {
                if (steps.length > 1) {
                    const updatedSteps = steps.filter((_, idx) => idx !== i);
                    setSteps(updatedSteps);
                } else {
                    setMessageInfo("Il doit y avoir au moins une étape.");
                    setShowMessage(true);
                }
                }}
              isFirst={index === 0}
            />
          ))}
            {
            steps.length < 5
            ?<Button
                onClick={() => {
                    const prevStep = steps[steps.length - 1];
                    if (prevStep.outputCount > 1){
                    const input = Math.max(2, prevStep.outputCount);
                    const output = Math.max(1, input - 1);
                    setSteps([
                        ...steps,
                        {
                        name: "",
                        mode: "Points",
                        quizz: "",
                        inputCount:input,
                        outputCount:output,
                        resetPoint: false,
                        last: false,
                        played: false,
                        },
                    ]);
                    } else {
                        setMessageInfo("vous avez une étape final dans vos étapes")
                        setShowMessage(true)
                    }
                }}
            >
            <Add /> Ajouter une étape
            </Button> :
            <>limite du nombre d'étape atteinte</>}
        </div>

        <div>
          <Button className="send-Quizz" onClick={sendData}>
            {isModifying ? "Sauvegarder l'émission" : "Créer l'émission"}
          </Button>
        </div>

        {(location.state && location.state.emission) && (
          <div>
            <Button onClick={deleteEmission}>Supprimer l'émission</Button>
          </div>
        )}

        <div className="RedText">
          {showMessage && (
            <Toast
              message={messageInfo}
              onClose={() => {
                setShowMessage(false);
                endTaskToast();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
