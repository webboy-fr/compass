/**
 * Political Compass War V9.3.
 * Fixed ideological actors. One political action: Influence. Two structural actions: Attack / Repair.
 */
const STORAGE_KEY = 'political_compass_war_v9_3_no_win_multishot';
const TICK_MS = 1000;
const MAX_INFLUENCE = 100;
const MAX_HP = 100;
const MOVE_FACTOR = 0.045;
const PROJECTILE_MIN_SPEED = 115;
const PROJECTILE_MAX_SPEED = 170;

const ideologies = [
  { id: 'liberal', name: 'Libéral', color: '#42d392', x: 72, y: -38, influencePower: 12, attackPower: 9, repairPower: 8, regen: 6 },
  { id: 'socialdem', name: 'Social-démocrate', color: '#ffb84d', x: -38, y: -34, influencePower: 11, attackPower: 7, repairPower: 11, regen: 6 },
  { id: 'ecologist', name: 'Écologiste', color: '#7bd957', x: -55, y: -56, influencePower: 10, attackPower: 7, repairPower: 12, regen: 6 },
  { id: 'conservative', name: 'Conservateur', color: '#579dff', x: 38, y: 42, influencePower: 10, attackPower: 10, repairPower: 8, regen: 6 },
  { id: 'sovereignist', name: 'Souverainiste', color: '#ff5d6c', x: -48, y: 58, influencePower: 9, attackPower: 12, repairPower: 7, regen: 6 },
  { id: 'libertarian', name: 'Libertarien', color: '#36dce8', x: 84, y: -68, influencePower: 13, attackPower: 9, repairPower: 7, regen: 6 }
];

const fortTemplates = [
  { name: 'CNC', x: -55, y: -28, base: 'socialdem', hp: 100 },
  { name: 'Syndicat Rouge', x: -72, y: -38, base: 'socialdem', hp: 100 },
  { name: 'Bastion Entrepreneurial', x: 70, y: -30, base: 'liberal', hp: 100 },
  { name: 'Préfecture Centrale', x: -38, y: 54, base: 'sovereignist', hp: 100 },
  { name: 'Université Militante', x: -28, y: -62, base: 'ecologist', hp: 100 },
  { name: 'Plateau Média', x: 10, y: 22, base: null, hp: 100 },
  { name: 'Marché National', x: 76, y: 8, base: 'conservative', hp: 100 },
  { name: 'Commune Verte', x: -78, y: -62, base: 'ecologist', hp: 100 },
  { name: 'Club Constitutionnel', x: 45, y: 54, base: 'conservative', hp: 100 }
];

const mapEl = document.getElementById('map');
const layerEl = document.getElementById('entitiesLayer');
const projectilesLayerEl = document.getElementById('projectilesLayer');
const ideologyButtonsEl = document.getElementById('ideologyButtons');
const playerBadgeEl = document.getElementById('playerBadge');
const resetButtonEl = document.getElementById('resetButton');
const statusTextEl = document.getElementById('statusText');
const targetInfoEl = document.getElementById('targetInfo');
const eventLogEl = document.getElementById('eventLog');
const botInfoEl = document.getElementById('botInfo');
const fortActionPanelEl = document.getElementById('fortActionPanel');

let state = loadState();
let timer = null;
let animationFrame = null;
let lastAnimationTime = 0;

function createInitialState() {
  return {
    started: false,
    destructionModal: null,
    time: 0,
    selectedFortId: null,
    player: createEmptyPlayer(),
    forts: createForts(),
    passiveBots: generatePassiveBots(),
    activeBots: generateActiveBots(),
    projectiles: [],
    log: ['Choisis ton idéologie. Le temps avance déjà.'],
    notice: ''
  };
}

function createEmptyPlayer() {
  return { id: 'player', name: 'TOI', ideologyId: null, ideologyName: 'Non choisi', color: '#ffffff', x: 0, y: 0, energy: 0, influencePower: 0, attackPower: 0, repairPower: 0, regen: 0 };
}

