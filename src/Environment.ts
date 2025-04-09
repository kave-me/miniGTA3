import * as THREE from 'three';

export class Environment {
  private ground!: THREE.Mesh; // Initialized in createGround()
  private buildings: THREE.Mesh[] = [];
  private obstacles: THREE.Box3[] = [];
  private groundHeight = 0;
  
  constructor(private scene: THREE.Scene) {
    // Create ground
    this.createGround();
    
    // Create buildings
    this.createBuildings();
    
    // Create roads
    this.createRoads();
  }
  
  private createGround(): void {
    // Create a large flat ground plane
    const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a5e1a, // Dark green
      roughness: 0.8,
      metalness: 0.2
    });
    
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    this.ground.position.y = this.groundHeight;
    this.ground.receiveShadow = true;
    
    this.scene.add(this.ground);
  }
  
  private createBuildings(): void {
    // Create a simple grid of buildings
    const buildingCount = 20;
    const gridSize = 1000;
    
    for (let i = 0; i < buildingCount; i++) {
      // Randomize building properties
      const width = 5 + Math.random() * 10;
      const height = 10 + Math.random() * 30;
      const depth = 5 + Math.random() * 10;
      
      // Randomize position within grid
      const x = (Math.random() * gridSize) - (gridSize / 2);
      const z = (Math.random() * gridSize) - (gridSize / 2);
      
      // Skip buildings too close to center (player spawn area)
      if (Math.abs(x) < 10 && Math.abs(z) < 10) continue;
      
      // Create building mesh
      const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
      const buildingMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x808080 + Math.random() * 0x7F7F7F, // Random gray-ish color
        roughness: 0.7,
        metalness: 0.2
      });
      
      const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
      building.position.set(x, this.groundHeight + height / 2, z);
      building.castShadow = true;
      building.receiveShadow = true;
      
      // Add to scene and track
      this.scene.add(building);
      this.buildings.push(building);
      
      // Create collision box
      const collider = new THREE.Box3().setFromObject(building);
      this.obstacles.push(collider);
    }
  }
  
  private createRoads(): void {
    // Create a simple cross-shaped road
    const roadLength = 1000;
    const roadWidth = 50; // Width of the road
    
    // Road material
    const roadMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x333333, // Dark gray
      roughness: 0.9,
      metalness: 0.1
    });
    
    // East-West road
    const eastWestGeometry = new THREE.PlaneGeometry(roadLength, roadWidth);
    const eastWestRoad = new THREE.Mesh(eastWestGeometry, roadMaterial);
    eastWestRoad.rotation.x = -Math.PI / 2;
    eastWestRoad.position.y = this.groundHeight + 0.01; // Slightly above ground to prevent z-fighting
    eastWestRoad.position.z = 0;
    eastWestRoad.receiveShadow = true;
    
    // North-South road
    const northSouthGeometry = new THREE.PlaneGeometry(roadWidth, roadLength);
    const northSouthRoad = new THREE.Mesh(northSouthGeometry, roadMaterial);
    northSouthRoad.rotation.x = -Math.PI / 2;
    northSouthRoad.position.y = this.groundHeight + 0.01; // Slightly above ground to prevent z-fighting
    northSouthRoad.position.x = 0;
    northSouthRoad.receiveShadow = true;
    
    // Add roads to scene
    this.scene.add(eastWestRoad);
    this.scene.add(northSouthRoad);
    
    // Add road markings
    this.addRoadMarkings(roadLength, roadWidth);
  }
  
  private addRoadMarkings(roadLength: number, _roadWidth: number): void {
    // Create dashed line for road center
    const markingMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
    
    // East-West road markings
    const dashLength = 2;
    const dashGap = 2;
    const dashWidth = 0.5;
    
    for (let x = -roadLength / 2; x < roadLength / 2; x += dashLength + dashGap) {
      const dashGeometry = new THREE.PlaneGeometry(dashLength, dashWidth);
      const dash = new THREE.Mesh(dashGeometry, markingMaterial);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(x + dashLength / 2, this.groundHeight + 0.02, 0);
      this.scene.add(dash);
    }
    
    // North-South road markings
    for (let z = -roadLength / 2; z < roadLength / 2; z += dashLength + dashGap) {
      const dashGeometry = new THREE.PlaneGeometry(dashWidth, dashLength);
      const dash = new THREE.Mesh(dashGeometry, markingMaterial);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, this.groundHeight + 0.02, z + dashLength / 2);
      this.scene.add(dash);
    }
  }
  
  // Public methods for interacting with the environment
  
  public getGroundHeight(_x: number, _z: number): number {
    // For a flat terrain, just return the ground height
    // This could be extended to support terrain with varying heights
    return this.groundHeight;
  }
  
  public getObstacles(): THREE.Box3[] {
    return this.obstacles;
  }
  
  public updateObstacles(): void {
    // Update collision boxes for all buildings
    this.obstacles = [];
    for (const building of this.buildings) {
      const collider = new THREE.Box3().setFromObject(building);
      this.obstacles.push(collider);
    }
  }
}