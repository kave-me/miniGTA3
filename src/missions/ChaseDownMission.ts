import * as THREE from 'three';
import { Mission } from './Mission';
import { Player } from '../Player';
import { InputManager } from '../InputManager';
import { HumanAnimationState } from '../models/HumanModel';

/**
 * ChaseDownMission is a classic GTA3-style mission where the player
 * must chase down and stop a target vehicle within a time limit
 */
export class ChaseDownMission extends Mission {
  // Mission locations
  private startPosition: THREE.Vector3 = new THREE.Vector3(15, 0, 15);
  private targetStartPosition: THREE.Vector3 = new THREE.Vector3(20, 0, 20);
  private targetEndPosition: THREE.Vector3 = new THREE.Vector3(-30, 0, -30);
  
  // Mission state
  private targetCaught = false;
  private missionStartTime = 0;
  
  // Mission markers
  private targetMarker: THREE.Mesh | null = null;
  
  // Target vehicle object
  private targetVehicle: THREE.Object3D | null = null;
  private targetPosition: THREE.Vector3 = new THREE.Vector3();
  private targetRotation: THREE.Euler = new THREE.Euler();
  
  constructor(scene: THREE.Scene, player: Player, inputManager: InputManager) {
    super(scene, player, inputManager);
    
    // Set mission properties
    this.id = 'chasedown1';
    this.title = 'Hot Pursuit';
    this.description = 'A gang member is trying to escape. Chase him down before he gets away!';
    
    // Set mission objectives
    this.objectives = [
      'Get in a vehicle',
      'Chase down the target vehicle',
      'Stop the target vehicle by ramming into it'
    ];
    
    // Set time limit (3 minutes)
    this.timeLimit = 180;
    
    // Set reward
    this.reward = '$2000';
    
    // Unlock the next mission
    this.unlocksMissions = ['heist1'];
  }
  
  /**
   * Initialize the chase mission
   */
  public initialize(): void {
    // Reset mission state
    this.isActive = true;
    this.isComplete = false;
    this.isFailed = false;
    this.targetCaught = false;
    this.currentObjectiveIndex = 0;
    this.missionStartTime = Date.now();
    
    // Reset player position
    this.player.setPosition(this.startPosition);
    
    // Create target vehicle
    this.createTargetVehicle();
    
    // Create target marker (red)
    this.targetMarker = this.createMarker(this.targetStartPosition, 0xff0000);
  }
  
  /**
   * Create the target vehicle
   */
  private createTargetVehicle(): void {
    // Create a simple box for the target vehicle
    const geometry = new THREE.BoxGeometry(2, 1, 4);
    const material = new THREE.MeshLambertMaterial({ color: 0x990000 }); // Red car
    
    this.targetVehicle = new THREE.Mesh(geometry, material);
    this.targetVehicle.position.copy(this.targetStartPosition);
    this.targetVehicle.position.y += 0.5; // Place on ground
    
    // Add to scene
    this.scene.add(this.targetVehicle);
    
    // Initialize target position
    this.targetPosition.copy(this.targetStartPosition);
  }
  
  /**
   * Update the chase mission
   */
  public update(deltaTime: number): void {
    if (!this.isActive || this.isComplete || this.isFailed) return;
    
    // Check for mission failure (time limit)
    if (this.timeLimit > 0) {
      const elapsedTime = (Date.now() - this.missionStartTime) / 1000;
      if (elapsedTime > this.timeLimit) {
        this.failMission('You ran out of time! The target escaped.');
        return;
      }
    }
    
    // Check if player is in a vehicle
    if (this.currentObjectiveIndex === 0 && this.player.isInsideVehicle()) {
      this.advanceObjective();
    }
    
    // Update target vehicle position
    this.updateTargetVehicle(deltaTime);
    
    // Check if player has caught the target
    if (this.currentObjectiveIndex >= 1 && !this.targetCaught && this.isPlayerNearTarget(5)) {
      if (this.player.isInsideVehicle() && this.player.hasCollidedRecently()) {
        this.catchTarget();
      }
    }
    
    // Update marker position to follow target
    if (this.targetMarker && this.targetVehicle) {
      this.targetMarker.position.copy(this.targetVehicle.position);
      this.targetMarker.position.y += 2; // Position above target vehicle
    }
  }
  
  /**
   * Update target vehicle movement
   */
  private updateTargetVehicle(deltaTime: number): void {
    if (!this.targetVehicle || this.targetCaught) return;
    
    // Calculate direction to end position
    const direction = new THREE.Vector3();
    direction.subVectors(this.targetEndPosition, this.targetPosition);
    
    // If we're close to the end position, fail the mission
    if (direction.length() < 5) {
      this.failMission('The target escaped!');
      return;
    }
    
    // Normalize direction
    direction.normalize();
    
    // Calculate speed (faster if player is close)
    const distanceToPlayer = this.targetPosition.distanceTo(this.player.getPosition());
    const baseSpeed = 5; // Base units per second
    const speedMultiplier = Math.max(0.5, Math.min(2.0, distanceToPlayer / 20));
    const speed = baseSpeed * speedMultiplier * deltaTime;
    
    // Update position
    this.targetPosition.add(direction.multiplyScalar(speed));
    
    // Update rotation to face direction of travel
    this.targetRotation.y = Math.atan2(direction.x, direction.z);
    
    // Apply to target vehicle
    this.targetVehicle.position.copy(this.targetPosition);
    this.targetVehicle.position.y = 0.5; // Keep at ground level
    this.targetVehicle.rotation.copy(this.targetRotation);
  }
  
  /**
   * Check if player is near the target
   */
  private isPlayerNearTarget(distance: number): boolean {
    if (!this.targetVehicle) return false;
    
    const playerPos = this.player.getPosition();
    return playerPos.distanceTo(this.targetPosition) < distance;
  }
  
  /**
   * Handle catching the target
   */
  private catchTarget(): void {
    this.targetCaught = true;
    
    // Update objective
    this.advanceObjective();
    
    // Hide target marker
    if (this.targetMarker) {
      this.targetMarker.visible = false;
    }
    
    // Stop target vehicle
    if (this.targetVehicle) {
      // Change color to indicate it's been caught
      const material = new THREE.MeshLambertMaterial({ color: 0x555555 }); // Gray (damaged)
      (this.targetVehicle as THREE.Mesh).material = material;
    }
    
    // Complete mission
    this.isComplete = true;
  }
  
  /**
   * Clean up mission resources
   */
  public cleanup(): void {
    super.cleanup();
    
    // Remove target vehicle from scene
    if (this.targetVehicle) {
      this.scene.remove(this.targetVehicle);
      this.targetVehicle = null;
    }
  }
}