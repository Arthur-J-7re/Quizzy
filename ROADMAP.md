# Roadmap — dette technique & nouvelles features

Feuille de route issue de [CODE_QUALITY.md](./CODE_QUALITY.md) et des retours produit du 2026-08-12. Chaque phase liste : objectif, changements clés, dépendances, points vérifiés dans le code existant (pour éviter les hypothèses fausses).

## Dépendances entre phases

```
0. Rôles & permissions (fondation)
 ├─→ 2. Modération des questions + backlog admin
 │     └─→ 3. Publication en cascade (quizz/thème/émission)
 │            └─→ 4. Intégrité de suppression & re-validation
 ├─→ 6. Super admin : vue d'ensemble
1. Refactor moteur de jeu + composants réponse (CODE_QUALITY.md)
5. Messagerie — dépend de 0, alimentée par 2 et 4
```

Phase 1 peut tourner en parallèle du reste (aucune dépendance croisée). Phases 4 et 5 sont liées dans les deux sens : 4 a besoin de 5 pour notifier, 5 a besoin des cas d'usage de 4/2 pour définir ses types de notification — les développer dans le même cycle plutôt que strictement en séquence.

---

## Phase 0 — Rôles & permissions (fondation)

**Pourquoi en premier :** modération (2), vue d'ensemble super admin (6) et l'émission des notifications de modération (5) en dépendent.

- `Collection/user.ts` : ajouter `role: "user" | "admin" | "superadmin"` (défaut `"user"`).
- Middleware `requireRole` (à côté de `token.verifyToken`), lecture du rôle en base à chaque requête plutôt que dans le JWT — un admin rétrogradé ne doit pas garder ses droits jusqu'à l'expiration du token (7 jours actuellement).
- Bootstrap du premier super admin via script (aucun utilisateur ne peut se promouvoir lui-même).
- Routes super admin : lister les admins, promouvoir/rétrograder (`user` ↔ `admin`). La promotion en `superadmin` reste script-only, jamais exposée via API.

## Phase 1 — Refactor moteur de jeu & composants dupliqués (CODE_QUALITY.md, points 1-4)

**Pourquoi avant tout nouveau mode de jeu :** ajouter un mode de plus sur la base actuelle dupliquerait le socle scoring/phase/reveal déjà dupliqué 7 fois.

- Base commune pour `server/Class/{BR,Duel,Grid,List,PickBan,Points,Timer}/*Game.ts` (scoring, cycle de phase/reveal, `QuestionDrawer`).
- Découpage de `_Thread.ts` (849 lignes) une fois ce socle extrait.
- Client : composant générique `AnswerCard` (QCM/Carré/VF/Cash), base commune pour `CreateQuestion/Create{Dcc,Free,Qcm,Vf}Form.tsx`.
- **Addendum trouvé en explorant le code, absent de CODE_QUALITY.md** : `questionManager`, `quizzManager`, `themeManager`, `emissionManager` réimplémentent chacun le même quintet create/update/delete/getByCreator/getPublic/getCreatorOf, typé `any`. Les phases 2-3 vont ajouter un statut de modération aux 4 mêmes entités : c'est le moment de factoriser un service CRUD générique plutôt que de dupliquer une 4ᵉ fois le même pattern.
- **Constat au 2026-08-18 : cet addendum n'avait pas été traité, la duplication prédite s'était bien produite.** Les phases 2 à 6 avaient été implémentées directement dans les 4 managers plutôt que via un service commun. Preuve concrète : `getPublicationStatus`, `getCreatorOfX`, `getXByIds` et `getAvailableX` existaient en 3 copies quasi identiques (`quizzManager.ts`, `themeManager.ts`, `emissionManager.ts` — `questionManager.ts` avait une variante propre à la modération avec `getPendingBacklog`/`approveQuestion`/`rejectQuestion`). Aucun fichier `entityManager`/CRUD générique n'existait dans `server/function/` ou `server/utils/`.
  - **Pourquoi ce n'était toujours pas fait** : le graphe de dépendances du roadmap plaçait la phase 1 "en parallèle, aucune dépendance croisée" — rien ne bloquait donc les phases 2-6 d'avancer sans elle, et elles avaient été développées avant elle plutôt qu'après.
