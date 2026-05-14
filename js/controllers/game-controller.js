/**
 * Application controller wiring services, renderer and events.
 */
class PCWGameController {
  constructor(config) {
    this.config = config;
    this.storage = new PCWStorageService(config);
    this.state = null;
    this.simulation = null;
    this.renderer = null;
    this.chat = null;
    this.timer = null;
    this.syncTimer = null;
    this.animationFrame = null;
    this.lastAnimationTime = 0;
    this.isSaving = false;
    this.isSyncing = false;
    this.pendingSave = false;
    this.pendingActions = [];
    this.isFlushingActions = false;
    this.actionFlushTimer = null;
    this.lastLocalChangeAt = 0;
    this.lastRemoteSyncAt = 0;
    this.lastActionClickAt = 0;
    this.isPlayerProfileRequired = false;
    this.isMapDragging = false;
    this.mapDragStart = null;
  }

  static async create(config) {
    const controller = new PCWGameController(config);
    controller.state = await controller.storage.load();
    controller.simulation = new PCWSimulationService(controller.state, config);
    controller.renderer = new PCWGameRenderer(controller.state, controller.simulation, config);
    controller.chat = new PCWChatService(config, controller.storage);
    controller.renderer.setSelectFortHandler((fortId) => controller.selectFort(fortId));
    return controller;
  }

  init() {
    this.bindEvents();
    this.renderer.renderIdeologyButtons((ideology) => this.chooseIdeology(ideology));
    this.renderer.render();
    if (this.chat) this.chat.init();
    this.startLoop();
    this.startSyncLoop();
    this.startAnimationLoop();
    this.openPlayerProfileIfSetupIsMissing();
  }

  playerNeedsProfileSetup() {
    if (!this.state || !this.state.player) {
      return false;
    }

    const ideologyTotal = this.getPlayerIdeologyTotal();
    return ideologyTotal !== 10;
  }

  openPlayerProfileIfSetupIsMissing() {
    if (!this.playerNeedsProfileSetup()) {
      return;
    }

    const openProfile = () => {
      if (this.playerNeedsProfileSetup()) {
        this.openRequiredPlayerProfile();
      }
    };

    openProfile();

    if (window.requestAnimationFrame) {
      window.requestAnimationFrame(openProfile);
    }

    window.setTimeout(openProfile, 150);
    window.setTimeout(openProfile, 500);
  }

  getPlayerIdeologyTotal() {
    const weights = this.state?.player?.ideologyWeights || {};
    return Object.values(weights).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
  }

  openRequiredPlayerProfile() {
    this.isPlayerProfileRequired = true;

    // Close map-side panels so the mandatory profile is the only active UI layer.
    if (this.renderer.closeMoveActionPanel) {
      this.renderer.closeMoveActionPanel();
    }
    this.state.selectedFortId = null;

    this.renderer.openPlayerClassModal({ required: true });
  }

