import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const RE3_ROOT = path.join(__dirname, '..');
const GAMEFILES_DIR = path.join(RE3_ROOT, '..', 'gamefiles');
const ASSETS_DIR = path.join(RE3_ROOT, 'public', 'assets');

// Create directories if they don't exist
const MODELS_DIR = path.join(ASSETS_DIR, 'models');
const TEXTURES_DIR = path.join(ASSETS_DIR, 'textures');
const VEHICLES_DIR = path.join(MODELS_DIR, 'vehicles');
const CHARACTERS_DIR = path.join(MODELS_DIR, 'characters');
const BUILDINGS_DIR = path.join(MODELS_DIR, 'buildings');

// Ensure directories exist
function ensureDirectoriesExist() {
  const dirs = [MODELS_DIR, TEXTURES_DIR, VEHICLES_DIR, CHARACTERS_DIR, BUILDINGS_DIR];
  
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  }
}

// Check if a tool is installed
function isToolInstalled(command) {
  try {
    execSync(`where ${command}`, { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

// Install required tools
function installRequiredTools() {
  console.log('Checking for required tools...');
  
  // Check for img-tool (for extracting IMG archives)
  if (!isToolInstalled('img-tool')) {
    console.log('img-tool not found. Please install it manually.');
    console.log('You can find it at: https://github.com/aap/imgtools');
  }
  
  // Check for txd-tool (for converting TXD textures)
  if (!isToolInstalled('txd-tool')) {
    console.log('txd-tool not found. Please install it manually.');
    console.log('You can find it at: https://github.com/aap/rwtools');
  }
  
  // Check for dff-tool (for converting DFF models)
  if (!isToolInstalled('dff-tool')) {
    console.log('dff-tool not found. Please install it manually.');
    console.log('You can find it at: https://github.com/aap/rwtools');
  }
}

// Extract files from IMG archives
function extractIMGFiles() {
  console.log('Extracting files from IMG archives...');
  
  const imgFiles = [
    path.join(GAMEFILES_DIR, 'models', 'gta3.img')
  ];
  
  const tempExtractDir = path.join(RE3_ROOT, 'temp_extract');
  if (!fs.existsSync(tempExtractDir)) {
    fs.mkdirSync(tempExtractDir, { recursive: true });
  }
  
  for (const imgFile of imgFiles) {
    if (fs.existsSync(imgFile)) {
      try {
        console.log(`Extracting ${imgFile}...`);
        execSync(`img-tool -x "${imgFile}" -o "${tempExtractDir}"`, { stdio: 'inherit' });
      } catch (e) {
        console.error(`Failed to extract ${imgFile}: ${e.message}`);
        console.log('Falling back to manual asset creation...');
        return false;
      }
    } else {
      console.log(`IMG file not found: ${imgFile}`);
    }
  }
  
  return true;
}

// Convert TXD textures to PNG
function convertTXDTextures() {
  console.log('Converting TXD textures to PNG...');
  
  const tempExtractDir = path.join(RE3_ROOT, 'temp_extract');
  const txdFiles = fs.readdirSync(tempExtractDir)
    .filter(file => file.toLowerCase().endsWith('.txd'));
  
  for (const txdFile of txdFiles) {
    const txdPath = path.join(tempExtractDir, txdFile);
    const textureName = path.basename(txdFile, '.txd');
    const outputDir = path.join(TEXTURES_DIR, textureName);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    try {
      console.log(`Converting ${txdFile} to PNG...`);
      execSync(`txd-tool -x "${txdPath}" -o "${outputDir}"`, { stdio: 'inherit' });
    } catch (e) {
      console.error(`Failed to convert ${txdFile}: ${e.message}`);
    }
  }
}

// Convert DFF models to GLTF
function convertDFFModels() {
  console.log('Converting DFF models to GLTF...');
  
  const tempExtractDir = path.join(RE3_ROOT, 'temp_extract');
  const dffFiles = fs.readdirSync(tempExtractDir)
    .filter(file => file.toLowerCase().endsWith('.dff'));
  
  for (const dffFile of dffFiles) {
    const dffPath = path.join(tempExtractDir, dffFile);
    const modelName = path.basename(dffFile, '.dff');
    let outputDir;
    
    // Determine the appropriate output directory based on model name
    if (modelName.toLowerCase().includes('car') || 
        modelName.toLowerCase().includes('vehicle')) {
      outputDir = VEHICLES_DIR;
    } else if (modelName.toLowerCase().includes('ped') || 
               modelName.toLowerCase().includes('player')) {
      outputDir = CHARACTERS_DIR;
    } else {
      outputDir = BUILDINGS_DIR;
    }
    
    try {
      console.log(`Converting ${dffFile} to GLTF...`);
      execSync(`dff-tool -g "${dffPath}" -o "${outputDir}/${modelName}.gltf"`, { stdio: 'inherit' });
    } catch (e) {
      console.error(`Failed to convert ${dffFile}: ${e.message}`);
    }
  }
}

// Fallback: Generate basic models if conversion fails
function generateBasicModels() {
  console.log('Generating basic models as fallback...');
  
  try {
    // Use the existing generateModels.js script
    execSync('node scripts/generateModels.js', { stdio: 'inherit', cwd: RE3_ROOT });
    console.log('Basic models generated successfully.');
    return true;
  } catch (e) {
    console.error(`Failed to generate basic models: ${e.message}`);
    return false;
  }
}

// Clean up temporary files
function cleanUp() {
  console.log('Cleaning up temporary files...');
  
  const tempExtractDir = path.join(RE3_ROOT, 'temp_extract');
  if (fs.existsSync(tempExtractDir)) {
    try {
      fs.rmSync(tempExtractDir, { recursive: true, force: true });
      console.log('Temporary files cleaned up successfully.');
    } catch (e) {
      console.error(`Failed to clean up temporary files: ${e.message}`);
    }
  }
}

// Main function
async function main() {
  console.log('Starting asset conversion process...');
  
  // Ensure directories exist
  ensureDirectoriesExist();
  
  // Check for required tools
  installRequiredTools();
  
  // Try to extract and convert original assets
  let conversionSuccessful = false;
  
  if (extractIMGFiles()) {
    convertTXDTextures();
    convertDFFModels();
    conversionSuccessful = true;
  }
  
  // If conversion failed, generate basic models
  if (!conversionSuccessful) {
    generateBasicModels();
  }
  
  // Clean up
  cleanUp();
  
  console.log('Asset conversion process completed.');
}

// Run the main function
main().catch(err => {
  console.error('An error occurred during asset conversion:', err);
});