# Action panel V1

The action panel is intentionally compact because it floats over the map.

## Ordering

```text
Influencer
[Special influence action if available]
Attaquer
[Special attack action if available]
Soutenir
[Special support action if available]
```

## Current special actions

- Journaliste: `Article d’enquête`, red attack-style button.
- Influenceur: `Vidéo virale`, influence-style button.
- Expert: `Plateau télé`, green support-style button.

## Energy state

Buttons keep the existing `needs-energy` class when the current player lacks energy.
The JS and PHP logic both prevent action execution in that state.
