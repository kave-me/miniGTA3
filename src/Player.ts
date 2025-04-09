import * as THREE from 'three';
import { InputManager } from './InputManager';
import { Environment } from './Environment';
import { Vehicle } from './Vehicle';
import { HumanModel, HumanAnimationState } from './models/HumanModel';

export class Player {
  // Player model
  private humanModel: HumanModel;
  
  // Player properties
  private position: THREE.Vector3;
  private velocity: THREE.Vector3;
  private rotation: THREE.Euler;
  private moveSpeed = 10.0;
  private rotationSpeed = 2.0;
  private gravity = 9.8;
  private jumpForce = 3.0; // Reduced from 5.0
  private jumpCooldown = 0.5; // seconds
  private lastJumpTime = 0;
  private isOnGround = false;
  private isMoving = false;
  private isRunning = false;
  
  // Vehicle interaction
  private currentVehicle: Vehicle | null = null;
  private isInVehicle = false;
  private isEnteringVehicle = false;
  private isExitingVehicle = false;
  private nearbyVehicles: Vehicle[] = [];
  
  // Collision properties
  private collider: THREE.Box3;
  private height = 1.8;
  private radius = 0.4;
  
  constructor(
    private scene: THREE.Scene,
    private inputManager: InputManager,
    private environment: Environment
  ) {
    // Initialize player position
    this.position = new THREE.Vector3(0, this.height / 2, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
    
    // Create human model
    this.humanModel = new HumanModel(this.scene);
    this.humanModel.load().then(() => {
      this.humanModel.setPosition(this.position);
      this.humanModel.playAnimation(HumanAnimationState.IDLE);
    });
    
    // Create collision box - temporary until model is loaded
    const tempGeometry = new THREE.BoxGeometry(this.radius * 2, this.height, this.radius * 2);
    const tempMesh = new THREE.Mesh(tempGeometry);
    tempMesh.visible = false;
    tempMesh.position.copy(this.position);
    this.collider = new THREE.Box3().setFromObject(tempMesh);
    
    // Add temp mesh to scene for collision updates
    this.scene.add(tempMesh);
  }
  
  public update(deltaTime: number): void {
    // Check for vehicle entry/exit
    this.handleVehicleInteraction();
    
    if (this.isInVehicle && this.currentVehicle) {
      // When in vehicle, update vehicle and sync player position
      this.currentVehicle.update(deltaTime, this.inputManager);
      
      // Sync player position with vehicle
      this.position.copy(this.currentVehicle.getPosition());
      this.rotation.copy(this.currentVehicle.getRotation());
      
      // Hide player model when in vehicle
      this.humanModel.setVisible(false);
    } else {
      // Normal player movement when not in vehicle
      // Handle player rotation from mouse input
      this.handleRotation(deltaTime);
      
      // Handle player movement from keyboard input
      this.handleMovement(deltaTime);
      
      // Apply gravity
      this.applyGravity(deltaTime);
      
      // Check for collisions and adjust position
      this.handleCollisions();
      
      // Update model position and rotation
      this.humanModel.setPosition(this.position);
      this.humanModel.setRotation(this.rotation);
      
      // Ensure player model is visible
      this.humanModel.setVisible(true);
    }
    
    // Update collider
    const playerMesh = this.humanModel.getMesh();
    if (playerMesh) {
      this.collider.setFromObject(playerMesh);
    }
  }
  
  private handleRotation(deltaTime: number): void {
    if (this.inputManager.isPointerLockActive()) {
      const mouseDelta = this.inputManager.getMouseDelta();
      
      // Rotate player based on mouse X movement - apply deltaTime for frame-rate independence
      this.rotation.y -= mouseDelta.x * 0.002 * this.rotationSpeed * deltaTime * 60;
      
      // We don't rotate the player mesh on the X axis (looking up/down)
      // That will be handled by the camera controller
    }
  }
  
  private handleMovement(deltaTime: number): void {
    // Calculate movement direction based on input
    const moveDirection = new THREE.Vector3(0, 0, 0);
    
    if (this.inputManager.isKeyPressed('w')) {
      moveDirection.z -= 1; // Forward
    }
    if (this.inputManager.isKeyPressed('s')) {
      moveDirection.z += 1; // Backward
    }
    if (this.inputManager.isKeyPressed('a')) {
      moveDirection.x -= 1; // Left
    }
    if (this.inputManager.isKeyPressed('d')) {
      moveDirection.x += 1; // Right
    }
    
    // Normalize movement direction if moving diagonally
    if (moveDirection.length() > 0) {
      moveDirection.normalize();
      this.isMoving = true;
      
      // Check if running (could be enhanced with shift key for sprint)
      this.isRunning = moveDirection.z < 0 && moveDirection.length() > 0.8;
      
      // Update animation state based on movement
      if (this.isRunning) {
        this.humanModel.playAnimation(HumanAnimationState.RUN);
      } else {
        this.humanModel.playAnimation(HumanAnimationState.WALK);
      }
    } else {
      this.isMoving = false;
      this.isRunning = false;
      this.humanModel.playAnimation(HumanAnimationState.IDLE);
    }
    
    // Apply player rotation to movement direction
    moveDirection.applyEuler(new THREE.Euler(0, this.rotation.y, 0));
    
    // Apply movement speed and delta time
    moveDirection.multiplyScalar(this.moveSpeed * deltaTime);
    
    // Update velocity (horizontal movement only)
    this.velocity.x = moveDirection.x;
    this.velocity.z = moveDirection.z;
    
    // Handle jumping with cooldown
    const currentTime = performance.now() / 1000; // Convert to seconds
    if (this.inputManager.isKeyPressed(' ') && this.isOnGround && 
        currentTime - this.lastJumpTime >= this.jumpCooldown) {
      this.velocity.y = this.jumpForce;
      this.isOnGround = false;
      this.lastJumpTime = currentTime;
    }
    
    // Apply velocity to position
    this.position.add(this.velocity);
  }
  
  private applyGravity(deltaTime: number): void {
    // Apply gravity if not on ground
    if (!this.isOnGround) {
      this.velocity.y -= this.gravity * deltaTime;
    }
    
    // Check if player is on ground
    const groundY = this.environment.getGroundHeight(this.position.x, this.position.z);
    if (this.position.y <= groundY + this.height / 2) {
      this.position.y = groundY + this.height / 2;
      this.velocity.y = 0;
      this.isOnGround = true;
    }
  }
  
  private handleCollisions(): void {
    // Get obstacles from environment
    const obstacles = this.environment.getObstacles();
    
    // Check for collisions with each obstacle
    for (const obstacle of obstacles) {
      if (this.collider.intersectsBox(obstacle)) {
        // Simple collision response - push player away from obstacle
        const obstacleCenter = new THREE.Vector3();
        obstacle.getCenter(obstacleCenter);
        
        const direction = new THREE.Vector3()
          .subVectors(this.position, obstacleCenter)
          .normalize();
        
        // Only adjust X and Z (horizontal movement)
        direction.y = 0;
        
        // Move player away from obstacle
        this.position.x += direction.x * 0.1;
        this.position.z += direction.z * 0.1;
      }
    }
  }
  
  // Vehicle interaction
  private lastInteractionTime = 0;
  private readonly INTERACTION_COOLDOWN: number = 100; // Reduced for even more responsive interaction
  private readonly VEHICLE_INTERACTION_RANGE: number = 2.5; // Increased for easier vehicle entry

  private handleVehicleInteraction(): void {
    const currentTime = Date.now();
    
    // Only process interaction if not currently in animation
    if (!this.isEnteringVehicle && !this.isExitingVehicle) {
      // Check for vehicle entry/exit with 'e' key with proper cooldown
      if (this.inputManager.isKeyPressed('e') && 
          currentTime - this.lastInteractionTime > this.INTERACTION_COOLDOWN) {
        
        this.lastInteractionTime = currentTime;
        
        if (this.isInVehicle && this.currentVehicle) {
          // Exit vehicle
          this.isExitingVehicle = true;
          this.humanModel.playAnimation(HumanAnimationState.EXIT_VEHICLE);
          
          // After animation delay, complete the exit
          setTimeout(() => {
            this.exitVehicle();
            this.isExitingVehicle = false;
          }, 500); // Animation time in ms
        } else {
          // Update nearby vehicles and find the closest one
          this.updateNearbyVehicles();
          
          // Find the nearest unoccupied vehicle without distance limit
          let nearestVehicle: Vehicle | null = null;
          let nearestDistance = Infinity;
          
          for (const vehicle of this.nearbyVehicles) {
            if (!vehicle.isOccupied()) {
              const distance = this.position.distanceTo(vehicle.getPosition());
              if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestVehicle = vehicle;
              }
            }
          }
          
          // If we found a vehicle, enter it immediately
          if (nearestVehicle) {
            this.currentVehicle = nearestVehicle;
            this.isEnteringVehicle = true;
            this.humanModel.playAnimation(HumanAnimationState.ENTER_VEHICLE);
            
            // After animation delay, complete the entry
            setTimeout(() => {
              this.enterVehicle(this.currentVehicle!);
              this.isEnteringVehicle = false;
              this.hideVehicleInteractionPrompt();
            }, 500); // Animation time in ms
          }
        }
      }
    }
  }

