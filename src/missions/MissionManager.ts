import * as THREE from 'three';
import { Player } from '../Player';
import { Vehicle } from '../Vehicle';
import { InputManager } from '../InputManager';
import { Mission } from './Mission';
import { TutorialMission } from './TutorialMission';
import { DeliveryMission } from './DeliveryMission';
import { ChaseDownMission } from './ChaseDownMission';

/**
 * MissionManager handles the game's mission system, including:
 * - Mission loading and progression
 * - Mission objectives and completion
 * - Mission rewards and unlocks
 * - Tutorial and onboarding
 */
export class MissionManager {
  // Available missions
  private missions: Mission[] = [];
  
  // Current active mission
  private currentMission: Mission | null = null;
  
  // Mission state
  private missionActive = false;
  private missionCompleted = false;
  private missionFailed = false;
  
  // Mission progress tracking
  private completedMissions: string[] = [];
  private unlockedMissions: string[] = [];
  
  // UI elements
  private missionUI: HTMLElement | null = null;
  private missionTitle: HTMLElement | null = null;
  private missionObjective: HTMLElement | null = null;
  private missionTimer: HTMLElement | null = null;
  
  // Timer for timed missions
  private timerInterval: number | null = null;
  private timeRemaining = 0;
  
  constructor(
    private scene: THREE.Scene,
    private player: Player,
    private inputManager: InputManager
  ) {
    // Initialize mission UI
    this.setupMissionUI();
    
    // Register missions
    this.registerMissions();
    
    // Start with tutorial mission unlocked
    this.unlockedMissions.push('tutorial');
  }
  
  /**
   * Initialize the mission UI elements
   */
  private setupMissionUI(): void {
    // Create mission UI container
    this.missionUI = document.createElement('div');
    this.missionUI.className = 'mission-ui';
    this.missionUI.style.position = 'absolute';
    this.missionUI.style.top = '20px';
    this.missionUI.style.left = '20px';
    this.missionUI.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.missionUI.style.color = 'white';
    this.missionUI.style.padding = '10px';
    this.missionUI.style.borderRadius = '5px';
    this.missionUI.style.fontFamily = 'Arial, sans-serif';
    this.missionUI.style.display = 'none';
    document.body.appendChild(this.missionUI);
    
    // Create mission title element
    this.missionTitle = document.createElement('h3');
    this.missionTitle.style.margin = '0 0 5px 0';
    this.missionTitle.style.color = '#ffcc00';
    this.missionUI.appendChild(this.missionTitle);
    
    // Create mission objective element
    this.missionObjective = document.createElement('p');
    this.missionObjective.style.margin = '0 0 5px 0';
    this.missionUI.appendChild(this.missionObjective);
    
    // Create mission timer element
    this.missionTimer = document.createElement('p');
    this.missionTimer.style.margin = '0';
    this.missionTimer.style.color = '#ff6666';
    this.missionUI.appendChild(this.missionTimer);
  }
  
  /**
   * Register all available missions
   */
  private registerMissions(): void {
    // Add tutorial mission
    this.missions.push(new TutorialMission(this.scene, this.player, this.inputManager));
    
    // Add delivery mission
    this.missions.push(new DeliveryMission(this.scene, this.player, this.inputManager));
    
    // Add chase down mission
    this.missions.push(new ChaseDownMission(this.scene, this.player, this.inputManager));
  }
  
  /**
   * Start a mission by ID
   */
  public startMission(missionId: string): boolean {
    // Check if mission is unlocked
    if (!this.unlockedMissions.includes(missionId)) {
      console.warn(`Mission ${missionId} is not unlocked yet`);
      return false;
    }
    
    // Find mission by ID
    const mission = this.missions.find(m => m.getId() === missionId);
    
    if (!mission) {
      console.error(`Mission ${missionId} not found`);
      return false;
    }
    
    // Check if already in a mission
    if (this.missionActive && this.currentMission) {
      console.warn('Cannot start a new mission while another is active');
      return false;
    }
    
    // Start the mission
    this.currentMission = mission;
    this.missionActive = true;
    this.missionCompleted = false;
    this.missionFailed = false;
    
    // Initialize mission
    mission.initialize();
    
    // Update UI
    this.updateMissionUI();
    
    // Start timer if mission has a time limit
    if (mission.getTimeLimit() > 0) {
      this.startTimer(mission.getTimeLimit());
    }
    
    // Show mission UI
    if (this.missionUI) {
      this.missionUI.style.display = 'block';
    }
    
    // Show mission briefing
    this.showMissionBriefing(mission);
    
    return true;
  }
  
