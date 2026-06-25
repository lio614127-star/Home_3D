import { IAssetDefinition } from '../../types';

export const ASSET_CATALOG: IAssetDefinition[] = [
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
