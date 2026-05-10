/**
 * Gameplay rules and simulation updates.
 */
class PCWSimulationService {
  constructor(state, config) {
    this.state = PCWGameState.ensure(state, config);
    this.config = config;
  }

  ensureState() {
    this.state = PCWGameState.ensure(this.state, this.config);
    return this.state;
  }

  chooseIdeology(ideology) {
    this.state.started = true;
    this.state.selectedFortId = null;
    this.state.setNotice('');
    this.state.player = PCWUser.fromIdeology(ideology, this.state.player);
    this.state.addLog(`Tu joues ${ideology.name}. Ajuste tes curseurs Marché/Autorité pour déplacer ton point.`);
  }

  choosePlayerClass(playerClass) {
    if (!playerClass) return;
    if (this.state.player.playerClass) {
      this.state.setNotice('Classe verrouillée : réinitialise ton joueur pour changer de classe.');
      this.state.addLog('Changement de classe refusé : ta classe est déjà verrouillée.');
      return;
    }
    this.state.player.setPlayerClass(playerClass);
    this.state.setNotice(`Classe choisie : ${playerClass.name}. Elle est maintenant verrouillée.`);
    this.state.addLog(`🎭 Classe verrouillée : ${playerClass.name}.`);
  }

  resetPlayerClass() {
    this.state.preparedActions = (this.state.preparedActions || []).filter((action) => action.actorId !== this.state.player.id);
    this.state.player.setPlayerClass(null);
    this.state.setNotice('Classe réinitialisée. Tu peux choisir une nouvelle classe.');
    this.state.addLog('🔄 Classe du joueur réinitialisée.');
  }

  setPlayerCompassPosition(market, authority) {
    if (!this.state.started) return;
    this.state.player.setCompassPosition(market, authority);
    this.state.setNotice(`Position ajustée : marché ${Math.round(this.state.player.market)}, autorité ${Math.round(this.state.player.authority)}.`);
  }

  selectFort(fortId) {
    if (!this.state.started) return;
    const fort = this.state.getFort(fortId);
    if (!fort) return;
    this.state.selectedFortId = fortId;
    this.state.addLog(`Place forte sélectionnée : ${fort.name}.`);
  }


  movePlayerTo(x, y) {
    this.ensureState();

    if (!this.state.started) {
      this.state.setNotice('Choisis une idéologie avant de te déplacer.');
      return false;
    }

    this.state.player.startMovement(x, y);
    this.state.setNotice(`Déplacement lancé vers (${Math.round(x)}, ${Math.round(y)}).`);
    this.state.addLog(`🧭 Déplacement vers (${Math.round(x)}, ${Math.round(y)}).`);
    return true;
  }

  updatePlayerMovement(deltaSeconds) {
    this.ensureState();

    if (!this.state.player || !this.state.player.movementTarget) {
      return false;
    }

    return this.state.player.updateMovement(deltaSeconds);
  }

  sendPlayerSpecialAction(actionSlug) {
    return this.prepareOrChargeSpecialAction(actionSlug);
  }