function createForts() {
  return fortTemplates.map((template, index) => {
    const influence = {};
    if (template.base) {
      influence[template.base] = 60;
    }
    return { id: `fort_${index}`, name: template.name, x: template.x, y: template.y, baseIdeologyId: template.base, ownerIdeologyId: template.base, ownerActorId: null, hp: template.hp, maxHp: MAX_HP, influence };
  });
}

function generatePassiveBots() {
  const bots = [];
  for (let i = 0; i < 50; i += 1) {
    const ideology = ideologies[i % ideologies.length];
    bots.push({ id: `passive_${i}`, x: clamp(ideology.x + random(-22, 22), -95, 95), y: clamp(ideology.y + random(-22, 22), -95, 95), color: ideology.color });
  }
  return bots;
}

function generateActiveBots() {
  const definitions = [
    { name: 'Camille', ideologyId: 'socialdem', mode: 'repair' },
    { name: 'Nora', ideologyId: 'sovereignist', mode: 'attack' },
    { name: 'Victor', ideologyId: 'libertarian', mode: 'influence' }
  ];
  return definitions.map((definition, index) => {
    const ideology = getIdeology(definition.ideologyId);
    return { id: `active_bot_${index}`, name: definition.name, ideologyId: ideology.id, ideologyName: ideology.name, color: ideology.color, x: ideology.x, y: ideology.y, mode: definition.mode, cooldownMax: index + 2, cooldown: index + 1, targetFortId: null };
  });
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : createInitialState();
  } catch (error) {
    console.warn('Unable to load saved state.', error);
    return createInitialState();
  }
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function random(min, max) { return Math.random() * (max - min) + min; }
function getIdeology(id) { return ideologies.find((ideology) => ideology.id === id) || ideologies[0]; }
function getActor(actorId) { return actorId === 'player' ? state.player : state.activeBots.find((bot) => bot.id === actorId) || null; }
function getSelectedFort() { return state.forts.find((fort) => fort.id === state.selectedFortId) || null; }
function toPxX(x) { return ((x + 100) / 200) * mapEl.clientWidth; }
function toPxY(y) { return ((100 - y) / 200) * mapEl.clientHeight; }
function addLog(message) { state.log.unshift(`[${state.time}s] ${message}`); state.log = state.log.slice(0, 10); }
function setNotice(message) { state.notice = message; }

function renderIdeologyButtons() {
  ideologyButtonsEl.innerHTML = '';
  ideologies.forEach((ideology) => {
    const button = document.createElement('button');
    button.className = 'ideology-btn';
    button.innerHTML = `<span>${ideology.name}<br><small>Influence +${ideology.influencePower} pts · Attaque -${ideology.attackPower} PV · Réparation +${ideology.repairPower} PV</small></span><span class="ideology-chip" style="background:${ideology.color}"></span>`;
    button.addEventListener('click', () => chooseIdeology(ideology));
    ideologyButtonsEl.appendChild(button);
  });
}

function chooseIdeology(ideology) {
  state.started = true;
  state.selectedFortId = null;
  setNotice('');
  state.player = { id: 'player', name: 'TOI', ideologyId: ideology.id, ideologyName: ideology.name, color: ideology.color, x: ideology.x, y: ideology.y, energy: 45, influencePower: ideology.influencePower, attackPower: ideology.attackPower, repairPower: ideology.repairPower, regen: ideology.regen };
  addLog(`Tu joues ${ideology.name}. Ton point reste fixe.`);
  saveState();
  render();
}

function selectFort(fortId) {
  if (!state.started) return;
  state.selectedFortId = fortId;
  const fort = getSelectedFort();
  if (fort) addLog(`Place forte sélectionnée : ${fort.name}.`);
  saveState();
  render();
}

