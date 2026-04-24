# Political Compass War — Spécifications V9.3

## Objectif de cette version

Version de prototype HTML/CSS/JavaScript sans backend et sans base de données.

Le jeu représente une carte politique en deux axes :

- horizontal : État ↔ Marché libre ;
- vertical : Autorité ↔ Libertés publiques.

Le joueur choisit une idéologie. Son point reste fixe sur la boussole. Il agit sur les places fortes en envoyant des projectiles d’action.

## Règle principale

Il n’y a plus d’objectif de victoire du type « capturer 4 forts ».

La partie continue tant qu’il reste :

- des joueurs/bots ;
- des places fortes sur la carte.

## Entités

### Joueur

Le joueur possède :

- une idéologie ;
- une couleur ;
- une position fixe sur la carte ;
- une énergie de 0 à 100 ;
- une régénération d’énergie automatique.

Le joueur ne se déplace jamais.

### Bots actifs

Les bots actifs :

- ont chacun une idéologie ;
- restent fixes sur leur position idéologique ;
- choisissent automatiquement des places fortes ;
- envoient des actions périodiquement.

### Places fortes

Une place forte possède :

- un nom ;
- une position sur la carte ;
- des points de vie, ou PV ;
- une influence par idéologie ;
- une idéologie dominante éventuelle.

## Énergie et régénération

Le joueur possède une réserve d’énergie.

- Énergie maximale : 100.
- Régénération actuelle : +6 énergie/seconde selon l’idéologie.
- Chaque action coûte de l’énergie.
- Si l’énergie manque, l’action ne part pas et un message clair s’affiche.

Le joueur peut cliquer rapidement plusieurs fois sur une action.

Exemple :

- si le joueur a 100 énergie ;
- et qu’une action coûte 10 énergie ;
- il peut déclencher plusieurs projectiles successifs rapidement ;
- chaque clic consomme son coût immédiatement ;
- si l’énergie devient insuffisante, le clic ne déclenche plus de projectile.

## Actions disponibles

### Influencer

Influencer est une action politique.

Effets :

- ajoute des points d’influence de l’idéologie du joueur à la place forte ;
- rapproche progressivement la place forte de la position idéologique du joueur sur la carte ;
- ne détruit jamais la place forte.

Exemple :

Un joueur libéral influence le CNC.

- Le CNC reçoit des points d’influence libérale.
- Le CNC commence à se déplacer vers la zone libérale de la carte.
- Si l’influence libérale devient dominante, le CNC prend la couleur/libellé dominant libéral.

### Attaquer

Attaquer est une action structurelle destructive.

Effets :

- retire des PV à la place forte ;
- si les PV atteignent 0, la place forte est détruite ;
- la place forte disparaît de la carte.

Quand une place forte est détruite :

- une modale annonce la destruction ;
- la place forte est supprimée de la liste ;
- les projectiles déjà envoyés vers elle continuent vers sa dernière position connue puis disparaissent.

### Réparer

Réparer est une action structurelle défensive.

Effets :

- ajoute des PV à la place forte ;
- ne peut pas dépasser les PV maximum ;
- ne modifie pas directement l’influence politique.

## Projectiles / flux d’action

Chaque action envoyée crée un projectile visible.

- Les projectiles sont animés en continu.
- Les projectiles ne dépendent pas du tick d’une seconde pour leur animation.
- Plusieurs projectiles peuvent être envoyés rapidement si l’énergie est suffisante.
- Si la cible est détruite avant l’arrivée, le projectile continue vers la dernière position connue puis disparaît.

## Temps de jeu

Le temps avance automatiquement.

- Tick logique : 1 fois par seconde.
- Animation visuelle : continue via `requestAnimationFrame`.
- Le jeu ne s’arrête pas si le joueur ne fait rien.

À chaque tick :

- l’énergie du joueur se régénère ;
- les bots peuvent agir ;
- les places fortes peuvent recevoir une légère dérive naturelle vers leur idéologie de base.

## Interface V9.3

Changements principaux :

- suppression de la condition de victoire à 4 forts ;
- carte resserrée pour entrer dans le viewport sans scroll global ;
- panneau latéral scrollable si nécessaire ;
- marges autour de la carte ;
- panneau d’action mieux contraint dans la carte ;
- modale de destruction d’une place forte ;
- projectiles multiples déclenchables rapidement.

## Persistance

Le jeu utilise uniquement `localStorage`.

Aucune base de données.
Aucun backend.
Aucune authentification.

Clé localStorage :

`political_compass_war_v9_3_no_win_multishot`

## Limites connues

- Les bots sont encore très simples.
- Les choix stratégiques restent basiques.
- Les places fortes ne réapparaissent pas après destruction.
- Il n’y a pas encore de ressources séparées pour influence, attaque et réparation.
- Il n’y a pas encore de vraie notion d’alliance.

## V9.4 Layout 3 colonnes + survol des places fortes

- Rebase strict depuis `v9.zip`.
- Layout en 3 colonnes : panneau joueur à gauche, carte fixe 1024x1024 au centre, panneau informations à droite.
- Les anciennes informations du bas sont déplacées dans la colonne de droite.
- La carte ne dépend plus d'une taille relative : largeur et hauteur fixes à 1024px.
- Les places fortes disposent d'une zone transparente large autour de l'icône et du texte.
- Le survol d'une zone de place forte sélectionne automatiquement la place forte.
- Les détails complets de la place forte survolée s'affichent dans la colonne de droite.
- Le mini panneau flottant sur la carte ne contient plus que trois petits boutons d'action : influencer, attaquer, réparer.
- Le clic sur une place forte reste conservé comme fallback pour les écrans tactiles ou les usages anciens.

## V9.5 layout / destruction notes

- The center topbar is hidden; the center column contains only the map.
- The map scales as a square inside the available center column and uses the full viewport height when possible.
- Destroyed forts no longer open any destruction modal.
- When a fort reaches 0 HP, its hover/action panel closes, a short collapse/explosion animation appears at its last position, and a single log line is added.
- Any projectiles still targeting a destroyed fort are removed immediately.

## V9.6 refactoring pass

Goal: keep the existing working gameplay and layout, but stop keeping all JavaScript in a single file.

Structure:
- `js/config.js`: constants, ideologies, fort templates and bot definitions.
- `js/utils/math.js`: clamp/random helpers.
- `js/models/actor.js`: shared actor base class.
- `js/models/user.js`: human player class.
- `js/models/bot.js`: active bot class.
- `js/models/fort.js`: fort / place forte class.
- `js/models/projectile.js`: projectile animation class.
- `js/models/game-state.js`: state factory, hydration and state helpers.
- `js/services/storage-service.js`: localStorage persistence.
- `js/services/simulation-service.js`: gameplay rules, bots, projectiles, influence, attack, repair and destruction.
- `js/renderers/game-renderer.js`: all DOM rendering.
- `js/controllers/game-controller.js`: events, main loop and wiring.
- `js/app.js`: bootstrap.

Compatibility choice: scripts are loaded as classic browser scripts instead of ES modules, so the prototype can still be opened directly from `index.html` without a dev server.

Expected behavior: no intentional gameplay, layout, CSS or balancing changes in this pass.
