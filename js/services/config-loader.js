/**
 * Loads optional database-backed configuration while keeping local config as fallback.
 */
class PCWConfigLoader {
  static async load(defaultConfig) {
    const config = { ...defaultConfig };
    if (!config.apiEnabled || !config.configApiUrl) {
      return config;
    }

    try {
      const response = await fetch(config.configApiUrl, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Config API error ${response.status}`);
      }

      const remoteConfig = await PCWApiResponseParser.parse(response, 'Config API');
      return {
        ...config,
        ideologies: Array.isArray(remoteConfig.ideologies) && remoteConfig.ideologies.length ? remoteConfig.ideologies : config.ideologies,
        fortTemplates: Array.isArray(remoteConfig.fortTemplates) && remoteConfig.fortTemplates.length ? remoteConfig.fortTemplates : config.fortTemplates,
        playerClasses: Array.isArray(remoteConfig.playerClasses) && remoteConfig.playerClasses.length ? remoteConfig.playerClasses : config.playerClasses,
        actionDebounceMs: Number.isFinite(Number(remoteConfig.actionDebounceMs)) ? Number(remoteConfig.actionDebounceMs) : config.actionDebounceMs
      };
    } catch (error) {
      console.warn('Unable to load remote game config. Local config will be used.', error);
      return config;
    }
  }
}

window.PCWConfigLoader = PCWConfigLoader;