- **Résolu le 2026-08-18** : `server/function/entityQueryHelpers.ts` factorise `getByCreator`/`getPublic`/`getAvailable`/`getByIds`/`getCreatorOf`/`getPublicationStatus` en une factory paramétrée par le modèle Mongoose, le champ id métier, le filtre "candidat public" (`private:false` pour quizz/thème/émission, `status:"approved"` pour les questions), la vérification de cascade de la Phase 3 (no-op par défaut) et un post-traitement optionnel (résolution des tags en noms pour les questions). Les 4 managers l'utilisent désormais ; `create`/`update`/`delete` restent propres à chaque manager (champs trop différents par entité/mode pour être factorisés sans généricité illisible). `getAvailableThemes`/`getAvailableEmissions` renvoient depuis maintenant `[créations du créateur, puis publiques des autres]` au lieu de `[publiques, puis créations du créateur dédupliquées après coup]` — même ensemble de résultats, ordre différent, changement mineur assumé (et une requête Mongo de moins par appel).

## Phase 2 — Modération des questions + backlog admin

- `Question.private: boolean` → statut `"private" | "pending" | "approved" | "rejected"` (migration façon `server/scripts/migrateQuestionTags.ts` : `private:true` → `"private"`, `private:false` → `"approved"`, pour ne rien casser côté existant).
- Créateur : action "demander la publication" → `"pending"`.
- Admin : backlog filtrable (tag/mode), approuver (avec correction possible d'orthographe/tags au passage) ou rejeter (motif obligatoire).
- **Hypothèse à confirmer** : une question `approved` modifiée par son créateur repasse en `"pending"` — sinon la modération est contournable après une première approbation. À valider avec toi si ce n'est pas le comportement voulu.

## Phase 3 — Publication en cascade (quizz/thème/émission)

- Un quizz/thème/émission n'est public que si son créateur l'a demandé **et** que toutes les questions référencées sont `approved`.
- Point vérifié dans le code : les quizz `Grid`/`PickAndBan`/`BigBucket`/`Timer` embarquent une **copie** de chaque `Theme` (via `ThemeSchema` sous-document, `server/Collection/quizz.ts:47/65/86/95`), pas une référence par id. Le calcul de visibilité doit donc descendre dans `quizz.themes[].questions[]`, pas seulement dans `ListQuizz.questions`.
- Calcul à la lecture (fonction pure) plutôt qu'un champ stocké à resynchroniser partout — plus simple à garder correct au volume actuel.
- UI : expliquer pourquoi un quizz reste privé ("3 questions ne sont pas encore approuvées") plutôt qu'un blocage silencieux.

## Phase 4 — Intégrité de suppression & re-validation en cascade

Bug confirmé en lisant le code : `questionManager.deleteQuestion` nettoie `quizz.questions` (`ListQuizz`) via `quizzManager.handleDeletedQuestion`, mais :
- ne touche jamais `ThemeModel.questions` (bibliothèque de thèmes) ;
- ne touche jamais les thèmes **embarqués** dans les quizz Grid/PickAndBan/BigBucket/Timer (`quizz.themes[].questions[]`) ;
- ne touche jamais `GridQuizz.neutralQuestions` (le `$pull` cible le champ `questions`, absent de ce cas).

Autre lien fragile confirmé : `Emission.steps[].quizz` est un simple `Number` (id, `server/Collection/step.ts:14`) résolu à la volée au lancement d'une manche (`quizzManager.getListQuizz/getGridQuizz/...` dans `_Thread.ts`) — donc supprimer un quizz de bibliothèque **casse réellement** toute émission qui l'utilise (contrairement aux thèmes, embarqués par valeur et donc figés une fois le quizz créé).

**Ce que cette phase doit couvrir, au-delà du simple retrait de référence :**
1. **Nettoyage complet** : purge de `theme.questions[]` (bibliothèque + copies embarquées dans les quizz), et de `neutralQuestions`, en plus de ce qui existe déjà.
2. **Revalidation de playabilité** après nettoyage, pas juste retrait de l'id :
   - un thème qui passe sous le seuil minimum de questions requis par le mode qui l'utilise (ex. `cellsPerTheme` en Grid) rend le(s) quizz qui l'embarquent potentiellement injouables ;
   - un quizz devenu injouable (ou carrément supprimé) rend injouable toute émission dont une étape le référence ;
   - dans ces deux cas, l'entité impactée doit repasser automatiquement en privé (elle ne peut plus être publique/jouable en l'état) et son créateur doit être notifié (phase 5) — y compris quand ce créateur n'est pas celui qui a supprimé la question ou le thème d'origine (scénario cross-utilisateur explicitement demandé).