function sendPlayerAction(type) {
  const fort = getSelectedFort();
  if (!state.started) {
    setNotice('Choisis d’abord ton idéologie.');
    addLog('Action impossible : aucune idéologie choisie.');
    render();
    return;
  }
  if (!fort) {
    setNotice('Clique d’abord sur une place forte.');
    addLog('Action impossible : aucune place forte sélectionnée.');
    render();
    return;
  }
  const amount = getPlayerActionPower(type);
  if (state.player.energy < amount) {
    const missing = Math.ceil(amount - state.player.energy);
    const message = `Vous n’avez pas assez d’énergie : ${Math.round(state.player.energy)}/${amount} énergie. Il manque ${missing} énergie.`;
    setNotice(message);
    addLog(message);
    saveState();
    render();
    return;
  }
  state.player.energy = clamp(state.player.energy - amount, 0, 100);
  createProjectile('player', fort.id, type, amount);
  const message = `${getActionLabel(type)} envoyé vers ${fort.name} — coût ${amount} énergie.`;
  setNotice(message);
  addLog(message);
  saveState();
  render();
}

function getPlayerActionPower(type) {
  if (type === 'influence') return state.player.influencePower;
  if (type === 'attack') return state.player.attackPower;
  return state.player.repairPower;
}
function getActionLabel(type) { return type === 'influence' ? 'Influence' : type === 'attack' ? 'Attaque' : 'Réparation'; }

function createProjectile(actorId, fortId, type, amount) {
  const actor = getActor(actorId);
  const fort = state.forts.find((item) => item.id === fortId);
  if (!actor || !fort) return;

  // Store the current target coordinates as a fallback.
  // If the fort is destroyed before impact, the projectile still flies to that last known point and disappears.
  state.projectiles.push({
    id: `projectile_${Date.now()}_${Math.random()}`,
    actorId,
    ideologyId: actor.ideologyId,
    fortId,
    type,
    amount,
    x: actor.x,
    y: actor.y,
    targetX: fort.x,
    targetY: fort.y,
    speed: random(PROJECTILE_MIN_SPEED, PROJECTILE_MAX_SPEED)
  });
}

function updateProjectiles(deltaSeconds) {
  if (!state.projectiles.length) return false;
  let changed = false;
  const remaining = [];
  state.projectiles.forEach((projectile) => {
    const fort = state.forts.find((item) => item.id === projectile.fortId);
    const targetX = fort ? fort.x : projectile.targetX;
    const targetY = fort ? fort.y : projectile.targetY;
    const dx = targetX - projectile.x;
    const dy = targetY - projectile.y;
    const dist = Math.hypot(dx, dy);
    const step = projectile.speed * deltaSeconds;
    if (dist <= step || dist <= 1) {
      if (fort) {
        applyProjectile(projectile, fort);
      }
      changed = true;
      return;
    }
    projectile.x += (dx / dist) * step;
    projectile.y += (dy / dist) * step;
    remaining.push(projectile);
    changed = true;
  });
  state.projectiles = remaining;
  return changed;
}

function applyProjectile(projectile, fort) {
  const actor = getActor(projectile.actorId);
  if (!actor) return;
  if (projectile.type === 'influence') {
    applyInfluence(projectile, fort, actor);
  } else if (projectile.type === 'attack') {
    fort.hp = clamp(fort.hp - projectile.amount, 0, fort.maxHp);
    if (fort.hp <= 0) destroyFort(fort, actor);
  } else if (projectile.type === 'repair') {
    fort.hp = clamp(fort.hp + projectile.amount, 0, fort.maxHp);
  }
}

function applyInfluence(projectile, fort, actor) {
  fort.influence[projectile.ideologyId] = clamp((fort.influence[projectile.ideologyId] || 0) + projectile.amount, 0, MAX_INFLUENCE);
  moveFortTowardActor(fort, actor, projectile.amount);
  updateFortOwner(fort, actor);
}

function moveFortTowardActor(fort, actor, amount) {
  const ratio = clamp(MOVE_FACTOR * (amount / 10), 0.025, 0.09);
  fort.x = clamp(fort.x + (actor.x - fort.x) * ratio, -95, 95);
  fort.y = clamp(fort.y + (actor.y - fort.y) * ratio, -95, 95);
}

