# Weighted ideology influence

Influence actions now send the complete ideological profile of the player instead of only the dominant ideology.

Example:

- 5 points liberal
- 5 points sovereignist

When the player clicks `Influencer` on a bastion, the bastion receives:

- +5 liberal influence
- +5 sovereignist influence

The action still costs only 1 energy point. Power actions are unchanged and still add +1 positive power or +1 anti-power.

The player color is computed as a weighted RGB mix of every selected ideology color. The left player panel displays every selected ideology with its point score.
