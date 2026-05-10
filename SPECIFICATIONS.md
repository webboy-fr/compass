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

- des joueurs ;
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
- retire 1 point à chaque autre idéologie déjà présente sur cette place forte ;
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

### Soutenir

Soutenir est une action structurelle défensive.

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
- Le mini panneau flottant sur la carte ne contient plus que trois petits boutons d'action : influencer, attaquer, soutenir.
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
- `js/config.js`: constants, ideologies, fort templates.
- `js/utils/math.js`: clamp/random helpers.
- `js/models/actor.js`: shared actor base class.
- `js/models/user.js`: human player class.
- `js/models/fort.js`: fort / place forte class.
- `js/models/projectile.js`: projectile animation class.
- `js/models/game-state.js`: state factory, hydration and state helpers.
- `js/services/storage-service.js`: localStorage persistence.
- `js/services/simulation-service.js`: gameplay rules, projectiles, influence, attack, support and destruction.
- `js/renderers/game-renderer.js`: all DOM rendering.
- `js/controllers/game-controller.js`: events, main loop and wiring.
- `js/app.js`: bootstrap.

Compatibility choice: scripts are loaded as classic browser scripts instead of ES modules, so the prototype can still be opened directly from `index.html` without a dev server.

Expected behavior: no intentional gameplay, layout, CSS or balancing changes in this pass.


## V10.1 - Sliders without adaptive zoom

- The market/state and liberty/authority sliders are preserved.
- User positions still move on the political compass.
- Adaptive zoom/camera resizing has been removed because it made the map feel unstable.
- The compass now stays on a fixed -100/+100 coordinate frame.

## V10.4 - Sprite forts / mockup-inspired action panel

- Fort rendering now uses `assets/fort-sprite.svg` instead of the plain emoji marker.
- Forts keep click selection behavior for mobile compatibility.
- The selected fort action panel is compact and displays three game-like action buttons: I / A / R.
- Fort stats are shown below the sprite with a small dark nameplate and HP/value line.
- No gameplay balancing changes were intentionally introduced in this pass.

## v10 pause mode

- Added a pause/reprise control in the left rules panel.
- When paused, the simulation timer no longer increments.
- When paused, natural fort drift and projectile movement are frozen.
- Manual fort selection remains possible, but player actions are ignored until the simulation is resumed.
- A large non-interactive PAUSE overlay is shown over the map while paused.
- Existing DOM cache behavior is preserved: entities are not rebuilt every frame.

## Patch - map click deselect

- Clicking on the map outside a `.fort-token` deselects the current fort.
- Clicking a fort keeps/selects that fort.
- Clicking inside `#fortActionPanel` does not deselect the current fort.
- Pause mode still freezes state/render updates for debugging.


## Ajout — persistance et synchronisation multijoueur

La version persistante repose sur un état de carte partagé en base de données.
Chaque navigateur conserve uniquement l'identité du joueur connecté via un token local, tandis que les forts, scores d'influence, PV, propriétaires, logs sont lus depuis l'état partagé.

Règles de synchronisation :

- chaque joueur humain doit créer ou connecter son compte depuis l'écran d'accueil ;
- plusieurs navigateurs peuvent afficher la même partie avec des joueurs différents ;
- le front interroge l'API d'état environ deux fois par seconde ;
- les changements reçus depuis la base sont réaffichés sans rechargement manuel ;
- les actions joueur et les impacts de projectiles déclenchent une sauvegarde de l'état partagé ;
- les animations locales de projectiles ne doivent pas écrire en base à chaque frame, afin de ne pas écraser l'état des autres joueurs.


## V11.2 - Fort labels, action panel and aura

- Fort labels are larger so the fort name and status are easier to read.
- The fort action panel is centered directly above the selected fort sprite, with a small gap.
- Each fort displays an aura based on its dominant ideology influence.
- Aura intensity and size scale down with remaining HP: full HP creates a larger aura, low HP creates a smaller and weaker aura.
- This version keeps the persistence/API layer and human-only multiplayer behavior from previous builds.
- Database config must use a real config file, not an example file, and the default DB user remains `julien`.


## Configuration DB

Le ZIP contient un vrai fichier de configuration local, pas un fichier `example`. L'utilisateur de base de données par défaut est `julien`.

## V10.2 - Corrections énergie et influence de base

- Une action ne crée plus de projectile local si l'énergie actuelle du joueur est insuffisante.
- Les clics rapides restent possibles, mais chaque clic consomme immédiatement son coût local et le burst s'arrête dès que l'énergie passe sous le coût de l'action.
- Les places fortes ne régénèrent plus passivement leur idéologie de base.
- Une influence de base qui descend suite à une influence concurrente reste à son nouveau niveau, sauf nouvelle action explicite.
- La synchronisation serveur conserve la régénération d'énergie des joueurs, mais ne remonte plus les scores d'influence des places fortes avec le temps.

