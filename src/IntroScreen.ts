/**
 * IntroScreen.ts
 * 
 * Displays a branded intro screen before the game starts.
 * Shows the MiniGTA3 logo and waits for user input before continuing.
 */

export class IntroScreen {
  private element: HTMLDivElement;
  private onComplete: () => void;
  
  constructor(parent: HTMLElement, onComplete: () => void) {
    this.onComplete = onComplete;
    
    // Create intro screen container
    this.element = document.createElement('div');
    this.element.className = 'intro-screen';
    this.element.style.position = 'absolute';
    this.element.style.top = '0';
    this.element.style.left = '0';
    this.element.style.width = '100%';
    this.element.style.height = '100%';
    this.element.style.backgroundColor = '#000';
    this.element.style.zIndex = '1000';
    this.element.style.display = 'flex';
    this.element.style.flexDirection = 'column';
    this.element.style.justifyContent = 'center';
    this.element.style.alignItems = 'center';
    this.element.style.transition = 'opacity 1s ease-in-out';
    
    // Add intro screen content
    const img = document.createElement('img');
    img.src = '/assets/intro-screen.svg';
    img.style.width = '80%';
    img.style.maxWidth = '1200px';
    img.style.height = 'auto';
    this.element.appendChild(img);
    
    // Add event listeners for any key or click
    document.addEventListener('keydown', this.handleInput);
    document.addEventListener('click', this.handleInput);
    
    // Add to parent
    parent.appendChild(this.element);
    
    // Auto-dismiss after 10 seconds if no input
    setTimeout(() => {
      this.dismiss();
    }, 10000);
  }
  
  private handleInput = (event: KeyboardEvent | MouseEvent) => {
    // Prevent multiple triggers
    document.removeEventListener('keydown', this.handleInput);
    document.removeEventListener('click', this.handleInput);
    
    this.dismiss();
  }
  
  private dismiss() {
    // Fade out
    this.element.style.opacity = '0';
    
    // Remove after animation completes
    setTimeout(() => {
      if (this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
      
      // Call the completion callback
      this.onComplete();
    }, 1000);
  }
}