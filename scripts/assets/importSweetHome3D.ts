import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import obj2gltf from 'obj2gltf';

const ZIPS_DIR = path.resolve('public/assets/library/_source/sweethome3d/zips');
const EXTRACT_DIR = path.resolve('public/assets/library/_source/sweethome3d/extracted');
const MODELS_OUT_DIR = path.resolve('public/assets/library/models/sweethome3d');
const THUMB_OUT_DIR = path.resolve('public/assets/library/thumbnails/models/sweethome3d');
const MANIFEST_PATH = path.resolve('public/assets/library/asset-manifest.json');
const REPORT_PATH = path.resolve('public/assets/library/licenses/sweethome3d-import-report.md');

// Ensure dirs
[EXTRACT_DIR, MODELS_OUT_DIR, THUMB_OUT_DIR, path.dirname(REPORT_PATH)].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

function parseProperties(content: string) {
  const lines = content.split('\n');
  const items: Record<string, any> = {};
  const globalProps: Record<string, string> = {};

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;
    
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    
    const key = line.slice(0, eqIdx).trim();
    const val = line.slice(eqIdx + 1).trim();

    const match = key.match(/^(.*?)#(\d+)$/);
    if (match) {
       const propName = match[1];
       const idx = match[2];
       if (!items[idx]) items[idx] = {};
       items[idx][propName] = val;
    } else {
       globalProps[key] = val;
    }
  }
  return { items: Object.values(items), globalProps };
}

