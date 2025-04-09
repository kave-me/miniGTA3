import * as THREE from 'three';
import { InputManager } from './InputManager';
import { Environment } from './Environment';
import { VehicleModel, VehicleType } from './models/VehicleModel';

export class Vehicle {
  // Vehicle mesh and model
  private mesh: THREE.Group;
  private vehicleModel: VehicleModel;
  private vehicleType: VehicleType = VehicleType.SEDAN;
  
  // Vehicle properties
  private position: THREE.Vector3;
  private velocity: THREE.Vector3;
  private rotation: THREE.Euler;
  // Used by VehicleModel for wheel animation
  private steeringAngle = 0;
  private maxSteeringAngle: number = Math.PI / 4; // 45 degrees
  
  // Physics properties
  private acceleration = 25.0; // Increased from 15.0
  private deceleration = 15.0; // Increased from 8.0
  private maxSpeed = 30.0; // Increased from 20.0
  private currentSpeed = 0.0;
  private steeringSpeed = 3.0; // Increased from 2.0
  private steeringReturn = 8.0; // Increased from 5.0 for quicker centering
  
  // Enhanced physics properties
  private mass = 1000; // Reduced from 1200 for more responsive feel
  private enginePower = 500; // Increased from 400
  private brakingForce = 1200; // Increased from 800
  private dragCoefficient = 0.3; // Reduced from 0.4 for less air resistance
  private rollingResistance = 0.03; // Reduced from 0.05 for smoother rolling
  private corneringStiffness = 7.0; // Increased from 5.0 for better turning
  private suspensionStiffness = 12.0; // Increased from 10.0
  private suspensionDamping = 0.9; // Increased from 0.8
  private suspensionTravel = 0.25; // Increased from 0.2
  private _hasCollidedRecently = false;
  private collisionCooldown = 0;
  
  // AI control properties
  private _isAIControlled = false;
  private aiTargetPosition: THREE.Vector3 = new THREE.Vector3();
  private aiTargetRotation = 0;
  private aiTargetSpeed = 0;
  
  // Collision properties
  private collider: THREE.Box3 = new THREE.Box3();

  // Getter and setter for collision state
  public get hasCollidedRecently(): boolean {
    return this._hasCollidedRecently;
  }
  
  private set hasCollidedRecently(value: boolean) {
    this._hasCollidedRecently = value;
  }

  // Getter for AI control state
  public get isAIControlled(): boolean {
    return this._isAIControlled;
  }
  // Vehicle dimensions used for collision detection and visual representation
  private width = 2.0;
  private height = 1.5;
  private length = 4.0;
  
  // State
  private _isOccupied = false;
  
  public get isOccupied(): boolean {
    return this._isOccupied;
  }
  
  public set isOccupied(value: boolean) {
    this._isOccupied = value;
  }
  
  constructor(
    private scene: THREE.Scene,
    private environment: Environment,
    initialPosition: THREE.Vector3 = new THREE.Vector3(10, 0, 10),
    initialRotation = 0
  ) {
    // Initialize vehicle position
    this.position = initialPosition.clone();
    this.position.y = environment.getGroundHeight(initialPosition.x, initialPosition.z) + this.height / 2;
    
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.rotation = new THREE.Euler(0, initialRotation, 0, 'YXZ');
    
    // Create vehicle model
    this.vehicleModel = new VehicleModel(this.scene, this.vehicleType);
    
    // Create a dummy group until the model loads
    this.mesh = new THREE.Group();
    
    // Use dimensions for collision setup
    this.setupCollider();
    
    // Load the vehicle model
    this.vehicleModel.load().then(() => {
      // Update mesh reference after loading
      const vehicleMesh = this.vehicleModel.getMesh();
      if (vehicleMesh) {
        this.mesh = vehicleMesh;
        
        // Set initial position and rotation
        this.vehicleModel.setPosition(this.position);
        this.vehicleModel.setRotation(this.rotation);
        
        // Update collision box
        this.collider.setFromObject(this.mesh);
      }
    });
  }
  
