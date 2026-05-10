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
    if (payload.exists && payload.state) {
      localStorage.setItem(this.config.storageKey, JSON.stringify(payload.state));
      return new PCWGameState(payload.state, this.config);
    }

    const initialState = PCWGameState.createInitial(this.config);
    if (payload.player) {
      initialState.player = PCWUser.fromServerPlayer(payload.player);
      initialState.humanPlayers = (payload.humanPlayers || [payload.player]).map((player) => PCWUser.fromServerPlayer(player));
      initialState.started = Boolean(initialState.player.ideologyId);
    }
    return initialState;
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
