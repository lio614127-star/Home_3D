export interface RoofIntentParams {
  roofType: "hip" | "gable" | "flat";
  style: string;
  material: string;
  color: string;
  angle: number;
}

export interface AssetIntentParams {
  style: string;
  material: string;
  color: string;
  assetHint?: string; // Hint for the catalog to match, e.g. "sofa_modern"
}

export interface GardenIntentParams {
  style: string;
  objects: string[];
}

export const ROOF_ROLES = [
  'main_roof',
  'entry_roof',
  'garage_roof',
  'side_roof',
  'porch_roof',
  'balcony_roof',
  'canopy_roof'
];

export type RoofSegmentKind =
  | 'main'
  | 'secondary'
  | 'porch'
  | 'dormer'
  | 'connector'
  | 'eave'
  | 'tower'
  | 'decorative';

export type RoofSegmentType =
  | 'hip'
  | 'gable'
  | 'flat'
  | 'shed'
  | 'pyramid'
  | 'leanTo'
  | 'japanese'
  | 'thai';

export type RoofSegmentSide =
  | 'front'
  | 'back'
  | 'left'
  | 'right'
  | 'center'
  | 'frontLeft'
  | 'frontRight'
  | 'backLeft'
  | 'backRight';

export interface RoofSegmentParams {
  presetType?: string; // Optional marker to bypass generic generation
  id: string;
  kind?: RoofSegmentKind;
  roofType?: RoofSegmentType | string;
  
  // --- SEMANTIC LAYER ---
  role?: string;
  side?: RoofSegmentSide;
  attachToSide?: RoofSegmentSide;
  semanticPosition?: RoofSegmentSide;
  position?: {
    side: 'front' | 'back' | 'left' | 'right' | 'center';
    horizontal?: 'left' | 'center' | 'right';
  };
  alignment?: 'flush' | 'inside' | 'overhang';
  style?: string;
  
  materialData?: {
    color?: string;
    textureUrl?: string;
    roughness?: number;
    metalness?: number;
  };
  color?: string; // legacy support
  material?: string; // legacy support
  
  overhang?: number;
  confidence?: number;
  source?: 'vision' | 'inferred';
  
  // --- NEW V2 PARAMETRIC FIELDS ---
  centerX?: number;      // AI space -1..1
  centerZ?: number;      // AI space -1..1
  widthRatio?: number;   // relative to building bbox width
  depthRatio?: number;   // relative to building bbox depth
  
  heightRatio?: number;       // optional, roof height multiplier
  pitchDeg?: number;          // roof pitch in degrees
  overhangRatio?: number;     // overhang relative to bbox
  thickness?: number;         // roof thickness
  fasciaHeight?: number;      // fascia board height
  ridgeDirection?: 'horizontal' | 'vertical' | 'auto';
  ridgeOffsetRatio?: number;  // offset ridge if asymmetric
  elevationOffset?: number;   // raise segment above wall top
  tierIndex?: number;         // tier level 0=main/lower, 1=upper
  parentSegmentId?: string;   // parent segment relation
  slopeDirection?: 'front' | 'back' | 'left' | 'right' | 'auto'; // for shed/leanTo
  
  // --- GEOMETRIC LAYER (V1 LEGACY COMPATIBILITY) ---
  relativeFootprint?: {
    centerX: number; // -1 to 1 (relative to building bounding box center)
    centerZ: number; // -1 to 1
    widthRatio: number; // 0 to 1 (relative to building bounding box width)
    depthRatio: number; // 0 to 1 (relative to building bounding box depth)
  };
  relativeHeight?: number; // height relative to standard 3m ceiling (e.g. 0.5 = 1.5m)
  angle?: number;
  
  // --- DEBUG LAYER ---
  debug?: {
    aiFootprint?: {
      centerX: number;
      centerZ: number;
      widthRatio: number;
      depthRatio: number;
    };
    constraints?: string[];
  };
}

export interface IAIRoofIntent {
  target: "roof";
  styleParameters: {
    style: "japanese" | "thai" | "traditional" | "modern";
  };
  geometryParameters: {
    segments: RoofSegmentParams[];
  };
  materialParameters: {
    material: "tile" | "metal" | "concrete";
    color: string;
  };
}

export interface IAIDesignIntent {
  version: "2.0";
  requestId: string;
  category: string;
  target: "roof" | "asset" | "garden" | "material" | "unknown";
  confidence: number;
  summary: string;
  parameters: IAIRoofIntent | AssetIntentParams | GardenIntentParams | any;
}

import { IAIRequest } from '../../types';

export interface IAIAnalyzer {
  analyze(request: IAIRequest): Promise<IAIDesignIntent>;
}
