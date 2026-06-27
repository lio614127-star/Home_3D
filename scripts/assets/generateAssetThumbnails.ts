import fs from 'fs';
import path from 'path';

const MANIFEST_PATH = path.resolve('public/assets/library/asset-manifest.json');
const THUMB_DIR = path.resolve('public/assets/library/thumbnails/models');

if (!fs.existsSync(THUMB_DIR)) {
  fs.mkdirSync(THUMB_DIR, { recursive: true });
}

function getAssetKind(definition: any) {
  const text = `${definition.name} ${definition.category} ${(definition.tags || []).join(' ')}`.toLowerCase();
  
  if (text.includes('bed') || text.includes('giường')) return 'bed';
  if (text.includes('sofa')) return 'sofa';
  if (text.includes('table') || text.includes('bàn')) return 'table';
  if (text.includes('chair') || text.includes('ghế')) return 'chair';
  if (text.includes('cabinet') || text.includes('tủ')) return 'cabinet';
  if (text.includes('plant') || text.includes('tree') || text.includes('cây')) return 'plant';
  if (text.includes('door') || text.includes('cửa')) return 'door';
  if (text.includes('window') || text.includes('cửa sổ')) return 'window';
  if (text.includes('lighting') || text.includes('lamp') || text.includes('đèn')) return 'lamp';
  return 'generic';
}

function generateSVGForKind(kind: string): string {
  const bgColor = '#f0f4f8';
  let innerSvg = '';
  
  // Minimalist top-down or isometric SVGs
  switch(kind) {
    case 'bed':
      innerSvg = `
        <rect x="20" y="20" width="60" height="60" rx="4" fill="#a5d6a7" stroke="#2e7d32" stroke-width="2"/>
        <rect x="25" y="25" width="50" height="15" rx="2" fill="#ffffff" opacity="0.8"/>
        <line x1="20" y1="45" x2="80" y2="45" stroke="#2e7d32" stroke-width="2"/>
      `;
      break;
    case 'sofa':
      innerSvg = `
        <rect x="15" y="25" width="70" height="40" rx="4" fill="#90caf9" stroke="#1565c0" stroke-width="2"/>
        <rect x="15" y="25" width="70" height="15" rx="4" fill="#1565c0" opacity="0.2"/>
        <rect x="15" y="35" width="15" height="30" rx="2" fill="#1565c0" opacity="0.2"/>
        <rect x="70" y="35" width="15" height="30" rx="2" fill="#1565c0" opacity="0.2"/>
      `;
      break;
    case 'table':
      innerSvg = `
        <rect x="20" y="30" width="60" height="40" rx="2" fill="#bcaaa4" stroke="#5d4037" stroke-width="2"/>
        <rect x="25" y="35" width="50" height="30" rx="2" fill="none" stroke="#5d4037" stroke-width="1" stroke-dasharray="4"/>
      `;
      break;
    case 'chair':
      innerSvg = `
        <rect x="30" y="30" width="40" height="40" rx="4" fill="#ffcc80" stroke="#ef6c00" stroke-width="2"/>
        <rect x="35" y="30" width="30" height="10" rx="2" fill="#ef6c00" opacity="0.3"/>
      `;
      break;
    case 'cabinet':
      innerSvg = `
        <rect x="25" y="10" width="50" height="80" rx="2" fill="#cfd8dc" stroke="#455a64" stroke-width="2"/>
        <line x1="25" y1="50" x2="75" y2="50" stroke="#455a64" stroke-width="2"/>
        <line x1="50" y1="10" x2="50" y2="90" stroke="#455a64" stroke-width="2"/>
      `;
      break;
    case 'plant':
      innerSvg = `
        <circle cx="50" cy="50" r="30" fill="#aed581" stroke="#33691e" stroke-width="2"/>
        <circle cx="50" cy="50" r="15" fill="#8bc34a"/>
        <circle cx="50" cy="50" r="5" fill="#33691e"/>
      `;
      break;
    default:
      innerSvg = `
        <rect x="25" y="25" width="50" height="50" rx="4" fill="#e0e0e0" stroke="#757575" stroke-width="2"/>
        <text x="50" y="55" font-family="sans-serif" font-size="20" fill="#757575" text-anchor="middle">?</text>
      `;
      break;
  }
  
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" fill="${bgColor}"/>
    ${innerSvg}
  </svg>`;
}

async function run() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.warn(`[WARN] Manifest not found at ${MANIFEST_PATH}`);
    return;
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  let generatedCount = 0;

  for (const asset of manifest) {
    if (asset.type === 'model' || asset.format === 'glb') {
      const kind = getAssetKind(asset);
      const svgContent = generateSVGForKind(kind);
      const thumbName = `${asset.id}.svg`;
      const thumbPath = path.join(THUMB_DIR, thumbName);
      
      fs.writeFileSync(thumbPath, svgContent, 'utf-8');
      generatedCount++;
    }
  }

  console.log(`Generated ${generatedCount} SVG thumbnails to ${THUMB_DIR}`);
}

run().catch(console.error);