  bindEvents() {
    this.renderer.elements.resetButton.addEventListener('click', () => this.resetGame());
    if (this.renderer.elements.createFortButton) {
      this.renderer.elements.createFortButton.addEventListener('click', () => this.toggleCreateFortMode());
    }
    if (this.renderer.elements.createFortModalClose) {
      this.renderer.elements.createFortModalClose.addEventListener('click', () => this.renderer.closeCreateFortModal());
    }
    if (this.renderer.elements.createFortModal) {
      this.renderer.elements.createFortModal.addEventListener('click', (event) => {
        if (event.target === this.renderer.elements.createFortModal) this.renderer.closeCreateFortModal();
      });
    }
    if (this.renderer.elements.createFortForm) {
      this.renderer.elements.createFortForm.addEventListener('submit', (event) => this.handleCreateFortSubmit(event));
    }
    if (this.renderer.elements.playerProfileButton) {
      this.renderer.elements.playerProfileButton.addEventListener('click', () => this.renderer.openPlayerClassModal());
    }
    if (this.renderer.elements.playerClassModalClose) {
      this.renderer.elements.playerClassModalClose.addEventListener('click', () => this.renderer.closePlayerClassModal());
    }
    if (this.renderer.elements.playerClassModal) {
      this.renderer.elements.playerClassModal.addEventListener('click', (event) => this.handlePlayerClassModalClick(event));
    }
    if (this.renderer.elements.pauseButton) {
      this.renderer.elements.pauseButton.addEventListener('click', () => this.togglePause());
    }
    // Use pointerdown for fort actions instead of click. A click fires after mouseup
    // and can be lost when the panel is re-rendered between rapid presses.
    // Pointerdown gives one immediate projectile for every user press.
    this.renderer.elements.fortActionPanel.addEventListener('pointerdown', (event) => this.handleFortActionPointerDown(event));
    this.renderer.elements.moveActionPanel.addEventListener('click', (event) => this.handleMoveActionClick(event));
    this.renderer.elements.fortActionPanel.addEventListener('click', (event) => this.handleFortActionClick(event));
    this.renderer.elements.targetInfo.addEventListener('click', (event) => this.handleTargetInfoClick(event));
    this.renderer.elements.marketSlider.addEventListener('input', () => this.updatePlayerCompass());
    this.renderer.elements.authoritySlider.addEventListener('input', () => this.updatePlayerCompass());
    document.body.addEventListener('click', (event) => this.closeDestructionModal(event));
    if (this.renderer.usingLeaflet && this.renderer.osmMap) {
      this.renderer.osmMap.on('click', (event) => this.handleLeafletMapClick(event));
    } else {
      this.renderer.elements.map.addEventListener('click', (event) => this.handleMapClick(event));
      this.renderer.elements.map.addEventListener('wheel', (event) => this.handleMapWheel(event), { passive: false });
      this.renderer.elements.map.addEventListener('pointerdown', (event) => this.handleMapPointerDown(event));
      window.addEventListener('pointermove', (event) => this.handleMapPointerMove(event));
      window.addEventListener('pointerup', () => this.handleMapPointerUp());
    }
    window.addEventListener('resize', () => {
      if (this.renderer.usingLeaflet && this.renderer.osmMap) {
        this.renderer.osmMap.invalidateSize();
      } else {
        this.renderer.setMapTransform(this.renderer.mapTransform);
      }
      if (!this.state.paused) this.renderer.render();
    });
  }

  chooseIdeology(ideology) {
    this.simulation.chooseIdeology(ideology);
    this.saveAndRender();
  }

  updatePlayerCompass() {
    if (this.state.paused) return;

    const market = Number(this.renderer.elements.marketSlider.value);
    const authority = Number(this.renderer.elements.authoritySlider.value);
    this.simulation.setPlayerCompassPosition(market, authority);
    this.saveAndRender();
  }

  selectFort(fortId) {
    if (this.state.paused) return;

    this.simulation.selectFort(fortId);
    this.renderOnly();
  }

  handleLeafletMapClick(event) {
    if (this.isMapDragging) return;

    const point = {
      x: Number(event.latlng.lng.toFixed(6)),
      y: Number(event.latlng.lat.toFixed(6))
    };

    if (this.renderer.isCreateFortMode) {
      this.renderer.setCreateFortMode(false);
      this.renderer.openCreateFortModal(point.x, point.y);
      return;
    }

    this.state.selectedFortId = null;
    this.state.setNotice('');
    this.renderer.openMoveActionPanel(point.x, point.y);
    this.renderer.renderPanels();
  }

  handleMapClick(event) {
    if (this.state.paused || this.isMapDragging) return;
    if (event.target.closest('.fort-token')) return;
    if (event.target.closest('#fortActionPanel')) return;
    if (event.target.closest('#moveActionPanel')) return;

    const point = this.renderer.clientPointToMapPercent(event.clientX, event.clientY);

    if (this.renderer.isCreateFortMode) {
      this.renderer.setCreateFortMode(false);
      this.renderer.openCreateFortModal(point.x, point.y);
      return;
    }

    const selectedFort = this.state.getSelectedFort();
    if (selectedFort) {
      const fortX = this.renderer.toScreenX(selectedFort.x, selectedFort.y);
      const fortY = this.renderer.toScreenY(selectedFort.y, selectedFort.x);
      const mapRect = this.renderer.elements.map.getBoundingClientRect();
      const clickX = event.clientX - mapRect.left;
      const clickY = event.clientY - mapRect.top;
      if (Math.hypot(clickX - fortX, clickY - fortY) <= 125) return;
    }

    this.state.selectedFortId = null;
    this.state.setNotice('');
    this.renderer.openMoveActionPanel(point.x, point.y);
    this.renderer.renderPanels();
  }

