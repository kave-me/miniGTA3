import * as THREE from 'three';
import { AssetLoader } from '../utils/AssetLoader';
import { GTA3AssetLoader } from '../utils/GTA3AssetLoader';

/**
 * Animation states for the human character
 */
export enum HumanAnimationState {
  IDLE = 'idle',
  WALK = 'walk',
  RUN = 'run',
  JUMP = 'jump',
  ENTER_VEHICLE = 'enter_vehicle',
  EXIT_VEHICLE = 'exit_vehicle',
  DRIVING = 'driving'
}

/**
 * HumanModel represents a human character with animations
 */
export class HumanModel {
  // The 3D model group
  private model: THREE.Group | null = null;
  
  // Animation mixer and clips
  private mixer: THREE.AnimationMixer | null = null;
  private animations: Map<HumanAnimationState, THREE.AnimationAction> = new Map();
  private currentAnimation: THREE.AnimationAction | null = null;
  
  // Model properties
  private height = 1.8;
  private radius = 0.4;
  
  constructor(private scene: THREE.Scene) {}
  
  /**
   * Load the human model and its animations
   */
  public async load(modelId = 'player'): Promise<boolean> {
    // Try to load from original GTA3 assets first
    const gta3AssetLoader = GTA3AssetLoader.getInstance();
    let model: THREE.Group | null = null;
    
    // Try to load the model from GTA3 assets
    try {
      model = await gta3AssetLoader.loadModel(modelId);
    } catch (error) {
      console.warn(`Failed to load GTA3 character model: ${modelId}`, error);
    }
    
    // If GTA3 model loading failed, fall back to the asset loader
    if (!model) {
      const assetLoader = AssetLoader.getInstance();
      const loadedModel = assetLoader.getModel(modelId);
      
      if (!loadedModel) {
        console.error(`Failed to load human model: ${modelId}`);
        return this.createFallbackModel();
      }
      model = loadedModel;
    }
    
    this.model = model;
    this.scene.add(this.model);
    
    // Setup animations
    // First try to get animations from GTA3 assets, then fall back to generated animations
    let animationClips = null;
    const assetLoader = AssetLoader.getInstance();
    animationClips = assetLoader.getAnimations(modelId);
    
    if (animationClips && animationClips.length > 0) {
      this.setupAnimations(animationClips);
    }
    
    return true;
  }
  