3. **Même déclencheur pour une privatisation manuelle** : si un créateur repasse volontairement un thème ou un quizz de public à privé, il faut revérifier vers le haut (thème → quizz qui l'embarquent → émissions qui référencent ces quizz) et repasser en privé tout ce qui dépendait de sa visibilité publique — pas seulement au moment d'une suppression.
4. **Prérequis technique** : il n'existe aujourd'hui aucun index inverse ("quels quizz utilisent le thème X", "quelles émissions utilisent le quizz Y"). À l'échelle actuelle un scan complet suffit probablement, mais c'est un point à trancher pendant l'implémentation (scan vs. index dédié) plutôt qu'à l'écrit ici.

**Constat au 2026-08-18, confirme le point 2 ci-dessus** : `publicationStatus.ts` (déjà écrit, non commité) calcule `isThemeEffectivelyPublic`/`isQuizzEffectivelyPublic` en ne vérifiant que le statut `approved` des questions référencées (`getThemeBlockingCount`/`getQuizzBlockingCount`) — aucun seuil minimum par mode n'est pris en compte. Concrètement, `GridGame.ts:193` ne filtre les thèmes utilisables que par `questions.length > 0`, pas par `>= cellsPerTheme` (vérifié seulement côté formulaire de création, `GridQuizzCreation.tsx:112`) ; si un thème passe sous `cellsPerTheme` après suppression d'une question, `GridGame.ts:214` réutilise la même question plusieurs fois dans les cases du thème (modulo sur un tableau plus court) plutôt que d'échouer proprement. L'assert de playabilité doit donc être **au moins aussi strict que la validation de création** (même seuil `cellsPerTheme`, pas seulement "≥ 1 question"), et son échec après coup (suppression ou privatisation manuelle) doit déclencher le repassage en privé prévu au point 2/3 ci-dessus — pas seulement au moment de la création.

## Phase 5 — Messagerie

Un seul modèle `Notification`/`Message` (`type`, `recipient`, `sender?`, `payload`, `read`, `createdAt`) pour couvrir deux besoins plutôt que construire deux systèmes d'inbox :
- **Notifications système** : validation/rejet de question (phase 2), passage forcé en privé suite à une suppression/invalidation en cascade (phase 4).
- **Messagerie joueurs** : DM + demandes d'amis. Recommandation par défaut : demandes d'amis comme type `friend_request` dans le même inbox (accepter/refuser) — c'était une question ouverte de ta part, à confirmer.
- Implique un système d'amis à créer de zéro (aucune collection `Friend` aujourd'hui) avant la partie demandes d'amis.

## Phase 6 — Super admin : vue d'ensemble du site

- Dashboard (comptes, entités créées, taille du backlog, activité) + gestion des admins (dépend de la phase 0).
- Surtout front + agrégations Mongo, faible risque architectural.

---

## Backlog non planifié (périmètre pas encore défini)

Mis de côté pour l'instant, à spécifier plus tard avant de les planifier :

- **Profil social** : avatars, titres de noblesse, badges, **quêtes**. La partie quêtes suppose un système de progression/objectifs (à définir : par partie jouée ? par mode ? cumulatif ?) et probablement une nouvelle collection dédiée — aucune notion de progression n'existe aujourd'hui dans `Collection/user.ts`.
- **Questions média** (image/son/vidéo) — nécessite un stockage objet, aucun n'existe aujourd'hui (juste des assets statiques committés).
- **Nouveaux modes de jeu** (Qui veut gagner des millions, Money Drop) — à construire sur le socle commun de la phase 1 pour ne pas dupliquer un 8ᵉ moteur.
- **Blueprints d'émission** (12 Coups de Midi, Questions pour un Champion) — `Interface/Step.ts` semble assez générique pour porter des templates prédéfinis de `Step[]`, à investiguer plus précisément le moment venu.
- **Signalement d'une question en jeu**, côté arbitre/présentateur : cas d'une réponse jugée à tort erronée, ou d'une réponse "cash" qui aurait dû être acceptée. Suppose de savoir qui a le rôle arbitre/présentateur dans une room (à clarifier — dépend potentiellement de la phase 0, rôles) et un point d'atterrissage pour le signalement : nouveau statut sur la question (ex. `"disputed"`, distinct du pipeline `private/pending/approved/rejected` de la phase 2) et/ou notification (phase 5) vers un modérateur.
- **Signalement d'un joueur dans une room** : nécessite de définir l'objet du signalement (comportement en jeu, pseudo/contenu inapproprié, triche ?) et qui le traite — probablement une file consultée par les admins, sur le modèle du backlog de modération de la phase 2 plutôt qu'un système séparé.
