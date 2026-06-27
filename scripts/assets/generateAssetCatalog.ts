import fs from 'fs';
import path from 'path';

const ASSETS_DIR = path.resolve('public/assets/library');
const MANIFEST_PATH = path.join(ASSETS_DIR, 'asset-manifest.json');
const SRC_DIR = path.resolve('src/core/assets');
const CATALOG_MODELS_PATH = path.join(SRC_DIR, 'generatedAssetCatalog.ts');
const CATALOG_MATERIALS_PATH = path.join(SRC_DIR, 'generatedMaterialCatalog.ts');

function generateCatalogs() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error('[ERROR] asset-manifest.json not found. Run download script first.');
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  
  const models = manifest.filter((m: any) => m.type === 'model').map((m: any) => {
    // Check if SVG thumbnail exists
    const thumbPath = path.join(ASSETS_DIR, 'thumbnails', 'models', `${m.id}.svg`);
    if (fs.existsSync(thumbPath)) {
      m.thumbnailUrl = `/assets/library/thumbnails/models/${m.id}.svg`;
    }
    return m;
  });
  const materials = manifest.filter((m: any) => m.type === 'material');

  const modelsOutput = `// AUTO-GENERATED. DO NOT EDIT DIRECTLY.
export const GENERATED_ASSET_CATALOG = ${JSON.stringify(models, null, 2)};
`;

  const materialsOutput = `// AUTO-GENERATED. DO NOT EDIT DIRECTLY.
export const GENERATED_MATERIAL_CATALOG = ${JSON.stringify(materials, null, 2)};
`;

  if (!fs.existsSync(SRC_DIR)) {
    fs.mkdirSync(SRC_DIR, { recursive: true });
  }

  fs.writeFileSync(CATALOG_MODELS_PATH, modelsOutput);
  fs.writeFileSync(CATALOG_MATERIALS_PATH, materialsOutput);
  
  console.log(`[SUCCESS] Generated catalog stubs:`);
  console.log(`  - ${models.length} models -> generatedAssetCatalog.ts`);
  console.log(`  - ${materials.length} materials -> generatedMaterialCatalog.ts`);
}

generateCatalogs();
