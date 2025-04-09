import * as THREE from 'three';

/**
 * AssetLoader handles loading and caching of all game assets
 */
export class AssetLoader {
  private static instance: AssetLoader;
  
  // Loaders (kept for potential future use with actual assets)
  
  // Asset caches
  private textures: Map<string, THREE.Texture> = new Map();
  private models: Map<string, THREE.Group> = new Map();
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private animations: Map<string, THREE.AnimationClip[]> = new Map();
  
  // Loading tracking
  private totalAssets = 0;
  private loadedAssets = 0;
  private onProgressCallback: ((progress: number) => void) | null = null;
  private onCompleteCallback: (() => void) | null = null;
  
  private constructor() {
    // Initialization code
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): AssetLoader {
    if (!AssetLoader.instance) {
      AssetLoader.instance = new AssetLoader();
    }
    return AssetLoader.instance;
  }
  
  /**
   * Set callbacks for loading progress and completion
   */
  public setCallbacks(
    onProgress: (progress: number) => void,
    onComplete: () => void
  ): void {
    this.onProgressCallback = onProgress;
    this.onCompleteCallback = onComplete;
  }
  
  /**
   * Load all required game assets
   */
  public loadAllAssets(): void {
    this.totalAssets = 5; // Player model, car model, 2 textures, audio simulation
    this.loadedAssets = 0;
    
    // Generate models programmatically
    this.generatePlayerModel();
    this.generateVehicleModel();
    
    // Generate textures programmatically
    this.generateBasicTextures();
    
    // Audio files would be loaded when available, for now just simulate loaded audio
    this.simulateLoadedAudio();
  }
  
