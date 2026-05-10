# Player classes V1

## Goal

Each player can choose one class. A class unlocks exactly one special action.

## Default classes

| Class | Special action | Base action type | Icon | Energy cost | Power |
|---|---|---:|---:|---:|---:|
| Journaliste | Article d’enquête | attack | 📰 | 18 | 16 |
| Influenceur | Vidéo virale | influence | 📹 | 22 | 20 |
| Expert | Plateau télé | support | 🎙️ | 16 | 15 |

## Rules

- A player can have only one active class.
- The class is stored in `pcw_players.class_id`.
- Classes are configured in `pcw_player_classes`.
- Special actions reuse the existing projectile/action engine.
- A special action has its own `energy_cost` and `power`.
- If the player has insufficient energy, the action is rejected locally and server-side.

## UI

- The left panel has a `Profil joueur` button.
- The profile modal shows player info, current class and class choices.
- In the fort action panel, the special action appears under its related base action:
  - attack: under Attaquer
  - influence: under Influencer
  - support: under Soutenir
- The special action button uses the same color family as the related base action.


## V12 — Classes verrouillées et actions spéciales préparées

- Une classe choisie est verrouillée côté interface et côté serveur.
- Le joueur peut réinitialiser sa classe depuis la modale joueur.
- Une action spéciale n'est plus lancée instantanément : elle crée une préparation visible par les autres joueurs.
- Les autres joueurs peuvent soutenir cette préparation depuis le panneau d'information de la place forte.
- Les réglages `required_supports` et `preparation_seconds` sont stockés en base et configurables en backoffice.
- Les boutons d'action affichent des tooltips détaillés avec coût, puissance et effet.
- Les actions spéciales affichent un état visuel : attente, prêt, chargement.
