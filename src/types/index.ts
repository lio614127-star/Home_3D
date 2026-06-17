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
}

export interface ISite extends IBaseObject {
  width: number;
  depth: number;
  frontDirection: string;
  origin: Vector3;
  textSize?: number;
}

export interface IBuilding extends IBaseObject {
  width: number;
  depth: number;
  origin: Vector3;
  anchor: 'front_left_corner';
  floorHeight: number;
  wallHeight: number;
  wallThickness: number;
  textSize?: number;
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
}

export interface IDimension extends IBaseObject {
  type: 'dimension';
  start: { x: number; z: number };
  end: { x: number; z: number };
  offsetDistance: number;
}

export interface IProject {
  version: string;
  project: {
    id: string;
    name: string;
    unit: string;
  };
  site: ISite;
  building: IBuilding;
  levels: ILevel[];
  walls: IWall[];
  areas: IArea[];
  openings: IOpening[];
  roofs: any[];
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

export type SelectedItem =
  | { kind: "wall"; wallId: string }
  | { kind: "wallEndpoint"; wallId: string; endpoint: "start" | "end" }
  | { kind: "area"; areaId: string }
  | { kind: "areaVertex"; areaId: string; pointIndex: number }
  | { kind: "opening"; openingId: string }
  | { kind: "dimension"; annotationId: string }
  | { kind: "dimensionEndpoint"; annotationId: string; endpoint: "start" | "end" }
  | { kind: "building" }
  | { kind: "site" };

export interface IValidationResult {
  isValid: boolean; // false if there's any fatal error
  issues: IValidationIssue[];
}
