import { Game } from './Game';
import { IntroScreen } from './IntroScreen';

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  
  if (!app) {
    console.error('Could not find app container');
    return;
  }
  
  // Create the game
  const game = new Game(app);
  
  // Start the game after the loading screen animation completes
  window.addEventListener('load', () => {
    // Wait for loading screen animation to complete
    setTimeout(() => {
      // Hide the loading screen
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
          loadingScreen.style.display = 'none';
          
          // Show intro screen with branding
          const introScreen = new IntroScreen(document.body, () => {
            // Start game after intro completes
            game.start();
            console.log('Game started');
          });
        }, 1000);
      }
    }, 2000); // Match this with the loading screen duration
  });
  
  // Handle window resize
  window.addEventListener('resize', () => {
    game.resize();
  });
  
  // Handle visibility change to pause/resume game
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Pause game when tab is not visible
      game.stop();
    } else {
      // Resume game when tab becomes visible again
      game.start();
    }
  });
  
  // Log that the game is initialized
  console.log('MiniGTA3 initialized and ready to start');
});