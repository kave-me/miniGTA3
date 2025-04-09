import * as THREE from 'three';
import { HumanModel, HumanAnimationState } from './models/HumanModel';
import { Environment } from './Environment';
import { Player } from './Player';
import { Vehicle } from './Vehicle';

/**
 * Pedestrian behavior states
 */
export enum PedestrianState {
  IDLE = 'idle',
  WALKING = 'walking',
  RUNNING = 'running',
  PANICKING = 'panicking',
  WAITING_TO_CROSS = 'waiting_to_cross',
  ENTERING_VEHICLE = 'entering_vehicle',
  EXITING_VEHICLE = 'exiting_vehicle'
}

/**
 * Pedestrian class represents an AI-controlled character that walks around
 * the city, interacts with the environment, and reacts to the player
 */
export class Pedestrian {
  // Core properties
  private model: HumanModel;
  private position: THREE.Vector3;
  private rotation: THREE.Euler;
  private velocity: THREE.Vector3;
  private collider: THREE.Box3;
  
  // AI state
  private state: PedestrianState = PedestrianState.IDLE;
  private targetPosition: THREE.Vector3 | null = null;
  private path: THREE.Vector3[] = [];
  private currentPathIndex = 0;
  private stateTime = 0;
  private waitTime = 0;
  private maxWaitTime = 5; // Maximum time to wait in seconds
  
  // Movement properties
  private walkSpeed = 1.2;
  private runSpeed = 4.0;
  private panicSpeed = 5.0;
  private turnSpeed = 2.0;
  
  // Interaction properties
  private fleeRadius = 8;
  private targetVehicle: Vehicle | null = null;
  
  constructor(
    private scene: THREE.Scene,
    private environment: Environment,
    initialPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
    initialRotation = 0
  ) {
    // Initialize position and rotation
    this.position = initialPosition.clone();
    this.position.y = environment.getGroundHeight(initialPosition.x, initialPosition.z);
    this.rotation = new THREE.Euler(0, initialRotation, 0, 'YXZ');
    this.velocity = new THREE.Vector3(0, 0, 0);
    
    // Create human model
    this.model = new HumanModel(this.scene);
    
    // Create collider
    this.collider = new THREE.Box3(new THREE.Vector3(-0.3, 0, -0.3), new THREE.Vector3(0.3, 1.8, 0.3));
    this.updateCollider();
    
    // Load the model
    this.model.load().then(() => {
      // Set initial position and rotation
      this.model.setPosition(this.position);
      this.model.setRotation(this.rotation);
      
      // Start with idle animation
      this.model.playAnimation(HumanAnimationState.IDLE);
    });
    
    // Set initial state
    this.setState(PedestrianState.IDLE);
  }
  /**
   * Update the pedestrian's state and position
   */
  public update(deltaTime: number, player: Player, vehicles: Vehicle[]): void {
    // Update state timer
    this.stateTime += deltaTime;
    
    // Check for player proximity and react accordingly
    if (player) this.checkPlayerProximity(player);
    
    // Check for vehicle proximity
    this.checkVehicleProximity(vehicles);
    
    // Update based on current state
    switch (this.state) {
      case PedestrianState.IDLE:
        this.updateIdleState(deltaTime);
        break;
      case PedestrianState.WALKING:
        this.updateWalkingState(deltaTime);
        break;
      case PedestrianState.RUNNING:
        this.updateRunningState(deltaTime);
        break;
      case PedestrianState.PANICKING:
        this.updatePanickingState(deltaTime);
        break;
      case PedestrianState.WAITING_TO_CROSS:
        this.updateWaitingState(deltaTime);
        break;
      case PedestrianState.ENTERING_VEHICLE:
        this.updateEnteringVehicleState(deltaTime);
        break;
      case PedestrianState.EXITING_VEHICLE:
        this.updateExitingVehicleState(deltaTime);
        break;
    }
    
    // Update model position and rotation
    this.model.setPosition(this.position);
    this.model.setRotation(this.rotation);
    
    // Update collider
    this.updateCollider();
  }
  
  /**
   * Update the idle state
   */
  private updateIdleState(_deltaTime: number): void {
    // In idle state, occasionally decide to start walking
    if (this.stateTime > 3 + Math.random() * 5) {
      // 80% chance to walk, 20% chance to stay idle longer
      if (Math.random() < 0.8) {
        this.findNewDestination();
        this.setState(PedestrianState.WALKING);
      } else {
        // Reset timer but stay idle
        this.stateTime = 0;
      }
    }
  }
  
