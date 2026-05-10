/**
 * Base actor class shared by human players.
 */
class PCWActor {
  constructor(data) {
    Object.assign(this, data);
  }

  getPower(type) {
    if (type === 'influence') return this.influencePower || 0;
    if (type === 'attack') return this.attackPower || 0;
    return this.supportPower || this.repairPower || 0;
  }
}

window.PCWActor = PCWActor;
