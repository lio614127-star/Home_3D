export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Vector2 {
  x: number;
  z: number;
}

// --- NEW PLACEMENT RULES ---
export type AssetPlacementLayer =
  | 'floor'
  | 'surface'
  | 'wall'
  | 'ceiling'
  | 'underlay'
  | 'decor'
  | 'structural';

export type AssetCollisionMode =
  | 'solid'
  | 'soft'
  | 'ignore'
  | 'hosted';

export type AssetSupportType =
  | 'floor'
  | 'tableTop'
  | 'bedTop'
  | 'cabinetTop'
  | 'shelf'
  | 'wall'
  | 'ceiling'
  | 'rug';

export interface IAssetPlacementRules {
  layer: AssetPlacementLayer;
  collisionMode: AssetCollisionMode;

  // Where this asset is allowed to be placed
  allowedSupportTypes?: AssetSupportType[];

  // What kind of support this asset provides to other assets
  providesSupportTypes?: AssetSupportType[];

  // Approx support height in meters for objects placed on top
  supportHeight?: number;

  // Whether this asset blocks other floor objects
  blocksFloorSpace?: boolean;

  // Whether this asset can overlap with its host
  allowOverlapWithHost?: boolean;

  // Whether this asset may be placed below other assets
  canBeUnderFurniture?: boolean;

  // Optional clearance needed around asset in meters
  clearance?: {
    front?: number;
    back?: number;
    left?: number;
    right?: number;
  };
}

export interface IBaseObject {
  id: string;
  layer: string;
  visible: boolean;
  locked: boolean;
  selectable?: boolean;
  rotation?: number; // Rotation in degrees (0-360)
}

export interface ISite extends IBaseObject {
  width: number;
  depth: number;
  frontDirection: string;
  origin: Vector3;
  textSize?: number;
}

export type BuildingFrontSide = 'minZ' | 'maxZ' | 'minX' | 'maxX';

export interface IBuilding {
  id: string;
  name: string;
  rotation: number;
  hidden?: boolean;
  locked?: boolean;
  createdAt?: number;
  footprint?: { x: number; z: number }[];
  footprintVersion?: number;
  footprintDirty?: boolean;
  frontSide?: BuildingFrontSide;
  frontSource?: 'manual' | 'auto' | 'default';
}

export interface ILevel {
  id: string;
  name: string;
  elevation: number;
  height: number;
}

export interface IWall extends IBaseObject {
  start: Vector2;
  end: Vector2;
  thickness: number;
  height: number;
  levelId: string;
  justification?: 'center' | 'left' | 'right';
  buildingId?: string;
}

export interface IArea extends IBaseObject {
  name?: string;
  type?: string;
  points: { x: number; z: number }[];
  levelId: string;
  elevation?: number;
  textSize?: number;
  color?: string;
  showName?: boolean;
  showArea?: boolean;
  buildingId?: string;
}

export interface IOpening extends IBaseObject {
  type: 'door' | 'window';
  wallId: string;
  offsetFromStart: number;
  width: number;
  height: number;
  sillHeight: number;
  hingeSide?: 'left' | 'right';
  openDirection?: 'inward' | 'outward';
  swingAngle?: number;
  assetId?: string;
  buildingId?: string;
}

export interface IDimension extends IBaseObject {
  type: 'dimension';
  start: { x: number; z: number };
  end: { x: number; z: number };
  offsetDistance: number;
  buildingId?: string;
}

export interface IRoof extends IBaseObject {
  buildingId: string;
  type: 'flat' | 'japanese' | 'thai';
  color: string;
  angle: number;
  elevation: number;
  overhang: number;
  visible?: boolean;
  material?: {
    type: 'concrete' | 'metal' | 'tile';
    roughness?: number;
    metalness?: number;
  };
  segments?: any[]; // Array of RoofSegmentParams for complex roofs
}

