/**
 * Application controller wiring services, renderer and events.
 */
class PCWGameController {
  constructor(config) {
    this.config = config;
    this.storage = new PCWStorageService(config);
    this.state = this.storage.load();
    this.simulation = new PCWSimulationService(this.state, config);
    this.renderer = new PCWGameRenderer(this.state, this.simulation, config);
    this.timer = null;
    this.animationFrame = null;
    this.lastAnimationTime = 0;
    this.renderer.setSelectFortHandler((fortId) => this.selectFort(fortId));
  }

  init() {
    this.bindEvents();
    this.renderer.renderIdeologyButtons((ideology) => this.chooseIdeology(ideology));
    this.renderer.render();
    this.startLoop();
    this.startAnimationLoop();
  }

  bindEvents() {
    this.renderer.elements.resetButton.addEventListener('click', () => this.resetGame());
    if (this.renderer.elements.pauseButton) {
      this.renderer.elements.pauseButton.addEventListener('click', () => this.togglePause());
    }
    this.renderer.elements.fortActionPanel.addEventListener('click', (event) => this.handleFortActionClick(event));
    this.renderer.elements.fortActionPanel.addEventListener('pointerdown', (event) => event.stopPropagation());
    this.renderer.elements.marketSlider.addEventListener('input', () => this.updatePlayerCompass());
    this.renderer.elements.authoritySlider.addEventListener('input', () => this.updatePlayerCompass());
    document.body.addEventListener('click', (event) => this.closeDestructionModal(event));
    this.renderer.elements.map.addEventListener('click', (event) => this.handleMapClick(event));
    window.addEventListener('resize', () => {
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
    this.saveAndRender();
  }

  handleMapClick(event) {
    if (this.state.paused || !this.state.selectedFortId) return;

    // Keep the current fort selected when the user clicks the fort itself.
    if (event.target.closest('.fort-token')) return;

    // Keep the current fort selected when the user uses the action panel.
    if (event.target.closest('#fortActionPanel')) return;

    // Keep the current fort selected when the click is still close to the fort/action area.
    // This prevents the mini action panel from disappearing while the user tries to click it.
    const selectedFort = this.state.getSelectedFort();
    if (selectedFort) {
      const mapRect = this.renderer.elements.map.getBoundingClientRect();
      const clickX = event.clientX - mapRect.left;
      const clickY = event.clientY - mapRect.top;
      const fortX = this.renderer.toPxX(selectedFort.x);
      const fortY = this.renderer.toPxY(selectedFort.y);
      const safeRadius = 125;

      if (Math.hypot(clickX - fortX, clickY - fortY) <= safeRadius) return;
    }

    this.state.selectedFortId = null;
    this.state.setNotice('');
    this.saveAndRender();
  }

  handleFortActionClick(event) {
    event.stopPropagation();
    if (this.state.paused) return;

    const actionButton = event.target.closest('[data-action]');
    if (!actionButton || !this.renderer.elements.fortActionPanel.contains(actionButton)) return;
    const action = actionButton.dataset.action;
    if (action === 'close-panel') {
      this.state.selectedFortId = null;
      this.state.setNotice('');
      this.saveAndRender();
      return;
    }
    if (action === 'influence-fort') this.simulation.sendPlayerAction('influence');
    if (action === 'attack-fort') this.simulation.sendPlayerAction('attack');
    if (action === 'repair-fort') this.simulation.sendPlayerAction('repair');
    this.saveAndRender();
  }

  closeDestructionModal(event) {
    if (this.state.paused) return;

    const button = event.target.closest('[data-action="close-destruction-modal"]');
    if (!button) return;
    this.state.destructionModal = null;
    this.storage.save(this.state);
    this.renderer.renderPanels();
  }

  togglePause() {
    this.state.paused = !this.state.paused;
    this.state.setNotice(this.state.paused ? 'Simulation en pause.' : 'Simulation reprise.');
    this.state.addLog(this.state.paused ? '⏸ Pause activée.' : '▶ Simulation reprise.');
    this.storage.save(this.state);

    // When pausing, update only the pause button/body class, then freeze the DOM.
    // This keeps the current map/action panel exactly as-is for debugging.
    if (this.state.paused) {
      this.renderer.renderPauseState();
      return;
    }

    // When resuming, a full render is safe again.
    this.renderer.render();
  }

  resetGame() {
    this.storage.reset();
    this.state = PCWGameState.createInitial(this.config);
    this.simulation.state = this.state;
    this.renderer.state = this.state;
    this.renderer.resetDomCache();
    this.saveAndRender();
  }

  tick() {
    // In pause mode, freeze the DOM completely for debugging.
    if (this.state.paused) return;

    this.simulation.tick();
    this.saveAndRender();
  }
  startLoop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), this.config.tickMs);
  }

  startAnimationLoop() {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    this.lastAnimationTime = performance.now();
    const animate = (now) => {
      const deltaSeconds = Math.min((now - this.lastAnimationTime) / 1000, 0.05);
      this.lastAnimationTime = now;
      if (!this.state.paused && this.simulation.updateProjectiles(deltaSeconds)) {
        this.storage.save(this.state);
        this.renderer.renderProjectiles();
        this.renderer.renderFortsOnly();
      }
      this.animationFrame = requestAnimationFrame(animate);
    };
    this.animationFrame = requestAnimationFrame(animate);
  }

  saveAndRender() {
    this.storage.save(this.state);

    // In pause mode, no DOM update at all. Useful for inspecting action panels,
    // hitboxes and sprites without the renderer moving/rebuilding anything.
    if (this.state.paused) return;

    this.renderer.render();
  }

}

window.PCWGameController = PCWGameController;