  private setupCollider(): void {
    // Create a simple box collider based on vehicle dimensions
    const tempBox = new THREE.BoxGeometry(this.width, this.height, this.length);
    const tempMesh = new THREE.Mesh(tempBox);
    tempMesh.position.copy(this.position);
    
    // Update collider
    this.collider.setFromObject(tempMesh);
  }
  
  // Implement GTA3-style damage model
  public damageVehicle(amount: number, position: THREE.Vector3): void {
    // Reduce health
    // For now, just print damage info
    console.log(`Vehicle damaged: ${amount} at position:`, position);
    
    // In a more complete implementation, we would deform the vehicle mesh
    // and potentially change its handling characteristics based on damage
  }
  
  public update(deltaTime: number, inputManager?: InputManager): void {
    // If player is controlling this vehicle
    if (this.isOccupied && inputManager) {
      this.handleDriving(deltaTime, inputManager);
    } else if (this.isAIControlled) {
      // AI control logic
      this.applyAIPhysics(deltaTime);
    } else {
      // Apply physics when not controlled (e.g., rolling to a stop)
      this.applyPhysics(deltaTime);
    }
    
    // Check for collisions and adjust position
    this.handleCollisions();
    
    // Update vehicle model position and rotation
    this.vehicleModel.setPosition(this.position);
    this.vehicleModel.setRotation(this.rotation);
    
    // Update vehicle model (wheels, etc.)
    this.vehicleModel.update(deltaTime, this.steeringAngle, this.currentSpeed);
    
    // Play engine sound
    if (Math.abs(this.currentSpeed) > 0.1) {
      this.playEngineSound();
    }
    
    // Update collider
    this.collider.setFromObject(this.mesh);
    
    // Update collision cooldown
    if (this.collisionCooldown > 0) {
      this.collisionCooldown -= deltaTime;
    }
  }
  
  /**
   * Simplified update for distant vehicles (performance optimization)
   * @param deltaTime Time since last frame in seconds
   * @param intensityFactor Factor to reduce update intensity (0.0-1.0)
   */
  public updateSimple(deltaTime: number, intensityFactor = 0.5): void {
    // Apply simplified physics (reduced calculations)
    if (this.currentSpeed > 0) {
      // Apply simplified deceleration
      this.currentSpeed *= (1 - 0.5 * deltaTime * intensityFactor);
      
      // If speed is very low, just stop completely
      if (this.currentSpeed < 0.1) {
        this.currentSpeed = 0;
      }
    }
    
    // Calculate simplified velocity based on current rotation and speed
    if (this.currentSpeed > 0) {
      // Create direction vector from rotation
      const direction = new THREE.Vector3(0, 0, -1);
      direction.applyEuler(this.rotation);
      
      // Apply direction and speed to position
      this.position.x += direction.x * this.currentSpeed * deltaTime;
      this.position.z += direction.z * this.currentSpeed * deltaTime;
      
      // Update model position
      this.vehicleModel.setPosition(this.position);
      
      // Update wheel rotation but skip other animations
      this.vehicleModel.updateWheelsOnly(deltaTime, this.currentSpeed);
    }
    
    // Update collider with reduced frequency (every other frame)
    if (Math.random() > 0.5) {
      this.collider.setFromObject(this.mesh);
    }
  }
  
