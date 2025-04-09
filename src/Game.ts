import * as THREE from 'three';
import { Player } from './Player';
import { CameraController } from './CameraController';
import { Environment } from './Environment';
import { InputManager } from './InputManager';
import { Vehicle } from './Vehicle';
import { MissionManager } from './missions/MissionManager';
import { PedestrianManager } from './PedestrianManager';
import { VehicleManager } from './VehicleManager';

export class Game {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private player: Player;
  private cameraController: CameraController;
  private environment: Environment;
  private inputManager: InputManager;
  private vehicles: Vehicle[] = []; // Player-accessible vehicles
  private isRunning = false;
  private uiElement: HTMLElement | null = null;
  private missionManager: MissionManager;
  private pedestrianManager: PedestrianManager;
  private vehicleManager: VehicleManager; // AI traffic vehicles
  private fpsElement: HTMLDivElement | null = null; // FPS counter element

  constructor(private container: HTMLElement) {
    // Initialize Three.js scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue background
    
    // Initialize renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);
    
    // Initialize clock for frame-independent movement
    this.clock = new THREE.Clock();
    
    // Initialize input manager
    this.inputManager = new InputManager();
    
    // Initialize environment (terrain, buildings, etc.)
    this.environment = new Environment(this.scene);
    
    // Initialize player
    this.player = new Player(this.scene, this.inputManager, this.environment);
    
    // Initialize camera controller
    this.cameraController = new CameraController(this.scene, this.player);
    
    // Create vehicles
    this.createVehicles();
    
    // Initialize mission manager
    this.missionManager = new MissionManager(this.scene, this.player, this.inputManager);
    
    // Initialize pedestrian manager
    this.pedestrianManager = new PedestrianManager(this.scene, this.environment);
    
    // Initialize vehicle manager for AI traffic
    this.vehicleManager = new VehicleManager(this.scene, this.environment);
    
    // Add lights
    this.setupLights();
    
    // Setup UI
    this.setupUI();
  }

  private setupLights(): void {
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    // Add directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 10;
    directionalLight.shadow.camera.far = 200;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    this.scene.add(directionalLight);
  }

  public start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.clock.start();
    this.inputManager.initialize();
    
    // Initialize pedestrians and AI traffic
    this.pedestrianManager.initialize();
    this.vehicleManager.initialize();
    
