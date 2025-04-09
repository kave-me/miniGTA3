import * as THREE from 'three';
import { Player } from './Player';

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private cameraOffset: THREE.Vector3;
  private targetPosition: THREE.Vector3;
  private lookAtPosition: THREE.Vector3;
  private rotationX = 0;
  private smoothFactor = 0.1;
  
  constructor(
    private scene: THREE.Scene,
    private player: Player
  ) {
    // Initialize camera
    this.camera = new THREE.PerspectiveCamera(
      75, // Field of view
      window.innerWidth / window.innerHeight, // Aspect ratio
      0.1, // Near clipping plane
      1000 // Far clipping plane
    );
    
    // Set initial camera position (behind and above player)
    this.cameraOffset = new THREE.Vector3(0, 2, 5);
    this.targetPosition = new THREE.Vector3();
    this.lookAtPosition = new THREE.Vector3();
    
    // Add camera to scene
    this.scene.add(this.camera);
    
    // Initial camera positioning
    this.updateCameraPosition();
  }
  
  public update(): void {
    // Get player position and rotation
    const playerPosition = this.player.getPosition();
    const playerRotation = this.player.getRotation();
    
    // Calculate camera target position based on player position and rotation
    this.calculateTargetPosition(playerPosition, playerRotation);
    
    // Smoothly move camera to target position
    this.smoothlyMoveCameraToTarget();
    
    // Update camera look at position (slightly above player)
    this.lookAtPosition.copy(playerPosition).add(new THREE.Vector3(0, 1, 0));
    this.camera.lookAt(this.lookAtPosition);
  }
  
  private calculateTargetPosition(playerPosition: THREE.Vector3, playerRotation: THREE.Euler): void {
    // Calculate offset based on player rotation
    const offset = this.cameraOffset.clone();
    
    // Check if player is in a vehicle
    const isInVehicle = this.player.isInsideVehicle();
    
    // Adjust camera position when in vehicle (higher and further back)
    if (isInVehicle) {
      offset.y += 1.0;  // Higher camera position
      offset.z += 2.0;  // Further back
    }
    
    // Rotate offset around Y axis based on player rotation
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRotation.y);
    
    // Apply rotation around X axis (looking up/down)
    const upDownRotation = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRotation.y),
      this.rotationX
    );
    offset.applyQuaternion(upDownRotation);
    
    // Set target position by adding offset to player position
    this.targetPosition.copy(playerPosition).add(offset);
  }
  
  private smoothlyMoveCameraToTarget(): void {
    // Smoothly interpolate current camera position to target position
    this.camera.position.lerp(this.targetPosition, this.smoothFactor);
  }
  
  private updateCameraPosition(): void {
    // Get player position and rotation
    const playerPosition = this.player.getPosition();
    const playerRotation = this.player.getRotation();
    
    // Calculate camera position based on player position and rotation
    this.calculateTargetPosition(playerPosition, playerRotation);
    
    // Set camera position immediately (no smoothing for initial positioning)
    this.camera.position.copy(this.targetPosition);
    
    // Set camera look at position
    this.lookAtPosition.copy(playerPosition).add(new THREE.Vector3(0, 1, 0));
    this.camera.lookAt(this.lookAtPosition);
  }
  
  public updateAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
  
  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }
  
  public setRotationX(rotation: number): void {
    // Limit rotation to prevent camera flipping
    this.rotationX = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, rotation));
  }
  
  public getRotationX(): number {
    return this.rotationX;
  }
}