/**
 * Animated action sent from an actor to a fort.
 */
class PCWProjectile {
  constructor(data) {
    Object.assign(this, data);
  }

  static create(actor, fort, type, amount, config) {
    return new PCWProjectile({
      id: `projectile_${Date.now()}_${Math.random()}`,
      actorId: actor.id,
      ideologyId: actor.ideologyId,
      fortId: fort.id,
      type,
      amount,
      x: actor.x,
      y: actor.y,
      targetX: fort.x,
      targetY: fort.y,
      speed: PCWMath.random(config.projectileMinSpeed, config.projectileMaxSpeed)
    });
  }

  advanceTo(fort, deltaSeconds) {
    const dx = fort.x - this.x;
    const dy = fort.y - this.y;
    const dist = Math.hypot(dx, dy);
    const step = this.speed * deltaSeconds;
    if (dist <= step || dist <= 1) return true;
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
    return false;
  }
}

window.PCWProjectile = PCWProjectile;
