import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create directories if they don't exist
const modelsDir = path.join(__dirname, '../public/assets/models');
const vehiclesDir = path.join(modelsDir, 'vehicles');
const charactersDir = path.join(modelsDir, 'characters');

if (!fs.existsSync(vehiclesDir)) {
  fs.mkdirSync(vehiclesDir, { recursive: true });
}
if (!fs.existsSync(charactersDir)) {
  fs.mkdirSync(charactersDir, { recursive: true });
}

// Helper function to save a THREE.js object as GLTF
function saveAsGLTF(object, filePath) {
  const exporter = new GLTFExporter();
  
  exporter.parse(
    object,
    (gltf) => {
      const output = JSON.stringify(gltf, null, 2);
      fs.writeFileSync(filePath, output);
      console.log(`Exported: ${filePath}`);
    },
    { binary: false }
  );
}

// Create player model
function createPlayerModel() {
  const group = new THREE.Group();
  
  // Basic humanoid shape
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x2222ee });
  const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffcc99 });
  
  // Body
  const bodyGeometry = new THREE.BoxGeometry(0.5, 0.8, 0.25);
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.8;
  body.name = 'body';
  
  // Head
  const headGeometry = new THREE.SphereGeometry(0.2, 12, 12);
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.y = 1.5;
  head.name = 'head';
  
  // Arms
  const armGeometry = new THREE.BoxGeometry(0.15, 0.5, 0.15);
  
  const leftArm = new THREE.Mesh(armGeometry, bodyMaterial);
  leftArm.position.set(-0.325, 0.9, 0);
  leftArm.name = 'leftArm';
  
  const rightArm = new THREE.Mesh(armGeometry, bodyMaterial);
  rightArm.position.set(0.325, 0.9, 0);
  rightArm.name = 'rightArm';
  
  // Legs
  const legGeometry = new THREE.BoxGeometry(0.15, 0.5, 0.15);
  
  const leftLeg = new THREE.Mesh(legGeometry, bodyMaterial);
  leftLeg.position.set(-0.15, 0.25, 0);
  leftLeg.name = 'leftLeg';
  
  const rightLeg = new THREE.Mesh(legGeometry, bodyMaterial);
  rightLeg.position.set(0.15, 0.25, 0);
  rightLeg.name = 'rightLeg';
  
  // Add all parts to the group
  group.add(body);
  group.add(head);
  group.add(leftArm);
  group.add(rightArm);
  group.add(leftLeg);
  group.add(rightLeg);
  
  // Add animations
  const animations = [];
  
  // Create walking animation
  const walkingKeyframes = new THREE.KeyframeTrack(
    'leftLeg.rotation[0]',
    [0, 0.5, 1],
    [0, Math.PI/4, 0]
  );
  
  const walkingClip = new THREE.AnimationClip('walking', 1, [walkingKeyframes]);
  animations.push(walkingClip);
  
  // Add metadata to enable finding animation bones
  group.userData = { 
    type: 'character',
    animations: animations
  };
  
  return group;
}

// Create vehicle model (sedan)
function createVehicleModel() {
  const group = new THREE.Group();
  
  // Materials
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Red
  const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x88ccff,
    transparent: true,
    opacity: 0.5
  });
  
  // Vehicle dimensions
  const width = 2.0;
  const height = 1.2;
  const length = 4.0;
  
  // Body
  const bodyGeometry = new THREE.BoxGeometry(width, height, length);
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = height/2;
  body.name = 'body';
  
  // Wheels
  const wheelRadius = 0.4;
  const wheelThickness = 0.2;
  const wheelGeometry = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelThickness, 16);
  
  const wheelPositions = [
    new THREE.Vector3(-width/2 + 0.2, wheelRadius, length/2 - 0.5), // Front left
    new THREE.Vector3(width/2 - 0.2, wheelRadius, length/2 - 0.5),  // Front right
    new THREE.Vector3(-width/2 + 0.2, wheelRadius, -length/2 + 0.5), // Rear left
    new THREE.Vector3(width/2 - 0.2, wheelRadius, -length/2 + 0.5)  // Rear right
  ];
  
  const wheels = [];
  
  for (let i = 0; i < 4; i++) {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.rotation.z = Math.PI / 2; // Rotate to correct orientation
    wheel.position.copy(wheelPositions[i]);
    wheel.name = `wheel_${i}`;
    wheels.push(wheel);
    group.add(wheel);
  }
  
  // Windshield
  const windshieldGeometry = new THREE.PlaneGeometry(width - 0.4, height - 0.4);
  const windshield = new THREE.Mesh(windshieldGeometry, glassMaterial);
  windshield.position.set(0, height/2 + 0.1, length/2 - 0.6);
  windshield.rotation.x = Math.PI / 8; // Slight angle
  windshield.name = 'windshield';
  
  // Create doors
  const doorWidth = 0.05;
  const doorHeight = height - 0.3;
  const doorLength = length / 3;
  
  const doorGeometry = new THREE.BoxGeometry(doorWidth, doorHeight, doorLength);
  
  // Left door
  const leftDoor = new THREE.Mesh(doorGeometry, bodyMaterial);
  leftDoor.position.set(-width/2, height/2, 0);
  leftDoor.name = 'leftDoor';
  
  // Right door
  const rightDoor = new THREE.Mesh(doorGeometry, bodyMaterial);
  rightDoor.position.set(width/2, height/2, 0);
  rightDoor.name = 'rightDoor';
  
  // Add all parts to the group
  group.add(body);
  group.add(windshield);
  group.add(leftDoor);
  group.add(rightDoor);
  
  // Add metadata to enable finding parts
  group.userData = { 
    type: 'vehicle',
    vehicleType: 'sedan',
    wheels: wheels,
    doors: [leftDoor, rightDoor]
  };
  
  return group;
}

// Create and save player model
const playerModel = createPlayerModel();
saveAsGLTF(playerModel, path.join(charactersDir, 'player.gltf'));

// Create and save vehicle model
const vehicleModel = createVehicleModel();
saveAsGLTF(vehicleModel, path.join(vehiclesDir, 'car.gltf'));

console.log('All models generated successfully!');
