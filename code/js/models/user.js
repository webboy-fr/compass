/**
 * Human player.
 */
class PCWUser extends PCWActor {
  static createEmpty() {
    return new PCWUser({
      id: 'player',
      name: 'TOI',
      ideologyId: null,
      ideologyName: 'Non choisi',
      color: '#ffffff',
      x: 0,
      y: 0,
      energy: 0,
      influencePower: 0,
      attackPower: 0,
      repairPower: 0,
      regen: 0
    });
  }

  static fromIdeology(ideology) {
    return new PCWUser({
      id: 'player',
      name: 'TOI',
      ideologyId: ideology.id,
      ideologyName: ideology.name,
      color: ideology.color,
      x: ideology.x,
      y: ideology.y,
      energy: 45,
      influencePower: ideology.influencePower,
      attackPower: ideology.attackPower,
      repairPower: ideology.repairPower,
      regen: ideology.regen
    });
  }

  regenerate() {
    this.energy = PCWMath.clamp(this.energy + this.regen, 0, 100);
  }
}

window.PCWUser = PCWUser;