  /**
   * Generate a basic player model
   */
  private generatePlayerModel(): void {
    // Create a group to hold the player model
    const group = new THREE.Group();
    
    // Basic humanoid shape
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x2222ee });
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffcc99 });
    
    // Body
    const bodyGeometry = new THREE.BoxGeometry(0.5, 0.8, 0.25);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.8;
    body.name = 'body';
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.2, 12, 12);
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.5;
    head.name = 'head';
    
    // Arms
    const armGeometry = new THREE.BoxGeometry(0.15, 0.5, 0.15);
    
    const leftArm = new THREE.Mesh(armGeometry, bodyMaterial);
    leftArm.position.set(-0.325, 0.9, 0);
    leftArm.name = 'leftArm';
    
    const rightArm = new THREE.Mesh(armGeometry, bodyMaterial);
    rightArm.position.set(0.325, 0.9, 0);
    rightArm.name = 'rightArm';
    
    // Legs
    const legGeometry = new THREE.BoxGeometry(0.15, 0.5, 0.15);
    
    const leftLeg = new THREE.Mesh(legGeometry, bodyMaterial);
    leftLeg.position.set(-0.15, 0.25, 0);
    leftLeg.name = 'leftLeg';
    
    const rightLeg = new THREE.Mesh(legGeometry, bodyMaterial);
    rightLeg.position.set(0.15, 0.25, 0);
    rightLeg.name = 'rightLeg';
    
    // Add all parts to the group
    group.add(body);
    group.add(head);
    group.add(leftArm);
    group.add(rightArm);
    group.add(leftLeg);
    group.add(rightLeg);
    
    // Create walking animation clips
    const animations: THREE.AnimationClip[] = [];
    
    // Simple walk animation
    const times = [0, 0.5, 1.0];
    const values = [0, Math.PI/4, 0, 0, -Math.PI/4, 0];
    
    const leftLegTrack = new THREE.KeyframeTrack('leftLeg.rotation[0]', times, values.slice(0, 3));
    const rightLegTrack = new THREE.KeyframeTrack('rightLeg.rotation[0]', times, values.slice(3));
    
    const walkClip = new THREE.AnimationClip('walking', 1.0, [leftLegTrack, rightLegTrack]);
    animations.push(walkClip);
    
    // Idle animation
    const idleClip = new THREE.AnimationClip('idle', 1.0, []);
    animations.push(idleClip);
    
    // Store the model and animations
    this.models.set('player', group);
    this.animations.set('player', animations);
    
    // Mark as loaded
    this.assetLoaded();
  }
  
  /**
   * Generate a basic vehicle model
   */
  private generateVehicleModel(): void {
    // Create a group to hold the vehicle model
    const group = new THREE.Group();
    
    // Materials
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Red
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const glassMaterial = new THREE.MeshStandardMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.5
    });
    
    // Vehicle dimensions
    const width = 2.0;
    const height = 1.2;
    const length = 4.0;
    
    // Body
    const bodyGeometry = new THREE.BoxGeometry(width, height, length);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = height/2;
    body.name = 'body';
    
    // Wheels
    const wheelRadius = 0.4;
    const wheelThickness = 0.2;
    const wheelGeometry = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelThickness, 16);
    
    const wheelPositions = [
      new THREE.Vector3(-width/2 + 0.2, wheelRadius, length/2 - 0.5), // Front left
      new THREE.Vector3(width/2 - 0.2, wheelRadius, length/2 - 0.5),  // Front right
      new THREE.Vector3(-width/2 + 0.2, wheelRadius, -length/2 + 0.5), // Rear left
      new THREE.Vector3(width/2 - 0.2, wheelRadius, -length/2 + 0.5)  // Rear right
    ];
    
    const wheels = [];
    
    for (let i = 0; i < 4; i++) {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2; // Rotate to correct orientation
      wheel.position.copy(wheelPositions[i]);
      wheel.name = `wheel_${i}`;
      wheels.push(wheel);
      group.add(wheel);
    }
    
    // Windshield
    const windshieldGeometry = new THREE.PlaneGeometry(width - 0.4, height - 0.4);
    const windshield = new THREE.Mesh(windshieldGeometry, glassMaterial);
    windshield.position.set(0, height/2 + 0.1, length/2 - 0.6);
    windshield.rotation.x = Math.PI / 8; // Slight angle
    windshield.name = 'windshield';
    
    // Create doors
    const doorWidth = 0.05;
    const doorHeight = height - 0.3;
    const doorLength = length / 3;
    
    const doorGeometry = new THREE.BoxGeometry(doorWidth, doorHeight, doorLength);
    
    // Left door
    const leftDoor = new THREE.Mesh(doorGeometry, bodyMaterial);
    leftDoor.position.set(-width/2, height/2, 0);
    leftDoor.name = 'leftDoor';
    
    // Right door
    const rightDoor = new THREE.Mesh(doorGeometry, bodyMaterial);
    rightDoor.position.set(width/2, height/2, 0);
    rightDoor.name = 'rightDoor';
    
    // Add all parts to the group
    group.add(body);
    group.add(windshield);
    group.add(leftDoor);
    group.add(rightDoor);
    
    // Store vehicle model
    this.models.set('car', group);
    
    // Mark as loaded
    this.assetLoaded();
  }
  
  /**
   * Generate basic textures programmatically
   */
  private generateBasicTextures(): void {
    // Generate a ground texture
    const groundCanvas = document.createElement('canvas');
    groundCanvas.width = 512;
    groundCanvas.height = 512;
    const groundCtx = groundCanvas.getContext('2d');
    
    if (groundCtx) {
      // Draw a grass-like pattern
      groundCtx.fillStyle = '#4a7526';
      groundCtx.fillRect(0, 0, 512, 512);
      
      // Add some texture/noise
      for (let i = 0; i < 5000; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const size = Math.random() * 3 + 1;
        groundCtx.fillStyle = Math.random() > 0.5 ? '#3f6420' : '#558a2f';
        groundCtx.fillRect(x, y, size, size);
      }
      
      const groundTexture = new THREE.CanvasTexture(groundCanvas);
      groundTexture.wrapS = THREE.RepeatWrapping;
      groundTexture.wrapT = THREE.RepeatWrapping;
      groundTexture.repeat.set(10, 10);
      this.textures.set('ground', groundTexture);
    }
    
    // Generate a building texture
    const buildingCanvas = document.createElement('canvas');
    buildingCanvas.width = 512;
    buildingCanvas.height = 512;
    const buildingCtx = buildingCanvas.getContext('2d');
    
    if (buildingCtx) {
      // Draw a concrete-like background
      buildingCtx.fillStyle = '#a0a0a0';
      buildingCtx.fillRect(0, 0, 512, 512);
      
      // Add windows
      buildingCtx.fillStyle = '#3a3a3a';
      for (let y = 32; y < 512; y += 64) {
        for (let x = 32; x < 512; x += 96) {
          buildingCtx.fillRect(x, y, 64, 48);
        }
      }
      
      const buildingTexture = new THREE.CanvasTexture(buildingCanvas);
      this.textures.set('building', buildingTexture);
    }
    
    // Mark as loaded (2 textures)
    this.assetLoaded();
    this.assetLoaded();
  }
  
  /**
   * Simulate loading audio files
   */
  private simulateLoadedAudio(): void {
    // Since we can't create actual audio buffers without files,
    // we'll just mark them as loaded for now
    
    // Simulating loaded audio files
    console.log('Audio files would be loaded here in a complete implementation');
    
    // Mark as loaded
    this.assetLoaded();
  }
  
  /**
   * Track loaded assets and update progress
   */
  private assetLoaded(): void {
    this.loadedAssets++;
    
    const progress = this.loadedAssets / this.totalAssets;
    
    if (this.onProgressCallback) {
      this.onProgressCallback(progress);
    }
    
    if (this.loadedAssets === this.totalAssets && this.onCompleteCallback) {
      this.onCompleteCallback();
    }
  }
  
  /**
   * Get a loaded texture by ID
   */
  public getTexture(id: string): THREE.Texture | undefined {
    return this.textures.get(id);
  }
  
  /**
   * Get a loaded model by ID
   */
  public getModel(id: string): THREE.Group | undefined {
    const model = this.models.get(id);
    return model ? model.clone() : undefined;
  }
  
  /**
   * Get a loaded audio buffer by ID
   */
  public getAudio(id: string): AudioBuffer | undefined {
    return this.audioBuffers.get(id);
  }
  
  /**
   * Get animations for a model by ID
   */
  public getAnimations(id: string): THREE.AnimationClip[] | undefined {
    return this.animations.get(id);
  }
}