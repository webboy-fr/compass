/**
 * Active bot controlled by the simulation.
 */
class PCWBot extends PCWActor {
  static fromDefinition(definition, index, ideology) {
    return new PCWBot({
      id: `active_bot_${index}`,
      name: definition.name,
      ideologyId: ideology.id,
      ideologyName: ideology.name,
      color: ideology.color,
      x: ideology.x,
      y: ideology.y,
      mode: definition.mode,
      cooldownMax: (index % 6) + 2,
      cooldown: (index % 5) + 1,
      targetFortId: null,
      influencePower: ideology.influencePower,
      attackPower: ideology.attackPower,
      repairPower: ideology.repairPower,
      regen: ideology.regen
    });
  }

  shouldPlayTurn() {
    this.cooldown -= 1;
    if (this.cooldown > 0) return false;
    this.cooldown = this.cooldownMax;
    return true;
  }
}

window.PCWBot = PCWBot;
