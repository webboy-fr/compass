/**
 * Active bot controlled by the simulation.
 */
class PCWBot extends PCWActor {
  static fromDefinition(definition, index, ideology) {
    const offsetX = PCWMath.random(-10, 10);
    const offsetY = PCWMath.random(-10, 10);
    return new PCWBot({
      id: `active_bot_${index}`,
      name: definition.name,
      ideologyId: ideology.id,
      ideologyName: ideology.name,
      color: ideology.color,
      x: PCWMath.clamp(ideology.x + offsetX, -100, 100),
      y: PCWMath.clamp(ideology.y + offsetY, -100, 100),
      baseMarket: ideology.x,
      baseAuthority: ideology.y,
      market: PCWMath.clamp(ideology.x + offsetX, -100, 100),
      authority: PCWMath.clamp(ideology.y + offsetY, -100, 100),
      mode: definition.mode,
      cooldownMax: (index % 5) + 3,
      cooldown: (index % 4) + 2,
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

  driftIdeology(maxStep) {
    this.market = PCWMath.clamp(this.market + PCWMath.random(-maxStep, maxStep), this.baseMarket - 18, this.baseMarket + 18);
    this.authority = PCWMath.clamp(this.authority + PCWMath.random(-maxStep, maxStep), this.baseAuthority - 18, this.baseAuthority + 18);
    this.x = PCWMath.clamp(this.market, -100, 100);
    this.y = PCWMath.clamp(this.authority, -100, 100);
  }
}

window.PCWBot = PCWBot;
