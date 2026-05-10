# Database V1

## `pcw_player_classes`

Stores all configurable classes and their special action.

Important fields:

- `name`, `slug`, `description`
- `image_path`, `icon`
- `action_name`, `action_slug`, `action_type`, `action_description`
- `energy_cost`, `power`, `cooldown_seconds`
- `enabled`, `sort_order`

## `pcw_players.class_id`

Nullable foreign key to `pcw_player_classes.id`.

One player can only have one class at a time.


## V12 — Classes verrouillées et actions spéciales préparées

- Une classe choisie est verrouillée côté interface et côté serveur.
- Le joueur peut réinitialiser sa classe depuis la modale joueur.
- Une action spéciale n'est plus lancée instantanément : elle crée une préparation visible par les autres joueurs.
- Les autres joueurs peuvent soutenir cette préparation depuis le panneau d'information de la place forte.
- Les réglages `required_supports` et `preparation_seconds` sont stockés en base et configurables en backoffice.
- Les boutons d'action affichent des tooltips détaillés avec coût, puissance et effet.
- Les actions spéciales affichent un état visuel : attente, prêt, chargement.