  /**
   * Create a fallback model if the asset loading fails
   */
  private createFallbackModel(): boolean {
    // Create a simple humanoid shape as fallback
    const group = new THREE.Group();
    
    // Body (cylinder)
    const bodyGeometry = new THREE.CylinderGeometry(this.radius, this.radius, this.height * 0.6, 8);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x0000ff }); // Blue color
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.position.y = this.height * 0.3;
    group.add(bodyMesh);
    
    // Head (sphere)
    const headGeometry = new THREE.SphereGeometry(this.radius * 0.8, 16, 16);
    const headMaterial = new THREE.MeshLambertMaterial({ color: 0xffcc99 }); // Skin color
    const headMesh = new THREE.Mesh(headGeometry, headMaterial);
    headMesh.position.y = this.height * 0.7;
    group.add(headMesh);
    
    // Arms (cylinders)
    const armGeometry = new THREE.CylinderGeometry(this.radius * 0.2, this.radius * 0.2, this.height * 0.4, 8);
    const armMaterial = new THREE.MeshLambertMaterial({ color: 0x0000ff }); // Blue color
    
    // Left arm
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-this.radius - this.radius * 0.2, this.height * 0.3, 0);
    leftArm.rotation.z = Math.PI / 6; // Slightly angled
    group.add(leftArm);
    
    // Right arm
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(this.radius + this.radius * 0.2, this.height * 0.3, 0);
    rightArm.rotation.z = -Math.PI / 6; // Slightly angled
    group.add(rightArm);
    
    // Legs (cylinders)
    const legGeometry = new THREE.CylinderGeometry(this.radius * 0.25, this.radius * 0.25, this.height * 0.5, 8);
    const legMaterial = new THREE.MeshLambertMaterial({ color: 0x000066 }); // Dark blue color
    
    // Left leg
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-this.radius * 0.5, -this.height * 0.25, 0);
    group.add(leftLeg);
    
    // Right leg
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(this.radius * 0.5, -this.height * 0.25, 0);
    group.add(rightLeg);
    
    // Add to scene
    this.model = group;
    this.scene.add(this.model);
    
    return true;
  }
  
  /**
   * Setup animation mixer and actions
   */
  private setupAnimations(clips: THREE.AnimationClip[]): void {
    if (!this.model) return;
    
    this.mixer = new THREE.AnimationMixer(this.model);
    
    // Map animation clips to states
    clips.forEach(clip => {
      let state: HumanAnimationState | null = null;
      
      // Match clip names to animation states
      if (clip.name.includes('idle')) state = HumanAnimationState.IDLE;
      else if (clip.name.includes('walk')) state = HumanAnimationState.WALK;
      else if (clip.name.includes('run')) state = HumanAnimationState.RUN;
      else if (clip.name.includes('jump')) state = HumanAnimationState.JUMP;
      else if (clip.name.includes('enter')) state = HumanAnimationState.ENTER_VEHICLE;
      else if (clip.name.includes('exit')) state = HumanAnimationState.EXIT_VEHICLE;
      else if (clip.name.includes('drive')) state = HumanAnimationState.DRIVING;
      
      if (state && this.mixer) {
        const action = this.mixer.clipAction(clip);
        this.animations.set(state, action);
      }
    });
    
    // If no animations were loaded, create a default idle animation
    if (this.animations.size === 0 && this.mixer) {
      // Create a simple default animation (no movement)
      const track = new THREE.NumberKeyframeTrack(
        '.position[y]', // Property to animate
        [0, 1], // Keyframe times
        [0, 0], // Values
      );
      
      const idleClip = new THREE.AnimationClip('idle', 1, [track]);
      const idleAction = this.mixer.clipAction(idleClip);
      this.animations.set(HumanAnimationState.IDLE, idleAction);
    }
    
    // Set default animation to idle
    const idleAction = this.animations.get(HumanAnimationState.IDLE);
    if (idleAction) {
      idleAction.play();
      this.currentAnimation = idleAction;
    }
  }
  
  /**
   * Update the model and animations
   */
  public update(deltaTime: number): void {
    if (this.mixer) {
      this.mixer.update(deltaTime);
    }
  }
  
  /**
   * Set the model position
   */
  public setPosition(position: THREE.Vector3): void {
    if (this.model) {
      this.model.position.copy(position);
    }
  }
  
  /**
   * Set the model rotation
   */
  public setRotation(rotation: THREE.Euler): void {
    if (this.model) {
      this.model.rotation.copy(rotation);
    }
  }
  
  /**
   * Play an animation by state
   */
  public playAnimation(state: HumanAnimationState, crossFadeDuration = 0.5): void {
    const newAnimation = this.animations.get(state);
    
    if (newAnimation && newAnimation !== this.currentAnimation) {
      if (this.currentAnimation) {
        this.currentAnimation.crossFadeTo(newAnimation, crossFadeDuration, true);
      }
      
      newAnimation.enabled = true;
      newAnimation.setEffectiveTimeScale(1);
      newAnimation.setEffectiveWeight(1);
      newAnimation.play();
      
      this.currentAnimation = newAnimation;
    }
  }
  
  /**
   * Get the model's mesh
   */
  public getMesh(): THREE.Group | null {
    return this.model;
  }
  
  /**
   * Set model visibility
   */
  public setVisible(visible: boolean): void {
    if (this.model) {
      this.model.visible = visible;
    }
  }
  
  /**
   * Get the model's height
   */
  public getHeight(): number {
    return this.height;
  }
  
  /**
   * Get the model's radius for collision detection
   */
  public getRadius(): number {
    return this.radius;
  }
  
  /**
   * Get the model object
   */
  public getModel(): THREE.Group | null {
    return this.model;
  }
}