  toggleCreateFortMode() {
    this.renderer.setCreateFortMode(!this.renderer.isCreateFortMode);
  }

  handleMapWheel(event) {
    event.preventDefault();
    const rect = this.renderer.elements.map.getBoundingClientRect();
    const current = this.renderer.mapTransform;
    const oldScale = current.scale;
    const nextScale = PCWMath.clamp(oldScale * (event.deltaY < 0 ? 1.16 : 0.86), 1, 14);
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const worldX = (pointerX - current.x) / oldScale;
    const worldY = (pointerY - current.y) / oldScale;
    this.renderer.setMapTransform({
      scale: nextScale,
      x: pointerX - worldX * nextScale,
      y: pointerY - worldY * nextScale
    });
  }

  handleMapPointerDown(event) {
    if (event.button !== 0) return;
    if (event.target.closest('.fort-token, #fortActionPanel, #moveActionPanel')) return;
    this.isMapDragging = false;
    this.mapDragStart = {
      clientX: event.clientX,
      clientY: event.clientY,
      x: this.renderer.mapTransform.x,
      y: this.renderer.mapTransform.y
    };
  }

  handleMapPointerMove(event) {
    if (!this.mapDragStart) return;
    const dx = event.clientX - this.mapDragStart.clientX;
    const dy = event.clientY - this.mapDragStart.clientY;
    if (Math.hypot(dx, dy) > 4) this.isMapDragging = true;
    if (!this.isMapDragging) return;
    this.renderer.setMapTransform({
      scale: this.renderer.mapTransform.scale,
      x: this.mapDragStart.x + dx,
      y: this.mapDragStart.y + dy
    });
  }

  handleMapPointerUp() {
    window.setTimeout(() => { this.isMapDragging = false; }, 0);
    this.mapDragStart = null;
  }

  async handleCreateFortSubmit(event) {
    event.preventDefault();
    const name = String(this.renderer.elements.createFortName.value || '').trim();
    const x = Number(this.renderer.elements.createFortX.value || 0);
    const y = Number(this.renderer.elements.createFortY.value || 0);
    if (!name) {
      this.renderer.elements.createFortMessage.textContent = 'Le nom est obligatoire.';
      return;
    }
    const fort = PCWFort.fromTemplate({ name: name.slice(0, 80), x, y, base: null, hp: 100, category: 'player_created' }, Date.now(), this.config.maxHp);
    fort.id = `fort_player_${Date.now()}`;
    fort.category = 'player_created';
    this.state.forts.push(fort);
    this.state.addLog(`🏰 Nouveau bastion créé : ${fort.name}.`);
    this.renderer.closeCreateFortModal();
    await this.saveAndRender();
    if (this.storage.createFort) {
      try { await this.storage.createFort({ name: fort.name, x, y }); } catch (error) { console.warn('Remote fort creation failed.', error); }
    }
  }


  async handleMoveActionClick(event) {
    const button = event.target.closest('[data-action="move-player"]');
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();

    const x = Number(button.dataset.x || 0);
    const y = Number(button.dataset.y || 0);

    this.renderer.closeMoveActionPanel();
    this.lastLocalChangeAt = Date.now();

    // Movement is authoritative on the server. Persist first, then animate locally
    // using the same timeline returned by the API. This prevents the next polling
    // tick from restoring the previous database coordinates.
    try {
      const result = this.storage && typeof this.storage.movePlayer === 'function'
        ? await this.storage.movePlayer(x, y)
        : null;
      const movement = result && result.movement ? result.movement : null;

      if (movement && this.state.player) {
        this.state.player.x = Number(movement.fromX);
        this.state.player.y = Number(movement.fromY);
        this.state.player.market = this.state.player.x;
        this.state.player.authority = this.state.player.y;
        this.state.player.movementTarget = { x: Number(movement.toX), y: Number(movement.toY) };
        this.state.player.movementAnimation = {
          fromX: Number(movement.fromX),
          fromY: Number(movement.fromY),
          toX: Number(movement.toX),
          toY: Number(movement.toY),
          elapsed: 0,
          duration: Math.max(0.001, Number(movement.durationMs || 0) / 1000),
          easeRatio: 0.12
        };
      } else {
        this.simulation.movePlayerTo(x, y);
      }

      this.state.setNotice(`Déplacement vers (${x.toFixed(4)}, ${y.toFixed(4)}) enregistré.`);
      this.renderer.render();
    } catch (error) {
      console.warn('Unable to persist player movement destination.', error);
      this.state.setNotice("Déplacement annulé : la position n'a pas pu être enregistrée côté serveur.");
      this.renderer.renderPanels();
    }
  }

