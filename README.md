# Quizzy

## Développement local

La base de données MongoDB tourne en local via Docker (plus besoin d'un cluster distant type Atlas).

1. Lancer la base : `docker compose up -d` (démarre `mongo` sur `localhost:27017` et une interface d'admin `mongo-express` sur [http://localhost:8081](http://localhost:8081)).
2. Copier `server/.env.example` en `server/.env` et renseigner un `JWT_SECRET` (une longue chaîne aléatoire).
3. Backend : `cd server && npm install && npm run dev`.
4. Frontend : `cd client && npm install && npm run dev`.

Pour arrêter la base : `docker compose down` (les données persistent dans le volume `quizzy-mongo-data`).

### Vérifications avant de commiter

| | serveur | client |
|---|---|---|
| Types | `npm run typecheck` | `npx tsc -b` |
| Build | `npm run build` | `npm run build` |
| Tests | `npm test` | — |
| Lint | — | `npm run lint` |

Les deux `build` doivent passer sans erreur. Le `dev` du serveur tourne en
`--transpile-only`, donc il ne signale **pas** les erreurs de types : lancer
`npm run typecheck` régulièrement.

## Organisation

- `server/` — API Express + Socket.io, MongoDB via Mongoose.
  - `routes/` valide l'entrée (zod) et vérifie les droits, `function/` porte la logique métier, `Collection/` les schémas Mongo.
  - Toutes les routes passent par `asyncHandler` et remontent leurs erreurs à `utils/errorHandler.ts`, qui renvoie les bons codes HTTP.
  - `legacy/` — ancien système de Thread, hors compilation (cf. `server/legacy/README.md`).
- `client/` — React + Vite + MUI.
- `shared-types/` — contrat de types partagé entre les deux. Résolu par alias
  (`paths` dans `client/tsconfig.app.json` **et** `resolve.alias` dans
  `client/vite.config.ts` : les deux doivent rester synchronisés).

### Variables d'environnement

Voir `server/.env.example`. À noter : `JWT_EXPIRES_IN` (durée de vie des tokens)
et `LOG_LEVEL` (`debug` pour retrouver les logs verbeux de développement).

## Jouer en local avec des joueurs distants (tunnel ngrok)

Avant la mise en ligne du site, on peut quand même jouer avec des gens qui ne sont pas sur le même réseau, via un tunnel [ngrok](https://ngrok.com/) : même base de données, mêmes fonctionnalités, seule l'URL utilisée pour rejoindre change.

**Principe** : un seul tunnel ngrok, pointé sur le client (port 5180). Le serveur Vite relaie lui-même l'API et les websockets vers le backend (port 3000) via son proxy (`/local-api` → API REST, `/socket.io` → Socket.io) — pas besoin d'un deuxième tunnel pour le backend, et ça reste compatible avec le plan gratuit d'ngrok (1 seul tunnel).

Le lien à partager avec les joueurs s'affiche automatiquement dans l'écran de salon (composant `RoomLink`), même si toi (l'hôte) restes sur `localhost`.

### Installation d'ngrok (une fois)
```
# https://ngrok.com/download, puis :
ngrok config add-authtoken <TON_TOKEN>
```

### Lancer le mode tunnel
```
./dev-with-ngrok.sh
```
Ce script démarre la base (docker), le serveur, le client, et le tunnel ngrok, puis affiche le lien à partager. `Ctrl+C` arrête tout proprement.

Alternative manuelle (si tu préfères des terminaux séparés) : lance `docker compose up -d`, `npm run dev` dans `server/` et `client/` comme d'habitude, puis `./ngrok-start.sh` dans un dernier terminal.
## Modes de jeu

### Grid (mémoire)

Une grille `width × height`. Chaque joueur reçoit **un thème et une couleur** ;
un certain nombre de cases (`cellsPerTheme`) portent chaque thème, les cases
restantes sont neutres et tirent dans `neutralQuestions`.

1. **Mémorisation** — la grille s'affiche colorée pendant `memorizeDurationMs`.
2. **Jeu** — les couleurs disparaissent. À tour de rôle, un joueur choisit une
   case : la question de son thème lui est envoyée, **à lui seul**, et il a
   `answerDurationMs` pour répondre. Bonne réponse = 100 points.
3. **Fin** — quand toutes les cases sont jouées, classement par points.

L'intérêt est de retenir où sont les thèmes qu'on maîtrise pour les viser.

Le serveur est seul arbitre : les couleurs des cases fermées ne sont pas dans
l'état envoyé au client hors phase de mémorisation, et l'énoncé n'est transmis
qu'au joueur actif, sans la bonne réponse. Un client bricolé ne peut donc pas
lire la grille à l'avance.

- Moteur : `server/Class/Grid/GridGame.ts` (+ ses tests)
- Branchement : `server/Class/Thread/_Thread.ts`, événements dans `GameFunction/ThreadFunction.ts`
- Contrat partagé : `shared-types/grid.ts`
- Écrans : `client/src/pages/QuizzForm/GridQuizzCreation.tsx` (création),
  `client/src/component/Grid/GridBoard.tsx` (jeu)

Pour jouer : créer des thèmes → « Créer un Quizz Grid » → créer un salon en
mode **Grid** et choisir ce quizz.

#### Variante émission (élimination)

Dans une émission à plusieurs épreuves, on veut parfois que la grille ne tire
pas ses thèmes d'un vivier de quizz, mais des thèmes personnels des joueurs :
chacun a un thème attribué en début d'émission, et seuls ceux **encore en
lice** jouent avec le leur — les cases sans thème piochent alors dans les
questions des joueurs **déjà éliminés**.

C'est `EmissionGridGame` (`server/Class/Grid/EmissionGridGame.ts`), une
classe fille de `GridGame` qui ne redéfinit que deux points d'extension
prévus dans la classe mère :
- `resolvePlayerThemes(playerNames)` — thème par joueur (au lieu d'un tirage
  dans le vivier du quizz) ;
- `getNeutralQuestionPool()` — questions des thèmes éliminés (au lieu du pool
  neutre configuré sur le quizz).

Tout le reste (mémorisation, tours, scoring, fin de partie) est hérité tel
quel et n'est pas dupliqué.

Le mécanisme d'attribution vit sur `Room` :
`assignPlayerTheme`/`getPlayerTheme`, `eliminatePlayer`/`isEliminated`,
`getActivePlayerThemes`/`getEliminatedPlayerThemes`. `Thread.startGrid`
utilise cette variante quand l'étape porte `useEmissionThemes: true`, et deux
événements socket réservés au créateur du salon permettent de piloter ça :
`emission:assignPlayerTheme` et `emission:eliminatePlayer`.

**Limite actuelle** : rien n'appelle encore ces événements automatiquement.
Il n'existe pas aujourd'hui de mécanisme qui fait avancer une émission d'une
épreuve à la suivante, ni de logique d'élimination dans les autres modes
(Points, BR...) qui sont eux-mêmes non implémentés. Cette variante Grid est
prête à être branchée sur cette orchestration une fois qu'elle existera ; en
attendant, `assignPlayerTheme`/`eliminatePlayer` peuvent être appelés
manuellement (via un futur écran d'administration de l'émission, ou en test).

### Pick & Ban

À implémenter.
