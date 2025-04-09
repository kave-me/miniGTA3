import * as THREE from 'three';
import { AssetLoader } from '../utils/AssetLoader';
import { GTA3AssetLoader } from '../utils/GTA3AssetLoader';

/**
 * Vehicle types available in the game
 */
export enum VehicleType {
  SEDAN = 'sedan',
  SPORTS_CAR = 'sports_car',
  SUV = 'suv',
  TRUCK = 'truck',
  POLICE = 'police'
}

/**
 * VehicleModel represents a 3D vehicle model with animations
 */
export class VehicleModel {
  // The 3D model group
  private model: THREE.Group | null = null;
  
  // Vehicle parts for animation
  private wheels: THREE.Object3D[] = [];
  private steeringWheel: THREE.Object3D | null = null;
  private doors: THREE.Object3D[] = [];
  
  // Vehicle properties
  private type: VehicleType;
  private width = 2.0;
  private height = 1.5;
  private length = 4.0;
  private wheelRadius = 0.4;
  
  constructor(
    private scene: THREE.Scene,
    type: VehicleType = VehicleType.SEDAN
  ) {
    this.type = type;
  }
  
  /**
   * Load the vehicle model
   */
  public async load(modelId = 'car'): Promise<boolean> {
    // Try to load from original GTA3 assets first
    const gta3AssetLoader = GTA3AssetLoader.getInstance();
    let model: THREE.Group | null = null;
    
    // Map vehicle type to GTA3 model name
    let gta3ModelId = modelId;
    switch (this.type) {
      case VehicleType.SEDAN:
        gta3ModelId = 'idaho';
        break;
      case VehicleType.SPORTS_CAR:
        gta3ModelId = 'stinger';
        break;
      case VehicleType.SUV:
        gta3ModelId = 'landstal';
        break;
      case VehicleType.TRUCK:
        gta3ModelId = 'linerun';
        break;
      case VehicleType.POLICE:
        gta3ModelId = 'police';
        break;
    }
    
    // Try to load the model from GTA3 assets
    try {
      model = await gta3AssetLoader.loadModel(gta3ModelId);
    } catch (error) {
      console.warn(`Failed to load GTA3 vehicle model: ${gta3ModelId}`, error);
    }
    
    // If GTA3 model loading failed, fall back to the asset loader
    if (!model) {
      const assetLoader = AssetLoader.getInstance();
      model = assetLoader.getModel(modelId);
      
      if (!model) {
        console.error(`Failed to load vehicle model: ${modelId}`);
        return this.createFallbackModel();
      }
    }
    
    this.model = model;
    this.scene.add(this.model);
    
    // Find vehicle parts for animation
    this.findVehicleParts();
    
    // Apply vehicle dimensions based on type
    this.updateVehicleDimensions();
    
    return true;
  }
  
