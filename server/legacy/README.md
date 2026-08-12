# Code archivé

Ancienne génération du système de Thread (`Thread`, `ThreadBr`, `ThreadPoints`),
remplacée par `Class/Thread/_Thread.ts` + `Class/Helper.ts/`.

Ces fichiers ne compilent plus : ils importent `function/getter`, un module qui
n'existe plus (son remplaçant partiel est `function/getterPlay.ts`), et lisent
`room.room_id` alors que `Room` expose `id`. Rien ne les importe.

Ils sont exclus du `tsconfig.json` pour que `npm run typecheck` passe, mais
conservés ici parce qu'ils contiennent la logique de jeu la plus aboutie
(scoring, battle royale, modes DCC) — à reprendre pour remplir les squelettes
de `_Thread.ts` et `Helper.ts`.

À supprimer une fois cette logique réimplémentée.
