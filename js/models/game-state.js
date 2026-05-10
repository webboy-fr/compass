/**
 * Full mutable game state and factory methods.
 */
class PCWGameState {
  constructor(data, config) {
    this.config = config;
    this.started = data.started || false;
    this.paused = Boolean(data.paused);
    this.destructionModal = data.destructionModal || null;
    this.time = data.time || 0;
    this.selectedFortId = data.selectedFortId || null;
    this.player = data.player instanceof PCWUser ? data.player : new PCWUser(data.player || PCWUser.createEmpty());
    this.humanPlayers = (data.humanPlayers || []).map((player) => player instanceof PCWUser ? player : new PCWUser(player));
    this.forts = (data.forts || []).map((fort) => fort instanceof PCWFort ? fort : new PCWFort(fort));
    this.projectiles = (data.projectiles || []).map((projectile) => projectile instanceof PCWProjectile ? projectile : new PCWProjectile(projectile));
    this.preparedActions = Array.isArray(data.preparedActions) ? data.preparedActions : [];
    this.destroyEffects = data.destroyEffects || [];
    this.log = data.log || ['Choisis ton idéologie. Le temps avance déjà.'];
    this.notice = data.notice || '';
  }

  static ensure(state, config) {
    if (state instanceof PCWGameState) {
      return state;
    }

    return new PCWGameState(state || {}, config);
  }

  static createInitial(config) {
    return new PCWGameState({
      started: false,
      paused: false,
      destructionModal: null,
      time: 0,
      selectedFortId: null,
      player: PCWUser.createEmpty(),
      humanPlayers: [],
      forts: config.fortTemplates.map((template, index) => PCWFort.fromTemplate(template, index, config.maxHp)),
      projectiles: [],
      preparedActions: [],
      destroyEffects: [],
      log: ['Choisis ton idéologie. Le temps avance déjà.'],
      notice: ''
    }, config);
  }

  getIdeology(id) {
    return this.config.ideologies.find((ideology) => ideology.id === id) || this.config.ideologies[0];
  }

  getActor(actorId) {
    if (actorId === 'player' || actorId === this.player.id) return this.player;
    return this.humanPlayers.find((player) => player.id === actorId) || null;
  }

  getFort(fortId) {
    return this.forts.find((fort) => fort.id === fortId) || null;
  }

  getSelectedFort() {
    return this.getFort(this.selectedFortId);
  }

  setNotice(message) {
    this.notice = message;
  }

  addLog(message) {
    this.log.unshift(`[${this.time}s] ${message}`);
    this.log = this.log.slice(0, 10);
  }

  getPreparedAction(id) {
    return this.preparedActions.find((action) => action.id === id) || null;
  }

  getPlayerPreparedAction(playerId = null) {
    const actorId = playerId || this.player.id;
    return this.preparedActions.find((action) => action.actorId === actorId && action.status !== 'launched' && action.status !== 'cancelled') || null;
  }

  getPreparedActionsForFort(fortId) {
    return this.preparedActions.filter((action) => action.fortId === fortId && action.status !== 'launched' && action.status !== 'cancelled');
  }

  prunePreparedActions() {
    const now = Date.now();
    this.preparedActions = this.preparedActions.filter((action) => {
      if (action.status !== 'launched' && action.status !== 'cancelled') return true;
      return now - Number(action.updatedAt || action.createdAt || now) < 3000;
    });
  }

  countOwnedForts() {
    return this.forts.filter((fort) => fort.ownerActorId === this.player.id || fort.ownerActorId === 'player').length;
  }

}

window.PCWGameState = PCWGameState;
