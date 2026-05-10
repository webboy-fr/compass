/**
 * Political stronghold.
 */
class PCWFort {
  constructor(data) {
    Object.assign(this, data);
  }

  static fromTemplate(template, index, maxHp) {
    const influence = {};
    if (template.base) {
      influence[template.base] = 60;
    }

    return new PCWFort({
      id: `fort_${index}`,
      name: template.name,
      x: template.x,
      y: template.y,
      baseIdeologyId: template.base,
      ownerIdeologyId: template.base,
      ownerActorId: null,
      hp: template.hp,
      maxHp,
      influence
    });
  }

  getLeader() {
    const entries = Object.entries(this.influence).filter(([, value]) => value > 0);
    if (!entries.length) return null;
    const [ideologyId, score] = entries.sort((a, b) => b[1] - a[1])[0];
    return { ideologyId, score };
  }

  applyInfluence(ideologyId, amount, maxInfluence, competitionDecay = 1) {
    const decay = Number.isFinite(Number(competitionDecay)) ? Math.max(0, Number(competitionDecay)) : 1;

    Object.keys(this.influence).forEach((existingIdeologyId) => {
      if (existingIdeologyId === ideologyId) return;

      const current = Number(this.influence[existingIdeologyId] || 0);
      if (current <= 0) return;

      const next = PCWMath.clamp(current - decay, 0, maxInfluence);
      if (next <= 0) {
        delete this.influence[existingIdeologyId];
        return;
      }

      this.influence[existingIdeologyId] = next;
    });

    this.influence[ideologyId] = PCWMath.clamp((this.influence[ideologyId] || 0) + amount, 0, maxInfluence);
  }

  moveToward(actor, amount, moveFactor) {
    const ratio = PCWMath.clamp(moveFactor * (amount / 10), 0.025, 0.09);
    this.x = PCWMath.clamp(this.x + (actor.x - this.x) * ratio, -95, 95);
    this.y = PCWMath.clamp(this.y + (actor.y - this.y) * ratio, -95, 95);
  }

  attack(amount) {
    this.hp = PCWMath.clamp(this.hp - amount, 0, this.maxHp);
    return this.hp <= 0;
  }

  repair(amount) {
    this.hp = PCWMath.clamp(this.hp + amount, 0, this.maxHp);
  }

  drift(maxInfluence) {
    // Strongholds no longer regenerate their base ideology influence passively.
    // Influence changes only through player actions.
  }
}

window.PCWFort = PCWFort;
