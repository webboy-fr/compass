/**
 * Persistent storage wrapper with API-first behavior and localStorage fallback.
 */
class PCWStorageService {
  constructor(config) {
    this.config = config;
    this.apiAvailable = Boolean(config.apiEnabled && config.stateApiUrl);
    this.currentPlayerToken = config.currentPlayerToken || '';
  }

  getStateUrl() {
    const separator = this.config.stateApiUrl.includes('?') ? '&' : '?';
    return `${this.config.stateApiUrl}${separator}token=${encodeURIComponent(this.currentPlayerToken)}`;
  }

  getActionsUrl() {
    const baseUrl = this.config.actionsApiUrl || this.config.stateApiUrl.replace('state.php', 'actions.php');
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}token=${encodeURIComponent(this.currentPlayerToken)}`;
  }

  async fetchRemotePayload() {
    const response = await fetch(this.getStateUrl(), { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`State API error ${response.status}`);
    }
    return PCWApiResponseParser.parse(response, 'State API');
  }

  stateFromPayload(payload) {
    const hasPlayableProfile = (player) => {
      if (!player) return false;
      const weights = player.ideologyWeights || player.ideology_weights || {};
      const total = Object.values(weights).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
      return Boolean(player.ideologyId || player.ideology_id || total > 0);
    };

    const hydrateState = (rawState) => {
      const stateData = rawState && typeof rawState === 'object' ? { ...rawState } : {};

      // Defensive fix: an old or partial server state must never blank the map.
      // If forts are missing, rebuild the map from the local configuration.
      if (!Array.isArray(stateData.forts) || stateData.forts.length === 0) {
        stateData.forts = this.config.fortTemplates.map((template, index) => (
          PCWFort.fromTemplate(template, index, this.config.maxHp)
        ));
      }

      if (!Array.isArray(stateData.projectiles)) stateData.projectiles = [];
      if (!Array.isArray(stateData.preparedActions)) stateData.preparedActions = [];
      if (!Array.isArray(stateData.destroyEffects)) stateData.destroyEffects = [];
      if (!Array.isArray(stateData.log)) stateData.log = ['Bienvenue sur la carte.'];

      if (payload.player) {
        stateData.player = PCWUser.fromServerPlayer(payload.player);
      }

      stateData.humanPlayers = (payload.humanPlayers || (payload.player ? [payload.player] : []))
        .map((player) => PCWUser.fromServerPlayer(player));

      stateData.started = hasPlayableProfile(stateData.player);

      const state = new PCWGameState(stateData, this.config);
      localStorage.setItem(this.config.storageKey, JSON.stringify(state));
      return state;
    };

    if (payload.exists && payload.state) {
      return hydrateState(payload.state);
    }

    return hydrateState(PCWGameState.createInitial(this.config));
  }

  async load() {
    if (this.apiAvailable) {
      try {
        return this.stateFromPayload(await this.fetchRemotePayload());
      } catch (error) {
        console.warn('Unable to load remote saved state. Local storage will be used.', error);
      }
    }

    try {
      const raw = localStorage.getItem(this.config.storageKey);
      return raw ? new PCWGameState(JSON.parse(raw), this.config) : PCWGameState.createInitial(this.config);
    } catch (error) {
      console.warn('Unable to load saved state.', error);
      return PCWGameState.createInitial(this.config);
    }
  }

  async reloadRemote() {
    if (!this.apiAvailable) {
      return this.load();
    }

    return this.stateFromPayload(await this.fetchRemotePayload());
  }

  async save(state) {
    const stateData = JSON.parse(JSON.stringify(state));
    localStorage.setItem(this.config.storageKey, JSON.stringify(stateData));

    if (!this.apiAvailable) {
      return { ok: true, localOnly: true };
    }

    const response = await fetch(this.getStateUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: stateData })
    });

    if (!response.ok) {
      throw new Error(`State API error ${response.status}`);
    }

    return PCWApiResponseParser.parse(response, 'State API');
  }

  async sendActions(actions) {
    if (!this.apiAvailable || !actions.length) {
      return { ok: true, localOnly: true, accepted: actions.length, rejected: 0 };
    }

    const response = await fetch(this.getActionsUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actions })
    });

    if (!response.ok) {
      throw new Error(`Actions API error ${response.status}`);
    }

    return PCWApiResponseParser.parse(response, 'Actions API');
  }

  async reset() {
    localStorage.removeItem(this.config.storageKey);

    if (!this.apiAvailable) {
      return { ok: true, localOnly: true };
    }

    const response = await fetch(this.getStateUrl(), { method: 'DELETE' });
    if (!response.ok) {
      throw new Error(`State API error ${response.status}`);
    }
    return PCWApiResponseParser.parse(response, 'State API');
  }
}

window.PCWStorageService = PCWStorageService;