  /**
   * Create a fallback vehicle model if asset loading fails
   */
  private createFallbackModel(): boolean {
    // Create a simple car shape as fallback
    const group = new THREE.Group();
    
    // Car body
    const bodyGeometry = new THREE.BoxGeometry(this.width, this.height, this.length);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xff0000, // Red color
      roughness: 0.5,
      metalness: 0.7
    });
    
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    bodyMesh.position.y = 0.25; // Slight offset to position body above wheels
    group.add(bodyMesh);
    
    // Car roof (to make it look more like a car)
    const roofGeometry = new THREE.BoxGeometry(this.width * 0.8, this.height * 0.5, this.length * 0.5);
    const roofMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xff0000, // Red color
      roughness: 0.5,
      metalness: 0.7
    });
    
    const roofMesh = new THREE.Mesh(roofGeometry, roofMaterial);
    roofMesh.position.set(0, this.height * 0.75, -this.length * 0.1); // Position on top of the body, slightly to the back
    roofMesh.castShadow = true;
    group.add(roofMesh);
    
    // Windows (black material)
    const windowMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x111111, // Very dark gray
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.7
    });
    
    // Windshield
    const windshieldGeometry = new THREE.PlaneGeometry(this.width * 0.75, this.height * 0.4);
    const windshield = new THREE.Mesh(windshieldGeometry, windowMaterial);
    windshield.position.set(0, this.height * 0.5, this.length * 0.15);
    windshield.rotation.set(Math.PI / 4, 0, 0);
    group.add(windshield);
    
    // Create wheels
    const wheelGeometry = new THREE.CylinderGeometry(this.wheelRadius, this.wheelRadius, this.wheelRadius * 0.5, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x222222, // Dark gray/black
      roughness: 0.8,
      metalness: 0.3
    });
    
    // Position wheels at corners
    const wheelPositions = [
      new THREE.Vector3(-this.width/2 + 0.2, -this.height/2 + this.wheelRadius, this.length/2 - 0.5), // Front left
      new THREE.Vector3(this.width/2 - 0.2, -this.height/2 + this.wheelRadius, this.length/2 - 0.5),  // Front right
      new THREE.Vector3(-this.width/2 + 0.2, -this.height/2 + this.wheelRadius, -this.length/2 + 0.5), // Rear left
      new THREE.Vector3(this.width/2 - 0.2, -this.height/2 + this.wheelRadius, -this.length/2 + 0.5)  // Rear right
    ];
    
    this.wheels = [];
    for (let i = 0; i < 4; i++) {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2; // Rotate to correct orientation
      wheel.position.copy(wheelPositions[i]);
      wheel.castShadow = true;
      group.add(wheel);
      this.wheels.push(wheel);
    }
    
    // Add headlights
    const headlightGeometry = new THREE.CircleGeometry(0.15, 16);
    const headlightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffcc }); // Yellowish light
    
    // Left headlight
    const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    leftHeadlight.position.set(-this.width/2 + 0.3, 0, this.length/2);
    leftHeadlight.rotation.y = Math.PI;
    group.add(leftHeadlight);
    
    // Right headlight
    const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    rightHeadlight.position.set(this.width/2 - 0.3, 0, this.length/2);
    rightHeadlight.rotation.y = Math.PI;
    group.add(rightHeadlight);
    
    // Add to scene
    this.model = group;
    this.scene.add(this.model);
    
    return true;
  }
  
  /**
   * Find vehicle parts in the loaded model for animation
   */
  private findVehicleParts(): void {
    if (!this.model) return;
    
    // Find wheels
    this.wheels = [];
    this.model.traverse((child) => {
      if (child.name.toLowerCase().includes('wheel')) {
        this.wheels.push(child);
      } else if (child.name.toLowerCase().includes('steering')) {
        this.steeringWheel = child;
      } else if (child.name.toLowerCase().includes('door')) {
        this.doors.push(child);
      }
    });
  }
  
  /**
   * Update vehicle dimensions based on vehicle type
   */
  private updateVehicleDimensions(): void {
    // Set dimensions based on vehicle type
    switch (this.type) {
      case VehicleType.SEDAN:
        this.width = 2.0;
        this.height = 1.4;
        this.length = 4.5;
        this.wheelRadius = 0.35;
        break;
      case VehicleType.SPORTS_CAR:
        this.width = 1.9;
        this.height = 1.2;
        this.length = 4.2;
        this.wheelRadius = 0.35;
        break;
      case VehicleType.SUV:
        this.width = 2.2;
        this.height = 1.8;
        this.length = 4.8;
        this.wheelRadius = 0.45;
        break;
      case VehicleType.TRUCK:
        this.width = 2.5;
        this.height = 2.8;
        this.length = 7.0;
        this.wheelRadius = 0.5;
        break;
      case VehicleType.POLICE:
        this.width = 2.0;
        this.height = 1.5;
        this.length = 4.6;
        this.wheelRadius = 0.35;
        break;
      default:
        // Default dimensions already set in constructor
        break;
    }
  }
  
  /**
   * Update the vehicle model
   */
  public update(deltaTime: number, steeringAngle = 0, speed = 0): void {
    // Update wheel rotation based on speed
    this.rotateWheels(deltaTime, speed);
    
    // Update steering wheel based on steering angle
    this.steerWheels(steeringAngle);
  }
  
  /**
   * Simplified update method that only rotates wheels (for distant vehicles)
   * This is an optimization to reduce CPU usage for vehicles far from the player
   */
  public updateWheelsOnly(deltaTime: number, steeringAngle = 0, speed = 0): void {
    // Only update wheel rotation based on speed - skip other animations
    if (this.wheels.length > 0 && Math.abs(speed) > 0.1) {
      const rotationAmount = speed * deltaTime * 2;
      
      // Only update the first wheel to save CPU cycles
      // The rotation will still be visible but costs less processing
      this.wheels[0].rotation.x += rotationAmount;
    }
  }
  
  /**
   * Rotate the wheels based on vehicle speed
   */
  private rotateWheels(deltaTime: number, speed: number): void {
    // Calculate rotation amount based on speed
    const rotationAmount = speed * deltaTime * 2;
    
    // Apply rotation to wheels
    this.wheels.forEach(wheel => {
      wheel.rotation.x += rotationAmount;
    });
    
    // Update steering wheel if it exists
    if (this.steeringWheel) {
      this.steeringWheel.rotation.z -= speed * deltaTime * 0.05;
    }
  }
  
  /**
   * Steer the front wheels based on steering angle
   */
  private steerWheels(steeringAngle: number): void {
    // Only steer the front wheels (first two wheels)
    if (this.wheels.length >= 2) {
      // Assuming first two wheels are front wheels
      this.wheels[0].rotation.y = steeringAngle;
      this.wheels[1].rotation.y = steeringAngle;
    }
    
    // Update steering wheel if it exists
    if (this.steeringWheel) {
      this.steeringWheel.rotation.z = -steeringAngle * 2; // More rotation for dramatic effect
    }
  }
  
  /**
   * Play door animation (for vehicle entry/exit)
   */
  public animateDoor(doorIndex = 0, open = true): void {
    if (this.doors.length > doorIndex) {
      const door = this.doors[doorIndex];
      const targetRotation = open ? Math.PI / 4 : 0; // 45 degrees open or closed
      
      // Animate door opening/closing
      const animateDoorRotation = () => {
        const step = open ? 0.05 : -0.05;
        
        door.rotation.y += step;
        
        if ((open && door.rotation.y < targetRotation) || 
            (!open && door.rotation.y > targetRotation)) {
          requestAnimationFrame(animateDoorRotation);
        } else {
          door.rotation.y = targetRotation;
        }
      };
      
      animateDoorRotation();
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
   * Get the vehicle model mesh
   */
  public getMesh(): THREE.Group | null {
    return this.model;
  }
  
  /**
   * Get vehicle dimensions
   */
  public getDimensions(): { width: number, height: number, length: number } {
    return {
      width: this.width,
      height: this.height,
      length: this.length
    };
  }
}