  handleFortActionPointerDown(event) {
    const actionButton = event.target.closest('[data-action]');
    if (!actionButton || !this.renderer.elements.fortActionPanel.contains(actionButton)) return;

    event.preventDefault();
    event.stopPropagation();
    this.runFortAction(actionButton);
  }

  handleFortActionClick(event) {
    const actionButton = event.target.closest('[data-action]');
    if (!actionButton || !this.renderer.elements.fortActionPanel.contains(actionButton)) return;

    // Actions are handled on pointerdown to support rapid repeated presses.
    // Prevent the follow-up click from creating a duplicate projectile.
    event.preventDefault();
    event.stopPropagation();
  }

  runFortAction(actionButton) {
    const action = actionButton.dataset.action;
    if (this.state.paused) return;

    if (action === 'close-panel') {
      this.state.selectedFortId = null;
      this.state.setNotice('');
      this.renderOnly();
      return;
    }

    let queuedAction = null;
    if (action === 'influence-fort') queuedAction = this.simulation.sendPlayerAction('influence');
    if (action === 'power-up-fort') queuedAction = this.simulation.sendPlayerAction('power_up');
    if (action === 'power-down-fort') queuedAction = this.simulation.sendPlayerAction('power_down');

    if (queuedAction) {
      this.lastActionClickAt = Date.now();
      if (queuedAction.localOnly) {
        this.saveState(true);
      } else {
        this.queueServerAction(queuedAction);
      }

      // Do not fully re-render the map here. A full render can rebuild the
      // action panel under the cursor and makes quick repeated clicks feel
      // throttled. Update only the visible projectile layer and HUD panels.
      this.renderer.renderProjectiles();
      this.renderer.renderPanels();
    }
  }


  handleTargetInfoClick(event) {
    // Special prepared actions have been removed from the simplified action system.
    return;
  }

  handlePlayerClassModalClick(event) {
    if (event.target === this.renderer.elements.playerClassModal) {
      if (!this.isPlayerProfileRequired || !this.playerNeedsProfileSetup()) {
        this.renderer.closePlayerClassModal();
      }
      return;
    }


    const ideologyPoint = event.target.closest('[data-action="set-ideology-score"]');
    if (ideologyPoint) {
      const ideologyId = ideologyPoint.dataset.ideologyId;
      const requestedScore = Number(ideologyPoint.dataset.score || 0);
      const weights = { ...(this.state.player.ideologyWeights || {}) };
      const currentScore = Number(weights[ideologyId] || 0);
      const currentTotal = Object.values(weights).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
      const remainingWithoutCurrent = Math.max(0, 10 - (currentTotal - currentScore));
      const nextScore = Math.max(0, Math.min(10, requestedScore, remainingWithoutCurrent));

      if (nextScore > 0) {
        weights[ideologyId] = nextScore;
      } else {
        delete weights[ideologyId];
      }

      this.simulation.setPlayerIdeologyWeights(weights);
      this.saveAndRender(false);
      this.renderer.renderPlayerClassModal();
      return;
    }

    // Classes and special actions are disabled in the simplified political action model.
  }

  getActionDebounceMs() {
    const configuredValue = Number(this.config.actionDebounceMs);
    if (!Number.isFinite(configuredValue)) return 50;
    return Math.max(0, Math.min(1000, configuredValue));
  }

  isActionDebounceActive() {
    const now = Date.now();
    const debounceMs = this.getActionDebounceMs();

    // Keep the local click burst authoritative while actions are queued or being sent.
    // A small network guard prevents a sync response from re-inflating energy just
    // before the server applies the batch.
    if (this.pendingActions.length > 0 || this.isFlushingActions) return true;
    if (!this.lastActionClickAt) return false;

    return now - this.lastActionClickAt <= debounceMs + 300;
  }


