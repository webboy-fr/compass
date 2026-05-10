/**
 * Global game configuration and seed data.
 */
window.PCWConfig = {
  storageKey: 'political_compass_war_v12_prepared_specials',
  apiEnabled: true,
  configApiUrl: 'api/config.php',
  stateApiUrl: 'api/state.php?key=default',
  actionsApiUrl: 'api/actions.php?key=default',
  chatApiUrl: 'api/chat.php',
  authApiUrl: 'api/auth.php',
  tickMs: 1000,
  syncMs: 500,
  actionDebounceMs: 50,
  maxInfluence: 100,
  influenceCompetitionDecay: 1,
  maxHp: 100,
  moveFactor: 0.045,
  projectileMinSpeed: 115,
  projectileMaxSpeed: 170,
  ideologies: [
    { id: 'liberal', name: 'Libéral', color: '#42d392', x: 72, y: -38, influencePower: 12, attackPower: 9, supportPower: 8, regen: 6, moveSpeed: 12 },
    { id: 'socialdem', name: 'Social-démocrate', color: '#ffb84d', x: -38, y: -34, influencePower: 11, attackPower: 7, supportPower: 11, regen: 6, moveSpeed: 7 },
    { id: 'ecologist', name: 'Écologiste', color: '#7bd957', x: -55, y: -56, influencePower: 10, attackPower: 7, supportPower: 12, regen: 6, moveSpeed: 12 },
    { id: 'conservative', name: 'Conservateur', color: '#579dff', x: 38, y: 42, influencePower: 10, attackPower: 10, supportPower: 8, regen: 6, moveSpeed: 12 },
    { id: 'sovereignist', name: 'Souverainiste', color: '#ff5d6c', x: -48, y: 58, influencePower: 9, attackPower: 12, supportPower: 7, regen: 6, moveSpeed: 12 },
    { id: 'libertarian', name: 'Libertarien', color: '#36dce8', x: 84, y: -68, influencePower: 13, attackPower: 9, supportPower: 7, regen: 6, moveSpeed: 12 }
  ],
  playerClasses: [
    { id: 1, slug: 'journalist', name: 'Journaliste', description: 'Révèle et fragilise les positions adverses avec des articles ciblés.', imagePath: 'assets/classes/journalist.svg', icon: '📰', actionName: 'Article d’enquête', actionSlug: 'investigation_article', actionType: 'attack', actionDescription: 'Une attaque spéciale plus lisible et scénarisée.', energyCost: 18, power: 16, cooldownSeconds: 0, preparationSeconds: 2, requiredSupports: 1, sortOrder: 10 },
    { id: 2, slug: 'influencer', name: 'Influenceur', description: 'Fait basculer l’opinion vite avec des contenus viraux.', imagePath: 'assets/classes/influencer.svg', icon: '📹', actionName: 'Vidéo virale', actionSlug: 'viral_video', actionType: 'influence', actionDescription: 'Une poussée d’influence rapide sur la place forte sélectionnée.', energyCost: 22, power: 20, cooldownSeconds: 0, preparationSeconds: 2, requiredSupports: 1, sortOrder: 20 },
    { id: 3, slug: 'expert', name: 'Expert', description: 'Renforce un camp avec une parole perçue comme crédible.', imagePath: 'assets/classes/expert.svg', icon: '🎙️', actionName: 'Plateau télé', actionSlug: 'tv_panel', actionType: 'support', actionDescription: 'Un soutien spécial qui restaure la place forte.', energyCost: 16, power: 15, cooldownSeconds: 0, preparationSeconds: 2, requiredSupports: 1, sortOrder: 30 }
  ],
  fortTemplates: [
    { name: 'CNC', x: -55, y: -28, base: 'socialdem', hp: 100 },
    { name: 'Syndicat Rouge', x: -72, y: -38, base: 'socialdem', hp: 100 },
    { name: 'Bastion Entrepreneurial', x: 70, y: -30, base: 'liberal', hp: 100 },
    { name: 'Préfecture Centrale', x: -38, y: 54, base: 'sovereignist', hp: 100 },
    { name: 'Université Militante', x: -28, y: -62, base: 'ecologist', hp: 100 },
    { name: 'Plateau Média', x: 10, y: 22, base: null, hp: 100 },
    { name: 'Marché National', x: 76, y: 8, base: 'conservative', hp: 100 },
    { name: 'Commune Verte', x: -78, y: -62, base: 'ecologist', hp: 100 },
    { name: 'Club Constitutionnel', x: 45, y: 54, base: 'conservative', hp: 100 },
    { name: 'Assemblée Nationale', x: -8, y: -6, base: 'socialdem', hp: 100 },
    { name: 'Sénat Conservateur', x: 34, y: 68, base: 'conservative', hp: 100 },
    { name: 'Place de la République', x: -60, y: 6, base: null, hp: 100 },
    { name: 'Ministère des Finances', x: 58, y: -2, base: 'liberal', hp: 100 },
    { name: 'Rond-point Populaire', x: -82, y: 36, base: 'sovereignist', hp: 100 }
  ]
};
