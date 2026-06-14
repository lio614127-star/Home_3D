import { IProject } from '../../types';

export const createDefaultProject = (): IProject => {
  return {
    version: '1.1.0',
    project: {
      id: "proj_" + Date.now(),
      name: "Mẫu nhà vườn 2026",
      unit: "meter"
    },
    site: {
      id: "site_1",
      width: 21,
      depth: 54,
      frontDirection: "Tây Bắc",
      origin: { x: 0, y: 0, z: 0 },
      layer: "site",
      visible: true,
      locked: true
    },
    building: {
      id: "building_1",
      width: 12,
      depth: 10,
      origin: { x: 4.5, y: 0, z: 5 },
      anchor: "front_left_corner",
      floorHeight: 0.6,
      wallHeight: 3.6,
      wallThickness: 0.2,
      layer: "walls",
      visible: false,
      locked: false
    },
    levels: [
      {
        id: "level_1",
        name: "Trệt",
        elevation: 0.6,
        height: 3.6
      }
    ],
    walls: [],
    areas: [],
    openings: [],
    roofs: [],
    placedAssets: [],
    annotations: [],
    materials: []
  };
};