function destroyFort(fort, actor) {
  state.forts = state.forts.filter((item) => item.id !== fort.id);
  if (state.selectedFortId === fort.id) state.selectedFortId = null;
  state.destructionModal = { name: fort.name, actorName: actor.name };
  setNotice(`${fort.name} a été détruit.`);
  addLog(`💥 ${actor.name} détruit ${fort.name}.`);
}

function updateFortOwner(fort, actor) {
  const leader = getFortLeader(fort);
  if (!leader) return;
  const previousOwner = fort.ownerActorId;
  fort.ownerIdeologyId = leader.ideologyId;
  fort.ownerActorId = actor.id;
  if (actor.id === 'player' && previousOwner !== 'player') addLog(`🏰 Tu prends l’ascendant sur ${fort.name}.`);
}

function getFortLeader(fort) {
  const entries = Object.entries(fort.influence).filter(([, value]) => value > 0);
  if (!entries.length) return null;
  const [ideologyId, score] = entries.sort((a, b) => b[1] - a[1])[0];
  return { ideologyId, score };
}

function regeneratePlayerPoints() {
  if (!state.started) return;
  state.player.energy = clamp(state.player.energy + state.player.regen, 0, 100);
}

function playBots() {
  if (!state.started || !state.forts.length) return;
  state.activeBots.forEach((bot) => {
    bot.cooldown -= 1;
    if (bot.cooldown > 0) return;
    bot.cooldown = bot.cooldownMax;
    const target = chooseBotTarget(bot);
    if (!target) return;
    bot.targetFortId = target.id;
    const ideology = getIdeology(bot.ideologyId);
    let type = bot.mode;
    if (bot.mode === 'repair' && target.hp > 75) type = 'influence';
    if (bot.mode === 'attack' && target.ownerIdeologyId === bot.ideologyId) type = 'influence';
    const amount = type === 'influence' ? ideology.influencePower : type === 'attack' ? ideology.attackPower : ideology.repairPower;
    createProjectile(bot.id, target.id, type, amount);
  });
}

function chooseBotTarget(bot) {
  if (bot.mode === 'repair') {
    const damagedOwn = state.forts.filter((fort) => fort.ownerIdeologyId === bot.ideologyId && fort.hp < 95).sort((a,b) => a.hp - b.hp)[0];
    if (damagedOwn) return damagedOwn;
  }
  if (bot.mode === 'attack') {
    return state.forts.filter((fort) => fort.ownerIdeologyId !== bot.ideologyId).sort((a,b) => a.hp - b.hp)[0] || state.forts[0];
  }
  return state.forts.sort((a,b) => Math.hypot(bot.x-a.x, bot.y-a.y) - Math.hypot(bot.x-b.x, bot.y-b.y))[0] || null;
}

function fortNaturalDrift() {
  state.forts.forEach((fort) => {
    if (fort.baseIdeologyId) {
      fort.influence[fort.baseIdeologyId] = clamp((fort.influence[fort.baseIdeologyId] || 0) + 0.4, 0, MAX_INFLUENCE);
    }
  });
}

function tick() {
  state.time += 1;
  regeneratePlayerPoints();
  playBots();
  fortNaturalDrift();
  saveState();
  render();
}

function startLoop() { if (timer) clearInterval(timer); timer = setInterval(tick, TICK_MS); }
function startAnimationLoop() {
  if (animationFrame) cancelAnimationFrame(animationFrame);
  lastAnimationTime = performance.now();
  const animate = (now) => {
    const deltaSeconds = Math.min((now - lastAnimationTime) / 1000, 0.05);
    lastAnimationTime = now;
    if (updateProjectiles(deltaSeconds)) { saveState(); renderProjectiles(); renderFortsOnly(); }
    animationFrame = requestAnimationFrame(animate);
  };
  animationFrame = requestAnimationFrame(animate);
}