  private updateNearbyVehicles(): void {
    // Clear the current list
    this.nearbyVehicles = [];
    
    // Get all vehicles from the scene without distance filtering
    const vehicles = this.scene.children
      .filter(child => child instanceof THREE.Group)
      .map(group => {
        const vehicle = this.scene.userData.vehicles?.find(
          (v: Vehicle) => v.getMesh() === group
        );
        return vehicle || null;
      })
      .filter((v): v is Vehicle => v !== null);
    
    // Add all vehicles to the list without distance check
    this.nearbyVehicles = vehicles;
  }
  
  // Visual feedback for vehicle interaction
  private interactionPrompt: HTMLDivElement | null = null;

  private showVehicleInteractionPrompt(): void {
    if (!this.interactionPrompt) {
      this.interactionPrompt = document.createElement('div');
      this.interactionPrompt.className = 'vehicle-interaction-prompt';
      this.interactionPrompt.textContent = 'Press E to enter vehicle';
      document.body.appendChild(this.interactionPrompt);

      // Add CSS styles if not already present
      if (!document.querySelector('#vehicle-interaction-styles')) {
        const style = document.createElement('style');
        style.id = 'vehicle-interaction-styles';
        style.textContent = `
          .vehicle-interaction-prompt {
            position: fixed;
            left: 50%;
            top: 70%;
            transform: translate(-50%, -50%);
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            font-family: Arial, sans-serif;
            font-size: 16px;
            pointer-events: none;
            z-index: 1000;
            animation: fadeIn 0.3s ease-in-out;
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `;
        document.head.appendChild(style);
      }
    }
    this.interactionPrompt.style.display = 'block';
  }

