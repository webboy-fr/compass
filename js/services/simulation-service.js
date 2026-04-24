/**
 * Gameplay rules and simulation updates.
 */
class PCWSimulationService {
  constructor(state, config) {
    this.state = state;
    this.config = config;
  }

  chooseIdeology(ideology) {
    this.state.started = true;
    this.state.selectedFortId = null;
    this.state.setNotice('');
    this.state.player = PCWUser.fromIdeology(ideology);
    this.state.addLog(`Tu joues ${ideology.name}. Ton point reste fixe.`);
  }

  selectFort(fortId) {
    if (!this.state.started) return;
    const fort = this.state.getFort(fortId);
    if (!fort) return;
    this.state.selectedFortId = fortId;
    this.state.addLog(`Place forte sélectionnée : ${fort.name}.`);
  }

  sendPlayerAction(type) {
    const fort = this.state.getSelectedFort();
    if (!this.state.started) {
      this.state.setNotice('Choisis d’abord ton idéologie.');
      this.state.addLog('Action impossible : aucune idéologie choisie.');
      return;
    }
    if (!fort) {
      this.state.setNotice('Clique d’abord sur une place forte.');
      this.state.addLog('Action impossible : aucune place forte sélectionnée.');
      return;
    }

    const amount = this.state.player.getPower(type);
    if (this.state.player.energy < amount) {
      const missing = Math.ceil(amount - this.state.player.energy);
      const message = `Vous n’avez pas assez d’énergie : ${Math.round(this.state.player.energy)}/${amount} énergie. Il manque ${missing} énergie.`;
      this.state.setNotice(message);
      this.state.addLog(message);
      return;
    }

    this.state.player.energy = PCWMath.clamp(this.state.player.energy - amount, 0, 100);
    this.createProjectile('player', fort.id, type, amount);
    const message = `${this.getActionLabel(type)} envoyé vers ${fort.name} — coût ${amount} énergie.`;
    this.state.setNotice(message);
    this.state.addLog(message);
  }

  createProjectile(actorId, fortId, type, amount) {
    const actor = this.state.getActor(actorId);
    const fort = this.state.getFort(fortId);
    if (!actor || !fort) return;
    this.state.projectiles.push(PCWProjectile.create(actor, fort, type, amount, this.config));
  }

  updateProjectiles(deltaSeconds) {
    if (!this.state.projectiles.length) return false;
    let changed = false;
    const remaining = [];

    this.state.projectiles.forEach((projectile) => {
      const fort = this.state.getFort(projectile.fortId);
      if (!fort) {
        changed = true;
        return;
      }
      if (projectile.advanceTo(fort, deltaSeconds)) {
        this.applyProjectile(projectile, fort);
        changed = true;
        return;
      }
      remaining.push(projectile);
      changed = true;
    });

    this.state.projectiles = remaining;
    return changed;
  }

  applyProjectile(projectile, fort) {
    const actor = this.state.getActor(projectile.actorId);
    if (!actor) return;
    if (projectile.type === 'influence') {
      this.applyInfluence(projectile, fort, actor);
      return;
    }
    if (projectile.type === 'attack') {
      if (fort.attack(projectile.amount)) this.destroyFort(fort, actor);
      return;
    }
    if (projectile.type === 'repair') {
      fort.repair(projectile.amount);
    }
  }

  applyInfluence(projectile, fort, actor) {
    fort.applyInfluence(projectile.ideologyId, projectile.amount, this.config.maxInfluence);
    fort.moveToward(actor, projectile.amount, this.config.moveFactor);
    this.updateFortOwner(fort, actor);
  }

  destroyFort(fort, actor) {
    this.state.forts = this.state.forts.filter((item) => item.id !== fort.id);
    this.state.projectiles = this.state.projectiles.filter((projectile) => projectile.fortId !== fort.id);
    if (this.state.selectedFortId === fort.id) this.state.selectedFortId = null;
    this.state.destroyEffects.push({
      id: `destroy_${Date.now()}_${Math.random()}`,
      x: fort.x,
      y: fort.y,
      name: fort.name,
      createdAt: Date.now()
    });
    this.state.setNotice(`${fort.name} a été détruit.`);
    this.state.addLog(`💥 ${actor.name} détruit ${fort.name}.`);
  }

  pruneDestroyEffects() {
    this.state.destroyEffects = this.state.destroyEffects.filter((effect) => Date.now() - effect.createdAt < 950);
  }

  updateFortOwner(fort, actor) {
    const leader = fort.getLeader();
    if (!leader) return;
    const previousOwner = fort.ownerActorId;
    fort.ownerIdeologyId = leader.ideologyId;
    fort.ownerActorId = actor.id;
    if (actor.id === 'player' && previousOwner !== 'player') {
      this.state.addLog(`🏰 Tu prends l’ascendant sur ${fort.name}.`);
    }
  }

  playBots() {
    if (!this.state.started || !this.state.forts.length) return;
    this.state.activeBots.forEach((bot) => {
      if (!bot.shouldPlayTurn()) return;
      const target = this.chooseBotTarget(bot);
      if (!target) return;
      bot.targetFortId = target.id;
      const ideology = this.state.getIdeology(bot.ideologyId);
      let type = bot.mode;
      if (bot.mode === 'repair' && target.hp > 75) type = 'influence';
      if (bot.mode === 'attack' && target.ownerIdeologyId === bot.ideologyId) type = 'influence';
      const amount = type === 'influence' ? ideology.influencePower : type === 'attack' ? ideology.attackPower : ideology.repairPower;
      this.createProjectile(bot.id, target.id, type, amount);
    });
  }

  chooseBotTarget(bot) {
    if (bot.mode === 'repair') {
      const damagedOwn = this.state.forts
        .filter((fort) => fort.ownerIdeologyId === bot.ideologyId && fort.hp < 95)
        .sort((a, b) => a.hp - b.hp)[0];
      if (damagedOwn) return damagedOwn;
    }
    if (bot.mode === 'attack') {
      return this.state.forts
        .filter((fort) => fort.ownerIdeologyId !== bot.ideologyId)
        .sort((a, b) => a.hp - b.hp)[0] || this.state.forts[0];
    }
    return this.state.forts
      .sort((a, b) => Math.hypot(bot.x - a.x, bot.y - a.y) - Math.hypot(bot.x - b.x, bot.y - b.y))[0] || null;
  }

  fortNaturalDrift() {
    this.state.forts.forEach((fort) => fort.drift(this.config.maxInfluence));
  }

  tick() {
    this.state.time += 1;
    if (this.state.started) this.state.player.regenerate();
    this.playBots();
    this.fortNaturalDrift();
  }

  getActionLabel(type) {
    if (type === 'influence') return 'Influence';
    if (type === 'attack') return 'Attaque';
    return 'Réparation';
  }
}

window.PCWSimulationService = PCWSimulationService;