  /**
   * Update the walking state
   */
  private updateWalkingState(deltaTime: number): void {
    // If we have a target, move towards it
    if (this.targetPosition) {
      // Calculate direction to target
      const direction = new THREE.Vector3();
      direction.subVectors(this.targetPosition, this.position);
      direction.y = 0; // Keep movement on the ground plane
      
      // Check if we've reached the target
      if (direction.length() < 0.5) {
        // If we're following a path, move to the next point
        if (this.path.length > 0 && this.currentPathIndex < this.path.length - 1) {
          this.currentPathIndex++;
          this.targetPosition = this.path[this.currentPathIndex];
        } else {
          // We've reached our destination
          this.setState(PedestrianState.IDLE);
          return;
        }
      }
      
      // Normalize direction
      direction.normalize();
      
      // Gradually rotate towards the target direction
      const targetRotation = Math.atan2(direction.x, direction.z);
      const currentRotation = this.rotation.y;
      
      // Calculate the shortest rotation direction
      let rotationDiff = targetRotation - currentRotation;
      if (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
      if (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;
      
      // Apply rotation with smooth turning
      this.rotation.y += Math.sign(rotationDiff) * Math.min(Math.abs(rotationDiff), this.turnSpeed * deltaTime);
      
      // Move forward
      this.velocity.set(0, 0, -this.walkSpeed * deltaTime);
      this.velocity.applyEuler(this.rotation);
      this.position.add(this.velocity);
      
      // Keep on ground
      this.position.y = this.environment.getGroundHeight(this.position.x, this.position.z);
      
      // Check for obstacles and adjust path if needed
      this.avoidObstacles(deltaTime);
      
      // Occasionally check if we should wait to cross a road
      if (Math.random() < 0.02) {
        this.checkForRoadCrossing();
      }
    } else {
      // No target, go back to idle
      this.setState(PedestrianState.IDLE);
    }
  }
  
  /**
   * Update the running state
   */
  private updateRunningState(deltaTime: number): void {
    // Similar to walking but faster
    if (this.targetPosition) {
      const direction = new THREE.Vector3();
      direction.subVectors(this.targetPosition, this.position);
      direction.y = 0;
      
      if (direction.length() < 0.5) {
        if (this.path.length > 0 && this.currentPathIndex < this.path.length - 1) {
          this.currentPathIndex++;
          this.targetPosition = this.path[this.currentPathIndex];
        } else {
          this.setState(PedestrianState.IDLE);
          return;
        }
      }
      
      direction.normalize();
      
      const targetRotation = Math.atan2(direction.x, direction.z);
      const currentRotation = this.rotation.y;
      
      let rotationDiff = targetRotation - currentRotation;
      if (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
      if (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;
      
      this.rotation.y += Math.sign(rotationDiff) * Math.min(Math.abs(rotationDiff), this.turnSpeed * 1.5 * deltaTime);
      
      this.velocity.set(0, 0, -this.runSpeed * deltaTime);
      this.velocity.applyEuler(this.rotation);
      this.position.add(this.velocity);
      
      this.position.y = this.environment.getGroundHeight(this.position.x, this.position.z);
      
      this.avoidObstacles(deltaTime);
    } else {
      this.setState(PedestrianState.IDLE);
    }
  }
  
  /**
   * Update the panicking state
   */
  private updatePanickingState(deltaTime: number): void {
    // In panic mode, run away from the threat
    if (this.targetPosition) {
      const direction = new THREE.Vector3();
      direction.subVectors(this.targetPosition, this.position);
      direction.y = 0;
      
      // If we've run far enough, calm down
      if (direction.length() > this.fleeRadius * 1.5) {
        this.setState(PedestrianState.IDLE);
        return;
      }
      
      // Run in the opposite direction from the threat
      direction.normalize().negate();
      
      const targetRotation = Math.atan2(direction.x, direction.z);
      const currentRotation = this.rotation.y;
      
      let rotationDiff = targetRotation - currentRotation;
      if (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
      if (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;
      
      this.rotation.y += Math.sign(rotationDiff) * Math.min(Math.abs(rotationDiff), this.turnSpeed * 2 * deltaTime);
      
      this.velocity.set(0, 0, -this.panicSpeed * deltaTime);
      this.velocity.applyEuler(this.rotation);
      this.position.add(this.velocity);
      
      this.position.y = this.environment.getGroundHeight(this.position.x, this.position.z);
      
      this.avoidObstacles(deltaTime);
    } else {
      this.setState(PedestrianState.IDLE);
    }
    
    // After some time, calm down
    if (this.stateTime > 5 + Math.random() * 3) {
      this.setState(PedestrianState.RUNNING);
    }
  }
  
  /**
   * Update the waiting to cross state
   */
  private updateWaitingState(deltaTime: number): void {
    // Wait for a bit, then cross
    this.waitTime += deltaTime;
    
    if (this.waitTime >= this.maxWaitTime) {
      this.waitTime = 0;
      this.setState(PedestrianState.WALKING);
    }
  }
  
  /**
   * Update the entering vehicle state
   */
  private updateEnteringVehicleState(_deltaTime: number): void {
    // Animation for entering a vehicle
    if (this.stateTime > 2.0) { // Animation time
      // Hide pedestrian once inside
      this.model.setVisible(false);
      
      // If we have a target vehicle, mark it as occupied
      if (this.targetVehicle) {
        // Logic to occupy vehicle would go here
      }
    }
  }
  
  /**
   * Update the exiting vehicle state
   */
  private updateExitingVehicleState(_deltaTime: number): void {
    // Animation for exiting a vehicle
    if (this.stateTime > 2.0) { // Animation time
      this.setState(PedestrianState.IDLE);
    }
  }
  
  /**
   * Set the pedestrian state and reset state timer
   */
  private setState(newState: PedestrianState): void {
    // Don't change if same state
    if (this.state === newState) return;
    
    this.state = newState;
    this.stateTime = 0;
    
    // Update animation based on new state
    switch (newState) {
      case PedestrianState.IDLE:
        this.model.playAnimation(HumanAnimationState.IDLE);
        break;
      case PedestrianState.WALKING:
        this.model.playAnimation(HumanAnimationState.WALK);
        break;
      case PedestrianState.RUNNING:
        this.model.playAnimation(HumanAnimationState.RUN);
        break;
      case PedestrianState.PANICKING:
        this.model.playAnimation(HumanAnimationState.RUN); // Use running animation for panic
        break;
      case PedestrianState.WAITING_TO_CROSS:
        this.model.playAnimation(HumanAnimationState.IDLE); // Use idle animation for waiting
        break;
      case PedestrianState.ENTERING_VEHICLE:
        this.model.playAnimation(HumanAnimationState.ENTER_VEHICLE);
        break;
      case PedestrianState.EXITING_VEHICLE:
        this.model.playAnimation(HumanAnimationState.EXIT_VEHICLE);
        break;
    }
  }
  
  /**
   * Find a new random destination to walk to
   */
  private findNewDestination(): void {
    // Pick a random point within reasonable distance
    const distance = 10 + Math.random() * 20;
    const angle = Math.random() * Math.PI * 2;
    
    const targetX = this.position.x + Math.sin(angle) * distance;
    const targetZ = this.position.z + Math.cos(angle) * distance;
    
    this.targetPosition = new THREE.Vector3(targetX, 0, targetZ);
    this.path = [this.targetPosition]; // Simple direct path
    this.currentPathIndex = 0;
  }
  
  /**
   * Check if the pedestrian needs to wait before crossing a road
   */
  private checkForRoadCrossing(): void {
    // This is a simplified version - in a real implementation,
    // you would check if the pedestrian is about to cross a road
    // and if there are vehicles approaching
    
    // For now, just randomly decide to wait sometimes
    if (Math.random() < 0.1) {
      this.setState(PedestrianState.WAITING_TO_CROSS);
      this.maxWaitTime = 2 + Math.random() * 3; // Wait 2-5 seconds
    }
  }
  
  /**
   * Avoid obstacles in the path
   */
  private avoidObstacles(deltaTime: number): void {
    // Get obstacles from environment
    const obstacles = this.environment.getObstacles();
    
    // Check for potential collisions
    for (const obstacle of obstacles) {
      // Create a prediction of where we'll be in the near future
      const futurePosition = this.position.clone().add(
        this.velocity.clone().normalize().multiplyScalar(1.0)
      );
      
      // Create a temporary box for the future position
      const futureBox = this.collider.clone();
      futureBox.translate(new THREE.Vector3(
        futurePosition.x - this.position.x,
        0,
        futurePosition.z - this.position.z
      ));
      
      // Check if we'll collide with this obstacle
      if (futureBox.intersectsBox(obstacle)) {
        // Calculate avoidance direction (perpendicular to movement)
        const avoidDir = new THREE.Vector3(-this.velocity.z, 0, this.velocity.x);
        avoidDir.normalize();
        
        // Decide which side to avoid to (left or right)
        const obstacleCenter = new THREE.Vector3();
        obstacle.getCenter(obstacleCenter);
        
        const toObstacle = new THREE.Vector3();
        toObstacle.subVectors(obstacleCenter, this.position);
        
        // Dot product to determine which side the obstacle is on
        if (avoidDir.dot(toObstacle) < 0) {
          avoidDir.negate(); // Avoid to the other side
        }
        
        // Apply avoidance movement
        const avoidAmount = 0.5 * deltaTime;
        this.position.add(avoidDir.multiplyScalar(avoidAmount));
        
        // Slightly adjust target to go around obstacle
        if (this.targetPosition) {
          const newTarget = this.targetPosition.clone().add(
            avoidDir.multiplyScalar(2.0)
          );
          this.targetPosition = newTarget;
        }
        
        break; // Only avoid one obstacle at a time
      }
    }
  }
  
  /**
   * Check for player proximity and react accordingly
   */
  private checkPlayerProximity(player: Player): void {
    const playerPos = player.getPosition();
    const distanceToPlayer = this.position.distanceTo(playerPos);
    
    // React based on distance and player behavior
    if (distanceToPlayer < this.fleeRadius) {
      // Player is very close, check if they're in a vehicle
      if (player.isInsideVehicle()) {
        // Pedestrians will panic when a player drives too close to them
        this.targetPosition = playerPos.clone();
        this.setState(PedestrianState.PANICKING);
      }
      // If player is nearby, there's a chance the pedestrian might move away
      else if (!player.isInsideVehicle() && Math.random() < 0.2) {
        // Player is coming toward pedestrian
        this.targetPosition = playerPos.clone();
        this.setState(PedestrianState.RUNNING);
      }
    }
  }
  
  /**
   * Check for vehicle proximity and react accordingly
   */
  private checkVehicleProximity(vehicles: Vehicle[]): void {
    for (const vehicle of vehicles) {
      const vehiclePos = vehicle.getPosition();
      const distanceToVehicle = this.position.distanceTo(vehiclePos);
      
      // React based on distance and vehicle behavior
      if (distanceToVehicle < this.fleeRadius) {
        // Vehicle is close, check if it's moving fast
        if (vehicle.getCurrentSpeed() > 10) {
          // Panic and run away from vehicle
          this.targetPosition = vehiclePos.clone();
          this.setState(PedestrianState.PANICKING);
          break;
        }
      }
    }
  }
  
  /**
   * Update the collider position to match the pedestrian
   */
  private updateCollider(): void {
    this.collider.setFromCenterAndSize(
      new THREE.Vector3(this.position.x, this.position.y + 0.9, this.position.z),
      new THREE.Vector3(0.6, 1.8, 0.6)
    );
  }
  
  /**
   * Simplified update method for distant pedestrians
   * This method skips complex AI calculations and physics for better performance
   */
  public updateSimple(deltaTime: number): void {
    // Update state timer at a reduced rate
    this.stateTime += deltaTime;
    
    // Only perform minimal updates
    if (this.state === PedestrianState.WALKING || this.state === PedestrianState.RUNNING) {
      // Continue current movement with simplified physics
      const speed = this.state === PedestrianState.WALKING ? this.walkSpeed * 0.5 : this.runSpeed * 0.5;
      
      // Create direction vector from rotation
      const direction = new THREE.Vector3(0, 0, -1);
      direction.applyEuler(this.rotation);
      
      // Apply direction and speed to position
      this.position.x += direction.x * speed * deltaTime;
      this.position.z += direction.z * speed * deltaTime;
      
      // Ensure pedestrian stays on ground
      this.position.y = this.environment.getGroundHeight(this.position.x, this.position.z);
      
      // Update model position and rotation
      this.model.setPosition(this.position);
      
      // Randomly change direction occasionally
      if (Math.random() < 0.01) {
        this.rotation.y += (Math.random() - 0.5) * Math.PI;
        this.model.setRotation(this.rotation);
      }
    } else if (Math.random() < 0.005) {
      // Occasionally change state between idle and walking
      if (this.state === PedestrianState.IDLE) {
        this.setState(PedestrianState.WALKING);
      } else {
        this.setState(PedestrianState.IDLE);
      }
    }
    
    // Update collider less frequently
    if (Math.random() < 0.2) {
      this.updateCollider();
    }
  }
  
  /**
   * Get the pedestrian's position
   */
  public getPosition(): THREE.Vector3 {
    return this.position.clone();
  }
  
  /**
   * Get the pedestrian's collider
   */
  public getCollider(): THREE.Box3 {
    return this.collider;
  }
  
  /**
   * Clean up resources
   */
  public dispose(): void {
    // Remove model from scene
    if (this.model && this.model.getMesh()) {
      this.scene.remove(this.model.getMesh()!);
    }
  }
}