  private hideVehicleInteractionPrompt(): void {
    if (this.interactionPrompt) {
      this.interactionPrompt.style.display = 'none';
    }
  }
  
  public enterVehicle(vehicle: Vehicle): void {
    if (!this.isInVehicle && vehicle && !vehicle.isOccupied()) {
      this.currentVehicle = vehicle;
      this.isInVehicle = true;
      vehicle.enterVehicle();
      
      // Sync position with vehicle immediately
      this.position.copy(vehicle.getPosition());
      this.rotation.copy(vehicle.getRotation());
      
      // Hide player model
      this.humanModel.setVisible(false);
    }
  }
  
  public exitVehicle(): void {
    if (this.isInVehicle && this.currentVehicle) {
      // Position player next to vehicle
      const exitOffset = new THREE.Vector3(2, 0, 0);
      exitOffset.applyEuler(this.currentVehicle.getRotation());
      this.position.copy(this.currentVehicle.getPosition()).add(exitOffset);
      
      // Make sure player is on the ground
      const groundY = this.environment.getGroundHeight(this.position.x, this.position.z);
      this.position.y = groundY + this.height / 2;
      
      // Update vehicle state
      this.currentVehicle.exitVehicle();
      this.currentVehicle = null;
      this.isInVehicle = false;
    }
  }
  
  // Getters for camera and other components
  
  public getPosition(): THREE.Vector3 {
    return this.position.clone();
  }
  
  public getRotation(): THREE.Euler {
    return this.rotation.clone();
  }
  
  public getMesh(): THREE.Group | null {
    return this.humanModel.getMesh();
  }
  
  public isInsideVehicle(): boolean {
    return this.isInVehicle;
  }
  
  public getCurrentVehicle(): Vehicle | null {
    return this.currentVehicle;
  }
  
  public setCurrentVehicle(vehicle: Vehicle | null): void {
    this.currentVehicle = vehicle;
  }
}