  prepareOrChargeSpecialAction(actionSlug) {
    this.ensureState();
    const special = this.state.player.getSpecialAction();
    const fort = this.state.getSelectedFort();
    if (!special || special.actionSlug !== actionSlug) {
      this.state.setNotice('Aucune action spéciale disponible pour ta classe.');
      return null;
    }
    if (!fort) {
      this.state.setNotice('Clique d’abord sur une place forte.');
      return null;
    }

    const existing = this.state.getPlayerPreparedAction(this.state.player.id);
    if (existing && existing.actionSlug !== actionSlug) {
      this.state.setNotice('Tu as déjà une action spéciale en préparation.');
      return null;
    }

    if (!existing) {
      const requiredSupports = Math.max(0, Number(special.requiredSupports ?? 1));
      const prepared = {
        id: `prep_${Date.now()}_${Math.random()}`,
        actorId: this.state.player.id,
        actorName: this.state.player.name,
        actorColor: this.state.player.color,
        actorX: this.state.player.x,
        actorY: this.state.player.y,
        ideologyId: this.state.player.ideologyId,
        fortId: fort.id,
        fortName: fort.name,
        classId: special.id,
        className: special.name,
        actionSlug: special.actionSlug,
        actionName: special.actionName,
        actionType: special.actionType,
        icon: special.icon || '✨',
        energyCost: Number(special.energyCost || special.power || 0),
        power: Number(special.power || 0),
        requiredSupports,
        supporters: [],
        preparationSeconds: Math.max(0, Number(special.preparationSeconds ?? special.cooldownSeconds ?? 1)),
        status: requiredSupports > 0 ? 'waiting_support' : 'ready',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      this.state.preparedActions.push(prepared);
      this.state.setNotice(`${special.actionName} préparée sur ${fort.name}. Soutiens requis : ${requiredSupports}.`);
      this.state.addLog(`${special.icon || '✨'} ${this.state.player.name} prépare ${special.actionName} sur ${fort.name}.`);
      return { localOnly: true, preparedAction: true };
    }

    const supportCount = Array.isArray(existing.supporters) ? existing.supporters.length : 0;
    if (supportCount < Number(existing.requiredSupports || 0)) {
      this.state.setNotice(`${existing.actionName} attend encore ${Number(existing.requiredSupports || 0) - supportCount} soutien(s).`);
      return null;
    }

    if (existing.status === 'charging') {
      this.state.setNotice(`${existing.actionName} est déjà en chargement.`);
      return null;
    }

    existing.status = 'charging';
    existing.chargeStartedAt = Date.now();
    existing.chargeEndsAt = Date.now() + Math.max(0, Number(existing.preparationSeconds || 0)) * 1000;
    existing.updatedAt = Date.now();
    this.state.setNotice(`${existing.actionName} en chargement…`);
    this.state.addLog(`⏳ ${existing.actionName} commence son chargement.`);
    return { localOnly: true, preparedAction: true };
  }

  supportPreparedAction(preparedActionId) {
    this.ensureState();
    const action = this.state.getPreparedAction(preparedActionId);
    if (!action) return false;
    if (action.actorId === this.state.player.id) {
      this.state.setNotice('Tu ne peux pas soutenir ta propre action spéciale.');
      return false;
    }
    if (!Array.isArray(action.supporters)) action.supporters = [];
    if (action.supporters.some((supporter) => supporter.actorId === this.state.player.id)) {
      this.state.setNotice('Tu as déjà soutenu cette action.');
      return false;
    }
    action.supporters.push({
      actorId: this.state.player.id,
      actorName: this.state.player.name,
      at: Date.now()
    });
    action.updatedAt = Date.now();
    if (action.supporters.length >= Number(action.requiredSupports || 0)) {
      action.status = 'ready';
      this.state.addLog(`✅ ${action.actionName} de ${action.actorName} est prête.`);
    }
    this.state.setNotice(`Tu soutiens ${action.actionName} de ${action.actorName}.`);
    return true;
  }

  processPreparedActions() {
    this.ensureState();
    const now = Date.now();
    let changed = false;
    (this.state.preparedActions || []).forEach((action) => {
      if (action.actorId !== this.state.player.id || action.status !== 'charging') return;
      if (now < Number(action.chargeEndsAt || 0)) return;
      const currentEnergy = Number(this.state.player.energy || 0);
      const energyCost = Number(action.energyCost || 0);
      if (currentEnergy < energyCost) {
        action.status = 'cancelled';
        action.updatedAt = now;
        this.state.setNotice(`${action.actionName} annulée : énergie insuffisante.`);
        this.state.addLog(`❌ ${action.actionName} annulée : énergie insuffisante.`);
        changed = true;
        return;
      }
      const fort = this.state.getFort(action.fortId);
      if (!fort) {
        action.status = 'cancelled';
        action.updatedAt = now;
        changed = true;
        return;
      }
      const projectile = this.createProjectile(this.state.player.id, fort.id, action.actionType, Number(action.power || 0), {
        isSpecial: true,
        actionSlug: action.actionSlug,
        label: action.actionName,
        icon: action.icon || '✨'
      });
      if (projectile) {
        this.state.player.energy = PCWMath.clamp(currentEnergy - energyCost, 0, 100);
        action.status = 'launched';
        action.updatedAt = now;
        this.state.setNotice(`${action.actionName} lancée sur ${fort.name}.`);
        this.state.addLog(`${action.icon || '✨'} ${action.actionName} lancée sur ${fort.name}.`);
        changed = true;
      }
    });
    this.state.prunePreparedActions();
    return changed;
  }

  sendPlayerAction(type, options = {}) {
    this.ensureState();
    const fort = this.state.getSelectedFort();
    if (this.state.paused) {
      this.state.setNotice('Simulation en pause : reprends la partie pour agir.');
      this.state.addLog('Action ignorée : la simulation est en pause.');
      return null;
    }
    if (!this.state.started) {
      this.state.setNotice('Choisis d’abord ton idéologie.');
      this.state.addLog('Action impossible : aucune idéologie choisie.');
      return null;
    }
    if (!fort) {
      this.state.setNotice('Clique d’abord sur une place forte.');
      this.state.addLog('Action impossible : aucune place forte sélectionnée.');
      return null;
    }

    const amount = Number(options.amount ?? this.state.player.getPower(type));
    const energyCost = Number(options.energyCost ?? amount);
    const currentEnergy = Number(this.state.player.energy || 0);
    if (amount <= 0 || energyCost <= 0 || currentEnergy < energyCost) {
      const missing = Math.max(0, energyCost - currentEnergy);
      this.state.setNotice(`Énergie insuffisante : il manque ${Math.ceil(missing)} point(s) pour ${(options.label || this.getActionLabel(type)).toLowerCase()}.`);
      this.state.addLog(`Action impossible : énergie insuffisante pour ${(options.label || this.getActionLabel(type)).toLowerCase()}.`);
      return null;
    }

    const projectile = this.createProjectile(this.state.player.id, fort.id, type, amount, options);
    if (!projectile) return null;

    // Spend locally before queuing the server action so a rapid click burst stops
    // immediately when the player reaches zero energy.
    this.state.player.energy = PCWMath.clamp(currentEnergy - energyCost, 0, 100);
    const label = options.label || this.getActionLabel(type);
    const message = `${label} envoyé vers ${fort.name} — coût ${energyCost} énergie.`;
    this.state.setNotice(message);
    this.state.addLog(message);

    return {
      id: projectile.id,
      type,
      fortId: fort.id,
      amount,
      energyCost,
      isSpecial: Boolean(options.isSpecial),
      actionSlug: options.actionSlug || null,
      label: options.label || null,
      icon: options.icon || null
    };
  }

  createProjectile(actorId, fortId, type, amount, options = {}) {
    const actor = this.state.getActor(actorId);
    const fort = this.state.getFort(fortId);
    if (!actor || !fort) return null;
    const projectile = PCWProjectile.create(actor, fort, type, amount, this.config);
    if (options.isSpecial) {
      projectile.isSpecial = true;
      projectile.actionSlug = options.actionSlug || null;
      projectile.label = options.label || null;
      projectile.icon = options.icon || null;
    }
    this.state.projectiles.push(projectile);
    return projectile;
  }

  updateProjectiles(deltaSeconds) {
    this.ensureState();
    if (!this.state.projectiles.length) {
      this.lastProjectileImpact = false;
      return false;
    }

    let changed = false;
    let impacted = false;
    const remaining = [];

    this.state.projectiles.forEach((projectile) => {
      const fort = this.state.getFort(projectile.fortId);
      if (!fort) {
        changed = true;
        impacted = true;
        return;
      }
      if (projectile.advanceTo(fort, deltaSeconds)) {
        this.applyProjectile(projectile, fort);
        changed = true;
        impacted = true;
        return;
      }
      remaining.push(projectile);
      changed = true;
    });

    this.state.projectiles = remaining;
    this.lastProjectileImpact = impacted;
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
    if (projectile.type === 'support') {
      fort.repair(projectile.amount);
    }
  }

  applyInfluence(projectile, fort, actor) {
    fort.applyInfluence(
      projectile.ideologyId,
      projectile.amount,
      this.config.maxInfluence,
      this.config.influenceCompetitionDecay
    );
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
    if ((actor.id === this.state.player.id || actor.id === 'player') && previousOwner !== this.state.player.id) {
      this.state.addLog(`🏰 Tu prends l’ascendant sur ${fort.name}.`);
    }
  }

  tick() {
    this.ensureState();
    if (this.state.paused) return;
    this.state.time += 1;
    if (this.state.started) this.state.player.regenerate();
    this.processPreparedActions();
  }

  getActionLabel(type) {
    if (type === 'influence') return 'Influence';
    if (type === 'attack') return 'Attaque';
    return 'Soutien';
  }
}

window.PCWSimulationService = PCWSimulationService;
