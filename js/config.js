/**
 * Global game configuration and seed data.
 */
window.PCWConfig = {
  storageKey: 'political_compass_war_v10_compact_forts_slow_bots',
  tickMs: 1000,
  maxInfluence: 100,
  maxHp: 100,
  moveFactor: 0.045,
  botIdeologyDrift: 0.75,
  botIdeologyDriftChance: 0.18,
  botActionChance: 0.34,
  projectileMinSpeed: 115,
  projectileMaxSpeed: 170,
  ideologies: [
    { id: 'liberal', name: 'Libéral', color: '#42d392', x: 72, y: -38, influencePower: 12, attackPower: 9, repairPower: 8, regen: 6 },
    { id: 'socialdem', name: 'Social-démocrate', color: '#ffb84d', x: -38, y: -34, influencePower: 11, attackPower: 7, repairPower: 11, regen: 6 },
    { id: 'ecologist', name: 'Écologiste', color: '#7bd957', x: -55, y: -56, influencePower: 10, attackPower: 7, repairPower: 12, regen: 6 },
    { id: 'conservative', name: 'Conservateur', color: '#579dff', x: 38, y: 42, influencePower: 10, attackPower: 10, repairPower: 8, regen: 6 },
    { id: 'sovereignist', name: 'Souverainiste', color: '#ff5d6c', x: -48, y: 58, influencePower: 9, attackPower: 12, repairPower: 7, regen: 6 },
    { id: 'libertarian', name: 'Libertarien', color: '#36dce8', x: 84, y: -68, influencePower: 13, attackPower: 9, repairPower: 7, regen: 6 }
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
  ],
  activeBotDefinitions: [
    { name: 'Camille', ideologyId: 'socialdem', mode: 'repair' },
    { name: 'Nora', ideologyId: 'sovereignist', mode: 'attack' },
    { name: 'Victor', ideologyId: 'libertarian', mode: 'influence' },
    { name: 'Manon', ideologyId: 'ecologist', mode: 'repair' },
    { name: 'Baptiste', ideologyId: 'liberal', mode: 'influence' },
    { name: 'Hugo', ideologyId: 'conservative', mode: 'attack' },
    { name: 'Sarah', ideologyId: 'socialdem', mode: 'influence' },
    { name: 'Mehdi', ideologyId: 'sovereignist', mode: 'attack' },
    { name: 'Claire', ideologyId: 'ecologist', mode: 'influence' },
    { name: 'Antoine', ideologyId: 'libertarian', mode: 'attack' },
    { name: 'Julie', ideologyId: 'liberal', mode: 'repair' },
    { name: 'Étienne', ideologyId: 'conservative', mode: 'repair' },
    { name: 'Inès', ideologyId: 'socialdem', mode: 'influence' },
    { name: 'Romain', ideologyId: 'sovereignist', mode: 'influence' },
    { name: 'Léa', ideologyId: 'ecologist', mode: 'repair' },
    { name: 'Maxime', ideologyId: 'liberal', mode: 'attack' },
    { name: 'Sofia', ideologyId: 'libertarian', mode: 'influence' },
    { name: 'Paul', ideologyId: 'conservative', mode: 'attack' },
    { name: 'Élise', ideologyId: 'socialdem', mode: 'repair' }
  ]
};
