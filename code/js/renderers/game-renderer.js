/**
 * DOM renderer for the game.
 */
class PCWGameRenderer {
  constructor(state, simulation, config) {
    this.state = state;
    this.simulation = simulation;
    this.config = config;
    this.elements = {
      map: document.getElementById('map'),
      layer: document.getElementById('entitiesLayer'),
      projectilesLayer: document.getElementById('projectilesLayer'),
      ideologyButtons: document.getElementById('ideologyButtons'),
      playerBadge: document.getElementById('playerBadge'),
      resetButton: document.getElementById('resetButton'),
      statusText: document.getElementById('statusText'),
      targetInfo: document.getElementById('targetInfo'),
      eventLog: document.getElementById('eventLog'),
      botInfo: document.getElementById('botInfo'),
      fortActionPanel: document.getElementById('fortActionPanel')
    };
  }

  toPxX(x) {
    return ((x + 100) / 200) * this.elements.map.clientWidth;
  }

  toPxY(y) {
    return ((100 - y) / 200) * this.elements.map.clientHeight;
  }

  renderIdeologyButtons(onChoose) {
    this.elements.ideologyButtons.innerHTML = '';
    this.config.ideologies.forEach((ideology) => {
      const button = document.createElement('button');
      button.className = 'ideology-btn';
      button.innerHTML = `<span>${ideology.name}<br><small>Influence +${ideology.influencePower} pts · Attaque -${ideology.attackPower} PV · Réparation +${ideology.repairPower} PV</small></span><span class="ideology-chip" style="background:${ideology.color}"></span>`;
      button.addEventListener('click', () => onChoose(ideology));
      this.elements.ideologyButtons.appendChild(button);
    });
  }

  render() {
    this.elements.layer.innerHTML = '';
    this.elements.projectilesLayer.innerHTML = '';
    this.renderPassiveBots();
    this.renderActiveBots();
    this.renderForts();
    this.renderDestroyEffects();
    this.renderProjectiles();
    this.renderPlayer();
    this.renderPanels();
  }

  renderPassiveBots() {
    this.state.passiveBots.forEach((bot) => {
      const el = document.createElement('div');
      el.className = 'bot-token';
      el.style.left = `${this.toPxX(bot.x)}px`;
      el.style.top = `${this.toPxY(bot.y)}px`;
      el.style.background = bot.color;
      this.elements.layer.appendChild(el);
    });
  }

  renderActiveBots() {
    this.state.activeBots.forEach((bot) => {
      const el = document.createElement('div');
      el.className = 'active-bot-token';
      el.style.left = `${this.toPxX(bot.x)}px`;
      el.style.top = `${this.toPxY(bot.y)}px`;
      el.style.background = bot.color;
      el.style.color = bot.color;
      el.title = `${bot.name} — ${bot.ideologyName}`;
      el.innerHTML = `<span>${bot.name}</span>`;
      this.elements.layer.appendChild(el);
    });
  }

  renderFortsOnly() {
    this.elements.layer.querySelectorAll('.fort-token, .fort-destroy-effect').forEach((el) => el.remove());
    this.renderForts();
    this.renderDestroyEffects();
  }

  renderForts() {
    this.state.forts.forEach((fort) => {
      const leader = fort.getLeader();
      const ownerColor = this.getOwnerColor(fort);
      const score = leader ? Math.round(leader.score) : 0;
      const hpPercent = Math.round((fort.hp / fort.maxHp) * 100);
      const el = document.createElement('button');
      el.className = 'fort-token';
      if (this.state.selectedFortId === fort.id) el.classList.add('selected');
      el.style.left = `${this.toPxX(fort.x)}px`;
      el.style.top = `${this.toPxY(fort.y)}px`;
      el.style.setProperty('--fort-bg', fort.ownerIdeologyId ? `${ownerColor}44` : 'rgba(0,0,0,.48)');
      el.title = `${fort.name} — ${this.getOwnerLabel(fort)}`;
      el.innerHTML = `<span class="fort-core" style="border-color:${ownerColor}"><span class="icon" aria-hidden="true">🏰</span><span class="influence-bar"><span style="width:${score}%; background:${ownerColor}"></span></span><span class="hp-bar"><span style="width:${hpPercent}%"></span></span></span><span class="fort-label">${fort.name} · ${score}/100 · ${hpPercent}❤️</span>`;
      el.addEventListener('mouseenter', () => this.onSelectFort(fort.id));
      el.addEventListener('focus', () => this.onSelectFort(fort.id));
      el.addEventListener('click', () => this.onSelectFort(fort.id));
      this.elements.layer.appendChild(el);
    });
  }

