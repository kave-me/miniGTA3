import * as THREE from 'three';
import { Vehicle } from './Vehicle';
import { Environment } from './Environment';
import { Player } from './Player';
import { VehicleType } from './models/VehicleModel';

/**
 * VehicleManager handles the creation, updating, and management of
 * AI-controlled vehicles in the game world. It spawns vehicles on roads
 * and ensures they follow traffic patterns.
 */
export class VehicleManager {
  private vehicles: Vehicle[] = [];

  /**
   * Cleanup method to dispose of vehicle resources and clear arrays
   */
  public cleanup(): void {
    // Remove all vehicles from the scene and dispose their resources
    for (const vehicle of this.vehicles) {
      this.scene.remove(vehicle.getMesh());
    }
    
    // Clear the vehicles array
    this.vehicles = [];
    
    // Reset spawn timer
    this.timeSinceLastSpawn = 0;
  }
  private maxVehicles = 10; // Maximum number of AI vehicles to spawn
  private spawnRadius = 60; // Radius around player to spawn vehicles
  private despawnRadius = 80; // Radius beyond which vehicles are removed
  private minSpawnDistance = 20; // Minimum distance from player to spawn
  
  // Spawn timing
  private timeSinceLastSpawn = 0;
  private spawnInterval = 3; // Time between spawn attempts in seconds
  
  // Road network (simplified for now)
  private roadSegments: { start: THREE.Vector3, end: THREE.Vector3, width: number }[] = [];
  
  // Vehicle types with probabilities
  private vehicleTypes: { type: VehicleType, probability: number }[] = [
    { type: VehicleType.SEDAN, probability: 0.4 },
    { type: VehicleType.SPORTS_CAR, probability: 0.2 },
    { type: VehicleType.SUV, probability: 0.2 },
    { type: VehicleType.TRUCK, probability: 0.1 },
    { type: VehicleType.POLICE, probability: 0.1 }
  ];
  
  constructor(
    private scene: THREE.Scene,
    private environment: Environment
  ) {}
  
  /**
   * Initialize the vehicle manager
   */
  public initialize(): void {
    // Define road network (simplified for now)
    this.defineRoadNetwork();
    
    // Create initial vehicles
    this.spawnInitialVehicles();
  }
  
  /**
   * Define a simple road network for vehicles to follow
   */
  private defineRoadNetwork(): void {
    // Simple cross-shaped road network
    // East-West road
    this.roadSegments.push({
      start: new THREE.Vector3(-50, 0, 0),
      end: new THREE.Vector3(50, 0, 0),
      width: 10
    });
    
    // North-South road
    this.roadSegments.push({
      start: new THREE.Vector3(0, 0, -50),
      end: new THREE.Vector3(0, 0, 50),
      width: 10
    });
    
    // Additional roads could be added here
  }
  
