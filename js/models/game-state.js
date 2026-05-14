/**
 * Full mutable game state and factory methods.
 */
class PCWGameState {
  constructor(data, config) {
    this.config = config;
    this.started = data.started || false;
    this.paused = Boolean(data.paused);
    this.destructionModal = data.destructionModal || null;
    this.utcTimeMs = Number(data.utcTimeMs || (data.time ? Number(data.time) * 1000 : Date.now()));
    this.utcIso = data.utcIso || new Date(this.utcTimeMs).toISOString().replace('.000Z', 'Z');
    this.time = Math.floor(this.utcTimeMs / 1000);
    this.selectedFortId = data.selectedFortId || null;
    this.player = data.player instanceof PCWUser ? data.player : new PCWUser(data.player || PCWUser.createEmpty());
    this.humanPlayers = (data.humanPlayers || []).map((player) => player instanceof PCWUser ? player : new PCWUser(player));
    this.normalizePlayerIdeologyAppearance(config);
    const botData = Array.isArray(data.bots) && data.bots.length
      ? data.bots
      : (config.botTemplates || []);
    this.bots = botData.map((bot, index) => PCWBot.ensure(bot, index, config.ideologies || [], config));
    this.forts = (data.forts || []).map((fort) => fort instanceof PCWFort ? fort : new PCWFort(fort));
    this.projectiles = (data.projectiles || []).map((projectile) => projectile instanceof PCWProjectile ? projectile : new PCWProjectile(projectile));
    this.preparedActions = [];
    this.destroyEffects = data.destroyEffects || [];
    this.log = data.log || ['Choisis ton idéologie. Le temps avance déjà.'];
    this.notice = data.notice || '';
  }


  normalizePlayerIdeologyAppearance(config) {
    const ideologies = config?.ideologies || [];
    const players = [this.player, ...(this.humanPlayers || [])];

    players.forEach((player) => {
      const weights = player?.ideologyWeights || {};
      const total = Object.values(weights).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
      if (player && total > 0 && typeof player.setIdeologyWeights === 'function') {
        // setIdeologyWeights recomputes color/name/powers, but it also computes a
        // theoretical ideological map position. In OSM mode, x/y are real
        // longitude/latitude coordinates, so normalizing the appearance must never
        // overwrite the player's persisted physical position from the database.
        const currentX = Number(player.x);
        const currentY = Number(player.y);
        const currentMarket = Number(player.market ?? player.x);
        const currentAuthority = Number(player.authority ?? player.y);
        const movementTarget = player.movementTarget || null;
        const movementAnimation = player.movementAnimation || null;

        player.setIdeologyWeights(weights, ideologies);

        if (Number.isFinite(currentX)) player.x = currentX;
        if (Number.isFinite(currentY)) player.y = currentY;
        if (Number.isFinite(currentMarket)) player.market = currentMarket;
        if (Number.isFinite(currentAuthority)) player.authority = currentAuthority;
        player.movementTarget = movementTarget;
        player.movementAnimation = movementAnimation;
      }
    });
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
      time: Math.floor(Date.now() / 1000),
      utcTimeMs: Date.now(),
      utcIso: new Date().toISOString().replace('.000Z', 'Z'),
      selectedFortId: null,
      player: PCWUser.createEmpty(),
      humanPlayers: [],
      bots: (config.botTemplates || []).map((template, index) => PCWBot.fromTemplate(template, index, config.ideologies || [], config)),
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
    return this.humanPlayers.find((player) => player.id === actorId)
      || this.bots.find((bot) => bot.id === actorId)
      || null;
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
    const label = new Date(this.utcTimeMs || Date.now()).toISOString().slice(11, 19) + ' UTC';
    this.log.unshift(`[${label}] ${message}`);
    this.log = this.log.slice(0, 10);
  }

  getPreparedAction(id) {
    return null;
  }

  getPlayerPreparedAction(playerId = null) {
    return null;
  }

  getPreparedActionsForFort(fortId) {
    return [];
  }

  prunePreparedActions() {
    this.preparedActions = [];
  }

  countOwnedForts() {
    return this.forts.filter((fort) => fort.ownerIdeologyId === this.player.ideologyId).length;
  }

}

window.PCWGameState = PCWGameState;
