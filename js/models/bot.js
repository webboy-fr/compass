/**
 * Autonomous actor controlled by the simulation.
 */
class PCWBot extends PCWActor {
  constructor(data) {
    super(data);
    this.isBot = true;
  }

  static fromTemplate(template, index, ideologies, config = {}) {
    const ideologyList = Array.isArray(ideologies) ? ideologies : [];
    const fallbackIdeology = ideologyList[index % Math.max(1, ideologyList.length)] || {};
    const ideology = ideologyList.find((item) => item.id === template.ideologyId) || fallbackIdeology;
    const powerMultiplier = Number(config.botPowerMultiplier || 0.8);
    const offset = template.offset || {};

    return new PCWBot({
      id: template.id || `bot_${index + 1}`,
      name: template.name || `Bot ${index + 1}`,
      ideologyId: ideology.id || null,
      ideologyName: ideology.name || 'Bot',
      color: ideology.color || '#ffffff',
      x: Number(template.x ?? (Number(ideology.x || 0) + Number(offset.x || 0))),
      y: Number(template.y ?? (Number(ideology.y || 0) + Number(offset.y || 0))),
      influencePower: Math.max(1, Math.round(Number(ideology.influencePower || 8) * powerMultiplier)),
      attackPower: Math.max(1, Math.round(Number(ideology.attackPower || 8) * powerMultiplier)),
      supportPower: Math.max(1, Math.round(Number(ideology.supportPower || 8) * powerMultiplier)),
      nextActionAt: Number(template.nextActionAt ?? (3 + (index * 2))),
      actionInterval: PCWBot.getConfiguredActionInterval(template, config),
      aggression: Number(template.aggression ?? 0.35)
    });
  }

  static ensure(bot, index, ideologies, config = {}) {
    const template = bot && typeof bot === 'object' ? bot : {};
    const hydrated = bot instanceof PCWBot
      ? bot
      : PCWBot.fromTemplate(template, index, ideologies, config);

    if (!Number.isFinite(Number(hydrated.nextActionAt))) {
      hydrated.nextActionAt = 3 + (index * 2);
    }
    if (!Number.isFinite(Number(hydrated.actionInterval)) || Number(hydrated.actionInterval) <= 0) {
      hydrated.actionInterval = PCWBot.getConfiguredActionInterval(template, config);
    }
    hydrated.actionInterval = PCWBot.clampActionInterval(hydrated.actionInterval, config);
    hydrated.isBot = true;
    return hydrated;
  }

  static getConfiguredActionInterval(template, config = {}) {
    return PCWBot.clampActionInterval(Number(template.actionInterval || config.botActionIntervalSeconds || 7), config);
  }

  static clampActionInterval(value, config = {}) {
    const minInterval = Math.max(5, Number(config.botActionMinIntervalSeconds || 5));
    const maxInterval = Math.max(minInterval, Number(config.botActionMaxIntervalSeconds || 10));
    const interval = Number.isFinite(Number(value)) ? Number(value) : minInterval;

    return Math.max(minInterval, Math.min(maxInterval, interval));
  }
}


window.PCWBot = PCWBot;