  renderProjectiles() {
    this.elements.projectilesLayer.innerHTML = '';
    this.state.projectiles.forEach((projectile) => {
      const ideology = this.state.getIdeology(projectile.ideologyId);
      const el = document.createElement('div');
      el.className = `projectile-token ${projectile.type}`;
      el.style.left = `${this.toPxX(projectile.x)}px`;
      el.style.top = `${this.toPxY(projectile.y)}px`;
      el.style.color = ideology.color;
      this.elements.projectilesLayer.appendChild(el);
    });
  }

  renderPlayer() {
    const el = document.createElement('div');
    el.className = 'player-token';
    el.style.left = `${this.toPxX(this.state.player.x)}px`;
    el.style.top = `${this.toPxY(this.state.player.y)}px`;
    el.style.background = this.state.player.color;
    el.style.color = this.state.player.color;
    this.elements.layer.appendChild(el);
  }

  renderDestroyEffects() {
    this.simulation.pruneDestroyEffects();
    this.state.destroyEffects.forEach((effect) => {
      const el = document.createElement('div');
      el.className = 'fort-destroy-effect';
      el.style.left = `${this.toPxX(effect.x)}px`;
      el.style.top = `${this.toPxY(effect.y)}px`;
      el.innerHTML = '<span>💥</span>';
      this.elements.layer.appendChild(el);
    });
  }

  renderFortActionPanel(selected) {
    const panel = this.elements.fortActionPanel;
    if (!selected || !this.state.started) {
      panel.classList.add('hidden');
      panel.innerHTML = '';
      return;
    }
    panel.classList.remove('hidden');
    panel.innerHTML = `<h3>${selected.name}</h3><div class="panel-actions"><button title="Influencer" class="primary ${this.state.player.energy < this.state.player.influencePower ? 'needs-energy' : ''}" type="button" data-action="influence-fort"><strong>Influencer</strong><small>Coût : ${this.state.player.influencePower} énergie · Effet : +${this.state.player.influencePower} points d’influence politique</small></button><button title="Attaquer" class="danger ${this.state.player.energy < this.state.player.attackPower ? 'needs-energy' : ''}" type="button" data-action="attack-fort"><strong>Attaquer</strong><small>Coût : ${this.state.player.attackPower} énergie · Effet : -${this.state.player.attackPower} PV structurels</small></button><button title="Réparer" class="support ${this.state.player.energy < this.state.player.repairPower ? 'needs-energy' : ''}" type="button" data-action="repair-fort"><strong>Réparer</strong><small>Coût : ${this.state.player.repairPower} énergie · Effet : +${this.state.player.repairPower} PV structurels</small></button></div>`;
    this.positionFortActionPanel(selected);
  }

  positionFortActionPanel(selected) {
    const panel = this.elements.fortActionPanel;
    const mapPadding = 12;
    const anchorGap = 16;
    const anchorX = this.toPxX(selected.x);
    const anchorY = this.toPxY(selected.y);
    panel.style.visibility = 'hidden';
    panel.style.left = '0px';
    panel.style.top = '0px';
    const panelWidth = panel.offsetWidth;
    const panelHeight = panel.offsetHeight;
    const maxLeft = Math.max(mapPadding, this.elements.map.clientWidth - panelWidth - mapPadding);
    const left = PCWMath.clamp(anchorX - panelWidth / 2, mapPadding, maxLeft);
    const spaceAbove = anchorY - mapPadding;
    const spaceBelow = this.elements.map.clientHeight - anchorY - mapPadding;
    const placeAbove = spaceAbove >= panelHeight + anchorGap || spaceAbove >= spaceBelow;
    const rawTop = placeAbove ? anchorY - panelHeight - anchorGap : anchorY + anchorGap;
    const top = PCWMath.clamp(rawTop, mapPadding, Math.max(mapPadding, this.elements.map.clientHeight - panelHeight - mapPadding));
    panel.dataset.side = placeAbove ? 'top' : 'bottom';
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.visibility = 'visible';
  }

