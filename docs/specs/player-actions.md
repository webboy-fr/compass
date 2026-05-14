# Player actions V1

## Base actions

- Influence: adds ideology influence without moving the fort.
- Attack: damages the fort; 0 HP neutralizes it without removing it from the map.
- Support: restores fort HP. This replaces the previous `repair` label in the UI.

## Special action payload

Special actions are sent to the API with:

```json
{
  "type": "attack|influence|support",
  "fortId": "fort_1",
  "isSpecial": true,
  "actionSlug": "investigation_article"
}
```

The server ignores client-provided power for special actions and reloads the current player class from the database.

## Server validation

The server rejects the action when:

- the player is not authenticated;
- the player has no ideology;
- the selected fort no longer exists;
- the player has no class;
- `actionSlug` does not match the player class;
- energy is lower than `energy_cost`.


## V12 — Classes verrouillées et actions spéciales préparées

- Une classe choisie est verrouillée côté interface et côté serveur.
- Le joueur peut réinitialiser sa classe depuis la modale joueur.
- Une action spéciale n'est plus lancée instantanément : elle crée une préparation visible par les autres joueurs.
- Les autres joueurs peuvent soutenir cette préparation depuis le panneau d'information de la place forte.
- Les réglages `required_supports` et `preparation_seconds` sont stockés en base et configurables en backoffice.
- Les boutons d'action affichent des tooltips détaillés avec coût, puissance et effet.
- Les actions spéciales affichent un état visuel : attente, prêt, chargement.

## Simplified cumulative influence model

From migration 010 onward, every player or bot action follows the same simple rule:

- one launched action costs exactly 1 player energy point;
- one projectile impact adds exactly +1 influence point to the target stronghold for the actor ideology;
- influence is cumulative and never removes points from other ideologies;
- attack and support are now political action flavours, not HP damage or HP healing;
- stronghold control is derived only from the dominant ideology score, never from a specific player or bot owner.

The former `ownerActorId` field may still exist in old state payloads for compatibility, but UI labels and control logic ignore personal ownership.

## Cumulative influence persistence guard

From V17, the server is the authority for accepted fort actions. When an action is accepted, the target fort immediately receives +1 point for the player's ideology in the shared server state. The projectile remains a visual effect only when `serverApplied` is true.

Browser state saves are monotonic for fort influence: if a browser posts an older state, `api/state.php` merges fort influence counters with the stored state and keeps the highest known value per ideology. This prevents player-created bastions from dropping back to zero after synchronization.
