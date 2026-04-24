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
    this.forts = (data.forts || []).map((fort) => fort instanceof PCWFort ? fort : new PCWFort(fort));
    this.passiveBots = data.passiveBots || [];
    this.activeBots = (data.activeBots || []).map((bot) => bot instanceof PCWBot ? bot : new PCWBot(bot));
    this.projectiles = (data.projectiles || []).map((projectile) => projectile instanceof PCWProjectile ? projectile : new PCWProjectile(projectile));
    this.destroyEffects = data.destroyEffects || [];
    this.log = data.log || ['Choisis ton idéologie. Le temps avance déjà.'];
    this.notice = data.notice || '';
  }

  static createInitial(config) {
    return new PCWGameState({
      started: false,
      paused: false,
      destructionModal: null,
      time: 0,
      selectedFortId: null,
      player: PCWUser.createEmpty(),
      forts: config.fortTemplates.map((template, index) => PCWFort.fromTemplate(template, index, config.maxHp)),
      passiveBots: PCWGameState.generatePassiveBots(config),
      activeBots: PCWGameState.generateActiveBots(config),
      projectiles: [],
      destroyEffects: [],
      log: ['Choisis ton idéologie. Le temps avance déjà.'],
      notice: ''
    }, config);
  }

  static generatePassiveBots(config) {
    const bots = [];
    for (let i = 0; i < 50; i += 1) {
      const ideology = config.ideologies[i % config.ideologies.length];
      const x = PCWMath.clamp(ideology.x + PCWMath.random(-22, 22), -95, 95);
      const y = PCWMath.clamp(ideology.y + PCWMath.random(-22, 22), -95, 95);
      bots.push({
        id: `passive_${i}`,
        ideologyId: ideology.id,
        x,
        y,
        market: x,
        authority: y,
        baseMarket: ideology.x,
        baseAuthority: ideology.y,
        color: ideology.color
      });
    }
    return bots;
  }

  static generateActiveBots(config) {
    return config.activeBotDefinitions.map((definition, index) => {
      const ideology = config.ideologies.find((item) => item.id === definition.ideologyId) || config.ideologies[0];
      return PCWBot.fromDefinition(definition, index, ideology);
    });
  }

  getIdeology(id) {
    return this.config.ideologies.find((ideology) => ideology.id === id) || this.config.ideologies[0];
  }

  getActor(actorId) {
    if (actorId === 'player') return this.player;
    return this.activeBots.find((bot) => bot.id === actorId) || null;
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

  countOwnedForts() {
    return this.forts.filter((fort) => fort.ownerActorId === 'player').length;
  }

  countBotForts(botId) {
    return this.forts.filter((fort) => fort.ownerActorId === botId).length;
  }
}

window.PCWGameState = PCWGameState;
