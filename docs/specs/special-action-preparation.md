# Spécification — Actions spéciales préparées

## Objectif

Les actions spéciales de classe ne sont plus des actions instantanées. Elles passent par un cycle lisible : préparation, soutien par d'autres joueurs, chargement, lancement.

## Cycle d'une action spéciale

1. Le joueur sélectionne une place forte.
2. Il clique sur son action spéciale dans le panneau d'action du fort.
3. Une action préparée est créée dans l'état partagé (`preparedActions`).
4. Les autres joueurs voient l'action en préparation autour du joueur et dans le panneau d'information du fort.
5. Les autres joueurs peuvent cliquer sur `Soutenir`.
6. Quand le nombre de soutiens requis est atteint, le propriétaire peut relancer l'action.
7. L'action passe en chargement pendant `preparation_seconds`.
8. À la fin du chargement, le projectile spécial est envoyé et l'énergie est dépensée.

## États

- `waiting_support` : attend des soutiens.
- `ready` : soutiens suffisants, prêt à charger.
- `charging` : chargement en cours.
- `launched` : projectile envoyé.
- `cancelled` : cible disparue ou énergie insuffisante.

## Règles UX

- Les boutons d'action ont un `title` détaillé avec coût, puissance et effet.
- Le bouton spécial est affiché sous son action de base : attaque, influence ou soutien.
- Le bouton spécial est visuellement terne tant qu'il attend des soutiens.
- Le bouton spécial a un état lumineux quand il est prêt.
- Une petite icône apparaît sur le joueur et la place forte lorsqu'une action est en préparation.

## Données partagées

Le tableau `preparedActions` est stocké dans l'état partagé afin que les autres joueurs voient les préparations en cours.

## v12.1 Stability notes

- The simulation now normalizes the shared state with `PCWGameState.ensure()` before processing prepared actions, regular actions, supports, ticks, and projectile updates.
- This prevents runtime errors when a browser receives a JSON state from storage or remote synchronization before the object has the `PCWGameState` prototype methods.
- Remote synchronization now merges prepared-action supporters and newer local prepared-action statuses before replacing the current state, reducing race conditions between the player preparing an action and another player supporting it.
- Prepared actions keep the same flow: `waiting_support` → `ready` → `charging` → `launched` or `cancelled`.