  renderPanels() {
    const selected = this.state.getSelectedFort();
    const owned = this.state.countOwnedForts();
    this.elements.playerBadge.innerHTML = `<span class="player-dot-preview" style="background:${this.state.player.color}; color:${this.state.player.color}"></span><div><strong>${this.state.player.name}</strong><br><span>${this.state.player.ideologyName}</span></div>`;
    document.getElementById('attackStock').textContent = Math.round(this.state.player.energy);
    document.getElementById('defenseStock').textContent = this.state.started ? `+${this.state.player.regen}/s` : '+0/s';
    document.getElementById('ownedForts').textContent = `${owned}`;
    document.getElementById('gameTime').textContent = `${this.state.time}s`;
    if (this.state.notice) this.elements.statusText.textContent = this.state.notice;
    else if (!this.state.started) this.elements.statusText.textContent = 'Le chrono tourne. Choisis ton idéologie.';
    else if (!this.state.forts.length) this.elements.statusText.textContent = 'Toutes les places fortes ont été détruites.';
    else if (selected) this.elements.statusText.textContent = 'Place forte survolée : utilise le mini-menu sur la carte.';
    else this.elements.statusText.textContent = 'Survole une place forte pour agir.';
    this.renderFortActionPanel(selected);
    if (selected) this.elements.targetInfo.innerHTML = `<strong>${selected.name}</strong><br>Contrôle : ${this.getOwnerLabel(selected)}<br>Vie : ${Math.round(selected.hp)}/${selected.maxHp} PV<br>${this.renderInfluenceList(selected)}<br>Influencer ajoute des points d’influence et la rapproche de ton point. Attaquer à 0 PV la supprime.`;
    else this.elements.targetInfo.textContent = 'Aucune cible. Survole une place forte.';
    this.elements.botInfo.innerHTML = this.state.activeBots.map((bot) => {
      const target = this.state.getFort(bot.targetFortId);
      return `<div class="bot-row"><span class="bot-chip" style="background:${bot.color}"></span><strong>${bot.name}</strong> — ${bot.ideologyName}<br><small>${this.state.countBotForts(bot.id)} fort(s), mode : ${bot.mode}, cible : ${target ? target.name : 'choix en cours'}</small></div>`;
    }).join('');
    this.elements.eventLog.innerHTML = this.state.log.map((line) => `<div>${line}</div>`).join('');
  }

  renderInfluenceList(fort) {
    const entries = Object.entries(fort.influence).filter(([, score]) => score > 0).sort((a, b) => b[1] - a[1]).slice(0, 4);
    if (!entries.length) return '<div class="influence-list">Aucune influence dominante.</div>';
    return `<div class="influence-list">${entries.map(([ideologyId, score]) => {
      const ideology = this.state.getIdeology(ideologyId);
      return `<div class="influence-row"><span class="influence-dot" style="background:${ideology.color}"></span><span>${ideology.name}</span><strong>${Math.round(score)} pts</strong></div>`;
    }).join('')}</div>`;
  }

  getOwnerLabel(fort) {
    if (!fort.ownerIdeologyId) return 'neutre';
    if (fort.ownerActorId === 'player') return `toi (${this.state.player.ideologyName})`;
    const bot = this.state.activeBots.find((item) => item.id === fort.ownerActorId);
    if (bot) return `${bot.name} (${bot.ideologyName})`;
    return this.state.getIdeology(fort.ownerIdeologyId).name;
  }

  getOwnerColor(fort) {
    return fort.ownerIdeologyId ? this.state.getIdeology(fort.ownerIdeologyId).color : 'rgba(255,255,255,.75)';
  }

  setSelectFortHandler(handler) {
    this.onSelectFort = handler;
  }
}

window.PCWGameRenderer = PCWGameRenderer;
