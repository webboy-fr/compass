/**
 * LocalStorage wrapper for the game state.
 */
class PCWStorageService {
  constructor(config) {
    this.config = config;
  }

  load() {
    try {
      const raw = localStorage.getItem(this.config.storageKey);
      return raw ? new PCWGameState(JSON.parse(raw), this.config) : PCWGameState.createInitial(this.config);
    } catch (error) {
      console.warn('Unable to load saved state.', error);
      return PCWGameState.createInitial(this.config);
    }
  }

  save(state) {
    localStorage.setItem(this.config.storageKey, JSON.stringify(state));
  }

  reset() {
    localStorage.removeItem(this.config.storageKey);
  }
}

window.PCWStorageService = PCWStorageService;