  queueServerAction(action) {
    this.pendingActions.push(action);
    this.lastLocalChangeAt = Date.now();

    // Render every click immediately, but send clicks in short JSON batches.
    // This gives the user the machine-gun feeling while keeping the server as
    // the source of truth for accepted energy/actions.
    if (this.actionFlushTimer) return;
    this.actionFlushTimer = setTimeout(() => {
      this.actionFlushTimer = null;
      this.flushServerActions();
    }, this.getActionDebounceMs());
  }

  async flushServerActions() {
    if (!this.pendingActions.length || this.isFlushingActions) return;

    const actions = this.pendingActions.splice(0, 50);
    this.isFlushingActions = true;
    try {
      const result = await this.storage.sendActions(actions);
      if (typeof result.energy !== 'undefined') {
        const serverEnergy = Number(result.energy);
        if (this.isActionDebounceActive()) {
          this.state.player.energy = Math.min(Number(this.state.player.energy || 0), serverEnergy);
        } else {
          this.state.player.energy = serverEnergy;
        }
      }
      if (result.rejected > 0) {
        this.state.addLog(`Serveur : ${result.accepted} action(s) acceptée(s), ${result.rejected} refusée(s).`);
      }
      this.lastLocalChangeAt = Date.now();
    } catch (error) {
      console.warn('Unable to send queued actions. Falling back to full state save.', error);
      this.saveState(false);
    } finally {
      this.isFlushingActions = false;
      if (this.pendingActions.length) {
        setTimeout(() => this.flushServerActions(), 40);
      }
    }
  }

  closeDestructionModal(event) {
    if (this.state.paused) return;

    const button = event.target.closest('[data-action="close-destruction-modal"]');
    if (!button) return;
    this.state.destructionModal = null;
    this.saveAndRender(false);
    this.renderer.renderPanels();
  }

  togglePause() {
    this.state.paused = !this.state.paused;
    this.state.setNotice(this.state.paused ? 'Simulation en pause.' : 'Simulation reprise.');
    this.state.addLog(this.state.paused ? '⏸ Pause activée.' : '▶ Simulation reprise.');
    this.saveAndRender(false);

    // When pausing, update only the pause button/body class, then freeze the DOM.
    // This keeps the current map/action panel exactly as-is for debugging.
    if (this.state.paused) {
      this.renderer.renderPauseState();
      return;
    }

    // When resuming, a full render is safe again.
    this.renderer.render();
  }

  async resetGame() {
    try {
      await this.storage.reset();
      this.state = await this.storage.load();
      this.rebindStateReferences();
      this.renderer.resetDomCache();
      this.saveAndRender();
    } catch (error) {
      console.warn('Unable to reset remote state.', error);
      this.state.setNotice('Impossible de réinitialiser la partie distante.');
      this.renderer.renderPanels();
    }
  }

  tick() {
    // In pause mode, freeze the DOM completely for debugging.
    if (this.state.paused) return;

    const energyBeforeTick = Number(this.state.player?.energy || 0);
    const preparedBefore = JSON.stringify(this.state.preparedActions || []);
    const botsLaunchedActions = this.simulation.tick({ updateBots: this.shouldRunBots() });
    const preparedChanged = preparedBefore !== JSON.stringify(this.state.preparedActions || []);

    // During a burst of clicks, action spending has priority over passive local
    // regeneration. This prevents the energy counter from bouncing upward while
    // the click batch is still being sent/validated by the server.
    if (this.isActionDebounceActive() && this.state.player) {
      this.state.player.energy = Math.min(Number(this.state.player.energy || 0), energyBeforeTick);
    }

    // Do not persist the passive simulation tick from every open browser.
    // The shared world is saved when a player acts and when a projectile impacts.
    // This keeps the database as a common source instead of letting each browser
    // continuously overwrite the others with its own passive local simulation.
    if (preparedChanged || botsLaunchedActions) {
      this.saveState(true);
    }
    this.renderOnly();
    if (this.chat) this.chat.fetchMessages();
  }

