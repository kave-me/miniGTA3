import * as THREE from 'three';
import { Pedestrian } from './Pedestrian';
import { Environment } from './Environment';
import { Player } from './Player';
import { Vehicle } from './Vehicle';

/**
 * PedestrianManager handles the creation, updating, and management of
 * pedestrians in the game world. It spawns pedestrians in appropriate
 * locations and ensures they behave realistically.
 */
export class PedestrianManager {
  private pedestrians: Pedestrian[] = [];
  private maxPedestrians = 15; // Maximum number of pedestrians to spawn
  private spawnRadius = 50; // Radius around player to spawn pedestrians
  private despawnRadius = 70; // Radius beyond which pedestrians are removed
  private minSpawnDistance = 15; // Minimum distance from player to spawn
  
  // Spawn timing
  private timeSinceLastSpawn = 0;
  private spawnInterval = 2; // Time between spawn attempts in seconds
  
  // Pedestrian density by area type
  private densityMultipliers: Map<string, number> = new Map([
    ['downtown', 1.0],   // Normal density
    ['suburban', 0.6],    // Lower density
    ['industrial', 0.4],  // Even lower density
    ['rural', 0.2]        // Very low density
  ]);
  
  constructor(
    private scene: THREE.Scene,
    private environment: Environment
  ) {}
  
  /**
   * Initialize the pedestrian manager
   */
  public initialize(): void {
    // Create initial pedestrians
    this.spawnInitialPedestrians();
  }
  
  /**
   * Update all pedestrians
   */
  public update(deltaTime: number, player: Player, vehicles: Vehicle[]): void {
    // Update spawn timer
    this.timeSinceLastSpawn += deltaTime;
    
    // Try to spawn new pedestrians if needed
    if (this.timeSinceLastSpawn > this.spawnInterval) {
      this.timeSinceLastSpawn = 0;
      this.trySpawnPedestrian(player);
    }
    
    // Get player position once for distance calculations
    const playerPosition = player.getPosition();
    
    // Update existing pedestrians with distance-based optimization
    for (let i = this.pedestrians.length - 1; i >= 0; i--) {
      const pedestrian = this.pedestrians[i];
      const distanceToPlayer = pedestrian.getPosition().distanceTo(playerPosition);
      
      // Apply distance-based optimization
      if (distanceToPlayer > this.despawnRadius) {
        // Remove pedestrian
        pedestrian.dispose();
        this.pedestrians.splice(i, 1);
      } else if (distanceToPlayer > 30) {
        // Very distant pedestrians - update at reduced rate (every 3rd frame)
        if (Math.random() < 0.3) {
          pedestrian.updateSimple(deltaTime);
        }
      } else if (distanceToPlayer > 15) {
        // Distant pedestrians - update at reduced rate (every other frame)
        if (Math.random() < 0.5) {
          pedestrian.update(deltaTime, player, vehicles);
        }
      } else {
        // Nearby pedestrians - full update
        pedestrian.update(deltaTime, player, vehicles);
      }
    }
  }
  
  /**
   * Spawn initial pedestrians around the world
   */
  private spawnInitialPedestrians(): void {
    // Create a few pedestrians at fixed positions
    const initialPositions = [
      new THREE.Vector3(10, 0, 10),
      new THREE.Vector3(-15, 0, 5),
      new THREE.Vector3(5, 0, -20),
      new THREE.Vector3(-8, 0, -12),
      new THREE.Vector3(20, 0, 0)
    ];
    
    for (const position of initialPositions) {
      const rotation = Math.random() * Math.PI * 2;
      const pedestrian = new Pedestrian(this.scene, this.environment, position, rotation);
      this.pedestrians.push(pedestrian);
    }
  }
  
  /**
   * Try to spawn a new pedestrian if conditions are right
   */
  private trySpawnPedestrian(player: Player): void {
    // Don't spawn if we've reached the maximum
    if (this.pedestrians.length >= this.maxPedestrians) {
      return;
    }
    
    // Get player position
    const playerPos = player.getPosition();
    
    // Determine spawn position
    const spawnPos = this.findSpawnPosition(playerPos);
    if (!spawnPos) return;
    
    // Create new pedestrian
    const rotation = Math.random() * Math.PI * 2;
    const pedestrian = new Pedestrian(this.scene, this.environment, spawnPos, rotation);
    this.pedestrians.push(pedestrian);
  }
  
  /**
   * Find a suitable position to spawn a pedestrian
   */
  private findSpawnPosition(playerPos: THREE.Vector3): THREE.Vector3 | null {
    // Try several times to find a good position
    for (let attempt = 0; attempt < 10; attempt++) {
      // Random angle and distance
      const angle = Math.random() * Math.PI * 2;
      const distance = this.minSpawnDistance + Math.random() * (this.spawnRadius - this.minSpawnDistance);
      
      // Calculate position
      const x = playerPos.x + Math.sin(angle) * distance;
      const z = playerPos.z + Math.cos(angle) * distance;
      const y = this.environment.getGroundHeight(x, z);
      
      const position = new THREE.Vector3(x, y, z);
      
      // Check if position is valid (not inside a building or obstacle)
      if (this.isValidSpawnPosition(position)) {
        return position;
      }
    }
    
    // Couldn't find a valid position
    return null;
  }
  
  /**
   * Check if a position is valid for spawning
   */
  private isValidSpawnPosition(position: THREE.Vector3): boolean {
    // Create a temporary box for collision checking
    const tempBox = new THREE.Box3(
      new THREE.Vector3(position.x - 0.3, position.y, position.z - 0.3),
      new THREE.Vector3(position.x + 0.3, position.y + 1.8, position.z + 0.3)
    );
    
    // Check against obstacles
    const obstacles = this.environment.getObstacles();
    for (const obstacle of obstacles) {
      if (tempBox.intersectsBox(obstacle)) {
        return false;
      }
    }
    
    // Check against other pedestrians to avoid overlap
    for (const pedestrian of this.pedestrians) {
      const distance = position.distanceTo(pedestrian.getPosition());
      if (distance < 1.5) { // Minimum distance between pedestrians
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Get all pedestrians
   */
  public getPedestrians(): Pedestrian[] {
    return this.pedestrians;
  }
  
  /**
   * Set the maximum number of pedestrians
   */
  public setMaxPedestrians(max: number): void {
    this.maxPedestrians = max;
  }
  
  /**
   * Clean up resources
   */
  public cleanup(): void {
    for (const pedestrian of this.pedestrians) {
      pedestrian.dispose();
    }
    this.pedestrians = [];
  }
}