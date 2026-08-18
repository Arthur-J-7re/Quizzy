import { Button, Slider, Switch, TextField } from "@mui/material";
import { Add } from "@mui/icons-material";
import { Banner } from "../../component/Banner/Banner";
import { useNavigate, useLocation } from "react-router-dom";
import { useContext, useEffect, useMemo, useState, useRef } from "react";
import { AuthContext } from "../../context/authentContext";
import Toast from "../../tools/toast/toast";
import { StepForm } from "../../component/StepForm/StepForm";
import makeRequest from "../../tools/requestScheme";
import { useEntityByIdResolver } from "../../tools/hooks/useEntityByIdResolver";
import PublicationBlockedNotice from "../../component/PublicationStatus/PublicationBlockedNotice";
import "../CommonCss.css";
import "./emission.css";
import {Step} from "../../tools/type/Step"

const DEFAULT_STEP: Step = {
  name: "",
  mode: "GRID",
  quizz: "",
  inputCount: 10,
  outputCount: 4,
  resetPoint: false,
  last: false,
  played: false,
};

// Pas de réglage dans l'UI pour choisir une autre taille : toujours des duos
// (cf. StepForm.tsx et Thread.startTeamFormation côté serveur).
const TEAM_SIZE = 2;

/**
 * Recalcule Entrées/Sorties de haut en bas à chaque changement : `outputCount`
 * reste le choix du MJ (juste capé à `inputCount`, forcé à `inputCount` sur
 * une étape TEAM_FORMATION puisqu'elle n'élimine personne), `inputCount` est
 * toujours dérivé de la sortie de l'étape précédente.
 *
 * Une étape TEAM_FORMATION puis un "dissoudre les équipes" font basculer
 * l'unité de comptage entre joueurs et équipes : dès que des équipes sont
 * actives, le classement que renvoie le serveur est par équipe (une entrée =
 * un duo, cf. Thread.finalizeStep/applyStepElimination), donc les nombres
 * affichés doivent l'être aussi, sans quoi "Sorties" ne veut plus rien dire.
 */
const recalcStepCounts = (steps: Step[], numberOfPlayers: number): Step[] => {
  const result = steps.map((s) => ({ ...s }));
  let teamsActive = false;

  for (let i = 0; i < result.length; i++) {
    const s = result[i];
    if (i === 0) s.inputCount = numberOfPlayers;

    if (s.mode === "TEAM_FORMATION") {
      s.outputCount = s.inputCount;
    } else {
      if (s.outputCount > s.inputCount) s.outputCount = s.inputCount;
      if (s.outputCount < 1) s.outputCount = 1;
    }

    const enteringTeams = teamsActive;
    if (s.mode === "TEAM_FORMATION") teamsActive = true;
    if (s.dissolveTeamsAfter) teamsActive = false;

    if (i + 1 < result.length) {
      const teamSize = s.teamSize ?? TEAM_SIZE;
      let nextInput = s.outputCount;
      if (!enteringTeams && teamsActive) nextInput = Math.max(1, Math.floor(nextInput / teamSize));
      else if (enteringTeams && !teamsActive) nextInput = nextInput * teamSize;
      result[i + 1].inputCount = nextInput;
    }
  }

  return result;
};

/**
 * Résout l'émission existante (état de navigation, ou repli par id via
 * l'URL — ouverture directe/nouvel onglet) avant de monter le vrai
 * formulaire : celui-ci peut alors dériver tous ses champs de
 * `existingEmission` sans se soucier de son arrivée asynchrone.
 */
export function EmissionCreation() {
  const location = useLocation();
  const isModifying = location.pathname.startsWith("/modify-an-emission");
  const { entity: existingEmission, loading, ready } = useEntityByIdResolver({
    isModifying,
    entityKey: "emission",
    idParamName: "emission_id",
    byIdsUrl: (id) => `/emission/by-ids?ids=${id}`,
    createRoute: "/create-an-emission",
  });

  if (!ready) {
    return (
      <div className="emissionCreationPage">
        <Banner />
        <div className="emissionCreationContent">
          <h1>{loading ? "Chargement de l'émission…" : "Cette émission n'existe pas ou n'est pas accessible."}</h1>
        </div>
      </div>
    );
  }

  return <EmissionCreationForm existingEmission={existingEmission} isModifying={isModifying} />;
}

