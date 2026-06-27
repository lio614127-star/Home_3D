import fs from 'fs';
import path from 'path';
import https from 'https';
import admZip from 'adm-zip';

// Config
const ASSETS_DIR = path.resolve('public/assets/library');
const TEMP_DIR = path.join(ASSETS_DIR, '_source');
const MANIFEST_PATH = path.join(ASSETS_DIR, 'asset-manifest.json');

const DIRS = [
  'models/furniture',
  'models/exterior',
  'models/plants',
  'models/openings',
  'models/decor',
  'materials/concrete',
  'materials/wood',
  'materials/tile',
  'materials/roof',
  'materials/grass',
  'materials/stone',
  'materials/brick',
  'thumbnails/models',
  'thumbnails/materials',
  'licenses',
  '_source'
];

interface ManifestAsset {
  id: string;
  name: string;
  category: string;
  type: 'model' | 'material';
  format?: string;
  modelUrl?: string;
  thumbnailUrl?: string;
  defaultSize?: { x: number; y: number; z: number };
  defaultScale?: { x: number; y: number };
  source: string;
  sourceUrl: string;
  license: string;
  attributionRequired: boolean;
  tags: string[];
  unit?: string;
  origin?: string;
  polyCountLevel?: string;
  maps?: {
    baseColor?: string;
    normal?: string;
    roughness?: string;
    ao?: string;
  };
  downloadedAt: string;
}

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

// Curated List
const TARGET_MODELS = [
  { id: 'chair_wood', name: 'Wooden Chair', file: 'chair.glb', category: 'furniture/chair', tags: ['chair', 'wood'] },
  { id: 'table_dining', name: 'Dining Table', file: 'table.glb', category: 'furniture/table', tags: ['table', 'dining'] },
  { id: 'bed_single', name: 'Single Bed', file: 'bedSingle.glb', category: 'furniture/bed', tags: ['bed', 'single'] },
  { id: 'cabinet_tv', name: 'TV Cabinet', file: 'cabinetTelevision.glb', category: 'furniture/storage', tags: ['cabinet', 'tv'] },
  { id: 'plant_potted', name: 'Potted Plant', file: 'plant.glb', category: 'exterior/plants', tags: ['plant', 'pot'] }
];

const TARGET_MATERIALS = [
  { id: 'RoofingTiles009', name: 'Roof Tiles 009', category: 'material/roof', tags: ['roof', 'tile'] },
  { id: 'Concrete019', name: 'Concrete 019', category: 'material/concrete', tags: ['concrete', 'wall'] },
  { id: 'WoodFloor041', name: 'Wood Floor 041', category: 'material/wood', tags: ['wood', 'floor'] },
  { id: 'Tiles107', name: 'Ceramic Tiles 107', category: 'material/tile', tags: ['tile', 'ceramic', 'floor'] },
  { id: 'Grass001', name: 'Grass 001', category: 'material/grass', tags: ['grass', 'ground'] },
  { id: 'PavingStones092', name: 'Paving Stones 092', category: 'material/stone', tags: ['stone', 'paving', 'outdoor'] },
  { id: 'Bricks076', name: 'Bricks 076', category: 'material/brick', tags: ['brick', 'wall'] }
];

async function ensureDirs() {
  if (isDryRun) {
    console.log('[DRY-RUN] Would create directories under:', ASSETS_DIR);
    return;
  }
  for (const dir of DIRS) {
    const fullPath = path.join(ASSETS_DIR, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }
}

async function downloadFile(url: string, dest: string): Promise<boolean> {
  if (isDryRun) {
    console.log(`[DRY-RUN] Would download: ${url} -> ${dest}`);
    return true;
  }
  if (fs.existsSync(dest)) {
    console.log(`[SKIP] File already exists: ${dest}`);
    return true;
  }
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`[ERROR] Failed to download ${url}: HTTP ${response.status} ${response.statusText}`);
      return false;
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(dest, buffer);
    return true;
  } catch (err: any) {
    console.error(`[ERROR] Download error ${url}: ${err.message}`);
    return false;
  }
}

