import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import fs from 'fs';
import path from 'path';

// Polyfills for Node
global.atob = function(str: string) { return Buffer.from(str, 'base64').toString('binary'); };
global.btoa = function(str: string) { return Buffer.from(str, 'binary').toString('base64'); };

class MockFileReader {
  result: any;
  onloadend: any;
  readAsArrayBuffer(blob: any) {
    blob.arrayBuffer().then((ab: ArrayBuffer) => {
      this.result = ab;
      if (this.onloadend) this.onloadend();
    });
  }
  readAsDataURL(blob: any) {
    blob.arrayBuffer().then((ab: ArrayBuffer) => {
      const b64 = Buffer.from(ab).toString('base64');
      this.result = 'data:application/octet-stream;base64,' + b64;
      if (this.onloadend) this.onloadend();
    });
  }
}
(global as any).FileReader = MockFileReader;

const ASSETS_DIR = path.resolve('public/assets/library');
const OUT_DIR = path.join(ASSETS_DIR, 'models', 'placeholder');
const MANIFEST_PATH = path.join(ASSETS_DIR, 'asset-manifest.json');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const defaultMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.8 });
const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 });
const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22, roughness: 0.8 });
const fabricMaterial = new THREE.MeshStandardMaterial({ color: 0x4466aa, roughness: 0.9 });
const glassMaterial = new THREE.MeshStandardMaterial({ color: 0xadd8e6, transparent: true, opacity: 0.5 });

function createChair() {
  const group = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.05, 0.45), woodMaterial);
  seat.position.y = 0.45;
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.05), woodMaterial);
  back.position.set(0, 0.7, -0.2);
  
  const legGeo = new THREE.BoxGeometry(0.05, 0.45, 0.05);
  for (let x of [-0.2, 0.2]) {
    for (let z of [-0.2, 0.2]) {
      const leg = new THREE.Mesh(legGeo, woodMaterial);
      leg.position.set(x, 0.225, z);
      group.add(leg);
    }
  }
  group.add(seat, back);
  return group;
}

function createTable() {
  const group = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.8), woodMaterial);
  top.position.y = 0.75;
  const legGeo = new THREE.BoxGeometry(0.05, 0.75, 0.05);
  for (let x of [-0.55, 0.55]) {
    for (let z of [-0.35, 0.35]) {
      const leg = new THREE.Mesh(legGeo, woodMaterial);
      leg.position.set(x, 0.375, z);
      group.add(leg);
    }
  }
  group.add(top);
  return group;
}

function createSofa() {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.4, 0.8), fabricMaterial);
  base.position.y = 0.2;
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 0.2), fabricMaterial);
  back.position.set(0, 0.65, -0.3);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.8), fabricMaterial);
  armL.position.set(-0.9, 0.6, 0);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.8), fabricMaterial);
  armR.position.set(0.9, 0.6, 0);
  group.add(base, back, armL, armR);
  return group;
}

function createBed() {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 2.0), woodMaterial);
  base.position.y = 0.15;
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.2, 1.9), new THREE.MeshStandardMaterial({ color: 0xffffff }));
  mattress.position.set(0, 0.4, 0);
  const headboard = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 0.1), woodMaterial);
  headboard.position.set(0, 0.4, -0.95);
  group.add(base, mattress, headboard);
  return group;
}

function createCabinet() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.8, 0.4), woodMaterial);
  body.position.y = 0.9;
  group.add(body);
  return group;
}

function createPlantPot() {
  const group = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.4, 16), defaultMaterial);
  pot.position.y = 0.2;
  const plant = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), leafMaterial);
  plant.position.y = 0.6;
  group.add(pot, plant);
  return group;
}

function createTree() {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.0, 8), woodMaterial);
  trunk.position.y = 0.5;
  const leaves = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2.0, 16), leafMaterial);
  leaves.position.y = 2.0;
  group.add(trunk, leaves);
  return group;
}

function createLamp() {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.05, 16), defaultMaterial);
  base.position.y = 0.025;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.5, 8), defaultMaterial);
  pole.position.y = 0.75;
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, 0.3, 16), new THREE.MeshStandardMaterial({ color: 0xffffff }));
  shade.position.y = 1.5;
  group.add(base, pole, shade);
  return group;
}