  private handleDriving(deltaTime: number, inputManager: InputManager): void {
    // Acceleration/braking
    if (inputManager.isKeyPressed('w')) {
      // Accelerate forward
      const speedFactor = 1.0 - (this.currentSpeed / this.maxSpeed);
      const accelerationForce = this.acceleration * speedFactor * deltaTime;
      this.currentSpeed = Math.min(this.currentSpeed + accelerationForce, this.maxSpeed);
    } else if (inputManager.isKeyPressed('s')) {
      // Brake or reverse
      if (this.currentSpeed > 0) {
        // Apply brakes
        this.currentSpeed = Math.max(0, this.currentSpeed - this.brakingForce * deltaTime);
      } else {
        // Reverse with limited speed
        this.currentSpeed = Math.max(-this.maxSpeed * 0.5, this.currentSpeed - this.acceleration * deltaTime);
      }
    } else {
      // No input - gradually slow down
      if (Math.abs(this.currentSpeed) > 0) {
        const decelForce = this.deceleration * deltaTime;
        if (this.currentSpeed > 0) {
          this.currentSpeed = Math.max(0, this.currentSpeed - decelForce);
        } else {
          this.currentSpeed = Math.min(0, this.currentSpeed + decelForce);
        }
      }
    }
  
    // Steering
    if (inputManager.isKeyPressed('a')) {
      // Turn left - steering angle increases with speed
      const steeringFactor = Math.min(1.0, Math.abs(this.currentSpeed) / (this.maxSpeed * 0.5));
      this.steeringAngle = Math.min(
        this.steeringAngle + this.steeringSpeed * deltaTime,
        this.maxSteeringAngle * steeringFactor
      );
    } else if (inputManager.isKeyPressed('d')) {
      // Turn right
      const steeringFactor = Math.min(1.0, Math.abs(this.currentSpeed) / (this.maxSpeed * 0.5));
      this.steeringAngle = Math.max(
        this.steeringAngle - this.steeringSpeed * deltaTime,
        -this.maxSteeringAngle * steeringFactor
      );
    } else {
      // Return steering to center
      if (this.steeringAngle > 0) {
        this.steeringAngle = Math.max(0, this.steeringAngle - this.steeringReturn * deltaTime);
      } else if (this.steeringAngle < 0) {
        this.steeringAngle = Math.min(0, this.steeringAngle + this.steeringReturn * deltaTime);
      }
    }
  
    // Apply steering to rotation based on speed
    if (Math.abs(this.currentSpeed) > 0.1) {
      const rotationAmount = this.steeringAngle * (this.currentSpeed / this.maxSpeed) * deltaTime * 2.0;
      this.rotation.y += rotationAmount;
    }
  
    // Calculate velocity based on current rotation and speed
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyEuler(this.rotation);
    this.velocity.x = direction.x * this.currentSpeed;
    this.velocity.z = direction.z * this.currentSpeed;
  
    // Apply velocity to position
    this.position.add(this.velocity.multiplyScalar(deltaTime));
  
    // Keep vehicle on the ground
    const groundY = this.environment.getGroundHeight(this.position.x, this.position.z);
    this.position.y = groundY + this.height / 2;
  }
  
  private applyPhysics(deltaTime: number): void {
    // Reset collision flag if cooldown has expired
    if (this.collisionCooldown > 0) {
      this.collisionCooldown -= deltaTime;
      if (this.collisionCooldown <= 0) {
        this._hasCollidedRecently = false;
      }
    }
    
    // Handle AI-controlled vehicles differently
    if (this._isAIControlled) {
      this.applyAIPhysics(deltaTime);
      return;
    }
    
    if (Math.abs(this.currentSpeed) > 0.01) {
      // Calculate movement direction based on current rotation
      const moveDirection = new THREE.Vector3(0, 0, -1).applyEuler(this.rotation);
      
      // Calculate forces
      let tractionForce = 0;
      let dragForce = 0;
      let rollingResistanceForce = 0;
      
      // Traction force (engine power or braking)
      if (this.currentSpeed >= 0) {
        // Forward motion
        tractionForce = this.enginePower * (this.currentSpeed < this.maxSpeed ? 1 : 0);
      } else {
        // Reverse motion
        tractionForce = -this.enginePower * 0.5 * (this.currentSpeed > -this.maxSpeed * 0.5 ? 1 : 0);
      }
      
      // Air resistance (increases with speed squared)
      dragForce = this.dragCoefficient * this.currentSpeed * Math.abs(this.currentSpeed);
      
      // Rolling resistance (tire friction)
      rollingResistanceForce = this.rollingResistance * this.currentSpeed;
      
      // Net force
      const netForce = tractionForce - dragForce - rollingResistanceForce;
      
      // Acceleration (F = ma)
      const acceleration = netForce / this.mass;
      
      // Update speed
      this.currentSpeed += acceleration * deltaTime;
      
      // Apply velocity based on current speed
      this.velocity.copy(moveDirection).multiplyScalar(this.currentSpeed * deltaTime);
      
      // Apply steering (rotate based on speed and steering angle)
      if (Math.abs(this.steeringAngle) > 0.01 && Math.abs(this.currentSpeed) > 0.5) {
        // Calculate turn rate based on speed and cornering stiffness
        // Slower speed = sharper turns, higher cornering stiffness = more responsive steering
        const speedFactor = Math.min(Math.abs(this.currentSpeed) / 10, 1.0);
        const turnFactor = this.corneringStiffness * (1.0 - 0.5 * speedFactor);
        const turnRate = this.steeringAngle * turnFactor * (this.currentSpeed > 0 ? 1 : -1);
        
        // Apply rotation
        this.rotation.y += turnRate * deltaTime;
      }
      
      // Apply velocity to position
      this.position.add(this.velocity);
      
      // Apply suspension
      const groundY = this.environment.getGroundHeight(this.position.x, this.position.z);
      const targetHeight = groundY + this.height / 2;
      const currentHeight = this.position.y;
      const suspensionOffset = targetHeight - currentHeight;
      
      // Limit suspension travel
      const clampedOffset = Math.max(-this.suspensionTravel, Math.min(this.suspensionTravel, suspensionOffset));
      
      // Apply suspension force (spring and damping)
      const suspensionForce = clampedOffset * this.suspensionStiffness;
      const dampingForce = (suspensionOffset - clampedOffset) * this.suspensionDamping;
      
      // Update height with suspension
      this.position.y = currentHeight + (suspensionForce + dampingForce) * deltaTime;
      
      // Ensure minimum ground clearance
      if (this.position.y < groundY + this.height * 0.3) {
        this.position.y = groundY + this.height * 0.3;
      }
    }
  }
  
