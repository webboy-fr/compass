/**
 * DOM renderer for the game.
 *
 * Important: map entities are created once and then updated in place.
 * This avoids sprite flicker caused by clearing/rebuilding the DOM every frame.
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
      pauseButton: document.getElementById('pauseButton'),
      statusText: document.getElementById('statusText'),
      targetInfo: document.getElementById('targetInfo'),
      eventLog: document.getElementById('eventLog'),
      botInfo: document.getElementById('botInfo'),
      fortActionPanel: document.getElementById('fortActionPanel'),
      marketSlider: document.getElementById('marketSlider'),
      authoritySlider: document.getElementById('authoritySlider'),
      marketValue: document.getElementById('marketValue'),
      authorityValue: document.getElementById('authorityValue'),
      viewportInfo: document.getElementById('viewportInfo'),
      influenceChart: document.getElementById('influenceChart')
    };

    this.domCache = {
      passiveBots: new Map(),
      activeBots: new Map(),
      forts: new Map(),
      projectiles: new Map(),
      destroyEffects: new Map(),
      player: null
    };
  }

  resetDomCache() {
    this.elements.layer.innerHTML = '';
    this.elements.projectilesLayer.innerHTML = '';
    this.domCache.passiveBots.clear();
    this.domCache.activeBots.clear();
    this.domCache.forts.clear();
    this.domCache.projectiles.clear();
    this.domCache.destroyEffects.clear();
    this.domCache.player = null;
  }

  getUserBounds() {
    return { left: -100, right: 100, top: 100, bottom: -100, span: 200, zoom: 1 };
  }

  toPxX(x) {
    const bounds = this.getUserBounds();
    return ((x - bounds.left) / bounds.span) * this.elements.map.clientWidth;
  }

  toPxY(y) {
    const bounds = this.getUserBounds();
    return ((bounds.top - y) / bounds.span) * this.elements.map.clientHeight;
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
    this.renderPassiveBots();
    this.renderActiveBots();
    this.renderForts();
    this.renderDestroyEffects();
    this.renderProjectiles();
    this.renderPlayer();
    this.renderPanels();
  }

  syncCollection(cache, items, getId, createElement, updateElement, parent) {
    const aliveIds = new Set();
    items.forEach((item) => {
      const id = String(getId(item));
      aliveIds.add(id);
      let el = cache.get(id);
      if (!el) {
        el = createElement(item);
        cache.set(id, el);
        parent.appendChild(el);
      }
      updateElement(el, item);
    });

    cache.forEach((el, id) => {
      if (!aliveIds.has(id)) {
        el.remove();
        cache.delete(id);
      }
    });
  }

  renderPassiveBots() {
    this.syncCollection(
      this.domCache.passiveBots,
      this.state.passiveBots,
      (bot) => bot.id,
      () => {
        const el = document.createElement('div');
        el.className = 'bot-token';
        return el;
      },
      (el, bot) => {
        el.style.left = `${this.toPxX(bot.x)}px`;
        el.style.top = `${this.toPxY(bot.y)}px`;
        el.style.background = bot.color;
      },
      this.elements.layer
    );
  }

  renderActiveBots() {
    this.syncCollection(
      this.domCache.activeBots,
      this.state.activeBots,
      (bot) => bot.id,
      () => {
        const el = document.createElement('div');
        el.className = 'active-bot-token';
        el.appendChild(document.createElement('span'));
        return el;
      },
      (el, bot) => {
        el.style.left = `${this.toPxX(bot.x)}px`;
        el.style.top = `${this.toPxY(bot.y)}px`;
        el.style.background = bot.color;
        el.style.color = bot.color;
        el.title = `${bot.name} — ${bot.ideologyName}`;
        const label = el.querySelector('span');
        if (label.textContent !== bot.name) label.textContent = bot.name;
      },
      this.elements.layer
    );
  }

  renderFortsOnly() {
    this.renderForts();
    this.renderDestroyEffects();
  }

  createFortElement(fort) {
    const el = document.createElement('button');
    el.className = 'fort-token';
    el.type = 'button';
    el.dataset.fortId = fort.id;
    el.innerHTML = `
      <span class="fort-core">
        <img class="fort-sprite" src="assets/fort-sprite.svg" alt="" aria-hidden="true">
        <span class="influence-bar"><span></span></span>
        <span class="hp-bar"><span></span></span>
      </span>
      <span class="fort-label">
        <strong></strong>
        <small><span class="heart">♥</span> <span class="fort-hp-text"></span> · <span class="fort-score-text"></span></small>
      </span>`;
    el.addEventListener('click', (event) => {
      event.stopPropagation();
      this.onSelectFort(fort.id);
    });
    return el;
  }

  updateFortElement(el, fort) {
    const leader = fort.getLeader();
    const ownerColor = this.getOwnerColor(fort);
    const score = leader ? Math.round(leader.score) : 0;
    const hpPercent = Math.round((fort.hp / fort.maxHp) * 100);

    el.classList.toggle('selected', this.state.selectedFortId === fort.id);
    el.style.left = `${this.toPxX(fort.x)}px`;
    el.style.top = `${this.toPxY(fort.y)}px`;
    el.style.setProperty('--fort-bg', fort.ownerIdeologyId ? `${ownerColor}44` : 'rgba(0,0,0,.48)');
    el.title = `${fort.name} — ${this.getOwnerLabel(fort)}`;

    const core = el.querySelector('.fort-core');
    const name = el.querySelector('.fort-label strong');
    const hpText = el.querySelector('.fort-hp-text');
    const scoreText = el.querySelector('.fort-score-text');
    const influenceBar = el.querySelector('.influence-bar span');
    const hpBar = el.querySelector('.hp-bar span');

    core.style.setProperty('--owner-color', ownerColor);
    if (name.textContent !== fort.name) name.textContent = fort.name;
    hpText.textContent = `${Math.round(fort.hp)}/${fort.maxHp}`;
    scoreText.textContent = `${score}`;
    influenceBar.style.width = `${score}%`;
    influenceBar.style.background = ownerColor;
    hpBar.style.width = `${hpPercent}%`;
  }

  renderForts() {
    this.syncCollection(
      this.domCache.forts,
      this.state.forts,
      (fort) => fort.id,
      (fort) => this.createFortElement(fort),
      (el, fort) => this.updateFortElement(el, fort),
      this.elements.layer
    );
  }

  renderProjectiles() {
    this.syncCollection(
      this.domCache.projectiles,
      this.state.projectiles,
      (projectile) => projectile.id,
      () => {
        const el = document.createElement('div');
        return el;
      },
      (el, projectile) => {
        const ideology = this.state.getIdeology(projectile.ideologyId);
        el.className = `projectile-token ${projectile.type}`;
        el.style.left = `${this.toPxX(projectile.x)}px`;
        el.style.top = `${this.toPxY(projectile.y)}px`;
        el.style.color = ideology.color;
        const targetFort = this.state.getFort(projectile.fortId);
        if (targetFort) {
          const angle = Math.atan2(
            this.toPxY(targetFort.y) - this.toPxY(projectile.y),
            this.toPxX(targetFort.x) - this.toPxX(projectile.x)
          );
          el.style.setProperty('--projectile-angle', `${angle}rad`);
        }
        el.setAttribute('aria-label', projectile.type);
        if (projectile.type === 'repair' && el.textContent !== '♥') el.textContent = '♥';
        if (projectile.type !== 'repair' && el.textContent) el.textContent = '';
      },
      this.elements.projectilesLayer
    );
  }

  renderPlayer() {
    if (!this.domCache.player) {
      this.domCache.player = document.createElement('div');
      this.domCache.player.className = 'player-token';
      this.elements.layer.appendChild(this.domCache.player);
    }
    const el = this.domCache.player;
    el.style.left = `${this.toPxX(this.state.player.x)}px`;
    el.style.top = `${this.toPxY(this.state.player.y)}px`;
    el.style.background = this.state.player.color;
    el.style.color = this.state.player.color;
  }

  renderDestroyEffects() {
    this.simulation.pruneDestroyEffects();
    this.syncCollection(
      this.domCache.destroyEffects,
      this.state.destroyEffects,
      (effect) => effect.id || `${effect.x}:${effect.y}:${effect.createdAt || effect.time || 0}`,
      () => {
        const el = document.createElement('div');
        el.className = 'fort-destroy-effect';
        el.innerHTML = '<span>💥</span>';
        return el;
      },
      (el, effect) => {
        el.style.left = `${this.toPxX(effect.x)}px`;
        el.style.top = `${this.toPxY(effect.y)}px`;
      },
      this.elements.layer
    );
  }

  renderFortActionPanel(selected) {
    const panel = this.elements.fortActionPanel;
    if (!selected || !this.state.started) {
      panel.classList.add('hidden');
      panel.innerHTML = '';
      return;
    }
    panel.classList.remove('hidden');
    panel.innerHTML = `<div class="panel-actions sprite-actions" aria-label="Actions sur ${selected.name}"><button title="Influencer" class="primary ${this.state.player.energy < this.state.player.influencePower ? 'needs-energy' : ''}" type="button" data-action="influence-fort"><span class="action-icon">🤝</span><strong>I</strong><small>Influencer</small></button><button title="Attaquer" class="danger ${this.state.player.energy < this.state.player.attackPower ? 'needs-energy' : ''}" type="button" data-action="attack-fort"><span class="action-icon">⚔</span><strong>A</strong><small>Attaquer</small></button><button title="Réparer" class="support ${this.state.player.energy < this.state.player.repairPower ? 'needs-energy' : ''}" type="button" data-action="repair-fort"><span class="action-icon">🔧</span><strong>R</strong><small>Réparer</small></button></div>`;
    this.positionFortActionPanel(selected);
  }

  positionFortActionPanel(selected) {
    const panel = this.elements.fortActionPanel;
    const mapPadding = 0;
    const anchorGap = 60;
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
    panel.style.left = `${left-30}px`;
    panel.style.top = `${top}px`;
    panel.style.visibility = 'visible';
  }

  renderPauseState() {
    const isPaused = Boolean(this.state.paused);
    document.body.classList.toggle('game-paused', isPaused);

    if (!this.elements.pauseButton) return;

    this.elements.pauseButton.classList.toggle('is-paused', isPaused);
    this.elements.pauseButton.textContent = isPaused ? '▶ Reprendre' : '⏸ Pause';
    this.elements.pauseButton.setAttribute('aria-pressed', isPaused ? 'true' : 'false');
  }

  renderPanels() {
    const selected = this.state.getSelectedFort();
    this.renderPauseState();
    const owned = this.state.countOwnedForts();
    this.elements.playerBadge.innerHTML = `<span class="player-dot-preview" style="background:${this.state.player.color}; color:${this.state.player.color}"></span><div><strong>${this.state.player.name}</strong><br><span>${this.state.player.ideologyName}</span></div>`;
    this.renderCompassControls();
    document.getElementById('attackStock').textContent = Math.round(this.state.player.energy);
    document.getElementById('defenseStock').textContent = this.state.started ? `+${this.state.player.regen}/s` : '+0/s';
    document.getElementById('ownedForts').textContent = `${owned}`;
    document.getElementById('gameTime').textContent = `${this.state.time}s`;
    if (this.state.notice) this.elements.statusText.textContent = this.state.notice;
    else if (!this.state.started) this.elements.statusText.textContent = 'Le chrono tourne. Choisis ton idéologie.';
    else if (!this.state.forts.length) this.elements.statusText.textContent = 'Toutes les places fortes ont été détruites.';
    else if (selected) this.elements.statusText.textContent = 'Place forte sélectionnée : utilise le mini-menu sur la carte.';
    else this.elements.statusText.textContent = 'Clique sur une place forte pour agir.';
    this.renderFortActionPanel(selected);
    if (selected) this.elements.targetInfo.innerHTML = `<strong>${selected.name}</strong><br>Contrôle : ${this.getOwnerLabel(selected)}<br>Vie : ${Math.round(selected.hp)}/${selected.maxHp} PV<br>${this.renderInfluenceList(selected)}<br>Influencer ajoute des points d’influence et la rapproche de ton point. Attaquer à 0 PV la supprime.`;
    else this.elements.targetInfo.textContent = 'Aucune cible. Clique sur une place forte.';
    this.renderGlobalInfluenceChart();
    this.elements.botInfo.innerHTML = this.state.activeBots.map((bot) => {
      const target = this.state.getFort(bot.targetFortId);
      return `<div class="bot-row"><span class="bot-chip" style="background:${bot.color}"></span><strong>${bot.name}</strong> — ${bot.ideologyName}<br><small>${this.state.countBotForts(bot.id)} fort(s), mode : ${bot.mode}, cible : ${target ? target.name : 'choix en cours'}</small></div>`;
    }).join('');
    this.elements.eventLog.innerHTML = this.state.log.map((line) => `<div>${line}</div>`).join('');
  }

  renderCompassControls() {
    const market = Math.round(this.state.player.market ?? this.state.player.x ?? 0);
    const authority = Math.round(this.state.player.authority ?? this.state.player.y ?? 0);
    this.elements.marketSlider.value = market;
    this.elements.authoritySlider.value = authority;
    this.elements.marketSlider.disabled = !this.state.started;
    this.elements.authoritySlider.disabled = !this.state.started;
    this.elements.marketValue.textContent = market > 0 ? `+${market}` : `${market}`;
    this.elements.authorityValue.textContent = authority > 0 ? `+${authority}` : `${authority}`;
    this.elements.viewportInfo.textContent = 'Les curseurs déplacent ton point sur la carte.';
  }

  renderInfluenceList(fort) {
    const entries = Object.entries(fort.influence).filter(([, score]) => score > 0).sort((a, b) => b[1] - a[1]).slice(0, 4);
    if (!entries.length) return '<div class="influence-list">Aucune influence dominante.</div>';
    return `<div class="influence-list">${entries.map(([ideologyId, score]) => {
      const ideology = this.state.getIdeology(ideologyId);
      return `<div class="influence-row"><span class="influence-dot" style="background:${ideology.color}"></span><span>${ideology.name}</span><strong>${Math.round(score)} pts</strong></div>`;
    }).join('')}</div>`;
  }

  renderGlobalInfluenceChart() {
    if (!this.elements.influenceChart) return;
    const totals = this.config.ideologies.map((ideology) => {
      const total = this.state.forts.reduce((sum, fort) => sum + (Number(fort.influence[ideology.id]) || 0), 0);
      return { ideology, total };
    }).filter((entry) => entry.total > 0).sort((a, b) => b.total - a.total);

    if (!totals.length) {
      this.elements.influenceChart.innerHTML = '<div class="empty-chart">Aucune influence active.</div>';
      return;
    }

    const max = Math.max(...totals.map((entry) => entry.total), 1);
    this.elements.influenceChart.innerHTML = totals.map((entry) => {
      const width = Math.max(4, Math.round((entry.total / max) * 100));
      return `<div class="influence-chart-row"><div class="influence-chart-head"><span><i style="background:${entry.ideology.color}"></i>${entry.ideology.name}</span><strong>${Math.round(entry.total)}</strong></div><div class="influence-chart-track"><span style="width:${width}%; background:${entry.ideology.color}"></span></div></div>`;
    }).join('');
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
