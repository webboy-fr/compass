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
      moveActionPanel: document.getElementById('moveActionPanel'),
      mapWorld: document.getElementById('mapWorld'),
      osmMap: document.getElementById('osmMap'),
      createFortButton: document.getElementById('createFortButton'),
      createFortModal: document.getElementById('createFortModal'),
      createFortModalClose: document.getElementById('createFortModalClose'),
      createFortForm: document.getElementById('createFortForm'),
      createFortName: document.getElementById('createFortName'),
      createFortX: document.getElementById('createFortX'),
      createFortY: document.getElementById('createFortY'),
      createFortMessage: document.getElementById('createFortMessage')
    };

    this.domCache = {
      forts: new Map(),
      projectiles: new Map(),
      destroyEffects: new Map(),
      player: null,
      humanPlayers: new Map(),
      bots: new Map()
    };

    this.isPlayerClassModalRequired = false;
    this.mapTransform = { scale: 1, x: 0, y: 0 };
    this.isCreateFortMode = false;
    this.usingLeaflet = false;
    this.osmMap = null;
    this.initOsmMap();
    this.applyMapTransform();
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
    this.domCache.bots.clear();
  }

  getUserBounds() {
    return { left: 0, right: 100, top: 0, bottom: 100, span: 100, zoom: this.mapTransform.scale };
  }


  initOsmMap() {
    if (this.config.mapMode !== 'osm' || !this.elements.osmMap || typeof L === 'undefined') {
      return;
    }

    this.usingLeaflet = true;

    // Leaflet must be the only component in charge of tile projection, pan and zoom.
    // Game tokens are regular HTML overlays positioned from lat/lng after every map move.
    this.elements.map?.classList.add('osm-ready');
    this.elements.osmMap.innerHTML = '';

    const franceBounds = L.latLngBounds(
      this.config.osmFranceBounds || [[41.0, -5.8], [51.6, 10.2]]
    );
    const outerBounds = L.latLngBounds(
      this.config.osmMaxBounds || [[39.0, -8.5], [53.8, 12.8]]
    );

    this.osmMap = L.map(this.elements.osmMap, {
      center: this.config.osmDefaultCenter || [46.65, 2.45],
      zoom: Number(this.config.osmDefaultZoom || 6),
      minZoom: Number(this.config.osmMinZoom || 5),
      maxZoom: Number(this.config.osmMaxZoom || 18),
      maxBounds: outerBounds,
      maxBoundsViscosity: 0.75,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 95,
      markerZoomAnimation: false,
      zoomControl: true,
      attributionControl: true,
      preferCanvas: false,
      worldCopyJump: false
    });

    L.tileLayer(this.config.osmTileUrl || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      minZoom: Number(this.config.osmMinZoom || 5),
      maxZoom: Number(this.config.osmMaxZoom || 18),
      tileSize: 256,
      updateWhenIdle: false,
      updateWhenZooming: true,
      keepBuffer: 4,
      crossOrigin: true,
      attribution: this.config.osmAttribution || '&copy; OpenStreetMap contributors'
    }).addTo(this.osmMap);

    this.osmMap.fitBounds(franceBounds, { padding: [28, 28], animate: false });

    // Fix the classic broken-tile-grid symptom: if the container is measured too early,
    // Leaflet places tiles in apparently random squares. Recompute after layout settles.
    const refresh = () => {
      if (!this.osmMap) return;
      this.osmMap.invalidateSize({ animate: false, pan: false });
      this.renderMapEntitiesOnly();
    };

    this.osmMap.whenReady(() => {
      refresh();
      window.setTimeout(refresh, 80);
      window.setTimeout(refresh, 300);
    });
    const markMoving = () => this.elements.map?.classList.add('osm-map-moving');
    const markStable = () => {
      this.elements.map?.classList.remove('osm-map-moving');
      this.renderMapEntitiesOnly();
    };

    this.osmMap.on('zoomstart movestart', markMoving);
    this.osmMap.on('zoom move resize viewreset tileload', () => this.renderMapEntitiesOnly());
    this.osmMap.on('zoomend moveend', markStable);
  }

  renderMapEntitiesOnly() {
    if (!this.state) return;
    this.renderFortsOnly();
    this.renderProjectiles();
    this.renderBots();
    this.renderHumanPlayers();
    this.renderPlayer();
    this.renderPanels();
  }

  applyMapTransform() {
    if (this.usingLeaflet) return;
    if (!this.elements.mapWorld) return;
    const t = this.mapTransform;
    this.elements.mapWorld.style.transform = `translate3d(${t.x}px, ${t.y}px, 0) scale(${t.scale})`;
  }

  getClampedMapTransform(transform) {
    const map = this.elements.map;
    const width = map ? map.clientWidth : 0;
    const height = map ? map.clientHeight : 0;
    const scale = PCWMath.clamp(Number(transform.scale || 1), 1, 14);
    const requestedX = Number(transform.x || 0);
    const requestedY = Number(transform.y || 0);

    if (!width || !height || scale <= 1) {
      return { scale, x: 0, y: 0 };
    }

    // Keep the vector map inside the viewport while still allowing smooth pan.
    const minX = width - (width * scale);
    const minY = height - (height * scale);

    return {
      scale,
      x: PCWMath.clamp(requestedX, minX, 0),
      y: PCWMath.clamp(requestedY, minY, 0)
    };
  }

  setMapTransform(transform) {
    if (this.usingLeaflet) {
      this.renderMapEntitiesOnly();
      return;
    }
    this.mapTransform = this.getClampedMapTransform(transform);
    this.applyMapTransform();
    this.renderPanels();
  }

  toLatLng(x, y) {
    return [Number(y), Number(x)];
  }

  toPxX(x, y = null) {
    if (this.usingLeaflet && this.osmMap) {
      const lat = y === null ? 46.65 : Number(y);
      return this.osmMap.latLngToContainerPoint([lat, Number(x)]).x;
    }
    return (PCWMath.clamp(Number(x), 0, 100) / 100) * this.elements.map.clientWidth;
  }

  toPxY(y, x = null) {
    if (this.usingLeaflet && this.osmMap) {
      const lon = x === null ? 2.45 : Number(x);
      return this.osmMap.latLngToContainerPoint([Number(y), lon]).y;
    }
    return (PCWMath.clamp(Number(y), 0, 100) / 100) * this.elements.map.clientHeight;
  }

  toScreenX(x, y = null) {
    if (this.usingLeaflet && this.osmMap) {
      return this.osmMap.latLngToContainerPoint([Number(y), Number(x)]).x;
    }
    return (this.toPxX(x) * this.mapTransform.scale) + this.mapTransform.x;
  }

  toScreenY(y, x = null) {
    if (this.usingLeaflet && this.osmMap) {
      return this.osmMap.latLngToContainerPoint([Number(y), Number(x)]).y;
    }
    return (this.toPxY(y) * this.mapTransform.scale) + this.mapTransform.y;
  }

  clientPointToMapPercent(clientX, clientY) {
    if (this.usingLeaflet && this.osmMap) {
      const rect = this.elements.map.getBoundingClientRect();
      const latLng = this.osmMap.containerPointToLatLng([clientX - rect.left, clientY - rect.top]);
      return {
        x: Number(latLng.lng.toFixed(6)),
        y: Number(latLng.lat.toFixed(6))
      };
    }
    const rect = this.elements.map.getBoundingClientRect();
    const t = this.mapTransform;
    const localX = (clientX - rect.left - t.x) / t.scale;
    const localY = (clientY - rect.top - t.y) / t.scale;
    return {
      x: PCWMath.clamp((localX / rect.width) * 100, 0, 100),
      y: PCWMath.clamp((localY / rect.height) * 100, 0, 100)
    };
  }


  setCreateFortMode(enabled) {
    this.isCreateFortMode = Boolean(enabled);
    this.elements.map?.classList.toggle('create-fort-mode', this.isCreateFortMode);
    if (this.elements.createFortButton) {
      this.elements.createFortButton.classList.toggle('is-active', this.isCreateFortMode);
      this.elements.createFortButton.textContent = this.isCreateFortMode ? '📍 Clique sur la carte' : '➕ Créer un bastion';
    }
  }

  openCreateFortModal(x, y) {
    if (!this.elements.createFortModal) return;
    this.elements.createFortX.value = String(Number(x).toFixed(6));
    this.elements.createFortY.value = String(Number(y).toFixed(6));
    this.elements.createFortName.value = '';
    this.elements.createFortMessage.textContent = '';
    this.elements.createFortModal.classList.remove('hidden');
    this.elements.createFortName.focus();
  }

  closeCreateFortModal() {
    if (!this.elements.createFortModal) return;
    this.elements.createFortModal.classList.add('hidden');
    this.elements.createFortMessage.textContent = '';
  }

  renderIdeologyButtons(onChoose) {
    // The legacy ideology chooser can be removed from the UI.
    if (!this.elements.ideologyButtons) {
      return;
    }

    this.elements.ideologyButtons.innerHTML = '';
    this.config.ideologies.forEach((ideology) => {
      const button = document.createElement('button');
      button.className = 'ideology-btn';
      button.innerHTML = `<span>${ideology.name}<br><small>Actions : 1 point dépensé = +1 influence</small></span><span class="ideology-chip" style="background:${ideology.color}"></span>`;
      button.addEventListener('click', () => onChoose(ideology));
      this.elements.ideologyButtons.appendChild(button);
    });
  }

  render() {
    this.renderForts();
    this.renderDestroyEffects();
    this.renderProjectiles();
    this.renderBots();
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
    const totalInfluence = this.getFortTotalInfluence(fort);
    const totalPower = this.getFortTotalPower(fort);
    const powerRatio = PCWMath.clamp(Math.max(0, totalPower) / 160, 0, 1);
    const leaderRatio = totalInfluence > 0 ? PCWMath.clamp(score / totalInfluence, 0, 1) : 0;
    const influencePercent = Math.round(leaderRatio * 100);
    const auraSize = totalPower > 0 ? Math.round(18 + (powerRatio * 72)) : 0;
    const auraOpacity = totalPower > 0 ? (0.12 + (powerRatio * 0.62)).toFixed(2) : '0';

    el.classList.toggle('selected', this.state.selectedFortId === fort.id);
    el.dataset.category = fort.category || 'default';
    const preparedForFort = this.state.getPreparedActionsForFort ? this.state.getPreparedActionsForFort(fort.id) : [];
    el.classList.toggle('has-prepared-action', preparedForFort.length > 0);
    el.style.left = `${this.toScreenX(fort.x, fort.y)}px`;
    el.style.top = `${this.toScreenY(fort.y, fort.x)}px`;
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
    hpText.textContent = `${totalPower} pouvoir`;
    scoreText.textContent = `${score}`;
    influenceBar.style.width = `${influencePercent}%`;
    influenceBar.style.background = ownerColor;
    hpBar.style.width = `${Math.round(powerRatio * 100)}%`;
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
        el.style.left = `${this.toScreenX(projectile.x, projectile.y)}px`;
        el.style.top = `${this.toScreenY(projectile.y, projectile.x)}px`;
        el.style.color = ideology.color;
        const targetFort = this.state.getFort(projectile.fortId);
        if (targetFort) {
          const angle = Math.atan2(
            this.toScreenY(targetFort.y, targetFort.x) - this.toScreenY(projectile.y, projectile.x),
            this.toScreenX(targetFort.x, targetFort.y) - this.toScreenX(projectile.x, projectile.y)
          );
          el.style.setProperty('--projectile-angle', `${angle}rad`);
        }
        el.setAttribute('aria-label', projectile.type);
        if (projectile.isSpecial && el.textContent !== (projectile.icon || '✨')) el.textContent = projectile.icon || '✨';
        else if (projectile.type === 'power_up' && el.textContent !== '+') el.textContent = '+';
        else if (projectile.type === 'power_down' && el.textContent !== '−') el.textContent = '−';
        else if (projectile.type === 'influence' && el.textContent) el.textContent = '';
        el.classList.toggle('special', Boolean(projectile.isSpecial));
      },
      this.elements.projectilesLayer
    );
  }



  renderHumanPlayers() {
    const currentId = this.state.player?.id;
    const hasProfile = (player) => {
      const weights = player?.ideologyWeights || {};
      const total = Object.values(weights).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
      return Boolean(player?.ideologyId || total > 0);
    };
    const players = (this.state.humanPlayers || []).filter((player) => player.id !== currentId && hasProfile(player));
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
        el.style.left = `${this.toScreenX(player.x, player.y)}px`;
        el.style.top = `${this.toScreenY(player.y, player.x)}px`;
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

  renderBots() {
    const bots = this.state.bots || [];
    this.syncCollection(
      this.domCache.bots,
      bots,
      (bot) => bot.id,
      () => {
        const el = document.createElement('div');
        el.className = 'bot-token';
        el.appendChild(document.createElement('span'));
        return el;
      },
      (el, bot) => {
        el.style.left = `${this.toScreenX(bot.x, bot.y)}px`;
        el.style.top = `${this.toScreenY(bot.y, bot.x)}px`;
        el.style.background = bot.color;
        el.style.color = bot.color;
        el.title = `${bot.name} — ${bot.ideologyName || 'bot'}`;
        const label = el.querySelector('span');
        if (label && label.textContent !== bot.name) label.textContent = bot.name;
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
    el.style.left = `${this.toScreenX(this.state.player.x, this.state.player.y)}px`;
    el.style.top = `${this.toScreenY(this.state.player.y, this.state.player.x)}px`;
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
        el.style.left = `${this.toScreenX(effect.x, effect.y)}px`;
        el.style.top = `${this.toScreenY(effect.y, effect.x)}px`;
      },
      this.elements.layer
    );
  }

  escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  escapeAttr(value) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  getActionHelp(type, label, amount, cost) {
    if (type === 'influence') {
      const total = Object.values(this.state.player?.ideologyWeights || {}).reduce((sum, value) => sum + Math.max(0, Math.round(Number(value) || 0)), 0);
      return `${label} : envoie ton profil complet (${total || amount} point(s) répartis par idéologie) sur ce bastion. Coût : ${cost} énergie.`;
    }
    if (type === 'power_up') {
      return `${label} : ajoute ${amount} point de pouvoir positif au bastion. Coût : ${cost} énergie.`;
    }
    if (type === 'power_down') {
      return `${label} : ajoute ${amount} point d’anti-pouvoir et diminue le pouvoir total du bastion. Coût : ${cost} énergie.`;
    }
    return `${label} : coût ${cost} énergie.`;
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

    const energy = Number(this.state.player.energy || 0);
    const baseButton = (type, action, cssClass, icon, letter, label, amount) => {
      const cost = Number(amount || 0);
      const title = this.escapeAttr(this.getActionHelp(type, label, amount, cost));
      return `<button data-bs-toggle="tooltip" data-bs-html="true" data-bs-title="${title}" class="${cssClass} ${energy < cost ? 'needs-energy' : ''}" type="button" data-action="${action}"><span class="action-icon">${icon}</span><strong>${letter}</strong><small>${label}<br><em>${cost} énergie</em></small></button>`;
    };

    panel.classList.remove('hidden');
    this.disposeTooltips(panel);
    panel.innerHTML = `<div class="panel-actions sprite-actions" aria-label="Actions sur ${this.escapeAttr(selected.name)}">
      ${baseButton('influence', 'influence-fort', 'primary', '🤝', 'I', 'Influencer', 1)}
      ${baseButton('power_up', 'power-up-fort', 'support', '⚡', '+', 'Pouvoir +', 1)}
      ${baseButton('power_down', 'power-down-fort', 'danger', '⌁', '−', 'Pouvoir −', 1)}
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
    const anchorX = this.toScreenX(selected.x, selected.y);
    const anchorY = this.toScreenY(selected.y, selected.x);
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
    panel.style.left = `${this.toScreenX(x)}px`;
    panel.style.top = `${this.toScreenY(y)}px`;
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



  renderPlayerIdeologyBreakdown(player = this.state.player, options = {}) {
    const weights = player?.ideologyWeights || {};
    const entries = Object.entries(weights)
      .map(([ideologyId, score]) => ({ ideology: this.state.getIdeology(ideologyId), score: Math.max(0, Math.round(Number(score) || 0)) }))
      .filter((entry) => entry.ideology && entry.score > 0)
      .sort((a, b) => b.score - a.score);

    if (!entries.length) {
      return '<div class="player-ideology-breakdown empty">Aucune idéologie sélectionnée.</div>';
    }

    const compact = options.compact ? ' compact' : '';
    return `<div class="player-ideology-breakdown${compact}">${entries.map((entry) => `<div class="player-ideology-row" style="--ideology-color:${entry.ideology.color}"><span><i></i>${this.escapeHtml(entry.ideology.name)}</span><strong>${entry.score}</strong></div>`).join('')}</div>`;
  }

  formatUtcClock(value) {
    const timestamp = Number(value || Date.now());
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return '--:--:-- UTC';
    }

    return `${date.toISOString().slice(11, 19)} UTC`;
  }

  renderPanels() {
    const selected = this.state.getSelectedFort();
    this.renderPauseState();
    const owned = this.state.countOwnedForts();
    const playerClass = this.state.player.playerClass;
    const classLabel = playerClass ? `${playerClass.icon || '🎭'} ${playerClass.name}` : 'Profil actif';
    this.elements.playerBadge.innerHTML = `<span class="player-dot-preview" style="background:${this.state.player.color}; color:${this.state.player.color}"></span><div><strong>${this.escapeHtml(this.state.player.name)}</strong><br><span>${this.escapeHtml(this.state.player.ideologyName)}</span><br><small>${classLabel}</small>${this.renderPlayerIdeologyBreakdown(this.state.player, { compact: true })}</div>`;
    this.renderCompassControls();
    document.getElementById('attackStock').textContent = Math.round(this.state.player.energy);
    document.getElementById('defenseStock').textContent = this.state.started ? `+${this.state.player.regen}/s` : '+0/s';
    document.getElementById('ownedForts').textContent = `${owned}`;
    document.getElementById('gameTime').textContent = this.formatUtcClock(this.state.utcTimeMs || (Number(this.state.time || 0) * 1000));
    if (this.state.notice) this.elements.statusText.textContent = this.state.notice;
    else if (!this.state.started) this.elements.statusText.textContent = 'Le chrono tourne. Choisis ton idéologie.';
    else if (!this.state.forts.length) this.elements.statusText.textContent = 'Aucune place forte disponible.';
    else if (selected) this.elements.statusText.textContent = 'Place forte sélectionnée : utilise le mini-menu sur la carte.';
    else this.elements.statusText.textContent = 'Clique sur une place forte pour agir.';
    this.renderFortActionPanel(selected);
    this.disposeTooltips(this.elements.targetInfo);
    if (selected) this.elements.targetInfo.innerHTML = `<strong>${this.escapeHtml(selected.name)}</strong><br>Contrôle idéologique : ${this.getOwnerLabel(selected)}<br>Pouvoir total : ${this.getFortTotalPower(selected)} point(s)<br><small>Pouvoir + ${Math.round(Number(selected.positivePower || 0))} · anti-pouvoir ${Math.round(Number(selected.negativePower || 0))}</small><br>Influence totale : ${this.getFortTotalInfluence(selected)} point(s)<br>${this.renderInfluenceList(selected)}<br>Chaque action coûte 1 point. Influence envoie tout ton profil idéologique ; Pouvoir + renforce ; Pouvoir − affaiblit.`;
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
    return '';
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
    const ideologies = this.config.ideologies || [];
    const weights = this.state.player.ideologyWeights || {};
    const ideologyTotal = Object.values(weights).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
    const remaining = Math.max(0, 10 - ideologyTotal);
    const profileComplete = ideologyTotal === 10;
    const requiredMessage = this.isPlayerClassModalRequired && !profileComplete
      ? '<p class="hint required-profile-hint">Bienvenue ! Compose ton profil : répartis 10 points idéologiques et choisis une classe avant de rejoindre la partie.</p>'
      : '';

    const avatar = `<div class="player-profile-hero">
      <div class="player-avatar-preview" style="--avatar-color:${this.state.player.color || '#ffffff'}">${(this.state.player.name || 'J').slice(0, 1).toUpperCase()}</div>
      <div>
        <strong>${this.escapeHtml(this.state.player.name)}</strong>
        <span>${this.escapeHtml(this.state.player.ideologyName || 'Profil non défini')}</span>
        <small>Énergie ${Math.round(this.state.player.energy)} · ${ideologyTotal}/10 points idéologiques</small>
      </div>
    </div>`;

    const ideologyRows = ideologies.map((ideology) => {
      const score = Math.max(0, Number(weights[ideology.id] || 0));
      const dots = Array.from({ length: 10 }, (_, index) => {
        const dotScore = index + 1;
        const active = dotScore <= score;
        return `<button class="ideology-dot ${active ? 'active' : ''}" type="button" data-action="set-ideology-score" data-ideology-id="${this.escapeAttr(ideology.id)}" data-score="${dotScore}" title="${dotScore} point${dotScore > 1 ? 's' : ''} sur ${this.escapeAttr(ideology.name)}"></button>`;
      }).join('');

      return `<div class="ideology-allocation-row" style="--ideology-color:${ideology.color}">
        <div class="ideology-allocation-label">
          <span class="ideology-allocation-color"></span>
          <strong>${this.escapeHtml(ideology.name)}</strong>
          <small>${score}/10</small>
        </div>
        <div class="ideology-dots">${dots}</div>
        <button class="ideology-clear" type="button" data-action="set-ideology-score" data-ideology-id="${this.escapeAttr(ideology.id)}" data-score="0">0</button>
      </div>`;
    }).join('');

    const ideologyBlock = `<section class="profile-section ideology-allocation">
      <div class="profile-section-head">
        <div><h3>Profil idéologique</h3><p>Répartis exactement 10 points. Le profil majoritaire donne la couleur, les stats sont mélangées.</p></div>
        <strong class="points-counter ${ideologyTotal === 10 ? 'complete' : ''}">${ideologyTotal}/10</strong>
      </div>
      <div class="ideology-allocation-help">Points restants : <strong>${remaining}</strong></div>
      <div class="ideology-allocation-list">${ideologyRows}</div>
    </section>`;

    const currentAction = '<p class="hint">Actions disponibles : Influence, Pouvoir +, Pouvoir −. Les classes et actions spéciales sont désactivées pour cette version.</p>';
    const choices = '';

    this.elements.playerClassModalContent.innerHTML = `
      ${avatar}
      ${requiredMessage}
      ${ideologyBlock}
      <section class="profile-section">
        <div class="profile-section-head"><div><h3>Actions</h3><p>Le jeu utilise seulement trois actions simples.</p></div></div>
        ${currentAction}
      </section>
    `;
  }

  openPlayerClassModal(options = {}) {
    if (!this.elements.playerClassModal) return;
    this.isPlayerClassModalRequired = Boolean(options.required);
    this.renderPlayerClassModal();
    document.body.classList.add('player-profile-open');
    this.elements.playerClassModal.classList.remove('hidden');
    this.elements.playerClassModal.setAttribute('aria-hidden', 'false');
    if (this.elements.playerClassModalClose) {
      const weights = this.state.player.ideologyWeights || {};
      const ideologyTotal = Object.values(weights).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
      this.elements.playerClassModalClose.disabled = this.isPlayerClassModalRequired && ideologyTotal !== 10;
      this.elements.playerClassModalClose.title = this.elements.playerClassModalClose.disabled ? 'Complète ton profil avant de fermer.' : 'Fermer';
    }
  }

  closePlayerClassModal() {
    if (!this.elements.playerClassModal) return;
    const weights = this.state.player.ideologyWeights || {};
    const ideologyTotal = Object.values(weights).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
    if (this.isPlayerClassModalRequired && ideologyTotal !== 10) return;
    this.isPlayerClassModalRequired = false;
    this.mapTransform = { scale: 1, x: 0, y: 0 };
    this.isCreateFortMode = false;
    this.usingLeaflet = false;
    this.osmMap = null;
    this.initOsmMap();
    this.applyMapTransform();
    document.body.classList.remove('player-profile-open');
    this.elements.playerClassModal.classList.add('hidden');
    this.elements.playerClassModal.setAttribute('aria-hidden', 'true');
    if (this.elements.playerClassModalClose) {
      this.elements.playerClassModalClose.disabled = false;
      this.elements.playerClassModalClose.title = 'Fermer';
    }
  }

  getActionTypeLabel(actionType) {
    if (actionType === 'power_up') return 'Pouvoir +';
    if (actionType === 'power_down') return 'Pouvoir −';
    return 'Influence';
  }

  getFortTotalPower(fort) {
    if (fort && typeof fort.getTotalPower === 'function') {
      return Math.round(fort.getTotalPower());
    }
    return Math.round(Number(fort?.positivePower || fort?.power || fort?.hp || 0) - Number(fort?.negativePower || 0));
  }

  getFortTotalInfluence(fort) {
    return Object.values(fort.influence || {}).reduce((total, value) => total + Number(value || 0), 0);
  }

  getOwnerLabel(fort) {
    if (!fort.ownerIdeologyId) return 'neutre';
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