function createDoor() {
  const group = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.1, 0.1), woodMaterial);
  frame.position.y = 1.05;
  group.add(frame);
  return group;
}

function createWindow() {
  const group = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.2, 0.1), defaultMaterial);
  frame.position.y = 0.6;
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.05), glassMaterial);
  glass.position.y = 0.6;
  group.add(frame, glass);
  return group;
}

const MODELS = [
  { id: 'chair_placeholder', name: 'Chair (Placeholder)', file: 'chair.glb', category: 'furniture/chair', tags: ['chair', 'placeholder'], create: createChair },
  { id: 'table_placeholder', name: 'Table (Placeholder)', file: 'table.glb', category: 'furniture/table', tags: ['table', 'placeholder'], create: createTable },
  { id: 'sofa_placeholder', name: 'Sofa (Placeholder)', file: 'sofa.glb', category: 'furniture/sofa', tags: ['sofa', 'placeholder'], create: createSofa },
  { id: 'bed_placeholder', name: 'Bed (Placeholder)', file: 'bed.glb', category: 'furniture/bed', tags: ['bed', 'placeholder'], create: createBed },
  { id: 'cabinet_placeholder', name: 'Cabinet (Placeholder)', file: 'cabinet.glb', category: 'furniture/storage', tags: ['cabinet', 'placeholder'], create: createCabinet },
  { id: 'plant_pot_placeholder', name: 'Plant Pot (Placeholder)', file: 'plant_pot.glb', category: 'exterior/plants', tags: ['plant', 'pot', 'placeholder'], create: createPlantPot },
  { id: 'tree_placeholder', name: 'Tree (Placeholder)', file: 'tree.glb', category: 'exterior/plants', tags: ['tree', 'outdoor', 'placeholder'], create: createTree },
  { id: 'lamp_placeholder', name: 'Floor Lamp (Placeholder)', file: 'lamp.glb', category: 'furniture/lighting', tags: ['lamp', 'lighting', 'placeholder'], create: createLamp },
  { id: 'door_placeholder', name: 'Door (Placeholder)', file: 'door.glb', category: 'openings/door', tags: ['door', 'placeholder'], create: createDoor },
  { id: 'window_placeholder', name: 'Window (Placeholder)', file: 'window.glb', category: 'openings/window', tags: ['window', 'placeholder'], create: createWindow }
];

async function exportGLB(scene: THREE.Object3D, path: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    exporter.parse(
      scene,
      (gltf) => {
        fs.writeFileSync(path, Buffer.from(gltf as ArrayBuffer));
        resolve();
      },
      (error) => {
        reject(error);
      },
      { binary: true }
    );
  });
}

async function main() {
  console.log('Generating procedural GLB placeholders...');
  
  const newManifestEntries: any[] = [];
  const now = new Date().toISOString();

  for (const model of MODELS) {
    const scene = new THREE.Scene();
    scene.add(model.create());
    
    const filePath = path.join(OUT_DIR, model.file);
    await exportGLB(scene, filePath);
    console.log(`[GENERATED] ${model.file}`);

    newManifestEntries.push({
      id: model.id,
      name: model.name,
      category: model.category,
      type: 'model',
      format: 'glb',
      modelUrl: `/assets/library/models/placeholder/${model.file}`,
      source: 'Generated Placeholder',
      sourceUrl: 'local',
      license: 'Project Internal',
      attributionRequired: false,
      tags: model.tags,
      unit: 'meter',
      origin: 'bottom-center',
      polyCountLevel: 'low',
      downloadedAt: now
    });
  }

  // Update manifest
  let manifest: any[] = [];
  if (fs.existsSync(MANIFEST_PATH)) {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
    // Filter out old models just in case
    manifest = manifest.filter(m => m.type !== 'model' || m.source !== 'Generated Placeholder');
  }
  
  manifest = [...newManifestEntries, ...manifest];
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`\n[SUCCESS] Wrote ${newManifestEntries.length} placeholder models to manifest.`);
}

main().catch(console.error);
