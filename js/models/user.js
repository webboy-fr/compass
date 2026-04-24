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
      market: 0,
      authority: 0,
      baseMarket: 0,
      baseAuthority: 0,
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
      market: ideology.x,
      authority: ideology.y,
      baseMarket: ideology.x,
      baseAuthority: ideology.y,
      energy: 45,
      influencePower: ideology.influencePower,
      attackPower: ideology.attackPower,
      repairPower: ideology.repairPower,
      regen: ideology.regen
    });
  }

  setCompassPosition(market, authority) {
    this.market = PCWMath.clamp(Number(market), -100, 100);
    this.authority = PCWMath.clamp(Number(authority), -100, 100);
    this.x = this.market;
    this.y = this.authority;
  }

  regenerate() {
    this.energy = PCWMath.clamp(this.energy + this.regen, 0, 100);
  }
}

window.PCWUser = PCWUser;