function detectLicense(zipName: string, globalProps: any) {
  let licenseStr = "Unknown";
  let attributionRequired = true;
  
  const zipLower = zipName.toLowerCase();
  if (zipLower.includes("cc-0") || zipLower.includes("cc0")) {
     licenseStr = "CC0";
     attributionRequired = false;
  } else if (zipLower.includes("cc-by")) {
     licenseStr = "CC-BY";
     attributionRequired = true;
  } else if (globalProps.license) {
     licenseStr = globalProps.license;
     if (licenseStr.toLowerCase().includes("cc0") || licenseStr.toLowerCase().includes("public domain")) {
         attributionRequired = false;
     }
  }

  return { license: licenseStr, attributionRequired };
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function run() {
  if (!fs.existsSync(ZIPS_DIR)) {
    console.warn(`[WARN] Source directory not found: ${ZIPS_DIR}`);
    return;
  }

  let manifest: any[] = [];
  if (fs.existsSync(MANIFEST_PATH)) {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  }

  const existingIds = new Set(manifest.map(m => m.id));
  const newAssets: any[] = [];

  const report = {
    totalZips: 0,
    totalSh3f: 0,
    totalModelsFound: 0,
    totalConverted: 0,
    totalSkippedUnsupported: 0,
    totalSkippedUnknownLicense: 0,
    zipSummaries: [] as any[]
  };

  const zipFiles = fs.readdirSync(ZIPS_DIR).filter(f => f.toLowerCase().endsWith('.zip'));
  report.totalZips = zipFiles.length;

  for (const zipFile of zipFiles) {
    console.log(`Processing ZIP: ${zipFile}`);
    const zipPath = path.join(ZIPS_DIR, zipFile);
    const zipName = path.basename(zipFile, '.zip');
    const zipExtractedDir = path.join(EXTRACT_DIR, zipName);
    
    const zipSummary = {
      zipName: zipFile,
      license: "Unknown",
      sh3fCount: 0,
      converted: 0,
      skipped: 0
    };

    try {
      const zipArch = new AdmZip(zipPath);
      zipArch.extractAllTo(zipExtractedDir, true);

      // Read license if exists
      let licenseTxt = "";
      if (fs.existsSync(path.join(zipExtractedDir, 'LICENSE.TXT'))) {
        licenseTxt = fs.readFileSync(path.join(zipExtractedDir, 'LICENSE.TXT'), 'utf-8');
      }

      const sh3fFiles = fs.readdirSync(zipExtractedDir).filter(f => f.toLowerCase().endsWith('.sh3f'));
      report.totalSh3f += sh3fFiles.length;
      zipSummary.sh3fCount = sh3fFiles.length;

      for (const sh3fFile of sh3fFiles) {
        console.log(`  Extracting SH3F: ${sh3fFile}`);
        const sh3fPath = path.join(zipExtractedDir, sh3fFile);
        const sh3fName = path.basename(sh3fFile, '.sh3f');
        const sh3fExtractedDir = path.join(zipExtractedDir, sh3fName);
        
        const sh3fArch = new AdmZip(sh3fPath);
        sh3fArch.extractAllTo(sh3fExtractedDir, true);

        const propsPath = path.join(sh3fExtractedDir, 'PluginFurnitureCatalog.properties');
        if (!fs.existsSync(propsPath)) {
          console.warn(`  [WARN] No PluginFurnitureCatalog.properties in ${sh3fFile}`);
          continue;
        }

        const propsContent = fs.readFileSync(propsPath, 'utf-8');
        const { items, globalProps } = parseProperties(propsContent);

        const { license, attributionRequired } = detectLicense(zipName, globalProps);
        zipSummary.license = license;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          report.totalModelsFound++;

          if (license === "Unknown") {
            report.totalSkippedUnknownLicense++;
            zipSummary.skipped++;
            continue;
          }

          if (!item.model) {
             zipSummary.skipped++;
             continue; // No model file
          }

          // model string could be "/models/tree.obj"
          const modelRelPath = item.model.startsWith('/') ? item.model.slice(1) : item.model;
          const modelFullPath = path.join(sh3fExtractedDir, modelRelPath);

          if (!fs.existsSync(modelFullPath)) {
             zipSummary.skipped++;
             continue;
          }

          const ext = path.extname(modelFullPath).toLowerCase();
          if (ext !== '.obj') {
             report.totalSkippedUnsupported++;
             zipSummary.skipped++;
             console.log(`    Skipping unsupported format: ${ext} for ${item.name}`);
             continue;
          }

          // Generate ID
          const safeName = slugify(item.name || `model-${i}`);
          const safeLib = slugify(sh3fName);
          let assetId = `sweethome3d-${safeLib}-${safeName}`;
          if (existingIds.has(assetId)) {
             assetId = `${assetId}-${i}`;
          }
          existingIds.add(assetId);

          // Convert to GLB
          const glbOutPath = path.join(MODELS_OUT_DIR, `${assetId}.glb`);
          let conversionSuccess = false;
          let skipConversion = false;

          // Check if valid GLB already exists to skip
          if (fs.existsSync(glbOutPath)) {
             const stats = fs.statSync(glbOutPath);
             if (stats.size > 5000) {
                 try {
                     const fd = fs.openSync(glbOutPath, 'r');
                     const buffer = Buffer.alloc(12);
                     fs.readSync(fd, buffer, 0, 12, 0);
                     fs.closeSync(fd);
                     
                     const magic = buffer.toString('utf-8', 0, 4);
                     const version = buffer.readUInt32LE(4);
                     if (magic === 'glTF' && version === 2) {
                         skipConversion = true;
                         conversionSuccess = true;
                         console.log(`    Skipping ${item.name} (valid GLB exists)`);
                     }
                 } catch (e) {
                     // ignore error and re-convert
                 }
             }
          }

          try {
             if (!skipConversion) {
                 console.log(`    Converting ${item.name} -> ${assetId}.glb`);
                 const glbBuffer = await obj2gltf(modelFullPath, { binary: true });
                 fs.writeFileSync(glbOutPath, glbBuffer);
             }
             
             // Strict validation of output
             if (fs.existsSync(glbOutPath)) {
                const stats = fs.statSync(glbOutPath);
                if (stats.size > 5000) {
                    const fd = fs.openSync(glbOutPath, 'r');
                    const buffer = Buffer.alloc(12);
                    fs.readSync(fd, buffer, 0, 12, 0);
                    fs.closeSync(fd);
                    
                    const magic = buffer.toString('utf-8', 0, 4);
                    const version = buffer.readUInt32LE(4);
                    if (magic === 'glTF' && version === 2) {
                        conversionSuccess = true;
                        report.totalConverted++;
                        zipSummary.converted++;
                    } else {
                        console.error(`    [ERROR] Invalid GLB generated for ${item.name}`);
                        zipSummary.skipped++;
                        fs.unlinkSync(glbOutPath);
                        continue;
                    }
                } else {
                    console.error(`    [ERROR] Generated GLB too small for ${item.name}`);
                    zipSummary.skipped++;
                    fs.unlinkSync(glbOutPath);
                    continue;
                }
             } else {
                 console.error(`    [ERROR] GLB not written for ${item.name}`);
                 zipSummary.skipped++;
                 continue;
             }
          } catch (err: any) {
             console.error(`    [ERROR] Conversion failed for ${item.name}: ${err.message}`);
             zipSummary.skipped++;
             continue;
          }

          // Handle Thumbnail
          let thumbUrl = undefined;
          if (item.icon) {
             const iconRel = item.icon.startsWith('/') ? item.icon.slice(1) : item.icon;
             const iconFull = path.join(sh3fExtractedDir, iconRel);
             if (fs.existsSync(iconFull)) {
                const iconExt = path.extname(iconFull).toLowerCase();
                const thumbOutPath = path.join(THUMB_OUT_DIR, `${assetId}${iconExt}`);
                fs.copyFileSync(iconFull, thumbOutPath);
                thumbUrl = `/assets/library/thumbnails/models/sweethome3d/${assetId}${iconExt}`;
             }
          }

          // Push metadata
          const assetMeta = {
            id: assetId,
            name: item.name || "Unknown Sweet Home 3D Model",
            category: item.category || "uncategorized",
            type: "model",
            format: "glb",
            modelUrl: `/assets/library/models/sweethome3d/${assetId}.glb`,
            thumbnailUrl: thumbUrl,
            defaultSize: {
              width: item.width ? Number(item.width) / 10 : 1, // SH3D uses millimeters or arbitrary scale, usually cm? wait, usually mm or cm. Let's assume cm for obj but often unit varies. We will provide 1 if NaN. SH3D uses cm for width/depth usually in properties.
              depth: item.depth ? Number(item.depth) / 10 : 1, // converting cm to meter? Wait, Sweet Home 3D catalog uses CM? Or MM? Usually CM or MM. We'll divide by 100 if cm.
            },
            source: "Sweet Home 3D",
            sourceLibrary: sh3fName,
            sourceZip: zipFile,
            originalFile: item.model,
            author: item.creator || globalProps.provider || "Unknown",
            license: license,
            attributionRequired: attributionRequired,
            tags: item.tags ? item.tags.split(',').map((t: string) => t.trim()) : ["sweethome3d"],
            isPlaceholder: false
          };

          // Fix size units - SweetHome3D width/depth are usually in cm, sometimes mm depending on version. Let's assume cm and convert to meters.
          if (item.width) assetMeta.defaultSize.width = Number(item.width) / 100;
          if (item.depth) assetMeta.defaultSize.depth = Number(item.depth) / 100;

          // Since we verified it, mark it as runtime ready
          (assetMeta as any).runtimeReady = true;
          (assetMeta as any).validationReason = 'ok';
          (assetMeta as any).validatedAt = new Date().toISOString();

          newAssets.push(assetMeta);
        }
      }
    } catch (err: any) {
      console.error(`[ERROR] Processing ZIP ${zipFile} failed: ${err.message}`);
    }
    
    report.zipSummaries.push(zipSummary);
  }

  // Update manifest
  manifest.push(...newAssets);
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');

  // Generate Report
  const reportLines = [
    `# Sweet Home 3D Import Report`,
    `Generated on: ${new Date().toISOString()}`,
    ``,
    `## Summary`,
    `- Total ZIPs processed: ${report.totalZips}`,
    `- Total .sh3f files: ${report.totalSh3f}`,
    `- Total models found: ${report.totalModelsFound}`,
    `- Successfully converted (.obj to .glb): ${report.totalConverted}`,
    `- Skipped (unsupported format like .dae, .3ds): ${report.totalSkippedUnsupported}`,
    `- Skipped (unknown license): ${report.totalSkippedUnknownLicense}`,
    ``,
    `## ZIP Summaries`
  ];

  for (const zs of report.zipSummaries) {
    reportLines.push(
      `### ${zs.zipName}`,
      `- License resolved: ${zs.license}`,
      `- SH3F files: ${zs.sh3fCount}`,
      `- Converted to GLB: ${zs.converted}`,
      `- Skipped: ${zs.skipped}`
    );
  }

  fs.writeFileSync(REPORT_PATH, reportLines.join('\n'), 'utf-8');

  console.log(`\n[SUCCESS] Imported ${newAssets.length} Sweet Home 3D assets.`);
  console.log(`Updated manifest and wrote report to ${REPORT_PATH}`);
}

run().catch(console.error);
