import * as THREE from 'three';
import { Player } from '../Player';
import { InputManager } from '../InputManager';

/**
 * Base Mission interface that all mission types must implement
 */
export abstract class Mission {
  // Mission identification
  protected id: string;
  protected title: string;
  protected description: string;
  
  // Mission state
  protected isActive = false;
  protected isComplete = false;
  protected isFailed = false;
  protected failReason = '';
  
  // Mission objectives
  protected objectives: string[] = [];
  protected currentObjectiveIndex = 0;
  
  // Mission rewards
  protected reward = '';
  protected unlocksMissions: string[] = [];
  
  // Mission timer
  protected timeLimit = 0; // in seconds, 0 means no time limit
  
  // Mission markers and checkpoints
  protected markers: THREE.Mesh[] = [];
  protected checkpoints: THREE.Mesh[] = [];
  
  constructor(
    protected scene: THREE.Scene,
    protected player: Player,
    protected inputManager: InputManager
  ) {}
  
  /**
   * Initialize the mission
   */
  public abstract initialize(): void;
  
  /**
   * Update mission state
   */
  public abstract update(deltaTime: number): void;
  
  /**
   * Clean up mission resources
   */
  public cleanup(): void {
    // Remove markers and checkpoints from scene
    this.markers.forEach(marker => this.scene.remove(marker));
    this.checkpoints.forEach(checkpoint => this.scene.remove(checkpoint));
    
    this.markers = [];
    this.checkpoints = [];
  }
  
  /**
   * Create a mission marker at the specified position
   */
  protected createMarker(position: THREE.Vector3, color = 0xffff00): THREE.Mesh {
    // Create a cylinder for the marker
    const geometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 16);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.7
    });
    
    const marker = new THREE.Mesh(geometry, material);
    marker.position.copy(position);
    marker.position.y += 1; // Raise marker above ground
    
    // Add pulsing animation
    const pulseAnimation = () => {
      marker.scale.x = 1 + Math.sin(Date.now() * 0.003) * 0.2;
      marker.scale.z = marker.scale.x;
      marker.rotation.y += 0.01;
      
      requestAnimationFrame(pulseAnimation);
    };
    pulseAnimation();
    
    this.scene.add(marker);
    this.markers.push(marker);
    
    return marker;
  }
  
  /**
   * Create a checkpoint at the specified position
   */
  protected createCheckpoint(position: THREE.Vector3, radius = 2, color = 0x00ff00): THREE.Mesh {
    // Create a ring for the checkpoint
    const geometry = new THREE.TorusGeometry(radius, 0.3, 16, 32);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.5
    });
    
    const checkpoint = new THREE.Mesh(geometry, material);
    checkpoint.position.copy(position);
    checkpoint.position.y += 0.3; // Slightly above ground
    checkpoint.rotation.x = Math.PI / 2; // Lay flat
    
    // Add rotating animation
    const rotateAnimation = () => {
      checkpoint.rotation.z += 0.01;
      requestAnimationFrame(rotateAnimation);
    };
    rotateAnimation();
    
    this.scene.add(checkpoint);
    this.checkpoints.push(checkpoint);
    
    return checkpoint;
  }
  
  /**
   * Check if player is within range of a position
   */
  protected isPlayerInRange(position: THREE.Vector3, range: number): boolean {
    const playerPosition = this.player.getPosition();
    return playerPosition.distanceTo(position) <= range;
  }
  
  /**
   * Advance to the next objective
   */
  protected advanceObjective(): void {
    if (this.currentObjectiveIndex < this.objectives.length - 1) {
      this.currentObjectiveIndex++;
    } else {
      // All objectives completed
      this.isComplete = true;
    }
  }
  
  /**
   * Fail the mission with a reason
   */
  protected failMission(reason: string): void {
    this.isFailed = true;
    this.failReason = reason;
  }
  
  // Getters
  
  public getId(): string {
    return this.id;
  }
  
  public getTitle(): string {
    return this.title;
  }
  
  public getDescription(): string {
    return this.description;
  }
  
  public getCurrentObjective(): string {
    return this.objectives[this.currentObjectiveIndex] || 'No objective';
  }
  
  public getTimeLimit(): number {
    return this.timeLimit;
  }
  
  public getReward(): string {
    return this.reward;
  }
  
  public getUnlocksMissions(): string[] {
    return this.unlocksMissions;
  }
  
  public isCompleted(): boolean {
    return this.isComplete;
  }
  
  public hasFailed(): boolean {
    return this.isFailed;
  }
  
  public getFailReason(): string {
    return this.failReason;
  }
}