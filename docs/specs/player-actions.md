# Player actions V1

## Base actions

- Influence: adds ideology influence and moves the fort toward the actor.
- Attack: damages the fort; 0 HP destroys it.
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
