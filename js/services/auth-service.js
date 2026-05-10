/**
 * Very small browser-session auth service for human players.
 */
class PCWAuthService {
  constructor(config) {
    this.config = config;
    this.tokenKey = `${config.storageKey}_auth_token`;
    this.authApiUrl = config.authApiUrl || 'api/auth.php';
  }

  getToken() {
    return localStorage.getItem(this.tokenKey) || '';
  }

  setToken(token) {
    localStorage.setItem(this.tokenKey, token);
  }

  clearToken() {
    localStorage.removeItem(this.tokenKey);
  }

  async me() {
    const token = this.getToken();
    if (!token) return null;

    const response = await fetch(`${this.authApiUrl}?action=me&token=${encodeURIComponent(token)}`, { cache: 'no-store' });
    if (!response.ok) {
      this.clearToken();
      return null;
    }

    const payload = await response.json();
    return payload.authenticated ? payload.player : null;
  }

  async login(name, password) {
    return this.sendCredentials('login', name, password);
  }

  async register(name, password) {
    return this.sendCredentials('register', name, password);
  }

  async sendCredentials(action, name, password) {
    const response = await fetch(this.authApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, name, password })
    });
    const payload = await response.json();
    if (!response.ok || payload.error) {
      throw new Error(payload.error || 'Erreur d’authentification.');
    }
    this.setToken(payload.token);
    return payload.player;
  }

  async logout() {
    const token = this.getToken();
    this.clearToken();
    if (!token) return;

    await fetch(this.authApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout', token })
    }).catch(() => {});
  }

  static renderLoginScreen(auth, onAuthenticated) {
    const overlay = document.getElementById('authOverlay');
    const form = document.getElementById('authForm');
    const title = document.getElementById('authTitle');
    const switchButton = document.getElementById('authSwitchButton');
    const submitButton = document.getElementById('authSubmitButton');
    const message = document.getElementById('authMessage');
    let mode = 'login';

    const updateMode = () => {
      const isRegister = mode === 'register';
      title.textContent = isRegister ? 'Créer un joueur' : 'Connexion joueur';
      submitButton.textContent = isRegister ? 'Créer le joueur' : 'Se connecter';
      switchButton.textContent = isRegister ? 'J’ai déjà un joueur' : 'Créer un joueur';
      message.textContent = '';
    };

    switchButton.addEventListener('click', () => {
      mode = mode === 'login' ? 'register' : 'login';
      updateMode();
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const name = String(formData.get('name') || '').trim();
      const password = String(formData.get('password') || '');
      if (!name || !password) {
        message.textContent = 'Nom et mot de passe obligatoires.';
        return;
      }
      submitButton.disabled = true;
      message.textContent = 'Connexion en cours…';
      try {
        const player = mode === 'register' ? await auth.register(name, password) : await auth.login(name, password);
        overlay.classList.add('hidden');
        await onAuthenticated(player);
      } catch (error) {
        message.textContent = error.message;
      } finally {
        submitButton.disabled = false;
      }
    });

    updateMode();
    overlay.classList.remove('hidden');
  }
}

window.PCWAuthService = PCWAuthService;
