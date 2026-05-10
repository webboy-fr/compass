/**
 * Small polling chat service.
 */
class PCWChatService {
  constructor(config, storage) {
    this.config = config;
    this.storage = storage;
    this.messages = [];
    this.isFetching = false;
    this.isSending = false;
    this.lastFetchAt = 0;
    this.elements = {
      form: document.getElementById('chatForm'),
      input: document.getElementById('chatInput'),
      messages: document.getElementById('chatMessages'),
      sendButton: document.getElementById('chatSendButton')
    };
  }

  init() {
    if (!this.elements.form || !this.elements.input || !this.elements.messages) return;

    this.elements.form.addEventListener('submit', (event) => this.handleSubmit(event));
    this.fetchMessages(true);
  }

  getChatUrl() {
    const baseUrl = this.config.chatApiUrl || 'api/chat.php';
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}token=${encodeURIComponent(this.storage.currentPlayerToken || '')}`;
  }

  escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  formatTime(value) {
    if (!value) return '';

    const date = new Date(value.replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  async handleSubmit(event) {
    event.preventDefault();
    const message = this.elements.input.value.trim();
    if (!message || this.isSending) return;

    await this.sendMessage(message);
  }

  async sendMessage(message) {
    if (!this.storage.apiAvailable) {
      this.addLocalNotice('Chat indisponible hors API.');
      return;
    }

    this.isSending = true;
    if (this.elements.sendButton) this.elements.sendButton.disabled = true;

    try {
      const response = await fetch(this.getChatUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      if (!response.ok) {
        throw new Error(`Chat API error ${response.status}`);
      }

      const payload = await PCWApiResponseParser.parse(response, 'Chat API');
      this.elements.input.value = '';
      this.messages = Array.isArray(payload.messages) ? payload.messages : [];
      this.render();
    } catch (error) {
      console.warn('Unable to send chat message.', error);
      this.addLocalNotice('Message non envoyé.');
    } finally {
      this.isSending = false;
      if (this.elements.sendButton) this.elements.sendButton.disabled = false;
    }
  }

  async fetchMessages(force = false) {
    if (!this.storage.apiAvailable || this.isFetching || !this.elements.messages) return;

    const now = Date.now();
    if (!force && now - this.lastFetchAt < 900) return;

    this.isFetching = true;
    try {
      const response = await fetch(this.getChatUrl(), { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Chat API error ${response.status}`);
      }

      const payload = await PCWApiResponseParser.parse(response, 'Chat API');
      this.messages = Array.isArray(payload.messages) ? payload.messages : [];
      this.lastFetchAt = Date.now();
      this.render();
    } catch (error) {
      console.warn('Unable to fetch chat messages.', error);
    } finally {
      this.isFetching = false;
    }
  }

  addLocalNotice(message) {
    this.messages = [...this.messages.slice(-19), {
      playerName: 'Système',
      message,
      createdAt: new Date().toISOString()
    }];
    this.render();
  }

  render() {
    if (!this.elements.messages) return;

    const wasNearBottom = this.elements.messages.scrollTop + this.elements.messages.clientHeight >= this.elements.messages.scrollHeight - 24;

    if (!this.messages.length) {
      this.elements.messages.innerHTML = '<div class="chat-empty">Aucun message.</div>';
    } else {
      this.elements.messages.innerHTML = this.messages.map((message) => {
        const time = this.formatTime(message.createdAt || message.created_at);
        const playerName = this.escapeHtml(message.playerName || message.player_name || 'Joueur');
        const text = this.escapeHtml(message.message || '');
        return `
          <div class="chat-message">
            <div class="chat-message-meta">
              <strong>${playerName}</strong>${time ? `<span>${time}</span>` : ''}
            </div>
            <div class="chat-message-text">${text}</div>
          </div>`;
      }).join('');
    }

    if (wasNearBottom) {
      this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
    }
  }
}

window.PCWChatService = PCWChatService;
