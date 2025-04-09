import * as THREE from 'three';
import { Mission } from './Mission';
import { Player } from '../Player';
import { InputManager } from '../InputManager';
import { HumanAnimationState } from '../models/HumanModel';

/**
 * DeliveryMission is a classic GTA3-style mission where the player
 * must pick up a package and deliver it to a destination within a time limit
 */
export class DeliveryMission extends Mission {
  // Mission locations
  private startPosition: THREE.Vector3 = new THREE.Vector3(10, 0, 10);
  private pickupPosition: THREE.Vector3 = new THREE.Vector3(-15, 0, 5);
  private deliveryPosition: THREE.Vector3 = new THREE.Vector3(25, 0, -20);
  
  // Mission state
  private hasPackage = false;
  private packagePickedUpTime = 0;
  
  // Mission markers
  private pickupMarker: THREE.Mesh | null = null;
  private deliveryMarker: THREE.Mesh | null = null;
  
  // Package object
  private packageObject: THREE.Mesh | null = null;
  
  constructor(scene: THREE.Scene, player: Player, inputManager: InputManager) {
    super(scene, player, inputManager);
    
    // Set mission properties
    this.id = 'delivery1';
    this.title = 'Special Delivery';
    this.description = 'El Burro needs you to deliver a special package across town. Be quick about it!';
    
    // Set mission objectives
    this.objectives = [
      'Find and pick up the package',
      'Deliver the package to the drop-off point',
      'Avoid damaging the package (don\'t crash)'
    ];
    
    // Set time limit (2 minutes)
    this.timeLimit = 120;
    
    // Set reward
    this.reward = '$1000';
    
    // Unlock the next mission
    this.unlocksMissions = ['chasedown1'];
  }
  
  /**
   * Initialize the delivery mission
   */
  public initialize(): void {
    // Reset mission state
    this.isActive = true;
    this.isComplete = false;
    this.isFailed = false;
    this.hasPackage = false;
    this.currentObjectiveIndex = 0;
    
    // Reset player position
    this.player.setPosition(this.startPosition);
    
    // Create pickup marker (blue)
    this.pickupMarker = this.createMarker(this.pickupPosition, 0x0088ff);
    
    // Create delivery marker (initially hidden)
    this.deliveryMarker = this.createCheckpoint(this.deliveryPosition, 2, 0x00ff00);
    this.deliveryMarker.visible = false;
    
    // Create package object
    this.createPackage();
  }
  
  /**
   * Create the package object
   */
  private createPackage(): void {
    // Create a simple box for the package
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material = new THREE.MeshLambertMaterial({ color: 0xbb8844 }); // Brown box
    
    this.packageObject = new THREE.Mesh(geometry, material);
    this.packageObject.position.copy(this.pickupPosition);
    this.packageObject.position.y += 0.25; // Place on ground
    
    // Add to scene
    this.scene.add(this.packageObject);
  }
  
  /**
   * Update the delivery mission
   */
  public update(deltaTime: number): void {
    if (!this.isActive || this.isComplete || this.isFailed) return;
    
    // Check for mission failure (time limit)
    if (this.timeLimit > 0 && this.packagePickedUpTime > 0) {
      const elapsedTime = (Date.now() - this.packagePickedUpTime) / 1000;
      if (elapsedTime > this.timeLimit) {
        this.failMission('You ran out of time!');
        return;
      }
    }
    
    // Check for package pickup
    if (!this.hasPackage && this.isPlayerInRange(this.pickupPosition, 2)) {
      this.pickupPackage();
    }
    
    // Check for package delivery
    if (this.hasPackage && this.isPlayerInRange(this.deliveryPosition, 3)) {
      this.deliverPackage();
    }
    
    // Update package position if player has it
    if (this.hasPackage && this.packageObject) {
      this.updatePackagePosition();
    }
    
    // Check for vehicle crashes when carrying package
    if (this.hasPackage && this.player.isInsideVehicle() && this.player.hasCollidedRecently()) {
      this.failMission('You damaged the package in a crash!');
    }
  }
  
  /**
   * Handle package pickup
   */
  private pickupPackage(): void {
    this.hasPackage = true;
    this.packagePickedUpTime = Date.now();
    
    // Hide pickup marker
    if (this.pickupMarker) {
      this.pickupMarker.visible = false;
    }
    
    // Show delivery marker
    if (this.deliveryMarker) {
      this.deliveryMarker.visible = true;
    }
    
    // Update objective
    this.advanceObjective();
    
    // Play pickup animation if player is not in vehicle
    if (!this.player.isInsideVehicle()) {
      // In a real implementation, we would play a pickup animation here
      // this.player.playAnimation(HumanAnimationState.PICKUP);
    }
  }
  
  /**
   * Handle package delivery
   */
  private deliverPackage(): void {
    this.hasPackage = false;
    
    // Hide delivery marker
    if (this.deliveryMarker) {
      this.deliveryMarker.visible = false;
    }
    
    // Remove package from scene
    if (this.packageObject) {
      this.scene.remove(this.packageObject);
      this.packageObject = null;
    }
    
    // Update objective
    this.advanceObjective();
    
    // Complete mission
    this.isComplete = true;
  }
  
  /**
   * Update package position to follow player
   */
  private updatePackagePosition(): void {
    if (!this.packageObject) return;
    
    if (this.player.isInsideVehicle()) {
      // Package is in the vehicle
      const playerPos = this.player.getPosition();
      const playerRot = this.player.getRotation();
      
      // Position package in the trunk/back of the vehicle
      const offset = new THREE.Vector3(0, 0.5, -1.5);
      offset.applyEuler(playerRot);
      
      this.packageObject.position.copy(playerPos).add(offset);
      this.packageObject.rotation.copy(playerRot);
    } else {
      // Package is carried by player
      const playerPos = this.player.getPosition();
      const playerRot = this.player.getRotation();
      
      // Position package in player's hands
      const offset = new THREE.Vector3(0.3, 0.5, 0.5);
      offset.applyEuler(playerRot);
      
      this.packageObject.position.copy(playerPos).add(offset);
    }
  }
  
  /**
   * Clean up mission resources
   */
  public cleanup(): void {
    super.cleanup();
    
    // Remove package from scene
    if (this.packageObject) {
      this.scene.remove(this.packageObject);
      this.packageObject = null;
    }
  }
}