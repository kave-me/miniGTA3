import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AssetLoader } from './AssetLoader';

/**
 * GTA3AssetLoader extends the base AssetLoader to support loading
 * converted assets from the original GTA3 game
 */
export class GTA3AssetLoader {
  private static instance: GTA3AssetLoader;
  private assetLoader: AssetLoader;
  private gltfLoader: GLTFLoader;
  private textureLoader: THREE.TextureLoader;
  // @ts-ignore
  private xmlParser: DOMParser;
  
  // Mapping from original GTA3 model names to converted model paths
  private modelMap: Map<string, string> = new Map();
  
  // Mapping from original GTA3 texture names to converted texture paths
  private textureMap: Map<string, string> = new Map();
  
  private constructor() {
    this.assetLoader = AssetLoader.getInstance();
    this.gltfLoader = new GLTFLoader();
    this.textureLoader = new THREE.TextureLoader();
    this.xmlParser = new DOMParser();
    
    // Initialize model mappings
    this.initModelMap();
    
    // Initialize texture mappings
    this.initTextureMap();
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): GTA3AssetLoader {
    if (!GTA3AssetLoader.instance) {
      GTA3AssetLoader.instance = new GTA3AssetLoader();
    }
    return GTA3AssetLoader.instance;
  }
  
  /**
   * Initialize model mappings from original GTA3 model names to converted model paths
   */
  private initModelMap(): void {
    // Vehicle models - using simplified car model for all vehicles
    const vehicleTypes = ['landstal', 'idaho', 'stinger', 'linerun', 'peren', 
                         'sentinel', 'patriot', 'police'];
    for (const type of vehicleTypes) {
      this.modelMap.set(type, 'vehicles/car.glb');
    }
    
    // Character models - using player model for all characters
    const characterTypes = ['player', 'cop', 'swat', 'fbi', 'army', 
                           'medic', 'fireman'];
    for (const type of characterTypes) {
      this.modelMap.set(type, 'characters/player.glb');
    }
  }
  
  /**
   * Initialize texture mappings from original GTA3 texture names to converted texture paths
   */
  private initTextureMap(): void {
    // Vehicle textures
    this.textureMap.set('vehicle', 'vehicles/vehicle.png');
    
    // Character textures
    this.textureMap.set('player', 'characters/player.png');
    
    // Environment textures
    this.textureMap.set('road', 'environment/road.png');
    this.textureMap.set('grass', 'environment/grass.png');
    this.textureMap.set('building', 'environment/building.png');
  }
  
  /**
   * Load a model from the original GTA3 game assets
   * @param modelName The original GTA3 model name
   * @returns Promise that resolves to a THREE.Group containing the model
   */
  // Cache for loaded and fallback models
  private modelCache: Map<string, THREE.Group> = new Map();

  public async loadModel(modelName: string): Promise<THREE.Group | null> {
    const modelNameLower = modelName.toLowerCase();
    
    // Check cache first
    const cachedModel = this.modelCache.get(modelNameLower);
    if (cachedModel) {
      return cachedModel.clone();
    }

    // Try to load from base AssetLoader first as it has guaranteed models
    const baseModel = this.assetLoader.getModel(modelNameLower);
    if (baseModel) {
      this.modelCache.set(modelNameLower, baseModel);
      return baseModel.clone();
    }

    // Get the mapped model path or use a default path based on model type
    let modelPath = this.modelMap.get(modelNameLower);
    if (!modelPath) {
      // Default paths based on model type
      if (modelNameLower.includes('car') || modelNameLower.includes('vehicle')) {
        modelPath = 'vehicles/car.glb';
      } else if (modelNameLower.includes('ped') || modelNameLower.includes('person')) {
        modelPath = 'characters/player.glb';
      }
    }

    // Try to load the model if we have a path
    if (modelPath) {
      try {
        const fullPath = `/assets/models/${modelPath}`;
        const gltf = await this.loadGLTF(fullPath);
        if (gltf.scene) {
          this.modelCache.set(modelNameLower, gltf.scene);
          return gltf.scene.clone();
        }
      } catch (error) {
        console.warn(`Failed to load model ${modelPath}, trying fallback`);
      }
    }

    // If model loading failed, get a fallback model
    const fallbackName = this.mapToFallbackModel(modelNameLower);
    const fallbackModel = this.assetLoader.getModel(fallbackName);
    if (fallbackModel) {
      this.modelCache.set(modelNameLower, fallbackModel);
      return fallbackModel.clone();
    }

    return null;
  }


  
  /**
   * Load a texture from the original GTA3 game assets
   * @param textureName The original GTA3 texture name
   * @returns Promise that resolves to a THREE.Texture
   */
  public async loadTexture(textureName: string): Promise<THREE.Texture | null> {
    // Check if we have a mapping for this texture
    const texturePath = this.textureMap.get(textureName.toLowerCase());
    
    if (!texturePath) {
      console.warn(`No mapping found for GTA3 texture: ${textureName}`);
      return null;
    }
    
    try {
      // Try to load the converted texture
      const fullPath = `/assets/textures/${texturePath}`;
      return await this.loadTextureFile(fullPath);
    } catch (error) {
      console.error(`Error loading GTA3 texture ${textureName}:`, error);
    }
    
    // If loading fails, fall back to the base AssetLoader
    console.warn(`Falling back to generated texture for: ${textureName}`);
    const fallbackTexture = this.assetLoader.getTexture(this.mapToFallbackTexture(textureName));
    return fallbackTexture || null;
  }
  