  /**
   * Show mission briefing dialog
   */
  private showMissionBriefing(mission: Mission): void {
    // Create briefing dialog
    const briefingDialog = document.createElement('div');
    briefingDialog.className = 'mission-briefing';
    briefingDialog.style.position = 'absolute';
    briefingDialog.style.top = '50%';
    briefingDialog.style.left = '50%';
    briefingDialog.style.transform = 'translate(-50%, -50%)';
    briefingDialog.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    briefingDialog.style.color = 'white';
    briefingDialog.style.padding = '20px';
    briefingDialog.style.borderRadius = '5px';
    briefingDialog.style.fontFamily = 'Arial, sans-serif';
    briefingDialog.style.maxWidth = '500px';
    briefingDialog.style.zIndex = '1000';
    
    // Add mission title
    const title = document.createElement('h2');
    title.textContent = mission.getTitle();
    title.style.color = '#ffcc00';
    title.style.marginTop = '0';
    briefingDialog.appendChild(title);
    
    // Add mission description
    const description = document.createElement('p');
    description.textContent = mission.getDescription();
    briefingDialog.appendChild(description);
    
    // Add start button
    const startButton = document.createElement('button');
    startButton.textContent = 'Start Mission';
    startButton.style.backgroundColor = '#ffcc00';
    startButton.style.color = 'black';
    startButton.style.border = 'none';
    startButton.style.padding = '10px 20px';
    startButton.style.marginTop = '15px';
    startButton.style.cursor = 'pointer';
    startButton.style.fontWeight = 'bold';
    startButton.onclick = () => {
      document.body.removeChild(briefingDialog);
    };
    briefingDialog.appendChild(startButton);
    
    // Add to document
    document.body.appendChild(briefingDialog);
  }
  
  /**
   * Complete the current mission
   */
  public completeMission(): void {
    if (!this.missionActive || !this.currentMission) return;
    
    // Mark mission as completed
    this.missionCompleted = true;
    this.missionActive = false;
    
    // Add to completed missions if not already completed
    const missionId = this.currentMission.getId();
    if (!this.completedMissions.includes(missionId)) {
      this.completedMissions.push(missionId);
    }
    
    // Unlock next missions
    const unlockedMissions = this.currentMission.getUnlocksMissions();
    for (const unlockId of unlockedMissions) {
      if (!this.unlockedMissions.includes(unlockId)) {
        this.unlockedMissions.push(unlockId);
      }
    }
    
    // Stop timer if active
    this.stopTimer();
    
    // Show mission complete message
    this.showMissionComplete(this.currentMission);
    
    // Reset current mission
    this.currentMission = null;
    
    // Hide mission UI after a delay
    setTimeout(() => {
      if (this.missionUI) {
        this.missionUI.style.display = 'none';
      }
    }, 3000);
  }
  
  /**
   * Fail the current mission
   */
  public failMission(reason = 'Mission failed'): void {
    if (!this.missionActive || !this.currentMission) return;
    
    // Mark mission as failed
    this.missionFailed = true;
    this.missionActive = false;
    
    // Stop timer if active
    this.stopTimer();
    
    // Show mission failed message
    this.showMissionFailed(reason);
    
    // Reset current mission
    this.currentMission = null;
    
    // Hide mission UI after a delay
    setTimeout(() => {
      if (this.missionUI) {
        this.missionUI.style.display = 'none';
      }
    }, 3000);
  }
  
  /**
   * Show mission complete dialog
   */
  private showMissionComplete(mission: Mission): void {
    // Create completion dialog
    const completeDialog = document.createElement('div');
    completeDialog.className = 'mission-complete';
    completeDialog.style.position = 'absolute';
    completeDialog.style.top = '50%';
    completeDialog.style.left = '50%';
    completeDialog.style.transform = 'translate(-50%, -50%)';
    completeDialog.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    completeDialog.style.color = 'white';
    completeDialog.style.padding = '20px';
    completeDialog.style.borderRadius = '5px';
    completeDialog.style.fontFamily = 'Arial, sans-serif';
    completeDialog.style.maxWidth = '500px';
    completeDialog.style.zIndex = '1000';
    
    // Add completion title
    const title = document.createElement('h2');
    title.textContent = 'Mission Complete!';
    title.style.color = '#00cc00';
    title.style.marginTop = '0';
    completeDialog.appendChild(title);
    
    // Add mission title
    const missionTitle = document.createElement('h3');
    missionTitle.textContent = mission.getTitle();
    missionTitle.style.color = '#ffcc00';
    completeDialog.appendChild(missionTitle);
    
    // Add reward info
    const reward = document.createElement('p');
    reward.textContent = `Reward: ${mission.getReward()}`;
    completeDialog.appendChild(reward);
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Continue';
    closeButton.style.backgroundColor = '#00cc00';
    closeButton.style.color = 'black';
    closeButton.style.border = 'none';
    closeButton.style.padding = '10px 20px';
    closeButton.style.marginTop = '15px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontWeight = 'bold';
    closeButton.onclick = () => {
      document.body.removeChild(completeDialog);
    };
    completeDialog.appendChild(closeButton);
    
    // Add to document
    document.body.appendChild(completeDialog);
    
    // Auto-close after 5 seconds
    setTimeout(() => {
      if (document.body.contains(completeDialog)) {
        document.body.removeChild(completeDialog);
      }
    }, 5000);
  }
  