---

# V11 — Player classes and special actions

## Added

- Player profile modal.
- Configurable player classes in database.
- Backoffice page: `admin/classes.php`.
- One class per player through `pcw_players.class_id`.
- Three default classes:
  - Journaliste → Article d’enquête → attack.
  - Influenceur → Vidéo virale → influence.
  - Expert → Plateau télé → support.
- Special action button in the fort action panel, displayed under its related base action.
- `Réparation` is renamed to `Soutien` in the player-facing UI.

## Migration

Use `sql/upgrade_player_classes.sql` on existing installations.
Fresh installations can use `sql/schema.sql` and `sql/seed.sql` directly.


## V12 — Classes verrouillées et actions spéciales préparées

- Une classe choisie est verrouillée côté interface et côté serveur.
- Le joueur peut réinitialiser sa classe depuis la modale joueur.
- Une action spéciale n'est plus lancée instantanément : elle crée une préparation visible par les autres joueurs.
- Les autres joueurs peuvent soutenir cette préparation depuis le panneau d'information de la place forte.
- Les réglages `required_supports` et `preparation_seconds` sont stockés en base et configurables en backoffice.
- Les boutons d'action affichent des tooltips détaillés avec coût, puissance et effet.
- Les actions spéciales affichent un état visuel : attente, prêt, chargement.

## v12.1 Prepared action stability

- Fixed a JS runtime bug where `processPreparedActions()` could call `prunePreparedActions()` on a plain JSON state object.
- Added state normalization through `PCWGameState.ensure()`.
- Improved live-sync merging for prepared actions so supporters and action statuses are less likely to be overwritten by stale remote payloads.

## v13 — Déplacement du joueur et tooltips Bootstrap

- Les curseurs marché/état et libertés/autorité sont remplacés par un déplacement direct sur la carte.
- Cliquer sur une zone vide ouvre un mini panneau “Se déplacer”.
- Le joueur se déplace avec une animation fluide jusqu’aux nouvelles coordonnées.
- La vitesse dépend maintenant de l’idéologie via `move_speed`.
- Les coordonnées du joueur sont persistées côté serveur.
- Les anciens `title` HTML sont remplacés par des tooltips Bootstrap enrichis avec HTML.

## V13.1 - Correctifs déplacement

- Le clic sur la carte ouvre maintenant le bouton `Se déplacer` même si aucune place forte n'est sélectionnée.
- Les clics sur le panneau de déplacement ne ferment plus immédiatement la proposition de déplacement.
- Quand l'animation de déplacement arrive à destination, la position finale du joueur est persistée via `api/state.php` dans les champs `pcw_players.x` et `pcw_players.y`.
- La synchronisation distante ne doit plus ramener le joueur à son ancienne position après l'arrivée.

## V13.2 - Tooltip cleanup and eased movement

- Bootstrap tooltips are now disposed before each dynamic panel refresh.
- Generated `.tooltip` nodes are removed after dispose to avoid stacked/stale tooltips.
- Tooltips hide on mouse leave, blur, and click.
- Player movement now uses a cubic ease-in-out animation instead of a linear step.
- Movement still persists final `x/y` coordinates through the existing state API once the animation finishes.


## V13.3 - Player card contrast and faster cruise movement

- The fixed `Ton camp` player card now forces light text colors for player identity, ideology, stats, and disabled compass labels.
- Movement now uses a short ease-in/ease-out phase with a faster constant cruise speed, so long trips do not feel delayed or excessively slow.


## V14 - Chat simple

- Ajout d’un panneau de chat dans la colonne de droite, au-dessus du journal.
- Stockage des messages dans `pcw_chat_messages`.
- Rafraîchissement par polling pendant le tick du jeu.
- Maximum 20 messages conservés.
- Endpoint unique `api/chat.php` pour lire et envoyer.
- Migration : `sql/upgrade_chat.sql`.

## Player ideology point profile

- The player profile modal is the required setup screen after creating a player.
- A player must distribute exactly 10 points across the available ideologies.
- Each ideology can receive 0 to 10 points through dot controls in the profile modal.
- The dominant ideology gives the player color and primary label.
- Player coordinates and gameplay stats are computed as a weighted blend of selected ideologies.
- The selected distribution is persisted in `pcw_players.ideology_weights` as JSON.
- The player must also choose a class before closing the mandatory profile modal.
