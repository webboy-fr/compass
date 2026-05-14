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

  setPlayerIdeologyWeights(weights) {
    this.ensureState();
    const safeWeights = weights && typeof weights === 'object' ? weights : {};
    const total = Object.values(safeWeights).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);

    this.state.started = total > 0;
    this.state.player.setIdeologyWeights(safeWeights, this.config.ideologies || []);

    if (total === 10) {
      this.state.setNotice(`Profil idéologique enregistré : ${this.state.player.ideologyName}.`);
      this.state.addLog(`🧭 Profil idéologique : ${this.state.player.ideologyName}.`);
      return true;
    }

    this.state.setNotice(`Répartis exactement 10 points. Total actuel : ${total}/10.`);
    return false;
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
        energyCost: 1,
        power: 1,
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
      const energyCost = 1;
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
      const projectile = this.createProjectile(this.state.player.id, fort.id, action.actionType, 1, {
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

    const influencePayload = type === 'influence' && typeof this.state.player.getInfluencePayload === 'function'
      ? this.state.player.getInfluencePayload()
      : {};
    const influenceTotal = Object.values(influencePayload).reduce((sum, value) => sum + Math.max(0, Math.round(Number(value) || 0)), 0);
    const amount = type === 'influence' ? Math.max(1, influenceTotal) : 1;
    const energyCost = 1;
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
      influencePayload: type === 'influence' ? influencePayload : null,
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
    // Server-accepted actions already update the authoritative fort counters.
    // Remote projectiles are visual only and must not apply the same point twice.
    if (projectile.serverApplied) return;

    const actor = this.state.getActor(projectile.actorId);
    if (!actor) return;

    if (projectile.type === 'influence') {
      const payload = projectile.influencePayload && typeof projectile.influencePayload === 'object'
        ? projectile.influencePayload
        : (actor.getInfluencePayload ? actor.getInfluencePayload() : { [projectile.ideologyId]: Math.max(1, Math.round(Number(projectile.amount) || 1)) });

      Object.entries(payload).forEach(([ideologyId, amount]) => {
        fort.applyInfluence(ideologyId, Math.max(0, Math.round(Number(amount) || 0)));
      });
      this.updateFortOwner(fort, actor);
      return;
    }

    if (projectile.type === 'power_up') {
      fort.addPower(1);
      return;
    }

    if (projectile.type === 'power_down') {
      fort.removePower(1);
    }
  }

  updateBots() {
    this.ensureState();
    if (!Array.isArray(this.state.bots) || !this.state.bots.length || !this.state.forts.length) {
      return false;
    }

    let launched = false;
    this.state.bots.forEach((bot, index) => {
      if (!bot || !bot.ideologyId) return;
      const now = Number(this.state.time || 0);
      const nextActionAt = Number(bot.nextActionAt ?? (now + index + 1));
      if (now < nextActionAt) return;

      const decision = this.chooseBotAction(bot);
      const interval = this.getBotActionInterval(bot);
      bot.actionInterval = interval;
      bot.nextActionAt = now + interval;

      if (!decision) return;
      const projectile = this.createProjectile(bot.id, decision.fort.id, decision.type, decision.amount);
      if (!projectile) return;

      launched = true;
      if (Math.random() < 0.35) {
        this.state.addLog(`${bot.name} ${this.getBotActionVerb(decision.type)} ${decision.fort.name}.`);
      }
    });

    return launched;
  }


  getBotActionInterval(bot) {
    const minInterval = Math.max(5, Number(this.config.botActionMinIntervalSeconds || 5));
    const maxInterval = Math.max(minInterval, Number(this.config.botActionMaxIntervalSeconds || 10));
    const configuredInterval = Number(bot?.actionInterval || this.config.botActionIntervalSeconds || minInterval);
    const baseInterval = PCWMath.clamp(configuredInterval, minInterval, maxInterval);
    const jitter = Math.random() * Math.max(0, maxInterval - minInterval);

    return Math.round(Math.max(minInterval, Math.min(maxInterval, baseInterval + jitter - ((maxInterval - minInterval) / 2))));
  }

  chooseBotAction(bot) {
    const forts = this.state.forts;
    if (!forts.length) return null;

    const opposingTargets = forts
      .filter((fort) => fort.ownerIdeologyId && fort.ownerIdeologyId !== bot.ideologyId)
      .map((fort) => ({ fort, score: Math.max(0, Number(fort.getTotalPower ? fort.getTotalPower() : fort.power || 0)) + PCWMath.random(0, 20) }))
      .sort((a, b) => b.score - a.score);

    const friendlyTargets = forts
      .filter((fort) => fort.ownerIdeologyId === bot.ideologyId)
      .map((fort) => ({ fort, score: Math.max(0, 120 - Number(fort.getTotalPower ? fort.getTotalPower() : fort.power || 0)) + PCWMath.random(0, 15) }))
      .sort((a, b) => b.score - a.score);

    const influenceTargets = forts
      .filter((fort) => fort.ownerIdeologyId !== bot.ideologyId)
      .map((fort) => {
        const ownScore = Number(fort.influence?.[bot.ideologyId] || 0);
        const leaderScore = Number(fort.getLeader()?.score || 0);
        return { fort, score: (leaderScore - ownScore) + PCWMath.random(0, 20) };
      })
      .sort((a, b) => b.score - a.score);

    const roll = Math.random();

    if (opposingTargets.length && roll < 0.18) {
      return { type: 'power_down', fort: opposingTargets[0].fort, amount: 1 };
    }

    if (friendlyTargets.length && roll < 0.38) {
      return { type: 'power_up', fort: friendlyTargets[0].fort, amount: 1 };
    }

    if (influenceTargets.length) {
      return { type: 'influence', fort: influenceTargets[0].fort, amount: 1 };
    }

    if (friendlyTargets.length) {
      return { type: 'power_up', fort: friendlyTargets[0].fort, amount: 1 };
    }

    return null;
  }

  getBotActionVerb(type) {
    if (type === 'power_down') return 'affaiblit le pouvoir de';
    if (type === 'power_up') return 'renforce le pouvoir de';
    return 'influence';
  }

  pruneDestroyEffects() {
    this.state.destroyEffects = this.state.destroyEffects.filter((effect) => Date.now() - effect.createdAt < 950);
  }

  updateFortOwner(fort, actor) {
    const leader = fort.getLeader();
    if (!leader) return;
    const previousIdeology = fort.ownerIdeologyId;
    fort.ownerIdeologyId = leader.ideologyId;
    fort.ownerActorId = null;

    if (previousIdeology !== fort.ownerIdeologyId) {
      const ideology = this.state.getIdeology(fort.ownerIdeologyId);
      this.state.addLog(`🏰 ${fort.name} passe sous influence ${ideology.name}.`);
    }
  }

  tick(options = {}) {
    this.ensureState();
    if (this.state.paused) return;
    const nowMs = Date.now();
    this.state.utcTimeMs = nowMs;
    this.state.utcIso = new Date(nowMs).toISOString().replace('.000Z', 'Z');
    this.state.time = Math.floor(nowMs / 1000);
    if (this.state.started) this.state.player.regenerate();
    // Special/prepared actions have been removed from the simplified political model.
    this.state.preparedActions = [];
    return options.updateBots === false ? false : this.updateBots();
  }

  getActionLabel(type) {
    if (type === 'influence') return 'Influence';
    if (type === 'power_up') return 'Pouvoir +';
    if (type === 'power_down') return 'Pouvoir -';
    return 'Action';
  }
}

window.PCWSimulationService = PCWSimulationService;