  startLoop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), this.config.tickMs);
  }

  shouldRunBots() {
    if (!this.storage.apiAvailable) return true;
    const players = (this.state.humanPlayers || [])
      .filter((player) => player && player.id)
      .sort((a, b) => Number(a.dbId || 0) - Number(b.dbId || 0) || String(a.id).localeCompare(String(b.id)));

    if (!players.length) return true;
    return String(players[0].id) === String(this.state.player?.id || '');
  }

  startSyncLoop() {
    if (this.syncTimer) clearInterval(this.syncTimer);
    if (!this.storage.apiAvailable) return;

    const syncMs = Number(this.config.syncMs || 1000);
    this.syncTimer = setInterval(() => this.syncFromServer(), syncMs);
  }

  startAnimationLoop() {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    this.lastAnimationTime = performance.now();
    const animate = (now) => {
      const deltaSeconds = Math.min((now - this.lastAnimationTime) / 1000, 0.05);
      this.lastAnimationTime = now;
      const wasMoving = Boolean(this.state.player && this.state.player.movementTarget);
      const moved = !this.state.paused ? this.simulation.updatePlayerMovement(deltaSeconds) : false;
      const finishedMovement = moved && wasMoving && this.state.player && !this.state.player.movementTarget;
      if (moved) {
        this.lastLocalChangeAt = Date.now();
      }
      if (finishedMovement) {
        this.state.setNotice(`Position enregistrée : (${this.state.player.x.toFixed(4)}, ${this.state.player.y.toFixed(4)}).`);
      }

      if (!this.state.paused && this.simulation.updateProjectiles(deltaSeconds)) {
        // Projectile movement is only a visual animation. Persist only when a projectile
        // actually impacts a fort, otherwise every browser overwrites the shared state
        // many times per second and prevents live synchronization.
        if (this.simulation.lastProjectileImpact) {
          // An impact is a real world-state change. Protect it from the next remote
          // sync tick until the POST has had time to write the updated fort scores.
          this.lastLocalChangeAt = Date.now();
          this.saveState(false);
        }
        this.renderer.renderProjectiles();
        this.renderer.renderFortsOnly();
        this.renderer.renderPanels();
      }

      if (moved) {
        this.renderer.renderPlayer();
        this.renderer.renderPanels();
      }

      this.animationFrame = requestAnimationFrame(animate);
    };
    this.animationFrame = requestAnimationFrame(animate);
  }

  getProjectileDistanceToFort(projectile, state) {
    const fort = state.getFort(projectile.fortId);
    if (!fort) return Number.POSITIVE_INFINITY;
    return Math.hypot(fort.x - projectile.x, fort.y - projectile.y);
  }

  mergeLocalProjectileProgress(freshState) {
    const localProjectiles = new Map((this.state.projectiles || []).map((projectile) => [String(projectile.id), projectile]));

    freshState.projectiles = (freshState.projectiles || []).map((remoteProjectile) => {
      const localProjectile = localProjectiles.get(String(remoteProjectile.id));
      if (!localProjectile) return remoteProjectile;

      const localDistance = this.getProjectileDistanceToFort(localProjectile, this.state);
      const remoteDistance = this.getProjectileDistanceToFort(remoteProjectile, freshState);

      // The server stores the projectile position from the last save. During live sync,
      // that position can be older than the animation already running in this browser.
      // Keep the most advanced local position, otherwise every sync tick pulls the
      // projectile back to its launch point and it appears to spin forever until another
      // UI event forces a save.
      if (localDistance < remoteDistance) {
        return localProjectile;
      }

      return remoteProjectile;
    });
  }

  mergePreparedActions(freshState) {
    const remoteActions = new Map((freshState.preparedActions || []).map((action) => [String(action.id), action]));

    (this.state.preparedActions || []).forEach((localAction) => {
      const id = String(localAction.id || '');
      if (!id) return;

      const remoteAction = remoteActions.get(id);
      if (!remoteAction) {
        const age = Date.now() - Number(localAction.updatedAt || localAction.createdAt || Date.now());
        if (age < 5000 && localAction.status !== 'cancelled' && localAction.status !== 'launched') {
          remoteActions.set(id, localAction);
        }
        return;
      }

      const localUpdatedAt = Number(localAction.updatedAt || localAction.createdAt || 0);
      const remoteUpdatedAt = Number(remoteAction.updatedAt || remoteAction.createdAt || 0);
      if (localUpdatedAt > remoteUpdatedAt) {
        remoteActions.set(id, localAction);
        return;
      }

      const supporters = new Map();
      [...(remoteAction.supporters || []), ...(localAction.supporters || [])].forEach((supporter) => {
        if (!supporter || !supporter.actorId) return;
        supporters.set(String(supporter.actorId), supporter);
      });
      remoteAction.supporters = Array.from(supporters.values());
      if (remoteAction.supporters.length >= Number(remoteAction.requiredSupports || 0) && remoteAction.status === 'waiting_support') {
        remoteAction.status = 'ready';
      }
      remoteActions.set(id, remoteAction);
    });

    freshState.preparedActions = Array.from(remoteActions.values()).filter((action) => action.status !== 'cancelled' || Date.now() - Number(action.updatedAt || Date.now()) < 3000);
  }

  async syncFromServer() {
    if (!this.storage.apiAvailable || this.isSyncing) return;

    // Avoid immediately overwriting a local click before its save request returns.
    if (Date.now() - this.lastLocalChangeAt < 300) return;

    this.isSyncing = true;
    try {
      const selectedFortId = this.state.selectedFortId;
      const notice = this.state.notice;
      const wasPaused = this.state.paused;
      const localEnergy = Number(this.state.player?.energy || 0);
      const localPlayer = this.state.player;
      const keepLocalActionEnergy = this.isActionDebounceActive();
      const keepLocalMovement = Boolean(localPlayer && (localPlayer.movementTarget || localPlayer.movementAnimation));
      const freshState = await this.storage.reloadRemote();
      this.mergeLocalProjectileProgress(freshState);
      freshState.preparedActions = [];

      if (keepLocalMovement && freshState.player) {
        // The server persists the final destination immediately, but this browser
        // still owns the smooth in-flight animation. Keep local movement fields
        // during polling so the current player never snaps back to an older DB
        // position before the animation finishes.
        freshState.player.x = localPlayer.x;
        freshState.player.y = localPlayer.y;
        freshState.player.market = localPlayer.market;
        freshState.player.authority = localPlayer.authority;
        freshState.player.movementTarget = localPlayer.movementTarget;
        freshState.player.movementAnimation = localPlayer.movementAnimation;

        if (Array.isArray(freshState.humanPlayers)) {
          freshState.humanPlayers = freshState.humanPlayers.map((player) => {
            if (String(player.id) !== String(localPlayer.id)) {
              return player;
            }

            return {
              ...player,
              x: localPlayer.x,
              y: localPlayer.y,
              market: localPlayer.market,
              authority: localPlayer.authority,
              movementTarget: localPlayer.movementTarget,
              movementAnimation: localPlayer.movementAnimation
            };
          });
        }
      }

      if (keepLocalActionEnergy && freshState.player) {
        // During a click burst, action spending has priority over passive server regeneration.
        // This prevents the energy counter from bouncing upward before the action batch is fully applied.
        freshState.player.energy = Math.min(localEnergy, Number(freshState.player.energy || 0));
      }

      freshState.selectedFortId = freshState.getFort(selectedFortId) ? selectedFortId : null;
      freshState.notice = notice;
      freshState.paused = wasPaused;
      this.state = freshState;
      this.lastRemoteSyncAt = Date.now();
      this.rebindStateReferences();

      if (!this.state.paused) {
        this.renderer.render();
      }
    } catch (error) {
      console.warn('Unable to synchronize remote state.', error);
    } finally {
      this.isSyncing = false;
    }
  }

  rebindStateReferences() {
    this.state = PCWGameState.ensure(this.state, this.config);
    this.simulation.state = this.state;
    this.renderer.state = this.state;
    this.renderer.simulation = this.simulation;
    if (this.chat) {
      this.chat.config = this.config;
      this.chat.storage = this.storage;
    }
  }

  renderOnly() {
    if (this.state.paused) return;
    this.renderer.render();
  }

  saveState(markLocalChange = true) {
    if (markLocalChange) {
      this.lastLocalChangeAt = Date.now();
    }

    if (this.isSaving) {
      this.pendingSave = true;
      return;
    }

    this.isSaving = true;
    this.storage.save(this.state)
      .catch((error) => {
        console.warn('Unable to persist remote state. Local storage still contains the latest state.', error);
      })
      .finally(() => {
        this.isSaving = false;
        if (this.pendingSave) {
          this.pendingSave = false;
          this.saveState(false);
        }
      });
  }

  saveAndRender(markLocalChange = true) {
    this.saveState(markLocalChange);

    // In pause mode, no DOM update at all. Useful for inspecting action panels,
    // hitboxes and sprites without the renderer moving/rebuilding anything.
    if (this.state.paused) return;

    this.renderer.render();
  }
}

window.PCWGameController = PCWGameController;
