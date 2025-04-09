import * as THREE from 'three';
import { Mission } from './Mission';
import { Player } from '../Player';
import { InputManager } from '../InputManager';

/**
 * TutorialMission serves as the onboarding experience for new players
 * teaching them the basic controls and gameplay mechanics
 */
export class TutorialMission extends Mission {
  // Tutorial-specific properties
  private tutorialSteps: string[] = [];
  private currentStepIndex = 0;
  private stepCompleted = false;
  private stepStartTime = 0;
  private stepTimeout = 0;
  
  // Tutorial locations
  private startPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private vehiclePosition: THREE.Vector3 = new THREE.Vector3(5, 0, 5);
  private destinationPosition: THREE.Vector3 = new THREE.Vector3(20, 0, 20);
  
  // Tutorial markers
  private vehicleMarker: THREE.Mesh | null = null;
  private destinationMarker: THREE.Mesh | null = null;
  
  constructor(scene: THREE.Scene, player: Player, inputManager: InputManager) {
    super(scene, player, inputManager);
    
    // Set mission properties
    this.id = 'tutorial';
    this.title = 'Welcome to Liberty City';
    this.description = 'Learn the basic controls and gameplay mechanics to survive in Liberty City.';
    
    // Set mission objectives
    this.objectives = [
      'Move around using W, A, S, D keys',
      'Look around using the mouse',
      'Find and enter the vehicle',
      'Drive to the destination marker'
    ];
    
    // Set tutorial steps with detailed instructions
    this.tutorialSteps = [
      'Use W, A, S, D keys to move around. Press W to move forward.',
      'Move your mouse to look around. Click to enable mouse control.',
      'Press SPACE to jump.',
      'Approach the yellow marker and press E to enter the vehicle.',
      'Use W, A, S, D to drive the vehicle to the green destination marker.'
    ];
    
    // No time limit for tutorial
    this.timeLimit = 0;
    
    // Set reward
    this.reward = 'Access to your first mission';
    
    // Unlock the first real mission after tutorial
    this.unlocksMissions = ['delivery1'];
  }
  
  /**
   * Initialize the tutorial mission
   */
  public initialize(): void {
    // Reset mission state
    this.isActive = true;
    this.isComplete = false;
    this.isFailed = false;
    this.currentObjectiveIndex = 0;
    this.currentStepIndex = 0;
    this.stepCompleted = false;
    
    // Reset player position
    this.player.setPosition(this.startPosition);
    
    // Create vehicle marker
    this.vehicleMarker = this.createMarker(this.vehiclePosition, 0xffff00);
    
    // Create destination marker (initially hidden)
    this.destinationMarker = this.createCheckpoint(this.destinationPosition, 2, 0x00ff00);
    this.destinationMarker.visible = false;
    
    // Start the first step
    this.startCurrentStep();
  }
  
  /**
   * Update the tutorial mission
   */
  public update(_deltaTime: number): void {
    if (!this.isActive || this.isComplete || this.isFailed) return;
    
    // Check for step completion
    this.checkStepCompletion();
    
    // If current step is completed, move to the next step
    if (this.stepCompleted) {
      this.currentStepIndex++;
      
      // If all steps are completed, complete the mission
      if (this.currentStepIndex >= this.tutorialSteps.length) {
        this.isComplete = true;
        return;
      }
      
      // Start the next step
      this.stepCompleted = false;
      this.startCurrentStep();
    }
    
    // Check for objective completion based on current step
    this.checkObjectiveCompletion();
  }
  
  /**
   * Start the current tutorial step
   */
  private startCurrentStep(): void {
    this.stepStartTime = Date.now();
    
    // Set step timeout based on the step
    switch (this.currentStepIndex) {
      case 0: // Movement tutorial
        this.stepTimeout = 10000; // 10 seconds to try movement
        break;
      case 1: // Look around tutorial
        this.stepTimeout = 8000; // 8 seconds to try looking around
        break;
      case 2: // Jump tutorial
        this.stepTimeout = 5000; // 5 seconds to try jumping
        break;
      case 3: // Vehicle entry tutorial
        // No timeout, must complete this step
        this.stepTimeout = 0;
        break;
      case 4: // Driving tutorial
        // No timeout, must complete this step
        this.stepTimeout = 0;
        // Show destination marker
        if (this.destinationMarker) {
          this.destinationMarker.visible = true;
        }
        break;
      default:
        this.stepTimeout = 0;
    }
  }
  
  /**
   * Check if the current step is completed
   */
  private checkStepCompletion(): void {
    // If step has a timeout and time has elapsed, consider it completed
    if (this.stepTimeout > 0 && Date.now() - this.stepStartTime > this.stepTimeout) {
      this.stepCompleted = true;
      return;
    }
    
    // Check for step-specific completion criteria
    switch (this.currentStepIndex) {
      case 0: // Movement tutorial
        // Check if player has moved from starting position
        const playerPos = this.player.getPosition();
        if (playerPos.distanceTo(this.startPosition) > 2) {
          this.stepCompleted = true;
        }
        break;
      
      case 3: // Vehicle entry tutorial
        // Check if player has entered a vehicle
        if (this.player.isInsideVehicle()) {
          this.stepCompleted = true;
          // Hide vehicle marker once entered
          if (this.vehicleMarker) {
            this.vehicleMarker.visible = false;
          }
        }
        break;
      
      case 4: // Driving tutorial
        // Check if player has reached the destination
        if (this.isPlayerInRange(this.destinationPosition, 3)) {
          this.stepCompleted = true;
          // Complete the mission
          this.isComplete = true;
        }
        break;
    }
  }
  
  /**
   * Check for objective completion based on current step
   */
  private checkObjectiveCompletion(): void {
    // Map tutorial steps to objectives
    if (this.currentStepIndex <= 2 && this.currentObjectiveIndex === 0) {
      // First three steps (movement, looking, jumping) complete the first objective
      this.advanceObjective();
    } else if (this.currentStepIndex === 3 && this.stepCompleted && this.currentObjectiveIndex === 1) {
      // Vehicle entry completes the second objective
      this.advanceObjective();
    } else if (this.currentStepIndex === 4 && this.stepCompleted && this.currentObjectiveIndex === 2) {
      // Driving to destination completes the third objective
      this.advanceObjective();
    }
  }
  
  /**
   * Clean up mission resources
   */
  public cleanup(): void {
    super.cleanup();
    
    // Additional cleanup specific to tutorial
    this.vehicleMarker = null;
    this.destinationMarker = null;
  }
}