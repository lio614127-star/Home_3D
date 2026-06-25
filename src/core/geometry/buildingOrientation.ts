import { IBuilding, BuildingFrontSide } from '../../types';

export type BuildingOrientationFrame = {
  frontSide: BuildingFrontSide;
  front: { x: number; z: number };
  back: { x: number; z: number };
  right: { x: number; z: number };
  left: { x: number; z: number };
};

export type ResolvedBuildingOrientation = {
  frontSide: BuildingFrontSide;
  source: 'manual' | 'door' | 'fallback' | 'default' | 'auto';
  reason?: string;
  doorId?: string;
  wallId?: string;
};

/**
 * Heuristically detects the front side of a building based on doors.
 */
export function detectBuildingFrontSide(project: any, building: IBuilding): ResolvedBuildingOrientation {
  if (!building.footprint || building.footprint.length === 0) {
    return { frontSide: 'minZ', source: 'fallback', reason: 'No footprint' };
  }

  const minX = Math.min(...building.footprint.map(p => p.x));
  const maxX = Math.max(...building.footprint.map(p => p.x));
  const minZ = Math.min(...building.footprint.map(p => p.z));
  const maxZ = Math.max(...building.footprint.map(p => p.z));

  if (project && project.walls && project.openings) {
    const bWalls = project.walls.filter((w: any) => w.buildingId === building.id);
    const bWallIds = bWalls.map((w: any) => w.id);
    
    const doors = project.openings.filter((o: any) => o.type === 'door' && bWallIds.includes(o.wallId));
    
    if (doors.length > 0) {
      // Pick first door
      const door = doors[0];
      const wall = bWalls.find((w: any) => w.id === door.wallId);
      
      if (wall) {
        // compute wall length
        const dx = wall.end.x - wall.start.x;
        const dz = wall.end.z - wall.start.z;
        const length = Math.sqrt(dx*dx + dz*dz);
        let t = door.offsetFromStart / length;
        if (isNaN(t)) t = 0.5;
        t = Math.max(0, Math.min(1, t));

        const doorX = wall.start.x + dx * t;
        const doorZ = wall.start.z + dz * t;

        const distMinX = Math.abs(doorX - minX);
        const distMaxX = Math.abs(doorX - maxX);
        const distMinZ = Math.abs(doorZ - minZ);
        const distMaxZ = Math.abs(doorZ - maxZ);

        const dists = [
          { side: 'minZ', dist: distMinZ },
          { side: 'maxZ', dist: distMaxZ },
          { side: 'minX', dist: distMinX },
          { side: 'maxX', dist: distMaxX }
        ];

        dists.sort((a, b) => a.dist - b.dist);
        const nearestSide = dists[0].side as BuildingFrontSide;

        console.log(`[BUILDING FRONT] Detected from door ${door.id} on wall ${wall.id}. X:${doorX.toFixed(2)}, Z:${doorZ.toFixed(2)}. Nearest side: ${nearestSide}`);

        return {
          frontSide: nearestSide,
          source: 'door',
          reason: 'Detected from main door',
          doorId: door.id,
          wallId: wall.id
        };
      }
    }
  }

  return { frontSide: 'minZ', source: 'fallback', reason: 'No doors found' };
}

/**
 * Main resolver.
 */
export function resolveBuildingFrontOrientation(project: any, building: IBuilding): ResolvedBuildingOrientation {
  if (building.frontSource === 'manual' && building.frontSide) {
    return {
      frontSide: building.frontSide,
      source: 'manual',
      reason: 'Manually set by user'
    };
  }

  return detectBuildingFrontSide(project, building);
}

/**
 * Backward compatibility wrapper.
 */
export function getResolvedBuildingFrontSide(building: IBuilding, project: any): BuildingFrontSide {
  return resolveBuildingFrontOrientation(project, building).frontSide;
}

/**
 * Returns the local coordinate frame axes based on the front side.
 * Right/left are relative to a person facing the house front direction.
 */
export function getBuildingOrientationFrame(frontSide: BuildingFrontSide): BuildingOrientationFrame {
  switch (frontSide) {
    case 'maxZ':
      return {
        frontSide,
        front: { x: 0, z: 1 },
        back: { x: 0, z: -1 },
        right: { x: -1, z: 0 },
        left: { x: 1, z: 0 },
      };
    case 'minX':
      return {
        frontSide,
        front: { x: -1, z: 0 },
        back: { x: 1, z: 0 },
        right: { x: 0, z: -1 },
        left: { x: 0, z: 1 },
      };
    case 'maxX':
      return {
        frontSide,
        front: { x: 1, z: 0 },
        back: { x: -1, z: 0 },
        right: { x: 0, z: 1 },
        left: { x: 0, z: -1 },
      };
    case 'minZ':
    default:
      return {
        frontSide,
        front: { x: 0, z: -1 },
        back: { x: 0, z: 1 },
        right: { x: 1, z: 0 },
        left: { x: -1, z: 0 },
      };
  }
}
