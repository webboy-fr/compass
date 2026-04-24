/**
 * Base actor class shared by the player and active bots.
 */
class PCWActor {
  constructor(data) {
    Object.assign(this, data);
  }

  getPower(type) {
    if (type === 'influence') return this.influencePower || 0;
    if (type === 'attack') return this.attackPower || 0;
    return this.repairPower || 0;
  }
}

window.PCWActor = PCWActor;
