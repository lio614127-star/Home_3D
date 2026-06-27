import { IAssetDefinition } from '../../types';
import { GENERATED_ASSET_CATALOG } from './generatedAssetCatalog';

export const ASSET_CATALOG: IAssetDefinition[] = [
  ...(GENERATED_ASSET_CATALOG as IAssetDefinition[]),
  {
    id: "bed_basic",
    name: "Giường cơ bản",
    category: "furniture",
    source: "primitive",
    model: {
      type: "box"
    },
    defaultSize: { width: 1.8, depth: 2.0, height: 0.5 },
    resizePolicy: "proportionalResize",
    metadata: {
      style: "modern",
      material: "fabric",
      tags: ["bedroom", "bed"]
    },
    thumbnail: "/assets/thumbs/bed.png"
  },
  {
    id: "sofa_basic",
    name: "Sofa cơ bản",
    category: "furniture",
    source: "primitive",
    model: {
      type: "box"
    },
    defaultSize: { width: 2.0, depth: 0.8, height: 0.8 },
    resizePolicy: "proportionalResize",
    metadata: {
      style: "modern",
      material: "fabric",
      tags: ["living-room", "sofa"]
    },
    thumbnail: "/assets/thumbs/sofa.png"
  },
  {
    id: "table_basic",
    name: "Bàn cơ bản",
    category: "furniture",
    source: "primitive",
    model: {
      type: "box"
    },
    defaultSize: { width: 1.2, depth: 0.8, height: 0.75 },
    resizePolicy: "freeResize",
    metadata: {
      style: "minimalist",
      material: "wood",
      tags: ["dining-room", "table"]
    },
    thumbnail: "/assets/thumbs/table.png"
  },
  {
    id: "chair_basic",
    name: "Ghế cơ bản",
    category: "furniture",
    source: "primitive",
    model: {
      type: "box"
    },
    defaultSize: { width: 0.45, depth: 0.45, height: 0.9 },
    resizePolicy: "proportionalResize",
    metadata: {
      style: "minimalist",
      material: "wood",
      tags: ["dining-room", "chair"]
    },
    thumbnail: "/assets/thumbs/chair.png"
  },
  {
    id: "tree_basic",
    name: "Cây xanh",
    category: "plant",
    source: "primitive",
    model: {
      type: "cylinder"
    },
    defaultSize: { width: 1.5, depth: 1.5, height: 3.0 },
    resizePolicy: "proportionalResize",
    metadata: {
      style: "natural",
      tags: ["garden", "tree", "outdoor"]
    },
    thumbnail: "/assets/thumbs/tree.png"
  },
  {
    id: "column_basic",
    name: "Cột kiến trúc",
    category: "architecture",
    source: "primitive",
    model: {
      type: "cylinder"
    },
    defaultSize: { width: 0.4, depth: 0.4, height: 3.6 },
    resizePolicy: "freeResize",
    metadata: {
      style: "classic",
      material: "concrete",
      tags: ["structure", "column", "outdoor"]
    },
    thumbnail: "/assets/thumbs/column.png"
  },
  {
    id: "chair_glb_test",
    name: "Ghế 3D GLB",
    category: "furniture",
    source: "glb",
    renderer: "glb",
    model: {
      type: "glb",
      url: "https://modelviewer.dev/shared-assets/models/Astronaut.glb"
    },
    defaultSize: {
      width: 1,
      depth: 1,
      height: 2
    },
    resizePolicy: "freeResize",
    metadata: {
      style: "modern",
      material: "custom",
      tags: ["test", "glb"]
    }
  }
];

export function getAssetDefinition(id: string): IAssetDefinition | undefined {
  return ASSET_CATALOG.find(asset => asset.id === id);
}

export type AssetFootprintKind = 'bed' | 'sofa' | 'table' | 'chair' | 'plant' | 'door' | 'window' | 'lamp' | 'cabinet' | 'toilet' | 'sink' | 'bathtub' | 'stair' | 'generic';

export function getAssetFootprintDefinition(definition: IAssetDefinition): { width: number; depth: number; kind: AssetFootprintKind } {
  const text = `${definition.name} ${definition.category} ${definition.tags?.join(' ')}`.toLowerCase();

  const isBed = text.includes('bed') || text.includes('giường');
  const isSofa = text.includes('sofa') || text.includes('couch');
  const isTable = text.includes('table') || text.includes('bàn') || text.includes('dining');
  const isChair = text.includes('chair') || text.includes('ghế');
  const isCabinet = text.includes('cabinet') || text.includes('tủ') || text.includes('wardrobe') || text.includes('shelf') || text.includes('storage');
  const isPlant = text.includes('plant') || text.includes('tree') || text.includes('cây');
  const isDoor = text.includes('door') || text.includes('cửa');
  const isWindow = text.includes('window') || text.includes('cửa sổ');
  const isLamp = text.includes('lighting') || text.includes('lamp') || text.includes('light') || text.includes('đèn');
  const isToilet = text.includes('toilet') || text.includes('wc') || text.includes('bathroom') || text.includes('bồn cầu');
  const isSink = text.includes('washbasin') || text.includes('basin') || text.includes('sink') || text.includes('lavabo');
  const isBathtub = text.includes('bathtub') || text.includes('bath') || text.includes('bồn tắm');
  const isStair = text.includes('stair') || text.includes('cầu thang');

  let kind: AssetFootprintKind = 'generic';
  if (isToilet) kind = 'toilet';
  else if (isSink) kind = 'sink';
  else if (isBathtub) kind = 'bathtub';
  else if (isBed) kind = 'bed';
  else if (isSofa) kind = 'sofa';
  else if (isTable) kind = 'table';
  else if (isCabinet) kind = 'cabinet';
  else if (isChair) kind = 'chair';
  else if (isPlant) kind = 'plant';
  else if (isDoor) kind = 'door';
  else if (isWindow) kind = 'window';
  else if (isLamp) kind = 'lamp';
  else if (isStair) kind = 'stair';

  let defaultW = definition.defaultSize?.width;
  let defaultD = definition.defaultSize?.depth;

  if (defaultW === undefined || defaultD === undefined || isNaN(defaultW) || isNaN(defaultD) || defaultW <= 0 || defaultD <= 0) {
    if (kind === 'bed') { defaultW = 2.0; defaultD = 1.6; }
    else if (kind === 'sofa') { defaultW = 2.0; defaultD = 0.9; }
    else if (kind === 'table') { defaultW = 1.6; defaultD = 0.9; }
    else if (kind === 'cabinet') { defaultW = 1.2; defaultD = 0.45; }
    else if (kind === 'chair') { defaultW = 0.5; defaultD = 0.5; }
    else if (kind === 'plant') { defaultW = 0.6; defaultD = 0.6; }
    else if (kind === 'door') { defaultW = 0.9; defaultD = 0.12; }
    else if (kind === 'window') { defaultW = 1.2; defaultD = 0.12; }
    else if (kind === 'lamp') { defaultW = 0.35; defaultD = 0.35; }
    else if (kind === 'toilet') { defaultW = 0.45; defaultD = 0.7; } // WidthxDepth (depth is front-to-back)
    else if (kind === 'sink') { defaultW = 0.6; defaultD = 0.45; }
    else if (kind === 'bathtub') { defaultW = 1.7; defaultD = 0.75; }
    else if (kind === 'stair') { defaultW = 1.0; defaultD = 2.5; }
    else { defaultW = 1.0; defaultD = 1.0; }
  }

  return {
    width: defaultW,
    depth: defaultD,
    kind
  };
}
