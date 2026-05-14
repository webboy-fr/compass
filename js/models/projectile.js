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
      ideologyWeights: actor.ideologyWeights ? { ...actor.ideologyWeights } : {},
      influencePayload: typeof actor.getInfluencePayload === 'function' ? actor.getInfluencePayload() : (actor.ideologyId ? { [actor.ideologyId]: Math.max(1, Math.round(Number(amount) || 1)) } : {}),
      fortId: fort.id,
      type,
      amount,
      x: actor.x,
      y: actor.y,
      targetX: fort.x,
      targetY: fort.y,
      speed: PCWMath.random(config.projectileMinSpeed, config.projectileMaxSpeed),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      minTravelMs: Number(config.projectileMinTravelMs || 900)
    });
  }

  advanceTo(fort, deltaSeconds) {
    const targetX = Number(fort.x);
    const targetY = Number(fort.y);
    const dx = targetX - Number(this.x);
    const dy = targetY - Number(this.y);
    const dist = Math.hypot(dx, dy);
    const step = Math.max(0.0001, Number(this.speed || 1)) * deltaSeconds;
    const now = Date.now();
    const createdAt = Number(this.createdAt || now);
    const minTravelMs = Math.max(0, Number(this.minTravelMs || 900));

    // Keep even very short Paris-to-Paris actions visible long enough for other
    // browsers to receive them through polling before the impact is applied.
    if ((dist <= step || dist <= 0.000015) && now - createdAt >= minTravelMs) {
      this.x = targetX;
      this.y = targetY;
      this.updatedAt = now;
      return true;
    }

    if (dist > 0.000015) {
      const cappedStep = Math.min(step, dist);
      this.x = Number(this.x) + (dx / dist) * cappedStep;
      this.y = Number(this.y) + (dy / dist) * cappedStep;
    }

    this.updatedAt = now;
    return false;
  }
}

window.PCWProjectile = PCWProjectile;