async function processKenney() {
  console.log('--- Processing Kenney Furniture Kit ---');
  // We'll use a placeholder direct ZIP link. Kenney's direct links often change or block automated agents.
  // In a real production scenario, we host our own curated bucket or use a stable Github mirror.
  // Here we simulate the process. We will attempt a known URL pattern, but handle failure gracefully.
  const zipUrl = 'https://kenney.nl/data/zip/furniture-kit.zip';
  const zipDest = path.join(TEMP_DIR, 'furniture-kit.zip');
  
  let success = await downloadFile(zipUrl, zipDest);
  
  const manifestAssets: ManifestAsset[] = [];
  const now = new Date().toISOString();

  if (success && !isDryRun && fs.existsSync(zipDest)) {
    try {
      const zip = new admZip(zipDest);
      const zipEntries = zip.getEntries();
      
      for (const target of TARGET_MODELS) {
        const entryName = `Models/GLTF format/${target.file}`;
        const entry = zipEntries.find(e => e.entryName === entryName);
        
        if (entry) {
          const outDir = path.join(ASSETS_DIR, target.category.split('/')[0], target.category.split('/')[1] || '');
          if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
          
          const outFile = path.join(outDir, target.file);
          fs.writeFileSync(outFile, entry.getData());
          console.log(`[EXTRACTED] ${target.file}`);
          
          manifestAssets.push({
            id: target.id,
            name: target.name,
            category: target.category,
            type: 'model',
            format: 'glb',
            modelUrl: `/assets/library/models/${target.category.split('/')[1] || target.category.split('/')[0]}/${target.file}`,
            source: 'Kenney',
            sourceUrl: 'https://kenney.nl/assets/furniture-kit',
            license: 'CC0',
            attributionRequired: false,
            tags: target.tags,
            unit: 'meter',
            origin: 'bottom-center',
            downloadedAt: now
          });
        }
      }
    } catch (e: any) {
      console.error('[ERROR] Failed to extract Kenney zip:', e.message);
    }
  } else if (!isDryRun) {
     console.log('[WARN] Kenney download failed. Asset catalog will still be generated without them.');
  } else {
     // Dry run adds dummy manifests to test generation
     manifestAssets.push({
        id: 'chair_wood',
        name: 'Wooden Chair',
        category: 'furniture/chair',
        type: 'model',
        modelUrl: '/assets/library/models/furniture/chair.glb',
        source: 'Kenney',
        sourceUrl: 'https://kenney.nl/assets/furniture-kit',
        license: 'CC0',
        attributionRequired: false,
        tags: ['chair'],
        downloadedAt: now
     });
  }
  return manifestAssets;
}

async function processAmbientCG() {
  console.log('\n--- Processing ambientCG Materials ---');
  const manifestAssets: ManifestAsset[] = [];
  const now = new Date().toISOString();

  for (const target of TARGET_MATERIALS) {
    const zipUrl = `https://ambientcg.com/get?id=${target.id}&s=1K-JPG&type=zip`;
    const zipDest = path.join(TEMP_DIR, `${target.id}.zip`);
    
    let success = await downloadFile(zipUrl, zipDest);
    
    if (success && !isDryRun && fs.existsSync(zipDest)) {
      try {
        const zip = new admZip(zipDest);
        const zipEntries = zip.getEntries();
        
        const catFolder = target.category.split('/')[1] || 'misc';
        const outDir = path.join(ASSETS_DIR, 'materials', catFolder, target.id);
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        
        const maps: any = {};
        
        for (const entry of zipEntries) {
          const name = entry.name.toLowerCase();
          let mapType = '';
          if (name.includes('color')) mapType = 'baseColor';
          else if (name.includes('normalgl') || name.includes('normal')) mapType = 'normal';
          else if (name.includes('roughness')) mapType = 'roughness';
          else if (name.includes('ambientocclusion')) mapType = 'ao';
          
          if (mapType) {
            const outName = `${mapType}.jpg`;
            fs.writeFileSync(path.join(outDir, outName), entry.getData());
            maps[mapType] = `/assets/library/materials/${catFolder}/${target.id}/${outName}`;
          }
        }
        
        console.log(`[EXTRACTED] Material ${target.id}`);
        
        manifestAssets.push({
          id: target.id,
          name: target.name,
          category: target.category,
          type: 'material',
          maps,
          source: 'ambientCG',
          sourceUrl: `https://ambientcg.com/view?id=${target.id}`,
          license: 'CC0',
          attributionRequired: false,
          tags: target.tags,
          downloadedAt: now
        });
      } catch (e: any) {
        console.error(`[ERROR] Failed to extract ${target.id}:`, e.message);
      }
    } else if (!isDryRun) {
      console.log(`[WARN] Failed to download material ${target.id}`);
    } else {
       // Dry run dummy
       manifestAssets.push({
          id: target.id,
          name: target.name,
          category: target.category,
          type: 'material',
          maps: { baseColor: `/assets/library/materials/test/${target.id}/baseColor.jpg` },
          source: 'ambientCG',
          sourceUrl: `https://ambientcg.com/view?id=${target.id}`,
          license: 'CC0',
          attributionRequired: false,
          tags: target.tags,
          downloadedAt: now
       });
    }
  }
  return manifestAssets;
}

async function main() {
  console.log(`Starting asset download script... (Dry Run: ${isDryRun})`);
  await ensureDirs();
  
  const models = await processKenney();
  const materials = await processAmbientCG();
  
  const manifest = [...models, ...materials];
  
  if (!isDryRun) {
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    console.log(`\n[SUCCESS] Wrote manifest with ${manifest.length} items to ${MANIFEST_PATH}`);
  } else {
    console.log(`\n[DRY-RUN] Would write manifest with ${manifest.length} items to ${MANIFEST_PATH}`);
  }
}

main().catch(console.error);
