/**
 * Main bootstrap file.
 */
document.addEventListener('DOMContentLoaded', async () => {
  const config = await PCWConfigLoader.load(window.PCWConfig);
  const auth = new PCWAuthService(config);

  const startGame = async () => {
    const token = auth.getToken();
    config.currentPlayerToken = token;
    const controller = await PCWGameController.create(config);
    controller.auth = auth;
    controller.init();
    window.PCWGame = controller;
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

  PCWAuthService.renderLoginScreen(auth, async () => {
    await startGame();
  });
});