    this.animate();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.inputManager) {
      this.inputManager.dispose();
    }
  }

  public resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.renderer.setSize(width, height);
    this.cameraController.updateAspect(width / height);
  }

  private createVehicles(): void {
    // Create a few vehicles around the map
    const vehiclePositions = [
      new THREE.Vector3(15, 0, 15),
      new THREE.Vector3(-20, 0, 5),
      new THREE.Vector3(5, 0, -25)
    ];
    
    const vehicleRotations = [
      Math.PI / 4,  // 45 degrees
      Math.PI,      // 180 degrees
      -Math.PI / 2  // -90 degrees
    ];
    
    for (let i = 0; i < vehiclePositions.length; i++) {
      const vehicle = new Vehicle(
        this.scene,
        this.environment,
        vehiclePositions[i],
        vehicleRotations[i]
      );
      
      this.vehicles.push(vehicle);
    }
    
    // Set the first vehicle as the player's current vehicle (for interaction)
    if (this.vehicles.length > 0) {
      this.player.setCurrentVehicle(this.vehicles[0]);
    }
  }
  
  private setupUI(): void {
    // Get or create UI overlay element
    this.uiElement = document.querySelector('.ui-overlay');
    
    if (!this.uiElement) {
      this.uiElement = document.createElement('div');
      this.uiElement.className = 'ui-overlay';
      document.body.appendChild(this.uiElement);
    }
    
    // Update UI with controls
    this.uiElement.innerHTML = `
      <h3>Controls:</h3>
      <p>W - Move forward</p>
      <p>S - Move backward</p>
      <p>A - Turn left</p>
      <p>D - Turn right</p>
      <p>E - Enter/Exit vehicle</p>
      <p>Space - Jump (on foot)</p>
      <p>Mouse - Look around</p>
      <p>Click - Enable mouse control</p>
    `;
    
    // Create FPS counter element
    this.fpsElement = document.createElement('div');
    this.fpsElement.className = 'fps-counter';
    this.fpsElement.style.position = 'absolute';
    this.fpsElement.style.top = '10px';
    this.fpsElement.style.right = '10px';
    this.fpsElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    this.fpsElement.style.color = 'white';
    this.fpsElement.style.padding = '5px';
    this.fpsElement.style.borderRadius = '3px';
    this.fpsElement.style.fontFamily = 'monospace';
    this.fpsElement.style.zIndex = '1000';
    document.body.appendChild(this.fpsElement);
  }
  
  private updateUI(): void {
    // Update any dynamic UI elements here
    // For example, you could show vehicle speed when driving
    if (this.uiElement && this.player.isInsideVehicle()) {
      const vehicleInfo = document.createElement('div');
      vehicleInfo.className = 'vehicle-info';
      vehicleInfo.textContent = 'Currently driving';
      
      // Only add if it doesn't already exist
      if (!this.uiElement.querySelector('.vehicle-info')) {
        this.uiElement.appendChild(vehicleInfo);
      }
    } else if (this.uiElement) {
      // Remove vehicle info when not in vehicle
      const vehicleInfo = this.uiElement.querySelector('.vehicle-info');
      if (vehicleInfo) {
        this.uiElement.removeChild(vehicleInfo);
      }
    }
  }
  
  // Performance monitoring variables
  private frameCount = 0;
  private lastFpsTime = 0;
  private fps = 0;
  private frameTimeHistory: number[] = [];
  private maxFrameTimeHistory = 60; // Store last 60 frames for analysis
  private longFrameThreshold = 0.05; // 50ms threshold for long frames

  // Memory management
  private lastMemoryCleanupTime = 0;
  private memoryCleanupInterval = 10; // Cleanup every 10 seconds
  
  private animate = (): void => {
    if (!this.isRunning) return;
    
    requestAnimationFrame(this.animate);
    
    try {
      // Calculate delta time with a maximum value to prevent large jumps
      // This helps prevent physics issues when the game freezes or lags
      const rawDeltaTime = this.clock.getDelta();
      const deltaTime = Math.min(rawDeltaTime, 0.1); // Cap at 100ms (10fps)
      
      // Performance monitoring
      this.updatePerformanceMetrics(deltaTime);
      
      // Periodic memory cleanup
      const currentTime = performance.now() / 1000;
      if (currentTime - this.lastMemoryCleanupTime > this.memoryCleanupInterval) {
        this.performMemoryCleanup();
        this.lastMemoryCleanupTime = currentTime;
      }
      
      // Update game components
      this.player.update(deltaTime);
      this.cameraController.update();
      
      // Get player position for distance calculations
      const playerPosition = this.player.getPosition();
      
      // Update player-accessible vehicles with distance-based optimization
      for (const vehicle of this.vehicles) {
        if (!vehicle.isPlayerInside()) {
          const distanceToPlayer = vehicle.getPosition().distanceTo(playerPosition);
          
          // Use simplified physics for distant vehicles
          if (distanceToPlayer > 30) {
            vehicle.updateSimple(deltaTime, 0.3); // Very simplified update
          } else if (distanceToPlayer > 15) {
            vehicle.updateSimple(deltaTime, 0.7); // Somewhat simplified update
          } else {
            vehicle.update(deltaTime); // Full physics update for nearby vehicles
          }
        }
      }
      
      // Update pedestrians with optimized processing
      this.pedestrianManager.update(deltaTime, this.player, [...this.vehicles, ...this.vehicleManager.getVehicles()]);
      
      // Update AI traffic vehicles
      // @ts-ignore
      this.vehicleManager.update(deltaTime, this.player, this.vehicles);
      
      // Update mission manager
      this.missionManager.update(deltaTime);
      
      // Update UI
      this.updateUI();
      
      // Render the scene
      this.renderer.render(this.scene, this.cameraController.getCamera());
    } catch (error) {
      console.error('Error in game loop:', error);
      // Continue running to recover from errors
    }
  }
  
  /**
   * Update performance metrics and display FPS counter
   */
  private updatePerformanceMetrics(deltaTime: number): void {
    const now = performance.now();
    
    // Calculate FPS
    this.frameCount++;
    if (now - this.lastFpsTime >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsTime));
      this.frameCount = 0;
      this.lastFpsTime = now;
    }
    
    // Track frame times for analysis
    const frameTime = deltaTime * 1000; // Convert to ms
    this.frameTimeHistory.push(frameTime);
    if (this.frameTimeHistory.length > this.maxFrameTimeHistory) {
      this.frameTimeHistory.shift();
    }
    
    // Calculate average and max frame time
    const avgFrameTime = this.frameTimeHistory.reduce((sum, time) => sum + time, 0) / this.frameTimeHistory.length;
    const maxFrameTime = Math.max(...this.frameTimeHistory);
    
    // Log long frames that might cause stuttering
    if (frameTime > this.longFrameThreshold * 1000) {
      console.warn(`Long frame detected: ${frameTime.toFixed(2)}ms`);
    }
    
    // Update FPS display
    if (this.fpsElement) {
      this.fpsElement.textContent = `FPS: ${this.fps} | Avg: ${avgFrameTime.toFixed(1)}ms | Max: ${maxFrameTime.toFixed(1)}ms`;
      
      // Color code based on performance
      if (this.fps < 30) {
        this.fpsElement.style.color = 'red';
      } else if (this.fps < 50) {
        this.fpsElement.style.color = 'yellow';
      } else {
        this.fpsElement.style.color = 'lime';
      }
    }
  }
  
  /**
   * Perform periodic memory cleanup to prevent leaks
   */
  private performMemoryCleanup(): void {
    // Dispose unused Three.js resources
    this.scene.traverse(obj => {
      if (obj.userData && obj.userData.markedForDisposal) {
        if (obj instanceof THREE.Mesh) {
          if (obj.geometry) obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else if (obj.material) {
            obj.material.dispose();
          }
        } else if (obj instanceof THREE.Texture) {
          (obj as THREE.Texture).dispose();
        }
        this.scene.remove(obj);
      }
    });

    // Clear cached resources
    THREE.Cache.clear();

    // Remove expired objects from managers
    this.pedestrianManager.cleanup();
    this.vehicleManager.cleanup();
  }
}
