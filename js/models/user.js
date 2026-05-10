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
      ideologyWeights: {},
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
      supportPower: 0,
      regen: 0,
      classId: null,
      playerClass: null,
      moveSpeed: 10,
      movementTarget: null,
      movementAnimation: null
    });
  }

  static fromIdeology(ideology, currentPlayer = null) {
    return new PCWUser({
      id: currentPlayer?.id || 'player',
      dbId: currentPlayer?.dbId || null,
      name: currentPlayer?.name || 'TOI',
      ideologyId: ideology.id,
      ideologyName: ideology.name,
      ideologyWeights: currentPlayer?.ideologyWeights || { [ideology.id]: 10 },
      color: ideology.color,
      x: ideology.x,
      y: ideology.y,
      market: ideology.x,
      authority: ideology.y,
      baseMarket: ideology.x,
      baseAuthority: ideology.y,
      energy: currentPlayer?.energy ?? 45,
      influencePower: ideology.influencePower,
      attackPower: ideology.attackPower,
      supportPower: ideology.supportPower,
      regen: ideology.regen,
      classId: currentPlayer?.classId || null,
      playerClass: currentPlayer?.playerClass || null,
      moveSpeed: ideology.moveSpeed || currentPlayer?.moveSpeed || 10,
      movementTarget: currentPlayer?.movementTarget || null,
      movementAnimation: currentPlayer?.movementAnimation || null
    });
  }



  static fromServerPlayer(player) {
    return new PCWUser({
      id: player.id || `player_${player.dbId || player.id}`,
      dbId: player.dbId || null,
      name: player.name || 'Joueur',
      ideologyId: player.ideologyId || null,
      ideologyName: player.ideologyName || 'Non choisi',
      ideologyWeights: player.ideologyWeights || player.ideology_weights || {},
      color: player.color || '#ffffff',
      x: Number(player.x || 0),
      y: Number(player.y || 0),
      market: Number(player.market ?? player.x ?? 0),
      authority: Number(player.authority ?? player.y ?? 0),
      baseMarket: Number(player.baseMarket ?? player.x ?? 0),
      baseAuthority: Number(player.baseAuthority ?? player.y ?? 0),
      energy: Number(player.energy ?? 45),
      influencePower: Number(player.influencePower || 0),
      attackPower: Number(player.attackPower || 0),
      supportPower: Number(player.supportPower || 0),
      regen: Number(player.regen || 0),
      classId: player.classId || null,
      playerClass: player.playerClass || null,
      moveSpeed: Number(player.moveSpeed || 10),
      movementTarget: player.movementTarget || null,
      movementAnimation: player.movementAnimation || null
    });
  }

  setIdeologyWeights(weights, ideologies) {
    const safeWeights = weights && typeof weights === 'object' ? weights : {};
    this.ideologyWeights = { ...safeWeights };

    const entries = Object.entries(this.ideologyWeights)
      .map(([id, score]) => ({ id, score: Math.max(0, Math.min(10, Number(score) || 0)) }))
      .filter((entry) => entry.score > 0);

    const total = entries.reduce((sum, entry) => sum + entry.score, 0);
    const ideologyList = Array.isArray(ideologies) ? ideologies : [];

    if (total <= 0) {
      this.ideologyId = null;
      this.ideologyName = 'Non choisi';
      return;
    }

    const byId = new Map(ideologyList.map((ideology) => [ideology.id, ideology]));
    const sorted = [...entries].sort((a, b) => b.score - a.score);
    const dominant = byId.get(sorted[0].id);

    if (dominant) {
      this.ideologyId = dominant.id;
      this.color = dominant.color;
    }

    const names = sorted.slice(0, 2)
      .map((entry) => byId.get(entry.id)?.name)
      .filter(Boolean);
    this.ideologyName = names.length ? names.join(' / ') : 'Profil mixte';

    let x = 0;
    let y = 0;
    let influencePower = 0;
    let attackPower = 0;
    let supportPower = 0;
    let regen = 0;
    let moveSpeed = 0;

    entries.forEach((entry) => {
      const ideology = byId.get(entry.id);
      if (!ideology) return;
      const ratio = entry.score / total;
      x += Number(ideology.x || 0) * ratio;
      y += Number(ideology.y || 0) * ratio;
      influencePower += Number(ideology.influencePower || 0) * ratio;
      attackPower += Number(ideology.attackPower || 0) * ratio;
      supportPower += Number(ideology.supportPower || 0) * ratio;
      regen += Number(ideology.regen || 0) * ratio;
      moveSpeed += Number(ideology.moveSpeed || 10) * ratio;
    });

    this.x = x;
    this.y = y;
    this.market = x;
    this.authority = y;
    this.baseMarket = x;
    this.baseAuthority = y;
    this.influencePower = Math.round(influencePower);
    this.attackPower = Math.round(attackPower);
    this.supportPower = Math.round(supportPower);
    this.regen = Math.round(regen);
    this.moveSpeed = Math.max(1, Number(moveSpeed || 10));
  }

  setCompassPosition(market, authority) {
    this.market = PCWMath.clamp(Number(market), -100, 100);
    this.authority = PCWMath.clamp(Number(authority), -100, 100);
    this.x = this.market;
    this.y = this.authority;
  }

  setPlayerClass(playerClass) {
    this.classId = playerClass ? playerClass.id : null;
    this.playerClass = playerClass || null;
  }

  getSpecialAction() {
    return this.playerClass || null;
  }

  startMovement(x, y) {
    const targetX = PCWMath.clamp(Number(x), -100, 100);
    const targetY = PCWMath.clamp(Number(y), -100, 100);
    const distance = Math.hypot(targetX - this.x, targetY - this.y);
    const speed = Math.max(1, Number(this.moveSpeed || 10));

    // Movement speed is now treated as a max cruise speed.
    // The ease-in/ease-out phases stay short so long trips do not feel sluggish.
    const cruiseUnitsPerSecond = speed * 12;
    const accelerationSeconds = 0.16;
    const duration = Math.max(0.32, (distance / cruiseUnitsPerSecond) + accelerationSeconds);

    this.movementTarget = { x: targetX, y: targetY };
    this.movementAnimation = {
      fromX: this.x,
      fromY: this.y,
      toX: targetX,
      toY: targetY,
      elapsed: 0,
      duration,
      easeRatio: Math.min(0.22, 0.08 / duration)
    };
  }

  easeMovement(progress) {
    const t = PCWMath.clamp(Number(progress), 0, 1);
    const easeRatio = this.movementAnimation
      ? PCWMath.clamp(Number(this.movementAnimation.easeRatio || 0.12), 0.04, 0.22)
      : 0.12;

    // Short smoothstep acceleration, linear cruise, short smoothstep braking.
    if (t <= easeRatio) {
      const local = t / easeRatio;
      const eased = local * local * (3 - (2 * local));
      return eased * easeRatio;
    }

    if (t >= 1 - easeRatio) {
      const local = (t - (1 - easeRatio)) / easeRatio;
      const eased = local * local * (3 - (2 * local));
      return (1 - easeRatio) + (eased * easeRatio);
    }

    return t;
  }

  updateMovement(deltaSeconds = 1) {
    if (!this.movementTarget) return false;

    if (!this.movementAnimation) {
      this.startMovement(this.movementTarget.x, this.movementTarget.y);
    }

    this.movementAnimation.elapsed += Math.max(0, Number(deltaSeconds || 0));
    const progress = this.movementAnimation.duration > 0
      ? this.movementAnimation.elapsed / this.movementAnimation.duration
      : 1;
    const eased = this.easeMovement(progress);

    this.x = this.movementAnimation.fromX + ((this.movementAnimation.toX - this.movementAnimation.fromX) * eased);
    this.y = this.movementAnimation.fromY + ((this.movementAnimation.toY - this.movementAnimation.fromY) * eased);
    this.market = this.x;
    this.authority = this.y;

    if (progress >= 1) {
      this.x = this.movementTarget.x;
      this.y = this.movementTarget.y;
      this.market = this.x;
      this.authority = this.y;
      this.movementTarget = null;
      this.movementAnimation = null;
    }

    return true;
  }

  regenerate() {
    this.energy = PCWMath.clamp(this.energy + this.regen, 0, 100);
  }
}

window.PCWUser = PCWUser;