function countOwnedForts() { return state.forts.filter((fort) => fort.ownerActorId === 'player').length; }
function countBotForts(botId) { return state.forts.filter((fort) => fort.ownerActorId === botId).length; }
function getOwnerLabel(fort) {
  if (!fort.ownerIdeologyId) return 'neutre';
  if (fort.ownerActorId === 'player') return `toi (${state.player.ideologyName})`;
  const bot = state.activeBots.find((item) => item.id === fort.ownerActorId);
  if (bot) return `${bot.name} (${bot.ideologyName})`;
  return getIdeology(fort.ownerIdeologyId).name;
}
function getOwnerColor(fort) { return fort.ownerIdeologyId ? getIdeology(fort.ownerIdeologyId).color : 'rgba(255,255,255,.75)'; }
function resetGame() { localStorage.removeItem(STORAGE_KEY); state = createInitialState(); saveState(); render(); }

function render() {
  layerEl.innerHTML = '';
  projectilesLayerEl.innerHTML = '';
  renderPassiveBots(); renderActiveBots(); renderForts(); renderProjectiles(); renderPlayer(); renderPanels();
}
function renderPassiveBots() { state.passiveBots.forEach((bot) => { const el = document.createElement('div'); el.className = 'bot-token'; el.style.left = `${toPxX(bot.x)}px`; el.style.top = `${toPxY(bot.y)}px`; el.style.background = bot.color; layerEl.appendChild(el); }); }
function renderActiveBots() { state.activeBots.forEach((bot) => { const el = document.createElement('div'); el.className = 'active-bot-token'; el.style.left = `${toPxX(bot.x)}px`; el.style.top = `${toPxY(bot.y)}px`; el.style.background = bot.color; el.style.color = bot.color; el.title = `${bot.name} — ${bot.ideologyName}`; el.innerHTML = `<span>${bot.name}</span>`; layerEl.appendChild(el); }); }
function renderFortsOnly() { layerEl.querySelectorAll('.fort-token').forEach((el) => el.remove()); renderForts(); }
function renderForts() {
  state.forts.forEach((fort) => {
    const leader = getFortLeader(fort);
    const ownerColor = getOwnerColor(fort);
    const score = leader ? Math.round(leader.score) : 0;
    const hpPercent = Math.round((fort.hp / fort.maxHp) * 100);
    const el = document.createElement('button');
    el.className = 'fort-token';
    if (state.selectedFortId === fort.id) el.classList.add('selected');
    el.style.left = `${toPxX(fort.x)}px`;
    el.style.top = `${toPxY(fort.y)}px`;
    el.style.borderColor = ownerColor;
    el.style.background = fort.ownerIdeologyId ? `${ownerColor}44` : 'rgba(0,0,0,.48)';
    el.title = `${fort.name} — ${getOwnerLabel(fort)}`;
    el.innerHTML = `<span class="icon" aria-hidden="true">🏰</span><span class="influence-bar"><span style="width:${score}%; background:${ownerColor}"></span></span><span class="hp-bar"><span style="width:${hpPercent}%"></span></span><span class="fort-label">${score}/100 · ${hpPercent}❤️</span>`;
    el.addEventListener('click', () => selectFort(fort.id));
    const iconEl = el.querySelector('.icon');
    if (iconEl) {
      iconEl.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        selectFort(fort.id);
      });
    }
    layerEl.appendChild(el);
  });
}
function renderProjectiles() {
  projectilesLayerEl.innerHTML = '';
  state.projectiles.forEach((projectile) => { const ideology = getIdeology(projectile.ideologyId); const el = document.createElement('div'); el.className = `projectile-token ${projectile.type}`; el.style.left = `${toPxX(projectile.x)}px`; el.style.top = `${toPxY(projectile.y)}px`; el.style.color = ideology.color; projectilesLayerEl.appendChild(el); });
}
function renderPlayer() { const el = document.createElement('div'); el.className = 'player-token'; el.style.left = `${toPxX(state.player.x)}px`; el.style.top = `${toPxY(state.player.y)}px`; el.style.background = state.player.color; el.style.color = state.player.color; layerEl.appendChild(el); }

