/**
 * Political stronghold.
 */
class PCWFort {
  constructor(data) {
    Object.assign(this, data);
    this.influence = (this.influence && typeof this.influence === 'object') ? this.influence : {};
    this.positivePower = Number(this.positivePower ?? this.powerPositive ?? this.power ?? this.hp ?? 0);
    this.negativePower = Number(this.negativePower ?? this.powerNegative ?? 0);
    this.power = this.getTotalPower();
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
      category: template.category || 'institution',
      ownerActorId: null,
      hp: template.hp,
      maxHp,
      positivePower: Number(template.positivePower ?? template.power ?? template.hp ?? 100),
      negativePower: Number(template.negativePower ?? 0),
      influence
    });
  }

  getLeader() {
    const entries = Object.entries(this.influence).filter(([, value]) => value > 0);
    if (!entries.length) return null;
    const [ideologyId, score] = entries.sort((a, b) => b[1] - a[1])[0];
    return { ideologyId, score };
  }


  getTotalPower() {
    return Number(this.positivePower || 0) - Number(this.negativePower || 0);
  }

  addPower(amount = 1) {
    const increment = Math.max(0, Number(amount || 0));
    if (increment <= 0) return;
    this.positivePower = Number(this.positivePower || 0) + increment;
    this.power = this.getTotalPower();
  }

  removePower(amount = 1) {
    const increment = Math.max(0, Number(amount || 0));
    if (increment <= 0) return;
    this.negativePower = Number(this.negativePower || 0) + increment;
    this.power = this.getTotalPower();
  }

  applyInfluence(ideologyId, amount) {
    if (!ideologyId) return;

    const increment = Math.max(0, Number(amount || 0));
    if (increment <= 0) return;

    // Influence is now purely cumulative: adding points to one ideology never removes points from another.
    this.influence[ideologyId] = Number(this.influence[ideologyId] || 0) + increment;
    this.ownerIdeologyId = this.getLeader()?.ideologyId || null;
    this.ownerActorId = null;
  }

  attack(amount) {
    this.removePower(amount);
  }

  repair(amount) {
    this.addPower(amount);
  }

  drift(maxInfluence) {
    // Strongholds no longer regenerate their base ideology influence passively.
    // Influence changes only through player actions.
  }
}

window.PCWFort = PCWFort;