  /**
   * Load a GLTF model from a file
   * @param path Path to the GLTF file
   * @returns Promise that resolves to the loaded GLTF object
   */
  /**
   * Parse XML model format and convert to THREE.Group
   */

  
  private loadGLTF(path: string): Promise<GLTF> {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        path,
        (gltf) => resolve(gltf),

        (error: ProgressEvent) => reject(new Error(`Failed to load GLTF model: ${error}`))
      );
    });
  }
  
  /**
   * Load a texture from a file
   * @param path Path to the texture file
   * @returns Promise that resolves to the loaded texture
   */
  private loadTextureFile(path: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        path,
        (texture) => resolve(texture),

        (error: ProgressEvent) => reject(new Error(`Failed to load texture: ${error}`))
      );
    });
  }
  
  /**
   * Map an original GTA3 model name to a fallback model name
   * @param modelName The original GTA3 model name
   * @returns The fallback model name
   */
  private mapToFallbackModel(modelName: string): string {
    const modelNameLower = modelName.toLowerCase();
    
    // Map vehicle models to the generic 'car' model
    if (
      modelNameLower.includes('car') ||
      modelNameLower.includes('vehicle') ||
      modelNameLower === 'landstal' ||
      modelNameLower === 'idaho' ||
      modelNameLower === 'stinger' ||
      modelNameLower === 'linerun' ||
      modelNameLower === 'peren' ||
      modelNameLower === 'sentinel' ||
      modelNameLower === 'patriot' ||
      modelNameLower === 'police'
    ) {
      return 'car';
    }
    
    // Map character models to the generic 'player' model
    if (
      modelNameLower.includes('ped') ||
      modelNameLower.includes('person') ||
      modelNameLower === 'player' ||
      modelNameLower === 'cop' ||
      modelNameLower === 'swat' ||
      modelNameLower === 'fbi' ||
      modelNameLower === 'army' ||
      modelNameLower === 'medic' ||
      modelNameLower === 'fireman'
    ) {
      return 'player';
    }
    
    // Default fallback
    return modelName;
  }
  
  /**
   * Map an original GTA3 texture name to a fallback texture name
   * @param textureName The original GTA3 texture name
   * @returns The fallback texture name
   */
  private mapToFallbackTexture(textureName: string): string {
    const textureNameLower = textureName.toLowerCase();
    
    // Map road textures to the generic 'ground' texture
    if (
      textureNameLower.includes('road') ||
      textureNameLower.includes('street') ||
      textureNameLower.includes('pavement') ||
      textureNameLower.includes('asphalt')
    ) {
      return 'ground';
    }
    
    // Map building textures to the generic 'building' texture
    if (
      textureNameLower.includes('building') ||
      textureNameLower.includes('structure') ||
      textureNameLower.includes('house') ||
      textureNameLower.includes('wall')
    ) {
      return 'building';
    }
    
    // Default fallback
    return textureName;
  }
}