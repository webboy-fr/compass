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
      fortActionPanel: document.getElementById('fortActionPanel'),
      marketSlider: document.getElementById('marketSlider'),
      authoritySlider: document.getElementById('authoritySlider'),
      marketValue: document.getElementById('marketValue'),
      authorityValue: document.getElementById('authorityValue'),
      viewportInfo: document.getElementById('viewportInfo'),
      influenceChart: document.getElementById('influenceChart'),
      playerProfileButton: document.getElementById('playerProfileButton'),
      playerClassModal: document.getElementById('playerClassModal'),
      playerClassModalClose: document.getElementById('playerClassModalClose'),
      playerClassModalContent: document.getElementById('playerClassModalContent'),
      moveActionPanel: document.getElementById('moveActionPanel')
    };

    this.domCache = {
      forts: new Map(),
      projectiles: new Map(),
      destroyEffects: new Map(),
      player: null,
      humanPlayers: new Map()
    };
  }


  disposeTooltips(root = document) {
    if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
      root.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => {
        const existing = bootstrap.Tooltip.getInstance(el);
        if (existing) existing.dispose();
      });
    }

    // Bootstrap can leave the visible tooltip node during a render/dispose cycle.
    // Remove all generated tooltip nodes so they never stack on top of each other.
    document.querySelectorAll('.tooltip').forEach((tooltip) => tooltip.remove());
  }

  refreshTooltips(root = document) {
    if (typeof bootstrap === 'undefined' || !bootstrap.Tooltip) return;

    this.disposeTooltips(root);

    root.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => {
      const tooltip = new bootstrap.Tooltip(el, {
        html: true,
        trigger: 'hover',
        container: 'body',
        placement: el.dataset.bsPlacement || 'top'
      });

      // Make tooltip cleanup deterministic when the pointer leaves, when focus is lost,
      // or when a button is clicked and the panel is immediately re-rendered.
      const hide = () => tooltip.hide();
      el.addEventListener('mouseleave', hide, { passive: true });
      el.addEventListener('blur', hide, { passive: true });
      el.addEventListener('click', hide, { passive: true });
    });
  }

  resetDomCache() {
    this.elements.layer.innerHTML = '';
    this.elements.projectilesLayer.innerHTML = '';
    this.domCache.forts.clear();
    this.domCache.projectiles.clear();
    this.domCache.destroyEffects.clear();
    this.domCache.player = null;
    this.domCache.humanPlayers.clear();
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
      button.innerHTML = `<span>${ideology.name}<br><small>Influence +${ideology.influencePower} pts · Attaque -${ideology.attackPower} PV · Soutien +${ideology.supportPower} PV</small></span><span class="ideology-chip" style="background:${ideology.color}"></span>`;
      button.addEventListener('click', () => onChoose(ideology));
      this.elements.ideologyButtons.appendChild(button);
    });
  }

  render() {
    this.renderForts();
    this.renderDestroyEffects();
    this.renderProjectiles();
    this.renderHumanPlayers();
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
    const auraColor = leader ? this.state.getIdeology(leader.ideologyId).color : ownerColor;
    const score = leader ? Math.round(leader.score) : 0;
    const hpRatio = fort.maxHp > 0 ? PCWMath.clamp(fort.hp / fort.maxHp, 0, 1) : 0;
    const hpPercent = Math.round(hpRatio * 100);
    const auraSize = Math.round(18 + (hpRatio * 56));
    const auraOpacity = (0.18 + (hpRatio * 0.58)).toFixed(2);

    el.classList.toggle('selected', this.state.selectedFortId === fort.id);
    const preparedForFort = this.state.getPreparedActionsForFort ? this.state.getPreparedActionsForFort(fort.id) : [];
    el.classList.toggle('has-prepared-action', preparedForFort.length > 0);
    el.style.left = `${this.toPxX(fort.x)}px`;
    el.style.top = `${this.toPxY(fort.y)}px`;
    el.style.setProperty('--fort-bg', fort.ownerIdeologyId ? `${ownerColor}44` : 'rgba(0,0,0,.48)');
    el.title = preparedForFort.length ? `${fort.name} — ${preparedForFort.length} action(s) spéciale(s) en préparation` : `${fort.name} — ${this.getOwnerLabel(fort)}`;

    const core = el.querySelector('.fort-core');
    const name = el.querySelector('.fort-label strong');
    const hpText = el.querySelector('.fort-hp-text');
    const scoreText = el.querySelector('.fort-score-text');
    const influenceBar = el.querySelector('.influence-bar span');
    const hpBar = el.querySelector('.hp-bar span');

    core.style.setProperty('--owner-color', ownerColor);
    core.style.setProperty('--fort-aura-color', auraColor);
    core.style.setProperty('--fort-aura-size', `${auraSize}px`);
    core.style.setProperty('--fort-aura-opacity', auraOpacity);
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
        if (projectile.isSpecial && el.textContent !== (projectile.icon || '✨')) el.textContent = projectile.icon || '✨';
        else if (projectile.type === 'support' && !projectile.isSpecial && el.textContent !== '♥') el.textContent = '♥';
        else if (projectile.type !== 'support' && !projectile.isSpecial && el.textContent) el.textContent = '';
        el.classList.toggle('special', Boolean(projectile.isSpecial));
      },
      this.elements.projectilesLayer
    );
  }



  renderHumanPlayers() {
    const currentId = this.state.player?.id;
    const players = (this.state.humanPlayers || []).filter((player) => player.id !== currentId && player.ideologyId);
    this.syncCollection(
      this.domCache.humanPlayers,
      players,
      (player) => player.id,
      () => {
        const el = document.createElement('div');
        el.className = 'human-player-token';
        el.appendChild(document.createElement('span'));
        el.appendChild(document.createElement('b'));
        return el;
      },
      (el, player) => {
        el.style.left = `${this.toPxX(player.x)}px`;
        el.style.top = `${this.toPxY(player.y)}px`;
        el.style.background = player.color;
        el.style.color = player.color;
        const prepared = this.state.getPlayerPreparedAction ? this.state.getPlayerPreparedAction(player.id) : null;
        el.classList.toggle('has-prepared-action', Boolean(prepared));
        el.title = prepared ? `${player.name} prépare ${prepared.actionName} sur ${prepared.fortName}` : `${player.name} — ${player.ideologyName || 'joueur'}`;
        const label = el.querySelector('span');
        const badge = el.querySelector('b');
        if (label.textContent !== player.name) label.textContent = player.name;
        if (badge) badge.textContent = prepared ? (prepared.icon || '✨') : '';
      },
      this.elements.layer
    );
  }

  renderPlayer() {
    if (!this.domCache.player) {
      this.domCache.player = document.createElement('div');
      this.domCache.player.className = 'player-token';
      this.domCache.player.appendChild(document.createElement('span'));
      this.domCache.player.appendChild(document.createElement('b'));
      this.elements.layer.appendChild(this.domCache.player);
    }
    const el = this.domCache.player;
    el.style.left = `${this.toPxX(this.state.player.x)}px`;
    el.style.top = `${this.toPxY(this.state.player.y)}px`;
    el.style.background = this.state.player.color;
    el.style.color = this.state.player.color;
    const prepared = this.state.getPlayerPreparedAction ? this.state.getPlayerPreparedAction(this.state.player.id) : null;
    el.classList.toggle('has-prepared-action', Boolean(prepared));
    el.title = prepared ? `${this.state.player.name} prépare ${prepared.actionName} sur ${prepared.fortName}` : `${this.state.player.name} — ${this.state.player.ideologyName || 'joueur'}`;
    const label = el.querySelector('span');
    const badge = el.querySelector('b');
    if (label && label.textContent !== this.state.player.name) label.textContent = this.state.player.name;
    if (badge) badge.textContent = prepared ? (prepared.icon || '✨') : '';
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

  escapeAttr(value) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  getActionHelp(type, label, amount, cost) {
    const verb = type === 'attack' ? 'Retire' : type === 'support' ? 'Restaure' : 'Envoie';
    const unit = type === 'attack' ? 'PV' : type === 'support' ? 'PV de soutien' : 'points d’influence';
    return `${label} : ${verb} ${amount} ${unit}. Coût : ${cost} énergie.`;
  }

  getPreparedActionForCurrentPlayer() {
    return this.state.getPlayerPreparedAction ? this.state.getPlayerPreparedAction(this.state.player.id) : null;
  }

  getPreparedActionStatusLabel(action) {
    if (!action) return '';
    const supportCount = Array.isArray(action.supporters) ? action.supporters.length : 0;
    const required = Number(action.requiredSupports || 0);
    if (action.status === 'charging') {
      const remaining = Math.max(0, Math.ceil((Number(action.chargeEndsAt || 0) - Date.now()) / 1000));
      return `Chargement ${remaining}s`;
    }
    if (supportCount < required) return `Attente soutien ${supportCount}/${required}`;
    return 'Prêt à charger';
  }

  renderFortActionPanel(selected) {
    const panel = this.elements.fortActionPanel;
    if (!selected || !this.state.started) {
      this.disposeTooltips(panel);
      panel.classList.add('hidden');
      panel.innerHTML = '';
      return;
    }

    const special = this.state.player.getSpecialAction ? this.state.player.getSpecialAction() : null;
    const prepared = this.getPreparedActionForCurrentPlayer();
    const energy = Number(this.state.player.energy || 0);
    const baseButton = (type, action, cssClass, icon, letter, label, amount) => {
      const cost = Number(amount || 0);
      const title = this.escapeAttr(this.getActionHelp(type, label, amount, cost));
      return `<button data-bs-toggle="tooltip" data-bs-html="true" data-bs-title="${title}" class="${cssClass} ${energy < cost ? 'needs-energy' : ''}" type="button" data-action="${action}"><span class="action-icon">${icon}</span><strong>${letter}</strong><small>${label}<br><em>${cost} énergie</em></small></button>`;
    };
    const specialButton = (actionType) => {
      if (!special || special.actionType !== actionType) return '';
      const cost = Number(special.energyCost || special.power || 0);
      const power = Number(special.power || 0);
      const cssClass = this.getActionCssClass(actionType);
      const ownPrepared = prepared && prepared.actionSlug === special.actionSlug;
      const status = ownPrepared ? this.getPreparedActionStatusLabel(prepared) : 'Préparer';
      const isWaiting = !ownPrepared || prepared.status === 'waiting_support';
      const isCharging = ownPrepared && prepared.status === 'charging';
      const isReady = ownPrepared && prepared.status === 'ready';
      const disabledClass = isWaiting ? 'is-preparing' : '';
      const title = this.escapeAttr(`${special.actionName} : action spéciale ${this.getActionTypeLabel(actionType).toLowerCase()}. Puissance ${power}. Coût ${cost} énergie. Soutiens requis ${Number(special.requiredSupports ?? 1)}. Temps de chargement ${Number(special.preparationSeconds ?? special.cooldownSeconds ?? 1)}s.`);
      return `<button data-bs-toggle="tooltip" data-bs-html="true" data-bs-title="${title}" class="${cssClass} special-action ${disabledClass} ${isCharging ? 'is-charging' : ''} ${isReady ? 'is-ready' : ''} ${energy < cost ? 'needs-energy' : ''}" type="button" data-action="special-fort" data-special-action="${special.actionSlug}"><span class="action-icon">${special.icon || '✨'}</span><strong>${special.icon || '★'}</strong><small>${special.actionName}<br><em>${status}</em></small></button>`;
    };

    panel.classList.remove('hidden');
    this.disposeTooltips(panel);
    panel.innerHTML = `<div class="panel-actions sprite-actions" aria-label="Actions sur ${selected.name}">
      ${baseButton('influence', 'influence-fort', 'primary', '🤝', 'I', 'Influencer', this.state.player.influencePower)}
      ${specialButton('influence')}
      ${baseButton('attack', 'attack-fort', 'danger', '⚔', 'A', 'Attaquer', this.state.player.attackPower)}
      ${specialButton('attack')}
      ${baseButton('support', 'support-fort', 'support', '💚', 'S', 'Soutenir', this.state.player.supportPower)}
      ${specialButton('support')}
    </div>`;
    this.positionFortActionPanel(selected);
  }

  getActionCssClass(actionType) {
    if (actionType === 'attack') return 'danger';
    if (actionType === 'support') return 'support';
    return 'primary';
  }

  positionFortActionPanel(selected) {
    const panel = this.elements.fortActionPanel;
    const mapPadding = 0;
    const spriteHalfHeight = 26;
    const panelGap = 4;
    const anchorX = this.toPxX(selected.x);
    const anchorY = this.toPxY(selected.y);
    panel.style.visibility = 'hidden';
    panel.style.left = '0px';
    panel.style.top = '0px';
    const panelWidth = panel.offsetWidth;
    const panelHeight = panel.offsetHeight;
    const maxLeft = Math.max(mapPadding, this.elements.map.clientWidth - panelWidth - mapPadding);
    const left = PCWMath.clamp(anchorX - panelWidth / 2, mapPadding, maxLeft);
    const fortTop = anchorY - spriteHalfHeight;
    const fortBottom = anchorY + spriteHalfHeight;
    const spaceAbove = fortTop - mapPadding;
    const spaceBelow = this.elements.map.clientHeight - fortBottom - mapPadding;
    const placeAbove = spaceAbove >= panelHeight + panelGap || spaceAbove >= spaceBelow;
    const rawTop = placeAbove ? fortTop - panelHeight - panelGap : fortBottom + panelGap;
    const top = PCWMath.clamp(rawTop, mapPadding, Math.max(mapPadding, this.elements.map.clientHeight - panelHeight - mapPadding));
    panel.dataset.side = placeAbove ? 'top' : 'bottom';
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.visibility = 'visible';
  }


  openMoveActionPanel(x, y) {
    const panel = this.elements.moveActionPanel;
    if (!panel) return;

    panel.classList.remove('hidden');
    panel.style.left = `${this.toPxX(x)}px`;
    panel.style.top = `${this.toPxY(y)}px`;
    this.disposeTooltips(panel);
    panel.innerHTML = `<button class="move-button" type="button" data-action="move-player" data-x="${x}" data-y="${y}" data-bs-toggle="tooltip" data-bs-html="true" data-bs-title="<strong>Se déplacer</strong><br>Déplacement vers (${Math.round(x)}, ${Math.round(y)})<br>Vitesse : ${Math.round(this.state.player.moveSpeed || 10)}">🧭 Se déplacer</button>`;
    this.refreshTooltips();
  }

  closeMoveActionPanel() {
    const panel = this.elements.moveActionPanel;
    if (!panel) return;
    this.disposeTooltips(panel);
    panel.classList.add('hidden');
    panel.innerHTML = '';
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
    const playerClass = this.state.player.playerClass;
    const classLabel = playerClass ? `${playerClass.icon || '🎭'} ${playerClass.name}` : 'Classe non choisie';
    this.elements.playerBadge.innerHTML = `<span class="player-dot-preview" style="background:${this.state.player.color}; color:${this.state.player.color}"></span><div><strong>${this.state.player.name}</strong><br><span>${this.state.player.ideologyName}</span><br><small>${classLabel}</small></div>`;
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
    this.disposeTooltips(this.elements.targetInfo);
    if (selected) this.elements.targetInfo.innerHTML = `<strong>${selected.name}</strong><br>Contrôle : ${this.getOwnerLabel(selected)}<br>Vie : ${Math.round(selected.hp)}/${selected.maxHp} PV<br>${this.renderInfluenceList(selected)}${this.renderPreparedActionsForFort(selected)}<br>Influencer ajoute des points d’influence et la rapproche de ton point. Attaquer à 0 PV la supprime. Soutenir restaure sa vie.`;
    else this.elements.targetInfo.textContent = 'Aucune cible. Clique sur une place forte.';
    this.renderGlobalInfluenceChart();
    this.elements.eventLog.innerHTML = this.state.log.map((line) => `<div>${line}</div>`).join('');
    this.refreshTooltips();
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

  renderPreparedActionsForFort(fort) {
    const actions = this.state.getPreparedActionsForFort ? this.state.getPreparedActionsForFort(fort.id) : [];
    if (!actions.length) return '';
    return `<div class="prepared-actions-box"><strong>Actions spéciales en préparation</strong>${actions.map((action) => {
      const supportCount = Array.isArray(action.supporters) ? action.supporters.length : 0;
      const required = Number(action.requiredSupports || 0);
      const alreadySupported = Array.isArray(action.supporters) && action.supporters.some((supporter) => supporter.actorId === this.state.player.id);
      const isMine = action.actorId === this.state.player.id;
      const canSupport = !isMine && !alreadySupported && supportCount < required && action.status !== 'charging';
      const status = this.getPreparedActionStatusLabel(action);
      const button = canSupport ? `<button class="support-prepared-btn" type="button" data-action="support-prepared" data-prepared-action-id="${action.id}" data-bs-toggle="tooltip" data-bs-html="true" data-bs-title="<strong>${this.escapeAttr(action.actionName)}</strong><br>Soutenir ${this.escapeAttr(action.actorName)}">Soutenir</button>` : '';
      return `<div class="prepared-action-row"><span>${action.icon || '✨'}</span><div><b>${action.actionName}</b><small>${action.actorName} · ${status}</small></div>${button}</div>`;
    }).join('')}</div>`;
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


  renderPlayerClassModal() {
    if (!this.elements.playerClassModalContent) return;

    const playerClass = this.state.player.playerClass;
    const classes = this.config.playerClasses || [];
    const currentAction = playerClass ? `<div class="current-class-card"><div class="class-image">${playerClass.icon || '🎭'}</div><div><h3>${playerClass.name}</h3><p>${playerClass.description || ''}</p><strong>${playerClass.actionName}</strong><small>${this.getActionTypeLabel(playerClass.actionType)} · coût ${playerClass.energyCost} · puissance ${playerClass.power} · soutiens ${Number(playerClass.requiredSupports ?? 1)} · chargement ${Number(playerClass.preparationSeconds ?? playerClass.cooldownSeconds ?? 1)}s</small><button class="button subtle" type="button" data-action="reset-class">Réinitialiser la classe</button></div></div>` : '<p class="hint">Choisis une classe pour débloquer une action spéciale dans le panneau d’action des places fortes.</p>';

    const choices = classes.map((item) => `
      <button class="class-choice ${playerClass && playerClass.id === item.id ? 'selected' : ''} ${playerClass ? 'locked' : ''}" type="button" ${playerClass ? 'disabled' : ''} data-action="choose-class" data-class-id="${item.id}" title="${playerClass ? 'Classe verrouillée : réinitialise pour changer.' : 'Choisir cette classe.'}">
        <span class="class-choice-icon">${item.icon || '🎭'}</span>
        <span><strong>${item.name}</strong><small>${item.description || ''}<br>${item.actionName} · ${this.getActionTypeLabel(item.actionType)}</small></span>
      </button>
    `).join('');

    this.elements.playerClassModalContent.innerHTML = `
      <div class="player-modal-summary">
        <strong>${this.state.player.name}</strong>
        <span>${this.state.player.ideologyName}</span>
        <span>Énergie : ${Math.round(this.state.player.energy)}</span>
      </div>
      ${currentAction}
      <div class="class-choices">${choices}</div>
    `;
  }

  openPlayerClassModal() {
    if (!this.elements.playerClassModal) return;
    this.renderPlayerClassModal();
    this.elements.playerClassModal.classList.remove('hidden');
  }

  closePlayerClassModal() {
    if (!this.elements.playerClassModal) return;
    this.elements.playerClassModal.classList.add('hidden');
  }

  getActionTypeLabel(actionType) {
    if (actionType === 'attack') return 'Attaque';
    if (actionType === 'support') return 'Soutien';
    return 'Influence';
  }

  getOwnerLabel(fort) {
    if (!fort.ownerIdeologyId) return 'neutre';
    if (fort.ownerActorId === this.state.player.id || fort.ownerActorId === 'player') return `${this.state.player.name} (${this.state.player.ideologyName})`;
    const human = (this.state.humanPlayers || []).find((item) => item.id === fort.ownerActorId);
    if (human) return `${human.name} (${human.ideologyName})`;
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