  /**
   * Update all AI vehicles
   */
  public update(deltaTime: number, player: Player): void {
    // Update spawn timer
    this.timeSinceLastSpawn += deltaTime;
    
    // Try to spawn new vehicles if needed
    if (this.timeSinceLastSpawn > this.spawnInterval) {
      this.timeSinceLastSpawn = 0;
      this.trySpawnVehicle(player);
    }
    
    // Get player position once for distance calculations
    const playerPosition = player.getPosition();
    
    // Update existing vehicles with distance-based optimization
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const vehicle = this.vehicles[i];
      const distanceToPlayer = vehicle.getPosition().distanceTo(playerPosition);
      
      // Apply distance-based optimization
      if (distanceToPlayer > this.despawnRadius) {
        // Remove vehicle
        this.scene.remove(vehicle.getMesh());
        this.vehicles.splice(i, 1);
      } else if (distanceToPlayer > 40) {
        // Very distant vehicles - minimal update
        if (Math.random() < 0.3) { // Only update 30% of the time
          vehicle.updateSimple(deltaTime, 0.2);
        }
      } else if (distanceToPlayer > 25) {
        // Distant vehicles - simplified update
        vehicle.updateSimple(deltaTime, 0.5);
      } else {
        // Nearby vehicles - full AI update
        this.updateVehicleAI(vehicle, deltaTime);
      }
    }
  }
  
  /**
   * Update AI behavior for a vehicle
   */
  private updateVehicleAI(vehicle: Vehicle, deltaTime: number): void {
    // Get current position and forward direction
    const position = vehicle.getPosition();
    const rotation = vehicle.getRotation();
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(rotation);
    
    // Find the closest road segment
    const closestRoad = this.findClosestRoadSegment(position);
    if (!closestRoad) return;
    
    // Calculate direction along road
    const roadDirection = new THREE.Vector3()
      .subVectors(closestRoad.end, closestRoad.start)
      .normalize();
    
    // Determine if vehicle is going the right way on the road
    const dot = forward.dot(roadDirection);
    const targetDirection = dot >= 0 ? roadDirection : roadDirection.clone().negate();
    
    // Calculate target rotation to align with road
    const targetRotation = Math.atan2(targetDirection.x, targetDirection.z);
    
    // Gradually steer towards road alignment
    const currentRotation = rotation.y;
    let rotationDiff = targetRotation - currentRotation;
    
    // Normalize rotation difference to [-PI, PI]
    if (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2;
    if (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2;
    
    // Apply steering
    const steeringSpeed = 1.0;
    const newRotation = currentRotation + Math.sign(rotationDiff) * 
                        Math.min(Math.abs(rotationDiff), steeringSpeed * deltaTime);
    
    // Apply vehicle movement
    const speed = 5.0; // Base speed
    const moveDirection = new THREE.Vector3(0, 0, -1)
      .applyEuler(new THREE.Euler(0, newRotation, 0));
    
    // Check for obstacles and adjust speed
    const obstacleDistance = this.checkForObstacles(vehicle, moveDirection);
    
    // Adjust speed based on obstacles
    let adjustedSpeed = speed;
    if (obstacleDistance < 10) {
      // Slow down when approaching obstacles
      adjustedSpeed = speed * (obstacleDistance / 10);
    }
    
    // Apply movement
    const newPosition = position.clone().add(
      moveDirection.multiplyScalar(adjustedSpeed * deltaTime)
    );
    
    // Keep vehicle on the ground
    newPosition.y = this.environment.getGroundHeight(newPosition.x, newPosition.z) + 0.5;
    
    // Update vehicle
    vehicle.setAIControlled(true);
    vehicle.setAITargetPosition(newPosition);
    vehicle.setAITargetRotation(newRotation);
    vehicle.setAITargetSpeed(adjustedSpeed);
    
    // Let the vehicle's update method handle the actual movement
    vehicle.update(deltaTime);
  }
  
  /**
   * Check for obstacles in front of the vehicle
   */
  private checkForObstacles(vehicle: Vehicle, direction: THREE.Vector3): number {
    const position = vehicle.getPosition();
    
    // Cast a ray forward to detect obstacles
    
    // Check for other vehicles
    for (const otherVehicle of this.vehicles) {
      if (otherVehicle === vehicle) continue;
      
      const otherPosition = otherVehicle.getPosition();
      const distance = position.distanceTo(otherPosition);
      
      // Only check vehicles that are close and in front
      if (distance < 20) {
        const toOther = new THREE.Vector3().subVectors(otherPosition, position).normalize();
        const dot = direction.dot(toOther);
        
        // If other vehicle is in front (within 45 degrees of forward direction)
        if (dot > 0.7) {
          return Math.min(distance, 20);
        }
      }
    }
    
    // Check for obstacles from environment
    const obstacles = this.environment.getObstacles();
    let minDistance = 20;
    
    for (const obstacle of obstacles) {
      // Simple distance check for now
      const obstacleCenter = new THREE.Vector3();
      obstacle.getCenter(obstacleCenter);
      
      const toObstacle = new THREE.Vector3().subVectors(obstacleCenter, position).normalize();
      const dot = direction.dot(toObstacle);
      
      // If obstacle is in front
      if (dot > 0.7) {
        const distance = position.distanceTo(obstacleCenter);
        minDistance = Math.min(minDistance, distance);
      }
    }
    
    return minDistance;
  }
  
  /**
   * Find the closest road segment to a position
   */
  private findClosestRoadSegment(position: THREE.Vector3): { start: THREE.Vector3, end: THREE.Vector3, width: number } | null {
    if (this.roadSegments.length === 0) return null;
    
    let closestRoad = this.roadSegments[0];
    let closestDistance = this.distanceToRoadSegment(position, closestRoad);
    
    for (let i = 1; i < this.roadSegments.length; i++) {
      const road = this.roadSegments[i];
      const distance = this.distanceToRoadSegment(position, road);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestRoad = road;
      }
    }
    
    return closestRoad;
  }
  
  /**
   * Calculate the distance from a point to a road segment
   */
  private distanceToRoadSegment(point: THREE.Vector3, road: { start: THREE.Vector3, end: THREE.Vector3, width: number }): number {
    const start = road.start;
    const end = road.end;
    
    // Vector from start to end
    const roadVector = new THREE.Vector3().subVectors(end, start);
    const roadLength = roadVector.length();
    roadVector.normalize();
    
    // Vector from start to point
    const pointVector = new THREE.Vector3().subVectors(point, start);
    
    // Project point onto road line
    const projection = pointVector.dot(roadVector);
    
    // Clamp projection to road segment
    const clampedProjection = Math.max(0, Math.min(roadLength, projection));
    
    // Calculate closest point on road
    const closestPoint = start.clone().add(
      roadVector.clone().multiplyScalar(clampedProjection)
    );
    
    // Return distance to closest point
    return point.distanceTo(closestPoint);
  }
  
  /**
   * Spawn initial vehicles on the road network
   */
  private spawnInitialVehicles(): void {
    // Spawn a few vehicles on the roads
    for (let i = 0; i < 5; i++) {
      const roadIndex = Math.floor(Math.random() * this.roadSegments.length);
      const road = this.roadSegments[roadIndex];
      
      // Random position along the road
      const t = Math.random();
      const position = new THREE.Vector3().lerpVectors(road.start, road.end, t);
      
      // Offset from center of road
      const roadDirection = new THREE.Vector3().subVectors(road.end, road.start).normalize();
      const perpendicular = new THREE.Vector3(-roadDirection.z, 0, roadDirection.x);
      position.add(perpendicular.multiplyScalar((Math.random() - 0.5) * road.width * 0.8));
      
      // Set height
      position.y = this.environment.getGroundHeight(position.x, position.z) + 0.5;
      
      // Determine rotation (along road direction)
      const rotation = Math.atan2(roadDirection.x, roadDirection.z);
      
      // Randomly flip direction
      const flipDirection = Math.random() > 0.5;
      const finalRotation = flipDirection ? rotation + Math.PI : rotation;
      
      // Create vehicle
    //   @ts-ignore
      const vehicleType = this.selectRandomVehicleType();
      const vehicle = new Vehicle(this.scene, this.environment, position, finalRotation);
      
      // Add to list
      this.vehicles.push(vehicle);
    }
  }
  
  /**
   * Try to spawn a new vehicle if conditions are right
   */
  private trySpawnVehicle(player: Player): void {
    // Don't spawn if we've reached the maximum
    if (this.vehicles.length >= this.maxVehicles) {
      return;
    }
    
    // Get player position
    const playerPos = player.getPosition();
    
    // Find a road segment for spawning
    const spawnRoad = this.findSpawnRoad(playerPos);
    if (!spawnRoad) return;
    
    // Random position along the road
    const t = Math.random();
    const position = new THREE.Vector3().lerpVectors(spawnRoad.start, spawnRoad.end, t);
    
    // Offset from center of road
    const roadDirection = new THREE.Vector3().subVectors(spawnRoad.end, spawnRoad.start).normalize();
    const perpendicular = new THREE.Vector3(-roadDirection.z, 0, roadDirection.x);
    position.add(perpendicular.multiplyScalar((Math.random() - 0.5) * spawnRoad.width * 0.8));
    
    // Set height
    position.y = this.environment.getGroundHeight(position.x, position.z) + 0.5;
    
    // Check if position is valid
    if (!this.isValidSpawnPosition(position)) {
      return;
    }
    
    // Determine rotation (along road direction)
    const rotation = Math.atan2(roadDirection.x, roadDirection.z);
    
    // Randomly flip direction
    const flipDirection = Math.random() > 0.5;
    const finalRotation = flipDirection ? rotation + Math.PI : rotation;
    
    // Create vehicle
    const vehicle = new Vehicle(this.scene, this.environment, position, finalRotation);
    
    // Add to list
    this.vehicles.push(vehicle);
  }
  
  /**
   * Find a road segment suitable for spawning
   */
  private findSpawnRoad(playerPos: THREE.Vector3): { start: THREE.Vector3, end: THREE.Vector3, width: number } | null {
    // Filter roads by distance
    const candidateRoads = this.roadSegments.filter(road => {
      const roadCenter = new THREE.Vector3().lerpVectors(road.start, road.end, 0.5);
      const distance = roadCenter.distanceTo(playerPos);
      return distance > this.minSpawnDistance && distance < this.spawnRadius;
    });
    
    if (candidateRoads.length === 0) return null;
    
    // Pick a random road from candidates
    const randomIndex = Math.floor(Math.random() * candidateRoads.length);
    return candidateRoads[randomIndex];
  }
  
  /**
   * Check if a position is valid for spawning a vehicle
   */
  private isValidSpawnPosition(position: THREE.Vector3): boolean {
    // Create a temporary box for collision checking
    const tempBox = new THREE.Box3(
      new THREE.Vector3(position.x - 1, position.y, position.z - 2),
      new THREE.Vector3(position.x + 1, position.y + 1.5, position.z + 2)
    );
    
    // Check against obstacles
    const obstacles = this.environment.getObstacles();
    for (const obstacle of obstacles) {
      if (tempBox.intersectsBox(obstacle)) {
        return false;
      }
    }
    
    // Check against other vehicles to avoid overlap
    for (const vehicle of this.vehicles) {
      const distance = position.distanceTo(vehicle.getPosition());
      if (distance < 5) { // Minimum distance between vehicles
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Select a random vehicle type based on probabilities
   */
  private selectRandomVehicleType(): VehicleType {
    const rand = Math.random();
    let cumulativeProbability = 0;
    
    for (const vehicleType of this.vehicleTypes) {
      cumulativeProbability += vehicleType.probability;
      if (rand < cumulativeProbability) {
        return vehicleType.type;
      }
    }
    
    // Default fallback
    return VehicleType.SEDAN;
  }
  
  /**
   * Get all AI-controlled vehicles
   */
  public getVehicles(): Vehicle[] {
    return this.vehicles;
  }
  
  /**
   * Set the maximum number of vehicles
   */
  public setMaxVehicles(max: number): void {
    this.maxVehicles = max;
  }
  
  /**
   * Clean up resources
   */
  public dispose(): void {
    for (const vehicle of this.vehicles) {
      this.scene.remove(vehicle.getMesh());
    }
    this.vehicles = [];
  }
}