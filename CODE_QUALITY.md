# Revue de code — factorisation & réutilisation

État des lieux rapide sur la duplication de code dans le projet, avec des exemples concrets. Objectif : servir de base à une passe de refactoring future.

## 1. Duplication entre les modes de jeu (serveur)

`server/Class/{BR,Duel,Grid,List,PickBan,Points,Timer}/*Game.ts` réimplémentent chacun, indépendamment, le même squelette :

- `DEFAULT_SCORING` (`ListGame.ts:31`, `PointsGame.ts:37`)
- `REVEAL_DURATION_MS` (temps d'affichage du corrigé), redéfini dans chaque fichier
- Une interface `XxxPlayer { name, score, ... }` quasi identique par mode
- `QuestionDrawer` / `QuestionLoader`, la gestion de phase, et les mêmes imports depuis `GameFunction/threadHelper` (`verify`, `resolveDccMode`, `shuffledChoiceOrder`, `shuffledPairOrder`)

Aucune classe de base ni mixin ne factorise ce socle commun (scoring, cycle de phase, reveal). Résultat : un correctif ou une amélioration sur ce socle doit être répliqué manuellement dans les 7 fichiers, avec un risque de divergence.

**Fichiers concernés :**
- `server/Class/List/ListGame.ts`
- `server/Class/Points/PointsGame.ts`
- `server/Class/BR/BrGame.ts`
- `server/Class/Duel/DuelGame.ts`
- `server/Class/Grid/GridGame.ts`
- `server/Class/PickBan/PickBanGame.ts`
- `server/Class/Timer/TimerGame.ts`

**Piste :** extraire une base commune (scoring, drawer, cycle de phase/reveal) dont les modes hériteraient ou composeraient.

## 2. `_Thread.ts` fait trop de choses

`server/Class/Thread/_Thread.ts` (849 lignes) est le "chef d'orchestre" de toutes les parties : il détient une propriété `xxx: XxxGame | null` pour chacun des 7 modes (`grid`, `pickBan`, `list`, `timer`, `duel`, `points`, `br`) et porte à la fois la logique de démarrage, la gestion des étapes d'émission, les thèmes dynamiques, le scoring en attente (bonus/malus), et l'affichage `/show`.

**Piste :** découper par responsabilité (ex. un `EmissionStepRunner` séparé du dispatch par mode), une fois le socle des `*Game.ts` factorisé (point 1) — ça réduirait mécaniquement la partie dispatch de `_Thread.ts`.

## 3. Composants de réponse quasi identiques (client)

`client/src/component/GameQuestionAnswer/` contient plusieurs composants qui sont du copier-coller à 90-95% :

- `QcmAnswer.tsx` et `DCCAnswer/CarreAnswer.tsx` : structure, classes CSS, logique de flash/reveal identiques. Seules différences : le champ source (`question.choices` vs `question.carre`) et la forme du payload envoyé au serveur (`answer: selectedAns` vs `answer: {value: selectedAns, mode: "CARRE"}`).
- `VfAnswer.tsx` reprend la même mécanique (flash, `answering`/reveal, reset au changement de question) pour un cas particulier à 2 choix fixes ("vrai"/"faux") au lieu d'une liste.
- `DCCAnswer/CashAnswer.tsx` duplique encore le même pattern pour une réponse libre.

**Piste :** un composant générique de type `AnswerCard` paramétré par la liste de choix (ou le mode "texte libre") et par le format du payload envoyé, qui couvrirait QCM/Carré/VF/Cash.

## 4. Formulaires de création de question dupliqués

`client/src/component/CreateQuestion/Create{Dcc,Free,Qcm,Vf}Form.tsx` (270 / 146 / 199 / 111 lignes) partagent probablement une bonne partie de leur logique de formulaire (validation, état des champs communs) sans base commune identifiée. À vérifier plus en détail, mais le pattern est cohérent avec les points 1 et 3 : un mode de question = un fichier réécrit de zéro plutôt que dérivé d'un socle partagé.

## 5. Taille des fichiers/classes plutôt que des fonctions

Les fonctions individuelles restent globalement de taille raisonnable ; le problème est au niveau fichier/classe, signe que chaque classe de mode porte trop de responsabilités (état, scoring, timers, événements socket) sans découpage interne :

| Fichier | Lignes |
|---|---|
| `server/Class/Thread/_Thread.ts` | 849 |
| `server/Class/PickBan/PickBanGame.ts` | 690 |
| `server/Class/Timer/TimerGame.ts` | 629 |
| `server/Class/Grid/GridGame.ts` | 555 |

## Résumé

Le point le plus impactant est la duplication du socle "moteur de mode de jeu" (serveur) et "composant de réponse" (client) : ce n'est pas un problème de taille de fonctions, mais d'absence d'abstraction commune entre modules qui font fondamentalement la même chose avec de petites variations. C'est le premier chantier à traiter avant d'ajouter de nouveaux modes, sous peine de dupliquer encore un 8e moteur/composant quasi identique.