  /**
   * Show mission failed dialog
   */
  private showMissionFailed(reason: string): void {
    // Create failed dialog
    const failedDialog = document.createElement('div');
    failedDialog.className = 'mission-failed';
    failedDialog.style.position = 'absolute';
    failedDialog.style.top = '50%';
    failedDialog.style.left = '50%';
    failedDialog.style.transform = 'translate(-50%, -50%)';
    failedDialog.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    failedDialog.style.color = 'white';
    failedDialog.style.padding = '20px';
    failedDialog.style.borderRadius = '5px';
    failedDialog.style.fontFamily = 'Arial, sans-serif';
    failedDialog.style.maxWidth = '500px';
    failedDialog.style.zIndex = '1000';
    
    // Add failed title
    const title = document.createElement('h2');
    title.textContent = 'Mission Failed';
    title.style.color = '#ff3333';
    title.style.marginTop = '0';
    failedDialog.appendChild(title);
    
    // Add reason
    const reasonElement = document.createElement('p');
    reasonElement.textContent = reason;
    failedDialog.appendChild(reasonElement);
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Continue';
    closeButton.style.backgroundColor = '#ff3333';
    closeButton.style.color = 'white';
    closeButton.style.border = 'none';
    closeButton.style.padding = '10px 20px';
    closeButton.style.marginTop = '15px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontWeight = 'bold';
    closeButton.onclick = () => {
      document.body.removeChild(failedDialog);
    };
    failedDialog.appendChild(closeButton);
    
    // Add to document
    document.body.appendChild(failedDialog);
    
    // Auto-close after 5 seconds
    setTimeout(() => {
      if (document.body.contains(failedDialog)) {
        document.body.removeChild(failedDialog);
      }
    }, 5000);
  }
  
  /**
   * Start a timer for timed missions
   */
  private startTimer(seconds: number): void {
    // Clear any existing timer
    this.stopTimer();
    
    // Set time remaining
    this.timeRemaining = seconds;
    
    // Update timer display
    this.updateTimerDisplay();
    
    // Start interval
    this.timerInterval = window.setInterval(() => {
      this.timeRemaining--;
      
      // Update timer display
      this.updateTimerDisplay();
      
      // Check if time is up
      if (this.timeRemaining <= 0) {
        this.stopTimer();
        this.failMission('Time\'s up!');
      }
    }, 1000);
  }
  
  /**
   * Stop the active timer
   */
  private stopTimer(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
  
  /**
   * Update the timer display
   */
  private updateTimerDisplay(): void {
    if (this.missionTimer) {
      // Format time as MM:SS
      const minutes = Math.floor(this.timeRemaining / 60);
      const seconds = this.timeRemaining % 60;
      const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      this.missionTimer.textContent = `Time: ${formattedTime}`;
      
      // Change color when time is running low
      if (this.timeRemaining <= 10) {
        this.missionTimer.style.color = '#ff0000';
      } else {
        this.missionTimer.style.color = '#ff6666';
      }
    }
  }
  
  /**
   * Update mission UI with current mission info
   */
  private updateMissionUI(): void {
    if (!this.currentMission) return;
    
    if (this.missionTitle) {
      this.missionTitle.textContent = this.currentMission.getTitle();
    }
    
    if (this.missionObjective) {
      this.missionObjective.textContent = this.currentMission.getCurrentObjective();
    }
  }
  
  /**
   * Update mission state and check for completion
   */
  public update(deltaTime: number): void {
    if (!this.missionActive || !this.currentMission) return;
    
    // Update current mission
    this.currentMission.update(deltaTime);
    
    // Update mission UI with current objective
    if (this.missionObjective) {
      this.missionObjective.textContent = this.currentMission.getCurrentObjective();
    }
    
    // Check if mission is completed
    if (this.currentMission.isCompleted()) {
      this.completeMission();
    }
    
    // Check if mission is failed
    if (this.currentMission.hasFailed()) {
      this.failMission(this.currentMission.getFailReason());
    }
  }
  
  /**
   * Check if a mission is active
   */
  public isMissionActive(): boolean {
    return this.missionActive;
  }
  
  /**
   * Get the current active mission
   */
  public getCurrentMission(): Mission | null {
    return this.currentMission;
  }
  
  /**
   * Get all completed missions
   */
  public getCompletedMissions(): string[] {
    return [...this.completedMissions];
  }
  
  /**
   * Get all unlocked missions
   */
  public getUnlockedMissions(): string[] {
    return [...this.unlockedMissions];
  }
  
  /**
   * Check if a mission is completed
   */
  public isMissionCompleted(missionId: string): boolean {
    return this.completedMissions.includes(missionId);
  }
  
  /**
   * Check if a mission is unlocked
   */
  public isMissionUnlocked(missionId: string): boolean {
    return this.unlockedMissions.includes(missionId);
  }
}