function renderFortActionPanel(selected) {
  if (!selected || !state.started) { fortActionPanelEl.classList.add('hidden'); fortActionPanelEl.innerHTML = ''; return; }
  fortActionPanelEl.classList.remove('hidden');
  fortActionPanelEl.innerHTML = `<button class="close-panel" type="button" data-action="close-panel">×</button><h3>${selected.name}</h3><p>Contrôle : <strong>${getOwnerLabel(selected)}</strong><br>Vie : <strong>${Math.round(selected.hp)}/${selected.maxHp} PV</strong><br>Énergie disponible : <strong>${Math.round(state.player.energy)}/100 énergie</strong><br>Régénération : <strong>+${state.player.regen} énergie/seconde</strong></p>${renderInfluenceList(selected)}<div class="mini-status">Les boutons restent cliquables : si l’énergie manque, un message clair s’affiche.</div><div class="panel-actions"><button class="primary ${state.player.energy < state.player.influencePower ? 'needs-energy' : ''}" type="button" data-action="influence-fort"><strong>Influencer</strong><small>Coût : ${state.player.influencePower} énergie · Effet : +${state.player.influencePower} points d’influence politique</small></button><button class="danger ${state.player.energy < state.player.attackPower ? 'needs-energy' : ''}" type="button" data-action="attack-fort"><strong>Attaquer</strong><small>Coût : ${state.player.attackPower} énergie · Effet : -${state.player.attackPower} PV structurels</small></button><button class="support ${state.player.energy < state.player.repairPower ? 'needs-energy' : ''}" type="button" data-action="repair-fort"><strong>Réparer</strong><small>Coût : ${state.player.repairPower} énergie · Effet : +${state.player.repairPower} PV structurels</small></button></div>`;
  positionFortActionPanel(selected);
}
function positionFortActionPanel(selected) {
  const mapPadding = 12;
  const anchorGap = 16;
  const anchorX = toPxX(selected.x);
  const anchorY = toPxY(selected.y);

  // Make sure the panel is measurable before final positioning.
  fortActionPanelEl.style.visibility = 'hidden';
  fortActionPanelEl.style.left = '0px';
  fortActionPanelEl.style.top = '0px';
  const panelWidth = fortActionPanelEl.offsetWidth;
  const panelHeight = fortActionPanelEl.offsetHeight;

  const minLeft = mapPadding;
  const maxLeft = Math.max(mapPadding, mapEl.clientWidth - panelWidth - mapPadding);
  const centeredLeft = anchorX - panelWidth / 2;
  const left = clamp(centeredLeft, minLeft, maxLeft);

  const spaceAbove = anchorY - mapPadding;
  const spaceBelow = mapEl.clientHeight - anchorY - mapPadding;
  const placeAbove = spaceAbove >= panelHeight + anchorGap || spaceAbove >= spaceBelow;
  const rawTop = placeAbove ? anchorY - panelHeight - anchorGap : anchorY + anchorGap;
  const top = clamp(rawTop, mapPadding, Math.max(mapPadding, mapEl.clientHeight - panelHeight - mapPadding));

  fortActionPanelEl.dataset.side = placeAbove ? 'top' : 'bottom';
  fortActionPanelEl.style.left = `${left}px`;
  fortActionPanelEl.style.top = `${top}px`;
  fortActionPanelEl.style.visibility = 'visible';
}
function renderInfluenceList(fort) {
  const entries = Object.entries(fort.influence).filter(([, score]) => score > 0).sort((a,b) => b[1] - a[1]).slice(0,4);
  if (!entries.length) return '<div class="influence-list">Aucune influence dominante.</div>';
  return `<div class="influence-list">${entries.map(([ideologyId, score]) => { const ideology = getIdeology(ideologyId); return `<div class="influence-row"><span class="influence-dot" style="background:${ideology.color}"></span><span>${ideology.name}</span><strong>${Math.round(score)} pts</strong></div>`; }).join('')}</div>`;
}
function handleFortActionClick(event) {
  const actionButton = event.target.closest('[data-action]');
  if (!actionButton || !fortActionPanelEl.contains(actionButton)) return;
  const action = actionButton.dataset.action;
  if (action === 'close-panel') { state.selectedFortId = null; setNotice(''); saveState(); render(); return; }
  if (action === 'influence-fort') sendPlayerAction('influence');
  if (action === 'attack-fort') sendPlayerAction('attack');
  if (action === 'repair-fort') sendPlayerAction('repair');
}
function renderPanels() {
  const selected = getSelectedFort();
  const owned = countOwnedForts();
  renderDestructionModal();
  playerBadgeEl.innerHTML = `<span class="player-dot-preview" style="background:${state.player.color}; color:${state.player.color}"></span><div><strong>${state.player.name}</strong><br><span>${state.player.ideologyName}</span></div>`;
  document.getElementById('attackStock').textContent = Math.round(state.player.energy);
  document.getElementById('defenseStock').textContent = state.started ? `+${state.player.regen}/s` : '+0/s';
  document.getElementById('ownedForts').textContent = `${owned}`;
  document.getElementById('gameTime').textContent = `${state.time}s`;
  if (state.notice) statusTextEl.textContent = state.notice;
  else if (!state.started) statusTextEl.textContent = 'Le chrono tourne. Choisis ton idéologie.';
  else if (!state.forts.length) statusTextEl.textContent = 'Toutes les places fortes ont été détruites.';
  else if (selected) statusTextEl.textContent = 'Place forte sélectionnée : influence, attaque ou réparation.';
  else statusTextEl.textContent = 'Clique sur une place forte pour agir.';
  renderFortActionPanel(selected);
  if (selected) targetInfoEl.innerHTML = `<strong>${selected.name}</strong><br>Contrôle : ${getOwnerLabel(selected)}<br>Vie : ${Math.round(selected.hp)}/${selected.maxHp} PV<br>${renderInfluenceList(selected)}<br>Influencer ajoute des points d’influence et la rapproche de ton point. Attaquer à 0 PV la supprime.`;
  else targetInfoEl.textContent = 'Aucune cible. Clique sur une place forte.';
  botInfoEl.innerHTML = state.activeBots.map((bot) => { const target = state.forts.find((fort) => fort.id === bot.targetFortId); return `<div class="bot-row"><span class="bot-chip" style="background:${bot.color}"></span><strong>${bot.name}</strong> — ${bot.ideologyName}<br><small>${countBotForts(bot.id)} fort(s), mode : ${bot.mode}, cible : ${target ? target.name : 'choix en cours'}</small></div>`; }).join('');
  eventLogEl.innerHTML = state.log.map((line) => `<div>${line}</div>`).join('');
}


function renderDestructionModal() {
  let modal = document.getElementById('destructionModal');
  if (!state.destructionModal) {
    if (modal) modal.remove();
    return;
  }

  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'destructionModal';
    modal.className = 'destruction-modal-backdrop';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="destruction-modal">
      <div class="destruction-icon">💥</div>
      <h2>${state.destructionModal.name} a été détruite</h2>
      <p>${state.destructionModal.actorName} l’a fait tomber à 0 PV. Les projectiles déjà envoyés vers cette place forte continuent leur trajectoire puis disparaissent.</p>
      <button type="button" data-action="close-destruction-modal">OK</button>
    </div>
  `;
}

function closeDestructionModal(event) {
  const button = event.target.closest('[data-action="close-destruction-modal"]');
  if (!button) return;
  state.destructionModal = null;
  saveState();
  renderPanels();
}

resetButtonEl.addEventListener('click', resetGame);
fortActionPanelEl.addEventListener('click', handleFortActionClick);
document.body.addEventListener('click', closeDestructionModal);
window.addEventListener('resize', render);
renderIdeologyButtons();
render();
startLoop();
startAnimationLoop();
