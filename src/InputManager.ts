/**
 * InputManager handles keyboard and mouse inputs for the game
 */
export class InputManager {
  // Keyboard state
  private keys: { [key: string]: boolean } = {};
  
  // Mouse state
  private mousePosition: { x: number, y: number } = { x: 0, y: 0 };
  private mouseDelta: { x: number, y: number } = { x: 0, y: 0 };
  private previousMousePosition: { x: number, y: number } = { x: 0, y: 0 };
  private isPointerLocked = false;
  
  constructor() {}
  
  public initialize(): void {
    // Set up keyboard event listeners
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    
    // Set up mouse event listeners
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('click', this.handleMouseClick);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
  }
  
  public dispose(): void {
    // Remove keyboard event listeners
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    
    // Remove mouse event listeners
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('click', this.handleMouseClick);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    
    // Exit pointer lock if active
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }
  
  private handleKeyDown = (event: KeyboardEvent): void => {
    this.keys[event.key.toLowerCase()] = true;
  }
  
  private handleKeyUp = (event: KeyboardEvent): void => {
    this.keys[event.key.toLowerCase()] = false;
  }
  
  private handleMouseMove = (event: MouseEvent): void => {
    if (this.isPointerLocked) {
      // Use movementX/Y for pointer lock which gives relative movement
      this.mouseDelta.x = event.movementX || 0;
      this.mouseDelta.y = event.movementY || 0;
    } else {
      // Calculate delta from previous position
      this.mousePosition.x = event.clientX;
      this.mousePosition.y = event.clientY;
      
      this.mouseDelta.x = this.mousePosition.x - this.previousMousePosition.x;
      this.mouseDelta.y = this.mousePosition.y - this.previousMousePosition.y;
      
      this.previousMousePosition.x = this.mousePosition.x;
      this.previousMousePosition.y = this.mousePosition.y;
    }
  }
  
  private handleMouseClick = (): void => {
    // Request pointer lock on click for better camera control
    if (!this.isPointerLocked) {
      document.body.requestPointerLock();
    }
  }
  
  private handlePointerLockChange = (): void => {
    this.isPointerLocked = document.pointerLockElement !== null;
  }
  
  // Public methods to check input state
  
  public isKeyPressed(key: string): boolean {
    return this.keys[key.toLowerCase()] === true;
  }
  
  public getMouseDelta(): { x: number, y: number } {
    const delta = { x: this.mouseDelta.x, y: this.mouseDelta.y };
    // Reset delta after reading to prevent continuous rotation when mouse is not moving
    this.mouseDelta.x = 0;
    this.mouseDelta.y = 0;
    return delta;
  }
  
  public isPointerLockActive(): boolean {
    return this.isPointerLocked;
  }
}