/**
 * Main bootstrap file.
 */
document.addEventListener('DOMContentLoaded', () => {
  const controller = new PCWGameController(window.PCWConfig);
  controller.init();
  window.PCWGame = controller;
});
