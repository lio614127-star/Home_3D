import * as fs from 'fs';
import * as path from 'path';

const MANIFEST_PATH = path.join(process.cwd(), 'public', 'assets', 'library', 'asset-manifest.json');
const REPORT_PATH = path.join(process.cwd(), 'validate-asset-report.md');
const PUBLIC_DIR = path.join(process.cwd(), 'public');

interface AssetItem {
  id: string;
  modelUrl?: string;
  source?: string;
  runtimeReady?: boolean;
  validationReason?: string;
  validatedAt?: string;
  [key: string]: any;
}

async function validateAssetLibrary() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error('Manifest not found at', MANIFEST_PATH);
    process.exit(1);
  }

  const manifestData = fs.readFileSync(MANIFEST_PATH, 'utf-8');
  let assets: AssetItem[] = [];
  try {
    assets = JSON.parse(manifestData);
  } catch (e) {
    console.error('Failed to parse manifest');
    process.exit(1);
  }

  let validCount = 0;
  let invalidCount = 0;
  const reasons: Record<string, number> = {};

  const updatedAssets = assets.map((asset) => {
    // Only strictly validate model assets that are meant to be GLB
    // We specifically want to validate Sweet Home 3D assets heavily
    
    // For Sweet Home 3D, it MUST have a valid GLB
    const isSH3D = asset.source === 'Sweet Home 3D';
    if (!isSH3D && asset.source === 'primitive') {
        asset.runtimeReady = true;
        asset.validationReason = 'ok';
        return asset;
    }

    if (!asset.modelUrl) {
      asset.runtimeReady = false;
      asset.validationReason = 'missingModelUrl';
    } else {
      let isGlbOrGltf = asset.modelUrl.toLowerCase().endsWith('.glb') || asset.modelUrl.toLowerCase().endsWith('.gltf');
      if (!isGlbOrGltf) {
        asset.runtimeReady = false;
        asset.validationReason = 'unsupportedExtension';
      } else {
        // Check if file exists physically
        // modelUrl usually starts with /assets/library/
        // Map it to physical path
        const relativePath = asset.modelUrl.startsWith('/') ? asset.modelUrl.substring(1) : asset.modelUrl;
        const physicalPath = path.join(PUBLIC_DIR, relativePath);

        if (!fs.existsSync(physicalPath)) {
          asset.runtimeReady = false;
          asset.validationReason = 'missingFile';
        } else {
          const stats = fs.statSync(physicalPath);
          if (stats.size < 5000) { // < 5KB
            asset.runtimeReady = false;
            asset.validationReason = 'fileTooSmall';
          } else {
            // Check Magic Header for .glb
            if (physicalPath.endsWith('.glb')) {
                try {
                    const fd = fs.openSync(physicalPath, 'r');
                    const buffer = Buffer.alloc(12);
                    fs.readSync(fd, buffer, 0, 12, 0);
                    fs.closeSync(fd);
                    
                    const magic = buffer.toString('utf-8', 0, 4);
                    const version = buffer.readUInt32LE(4);
                    
                    if (magic !== 'glTF' || version !== 2) {
                        asset.runtimeReady = false;
                        asset.validationReason = 'invalidGlbHeader';
                    } else {
                        asset.runtimeReady = true;
                        asset.validationReason = 'ok';
                    }
                } catch (e) {
                    asset.runtimeReady = false;
                    asset.validationReason = 'readError';
                }
            } else {
                // .gltf
                try {
                    const content = fs.readFileSync(physicalPath, 'utf-8');
                    const parsed = JSON.parse(content);
                    if (!parsed.asset || !parsed.asset.version) {
                        asset.runtimeReady = false;
                        asset.validationReason = 'invalidGltfJson';
                    } else {
                        asset.runtimeReady = true;
                        asset.validationReason = 'ok';
                    }
                } catch (e) {
                    asset.runtimeReady = false;
                    asset.validationReason = 'invalidGltfJson';
                }
            }
          }
        }
      }
    }

    asset.validatedAt = new Date().toISOString();
    
    if (asset.runtimeReady) {
        validCount++;
    } else {
        invalidCount++;
        const r = asset.validationReason || 'unknown';
        reasons[r] = (reasons[r] || 0) + 1;
    }

    return asset;
  });

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(updatedAssets, null, 2), 'utf-8');
  
  // Write report
  let report = `# Asset Validation Report\n\n`;
  report += `Date: ${new Date().toISOString()}\n\n`;
  report += `- Total Assets: ${assets.length}\n`;
  report += `- Valid/Ready: ${validCount}\n`;
  report += `- Invalid/Broken: ${invalidCount}\n\n`;
  
  if (invalidCount > 0) {
      report += `## Invalid Reasons\n`;
      for (const [reason, count] of Object.entries(reasons)) {
          report += `- **${reason}**: ${count} assets\n`;
      }
  }

  fs.writeFileSync(REPORT_PATH, report, 'utf-8');
  console.log(`Validation complete. Valid: ${validCount}, Invalid: ${invalidCount}. Saved to manifest and report.`);
}

validateAssetLibrary().catch(e => {
    console.error(e);
    process.exit(1);
});
