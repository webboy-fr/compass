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
    this.renderer.elements.fortActionPanel.addEventListener('click', (event) => this.handleFortActionClick(event));
    this.renderer.elements.marketSlider.addEventListener('input', () => this.updatePlayerCompass());
    this.renderer.elements.authoritySlider.addEventListener('input', () => this.updatePlayerCompass());
    document.body.addEventListener('click', (event) => this.closeDestructionModal(event));
    window.addEventListener('resize', () => this.renderer.render());
  }

  chooseIdeology(ideology) {
    this.simulation.chooseIdeology(ideology);
    this.saveAndRender();
  }

  updatePlayerCompass() {
    const market = Number(this.renderer.elements.marketSlider.value);
    const authority = Number(this.renderer.elements.authoritySlider.value);
    this.simulation.setPlayerCompassPosition(market, authority);
    this.saveAndRender();
  }

  selectFort(fortId) {
    this.simulation.selectFort(fortId);
    this.saveAndRender();
  }

  handleFortActionClick(event) {
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
    const button = event.target.closest('[data-action="close-destruction-modal"]');
    if (!button) return;
    this.state.destructionModal = null;
    this.storage.save(this.state);
    this.renderer.renderPanels();
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
      if (this.simulation.updateProjectiles(deltaSeconds)) {
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
    this.renderer.render();
  }
}

window.PCWGameController = PCWGameController;
