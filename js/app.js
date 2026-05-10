/**
 * Main bootstrap file.
 */
document.addEventListener('DOMContentLoaded', async () => {
  const config = await PCWConfigLoader.load(window.PCWConfig);
  const auth = new PCWAuthService(config);

  const startGame = async (options = {}) => {
    const token = options.token || auth.getToken();
    config.currentPlayerToken = token;
    const controller = await PCWGameController.create(config);
    controller.auth = auth;
    controller.init();
    window.PCWGame = controller;

    if (options.openRequiredPlayerProfile) {
      const openProfile = () => {
        controller.openRequiredPlayerProfile();
      };

      // Open immediately, then retry after the first UI ticks. This keeps the
      // register flow robust even if the initial API sync re-renders the page.
      openProfile();
      if (window.requestAnimationFrame) {
        window.requestAnimationFrame(() => window.setTimeout(openProfile, 120));
      }
      window.setTimeout(openProfile, 350);
      window.setTimeout(openProfile, 900);
    }
  };

  if (!config.apiEnabled) {
    await startGame();
    return;
  }

  const player = await auth.me();
  if (player) {
    await startGame();
    return;
  }

  PCWAuthService.renderLoginScreen(auth, async (player, context = {}) => {
    await startGame({
      openRequiredPlayerProfile: Boolean(context.isNewPlayer),
      token: auth.getToken()
    });
  });
});
