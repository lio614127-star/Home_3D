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
    buildings: [],
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