  /**
   * Apply physics for AI-controlled vehicles
   */
  private applyAIPhysics(deltaTime: number): void {
    // Move towards target position
    if (this.aiTargetPosition) {
      // Calculate direction to target
      const direction = new THREE.Vector3();
      direction.subVectors(this.aiTargetPosition, this.position);
      direction.y = 0; // Keep movement on the ground plane
      
      // Gradually rotate towards target rotation
      const currentRotation = this.rotation.y;
      let rotationDiff = this.aiTargetRotation - currentRotation;
      
      // Normalize rotation difference to [-PI, PI]
      if (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
      if (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;
      
      // Apply rotation with smooth turning
      this.rotation.y += Math.sign(rotationDiff) * Math.min(Math.abs(rotationDiff), this.steeringSpeed * deltaTime);
      
      // Gradually adjust speed towards target speed
      if (this.currentSpeed < this.aiTargetSpeed) {
        this.currentSpeed += this.acceleration * 0.5 * deltaTime;
      } else if (this.currentSpeed > this.aiTargetSpeed) {
        this.currentSpeed -= this.deceleration * deltaTime;
      }
      
      // Clamp speed
      this.currentSpeed = Math.max(-this.maxSpeed * 0.5, Math.min(this.currentSpeed, this.maxSpeed));
      
      // Apply movement
      const moveDirection = new THREE.Vector3(0, 0, -1).applyEuler(this.rotation);
      this.velocity.copy(moveDirection).multiplyScalar(this.currentSpeed * deltaTime);
      this.position.add(this.velocity);
      
      // Keep on ground with suspension
      const groundY = this.environment.getGroundHeight(this.position.x, this.position.z);
      const targetHeight = groundY + this.height / 2;
      const currentHeight = this.position.y;
      const suspensionOffset = targetHeight - currentHeight;
      
      // Apply simplified suspension
      this.position.y = currentHeight + suspensionOffset * this.suspensionStiffness * deltaTime;
      
      // Ensure minimum ground clearance
      if (this.position.y < groundY + this.height * 0.3) {
        this.position.y = groundY + this.height * 0.3;
      }
    }
  }
  
  // Play engine sound with volume based on speed
  private playEngineSound(): void {
    // Would integrate with audio system
    // For now just a placeholder for future audio implementation
    const volume = Math.min(1.0, Math.abs(this.currentSpeed) / this.maxSpeed);
    // Use volume for audio system when implemented
    if (volume > 0.8) {
      // High speed - would play louder engine sound
    }
  }
  
  private handleCollisions(): void {
    // Get obstacles from environment
    const obstacles = this.environment.getObstacles();
    
    // Check for collisions with each obstacle
    let hasCollided = false;
    for (const obstacle of obstacles) {
      if (this.collider.intersectsBox(obstacle)) {
        hasCollided = true;
        
        // Calculate collision response
        const obstacleCenter = new THREE.Vector3();
        obstacle.getCenter(obstacleCenter);
        
        const direction = new THREE.Vector3()
          .subVectors(this.position, obstacleCenter)
          .normalize();
        
        // Only adjust X and Z (horizontal movement)
        direction.y = 0;
        
        // Calculate collision force based on speed and angle
        const impactSpeed = Math.abs(this.currentSpeed);
        const impactAngle = Math.abs(direction.dot(new THREE.Vector3(0, 0, -1).applyEuler(this.rotation)));
        
        // Head-on collisions slow the vehicle more than glancing blows
        const speedReduction = 0.5 + (impactAngle * 0.5);
        this.currentSpeed *= (1 - speedReduction);
        
        // Apply impulse force to push vehicle away
        const pushForce = 0.2 + (impactSpeed * 0.05);
        this.position.x += direction.x * pushForce;
        this.position.z += direction.z * pushForce;
        
        // Add some rotation based on impact angle and point
        const rightVector = new THREE.Vector3(1, 0, 0).applyEuler(this.rotation);
        const impactSide = direction.dot(rightVector);
        
        // Rotate vehicle based on which side was hit
        this.rotation.y += impactSide * 0.1 * impactSpeed / this.mass;
        
        // Apply damage to vehicle (visual effects would be added here)
        this.damageVehicle(impactSpeed * 10, this.position.clone().add(direction.multiplyScalar(-1)));
      }
    }
    
    // Update collision state
    if (hasCollided) {
      this._hasCollidedRecently = true;
      this.collisionCooldown = 1.0; // 1 second cooldown
    }
  }
  
  // Methods for player interaction
  
  // Vehicle interaction
  private interactionRange = 1.5; // Reduced from 3.0 for more precise interaction
  
  public canInteract(playerPosition: THREE.Vector3): boolean {
    // Check if player is close enough to interact with vehicle
    const distance = this.position.distanceTo(playerPosition);
    return distance < this.interactionRange && !this.isOccupied; // Only allow interaction if vehicle is not occupied
  }
  
  public enterVehicle(): void {
    this.isOccupied = true;
    
    // Play door open animation
    this.vehicleModel.animateDoor(2, true); // Left front door
  }
  
  public exitVehicle(): void {
    this.isOccupied = false;
    
    // Play door open animation
    this.vehicleModel.animateDoor(2, true); // Left front door
    
    // Close the door after a delay
    setTimeout(() => {
      this.vehicleModel.animateDoor(2, false);
    }, 2000);
  }
  
  public isPlayerInside(): boolean {
    return this.isOccupied;
  }
  
  // AI control methods
  
  /**
   * Set whether this vehicle is AI controlled
   */
  public setAIControlled(isAI: boolean): void {
    this._isAIControlled = isAI;
  }
  
  /**
   * Set the target position for AI movement
   */
  public setAITargetPosition(position: THREE.Vector3): void {
    this.aiTargetPosition = position.clone();
  }
  
  /**
   * Set the target rotation for AI movement
   */
  public setAITargetRotation(rotation: number): void {
    this.aiTargetRotation = rotation;
  }
  
  /**
   * Set the target speed for AI movement
   */
  public setAITargetSpeed(speed: number): void {
    this.aiTargetSpeed = speed;
  }
  
  // Getters and setters
  
  public getPosition(): THREE.Vector3 {
    return this.position.clone();
  }
  
  public getRotation(): THREE.Euler {
    return this.rotation.clone();
  }
  
  public getMesh(): THREE.Group {
    return this.vehicleModel.getMesh() || new THREE.Group();
  }
  
  public getCollider(): THREE.Box3 {
    return this.collider;
  }
  
  /**
   * Get the current speed of the vehicle
   */
  public getCurrentSpeed(): number {
    return this.currentSpeed;
  }
  

}