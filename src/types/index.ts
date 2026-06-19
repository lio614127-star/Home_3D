export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Vector2 {
  x: number;
  z: number;
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
  overhang: number;
  elevation: number;
  height?: number;
  angle?: number;
  ridgeDirection?: 'auto' | 'horizontal' | 'vertical';
  material?: {
    type: 'concrete' | 'tile' | 'metal';
  };
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
  placedAssets: any[];
  annotations: any[];
  materials: any[];
}

export interface IValidationIssue {
  severity: 'fatal' | 'warning';
  objectType: 'project' | 'site' | 'building' | 'wall' | 'area' | 'opening' | 'dimension' | 'json';
  objectId: string;
  fieldPath: string;
  message: string;
}

export interface SelectedItem {
  id: string;
  type: 'site' | 'building' | 'wall' | 'area' | 'opening' | 'dimension' | 'roof' | 'wallEndpoint' | 'areaVertex' | 'dimensionEndpoint';
  // Extra fields for endpoints/vertices during drag operations
  endpoint?: 'start' | 'end';
  pointIndex?: number;
}

export interface IValidationResult {
  isValid: boolean; // false if there's any fatal error
  issues: IValidationIssue[];
}