export interface IStructure extends IBaseObject {
  type: 'stairs' | 'patio' | 'sideKitchen' | 'garage';
  position: Vector2;
  dimensions: {
    width: number;
    depth: number;
    height: number;
  };
  buildingId?: string;
  // Specific properties
  stepCount?: number; // for stairs
  material?: string; // for patio, etc.
}

export interface IFenceStructure extends IBaseObject {
  type: 'fence';
  path: Vector2[];
  height: number;
  buildingId?: string;
}

export type Structure = IStructure | IFenceStructure;

export interface IAssetDefinition {
  id: string;
  name: string;
  category: 'furniture' | 'plant' | 'vehicle' | 'decoration' | 'architecture' | string;
  source: 'primitive' | 'glb' | 'generated' | string;
  renderer?: 'box' | 'cylinder' | 'glb' | 'parametric' | string;
  url?: string;
  model?: {
    type: 'box' | 'cylinder' | 'glb' | string;
    url?: string;
  };
  // Phase 2 Generated Asset Fields
  type?: 'model' | string;
  format?: string;
  modelUrl?: string;
  sourceUrl?: string;
  license?: string;
  attributionRequired?: boolean;
  unit?: string;
  origin?: string;
  polyCountLevel?: string;
  downloadedAt?: string;
  tags?: string[];
  
  // Validation fields
  runtimeReady?: boolean;
  validationReason?: string;
  validatedAt?: string;
  defaultSize?: {
    width: number;
    depth: number;
    height: number;
  };
  resizePolicy?: 'freeResize' | 'proportionalResize' | 'presetOnly';
  metadata?: {
    style?: string;
    material?: string;
    color?: string;
    tags?: string[];
  };
  thumbnail?: string;
  placementRules?: IAssetPlacementRules;
}

export interface IPlacedAsset extends IBaseObject {
  assetId: string;
  version?: number;
  position: Vector3; // typically x, y (elevation), z
  scale: Vector3; // 1, 1, 1 default
  materialOverride?: {
    color?: string;
    textureUrl?: string;
    roughness?: number;
    metalness?: number;
  };
  buildingId?: string;
  
  // Placement relation
  hostAssetId?: string;
  supportType?: AssetSupportType;
  placementLayer?: AssetPlacementLayer;
}

export interface IAIRequest extends IBaseObject {
  type: 'region' | 'asset' | 'architecture';
  category: string; // from the 60 predefined categories
  geometry?: {
    type: 'rectangle' | 'circle' | 'polygon';
    points: Vector2[];
    radius?: number; // for circle
  };
  imageDataUrl?: string; // v1 uses data url, later moved to asset storage
  prompt?: string;
  buildingId?: string;
  status?: 'pending' | 'applied' | 'rejected';
  intent?: any;
  regionId?: string;
}

export interface IProject {
  version: string;
  project: {
    id: string;
    name: string;
    unit: string;
  };
  site: ISite;
  buildings: IBuilding[];
  levels: ILevel[];
  walls: IWall[];
  areas: IArea[];
  openings: IOpening[];
  roofs: IRoof[];
  structures: Structure[];
  placedAssets: IPlacedAsset[];
  aiRequests: IAIRequest[];
  annotations: any[];
  materials: any[];
}

export interface IValidationIssue {
  severity: 'fatal' | 'warning';
  objectType: 'project' | 'site' | 'building' | 'wall' | 'area' | 'opening' | 'dimension' | 'structure' | 'asset' | 'json';
  objectId: string;
  fieldPath: string;
  message: string;
}



export interface SelectedItem {
  id: string;
  type: 'site' | 'building' | 'wall' | 'area' | 'opening' | 'dimension' | 'roof' | 'structure' | 'asset' | 'wallEndpoint' | 'areaVertex' | 'dimensionEndpoint' | 'fenceVertex';
  // Extra fields for endpoints/vertices during drag operations
  endpoint?: 'start' | 'end';
  pointIndex?: number;
}

export interface IValidationResult {
  isValid: boolean; // false if there's any fatal error
  issues: IValidationIssue[];
}