function EmissionCreationForm({ existingEmission, isModifying }: { existingEmission: any; isModifying: boolean }) {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);

  const [emission] = useState(
    existingEmission || {
      title: "",
      questions: [],
      tags: [],
    }
  );
  const [title, setTitle] = useState(emission?.title || "");

  // Pas de contrôle "Privé" avant Phase 3 (ROADMAP.md) : une émission créée
  // ou modifiée via ce formulaire restait donc toujours privée, quoi qu'on
  // fasse — `private` n'était même pas envoyé à la création.
  const [isPrivate, setPrivate] = useState<boolean>(existingEmission?.private ?? true);
  const [blockedCount, setBlockedCount] = useState(0);
  useEffect(() => {
    if (isPrivate || !emission?.emission_id) {
      setBlockedCount(0);
      return;
    }
    let cancelled = false;
    makeRequest(`/emission/${emission.emission_id}/publication-status`)
      .then((status) => { if (!cancelled) setBlockedCount(status.blockedCount ?? 0); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isPrivate, emission?.emission_id]);

  // Options générales : décidées une fois pour toute l'émission, avant de
  // décrire son déroulé épreuve par épreuve.
  const [numberOfPlayers, setNumberOfPlayers] = useState(emission?.options?.numberOfPlayers ?? 4);
  const [teams, setTeams] = useState(emission?.options?.teams ?? false);
  const [playerThemeEnabled, setPlayerThemeEnabled] = useState(emission?.options?.playerThemeEnabled ?? false);
  const [hostModeEnabled, setHostModeEnabled] = useState(emission?.options?.hostModeEnabled ?? false);

  const [quizzList, setQuizzList] = useState<any[]>([]);
  const [steps, setSteps] = useState<Step[]>(
    emission?.steps?.length ? emission.steps : [DEFAULT_STEP]
  );

  // Des équipes existent à l'entrée d'une étape si une étape TEAM_FORMATION a
  // tourné plus tôt dans le déroulé et qu'aucun "dissoudre les équipes" ne
  // s'est déclenché depuis (cf. Thread.finalizeStep côté serveur, qui suit
  // exactement la même logique pour savoir quand basculer en jeu par équipe).
  const teamsActiveByStep = useMemo(() => {
    const result: boolean[] = [];
    let active = false;
    steps.forEach((s, i) => {
      result[i] = active;
      if (s.mode === "TEAM_FORMATION") active = true;
      if (s.dissolveTeamsAfter) active = false;
    });
    return result;
  }, [steps]);

  const [messageInfo, setMessageInfo] = useState("");
  const [showMessage, setShowMessage] = useState(false);
  const [endTaskToast, setEndTaskToast] = useState<() => void>(() => () => {});
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
  }, [auth?.user?.id]);

  // L'entrée de la 1ère étape n'a pas de raison d'être différente du nombre
  // de joueurs attendus pour l'émission : dérivée, jamais saisie à la main
  // (cf. StepForm.tsx, champ "Entrées" désormais toujours disabled).
  useEffect(() => {
    setSteps((prev) => (prev.length === 0 ? prev : recalcStepCounts(prev, numberOfPlayers)));
  }, [numberOfPlayers]);

  const validateEmission = () => {
    if (!title.trim()) {
      setMessageInfo("Il faut un nom pour l'Émission !");
      setShowMessage(true);
      return false;
    }
    if (playerThemeEnabled && !steps.some((s) => s.dynamicThemeStep && (s.mode === "GRID" || s.mode === "TIMER"))) {
      setMessageInfo("L'option « thème associé au joueur » nécessite au moins une étape Grid ou Timer réglée en « étape dynamique ».");
      setShowMessage(true);
      return false;
    }
    const needsHost = steps.some((s) => {
      if (s.mode !== "TIMER") return false;
      const quizz = quizzList.find((q) => String(q.quizz_id) === String(s.quizz));
      return Boolean(quizz?.hostModeEnabled);
    });
    if (needsHost && !hostModeEnabled) {
      setMessageInfo("Une épreuve Timer « avec un présentateur » nécessite l'option « avec un présentateur » sur l'émission.");
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
      try {
        const response = await makeRequest("/emission", "DELETE", {
          emission_id: emission.emission_id,
        });
        if (response.success) {
          navigate(-1);
        } else {
          setMessageInfo("Erreur lors de la suppression");
          setShowMessage(true);
        }
      } catch (err) {
        // makeRequest lève sur toute réponse non-2xx : sans ce catch, le clic
        // ne faisait rigoureusement rien de visible pour l'utilisateur.
        setMessageInfo(err instanceof Error ? err.message : "Erreur réseau");
        setShowMessage(true);
      }
    }
  };

  const endTask = (message: string) => {
    setMessageInfo(message);
    setShowMessage(true);
    setEndTaskToast(() => () => navigate(-1));
  };

  const setStep = (index: number, field: keyof Step, value: any) => {
    const updatedSteps = [...steps];
    (updatedSteps[index] as any)[field] = value;
    setSteps(recalcStepCounts(updatedSteps, numberOfPlayers));
  };

  const sendData = async () => {
    if (!validateEmission()) return;

    const options = { numberOfPlayers, teams, playerThemeEnabled, hostModeEnabled };

    try {
      if (isModifying) {
        // La création postait toujours, même en modification : l'émission
        // existante n'était jamais mise à jour, une nouvelle était créée.
        const response = await makeRequest("/emission/update", "PUT", {
          emission_id: emission.emission_id,
          data: { title, steps, options, private: isPrivate },
        });
        if (response.success) {
          endTask("Émission mise à jour avec succès");
        } else {
          setMessageInfo("Erreur lors de la mise à jour");
          setShowMessage(true);
        }
      } else {
        // Postait sur /emission (404, "Cannot POST /emission") au lieu de
        // /emission/create : la création d'émission n'avait jamais marché.
        const response = await makeRequest("/emission/create", "POST", {
          title,
          steps,
          options,
          private: isPrivate,
        });
        if (response.success) {
          endTask("Émission créée avec succès");
        } else {
          setMessageInfo("Erreur lors de la création");
          setShowMessage(true);
        }
      }
    } catch (err) {
      setMessageInfo(err instanceof Error ? err.message : "Erreur réseau");
      setShowMessage(true);
    }
  };

  if (!auth?.user) {
    return (
      <div className="emissionCreationPage">
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

    <div className="emissionCreationPage">
      <Banner />
      <div className="emissionCreationContent">
        <h1>{isModifying ? "Modifier l'émission" : "Créer une émission"}</h1>
        <p className="emissionCreationIntro">
            Enchaînez plusieurs épreuves (quizz classique, Grid, Pick & Ban, Timer) au sein d'une même émission.
        </p>

        <section className="emissionSection">
          <h2>Options générales</h2>
          <TextField
            className="emissionTitleInput"
            label="Nom de l'émission"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
          />

          <div className="emissionOptionsGrid">
            <label>
              Nombre de joueurs : {numberOfPlayers}
              <Slider value={numberOfPlayers} min={2} max={20} step={1}
                onChange={(_, v) => setNumberOfPlayers(v as number)} />
            </label>

            <label className="emissionInlineLabel">
              Privé
              <Switch checked={isPrivate} onChange={() => setPrivate((p: boolean) => !p)} />
            </label>

            <label className="emissionInlineLabel">
              Jeu par équipes
              <Switch checked={teams} onChange={() => setTeams((t: boolean) => !t)} />
            </label>

            <label className="emissionInlineLabel">
              Thème associé à chaque joueur
              <Switch
                checked={playerThemeEnabled}
                onChange={() => setPlayerThemeEnabled((p: boolean) => !p)}
              />
            </label>

            <label className="emissionInlineLabel">
              Avec un présentateur
              <Switch
                checked={hostModeEnabled}
                onChange={() => setHostModeEnabled((p: boolean) => !p)}
              />
            </label>
          </div>
          <PublicationBlockedNotice blockedCount={blockedCount} entityLabel="émission" />
          {playerThemeEnabled && (
            <p className="emissionHint">
              Activez « étape dynamique » sur chaque épreuve Grid ou Timer qui doit
              utiliser un thème par joueur (pas de quizz à choisir pour elle). Le MJ
              devra assigner un thème à chaque joueur, pour chacune de ces étapes,
              dans le salon avant de pouvoir lancer la partie. Les thèmes des
              joueurs éliminés alimentent alors les cases neutres du Grid.
            </p>
          )}
          {hostModeEnabled && (
            <p className="emissionHint">
              Le créateur du salon devient présentateur : il ne joue pas. Sur les
              épreuves Timer, il juge lui-même chaque réponse au lieu d'une
              validation automatique. À la fin de chaque épreuve, il peut aussi
              ajuster les scores (bonus/malus) avant de passer à la suivante.
            </p>
          )}
        </section>

        <section className="emissionSection">
          <h2>Déroulé de l'émission</h2>
          <div className="emissionStepsList">
            {steps.map((step, index) => (
              <StepForm
                key={index}
                step={step}
                quizz={quizzList}
                hostModeEnabled={hostModeEnabled}
                playerThemeEnabled={playerThemeEnabled}
                teamsActive={teamsActiveByStep[index]}
                number={index}
                setStep={setStep}
                onDelete={(i: number) => {
                  if (steps.length > 1) {
                      const updatedSteps = steps.filter((_, idx) => idx !== i);
                      setSteps(recalcStepCounts(updatedSteps, numberOfPlayers));
                  } else {
                      setMessageInfo("Il doit y avoir au moins une étape.");
                      setShowMessage(true);
                  }
                  }}
                isFirst={index === 0}
              />
            ))}
          </div>
          <div className="emissionAddStepRow">
              {
              steps.length < 5
              ?<Button
                  className="Button"
                  onClick={() => {
                      const prevStep = steps[steps.length - 1];
                      // outputCount est compté en équipes (pas en joueurs) dès
                      // que teamsActiveByStep est vrai pour cette étape (cf.
                      // recalcStepCounts) : un duo gagnant (outputCount === 1
                      // en mode équipe) représente encore 2 joueurs, donc il
                      // reste bien de quoi enchaîner une étape (typiquement un
                      // DUEL) — sans cette conversion, outputCount === 1
                      // était à tort traité comme "plus personne à départager".
                      const prevStepTeamsActive = teamsActiveByStep[steps.length - 1] ?? false;
                      const teamSize = prevStep.teamSize ?? TEAM_SIZE;
                      const remainingParticipants = prevStepTeamsActive
                          ? prevStep.outputCount * teamSize
                          : prevStep.outputCount;
                      if (remainingParticipants > 1){
                      const newStep = { ...DEFAULT_STEP, outputCount: Math.max(1, prevStep.outputCount - 1) };
                      setSteps(recalcStepCounts([...steps, newStep], numberOfPlayers));
                      } else {
                          setMessageInfo("vous avez une étape final dans vos étapes")
                          setShowMessage(true)
                      }
                  }}
              >
              <Add /> Ajouter une étape
              </Button> :
              <span>limite du nombre d'étape atteinte</span>}
          </div>
        </section>

        <div className="emissionActions">
          {Boolean(emission?.emission_id) && (
            <Button className="Button" onClick={deleteEmission}>Supprimer l'émission</Button>
          )}
          <Button className="Button" onClick={sendData}>
            {isModifying ? "Sauvegarder l'émission" : "Créer l'émission"}
          </Button>
        </div>

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
  );
}
