import { IWall } from '../../types';

// Formatting & Normalization
export const formatMeters = (value: number): string => {
  if (!Number.isFinite(value)) return '0.00 m';
  return `${value.toFixed(2)} m`;
};

export const formatArea = (value: number): string => {
  if (!Number.isFinite(value)) return '0.00 m²';
  return `${value.toFixed(2)} m²`;
};

export const formatSize = (width: number, depth: number): string => {
  return `${formatMeters(width).replace(' m', 'm')} x ${formatMeters(depth).replace(' m', 'm')}`;
};

export const normalizeCoord = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 10000) / 10000;
};

// Derived values
export const getWallLength = (wall: IWall): number => {
  const dx = wall.end.x - wall.start.x;
  const dz = wall.end.z - wall.start.z;
  return Math.sqrt(dx * dx + dz * dz);
};

export const getWallEndFromLength = (start: {x: number, z: number}, end: {x: number, z: number}, newLength: number) => {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const currentLength = Math.sqrt(dx * dx + dz * dz);
  if (currentLength === 0) return { x: start.x + newLength, z: start.z };
  const ratio = newLength / currentLength;
  return {
    x: start.x + dx * ratio,
    z: start.z + dz * ratio
  };
};

// Legacy getRoomArea removed - use getPolygonArea(area.points) instead

export const getOpeningCenter = (wall: IWall, offset: number, openingWidth: number) => {
  const dx = wall.end.x - wall.start.x;
  const dz = wall.end.z - wall.start.z;
  const len = Math.sqrt(dx*dx + dz*dz);
  if (len === 0) return { x: wall.start.x, z: wall.start.z };
  
  const dirX = dx / len;
  const dirZ = dz / len;
  
  const centerDistance = offset + openingWidth / 2;
  return {
    x: wall.start.x + dirX * centerDistance,
    z: wall.start.z + dirZ * centerDistance,
    yaw: -Math.atan2(dz, dx)
  };
};

export function getOffsetFromStartOnWall(wall: IWall, pointerWorld: { x: number; z: number }): number {
  const dx = wall.end.x - wall.start.x;
  const dz = wall.end.z - wall.start.z;
  const wallLen = Math.sqrt(dx * dx + dz * dz);
  if (wallLen === 0) return 0;
  
  const vx = pointerWorld.x - wall.start.x;
  const vz = pointerWorld.z - wall.start.z;
  
  const dot = (vx * dx + vz * dz) / wallLen;
  return Math.max(0, Math.min(wallLen, dot));
}

export function getPolygonArea(points: { x: number; z: number }[]): number {
  if (!points || points.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].z;
    area -= points[j].x * points[i].z;
  }
  return Math.abs(area) / 2;
}

export function getPolygonCentroid(points: { x: number; z: number }[]): { x: number; z: number } {
  if (!points || points.length === 0) return { x: 0, z: 0 };
  if (points.length === 1) return { x: points[0].x, z: points[0].z };
  if (points.length === 2) return { x: (points[0].x + points[1].x) / 2, z: (points[0].z + points[1].z) / 2 };
  
  let cx = 0;
  let cz = 0;
  let area = 0;
  
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const factor = points[i].x * points[j].z - points[j].x * points[i].z;
    cx += (points[i].x + points[j].x) * factor;
    cz += (points[i].z + points[j].z) * factor;
    area += factor;
  }
  
  area /= 2;
  if (area === 0) return { x: points[0].x, z: points[0].z };
  
  return {
    x: cx / (6 * area),
    z: cz / (6 * area)
  };
}

// Distance from point to line segment
export function distanceToSegment(p: {x: number, z: number}, a: {x: number, z: number}, b: {x: number, z: number}): { distance: number, projection: {x: number, z: number}, ratio: number } {
  const l2 = Math.pow(b.x - a.x, 2) + Math.pow(b.z - a.z, 2);
  if (l2 === 0) return { distance: Math.sqrt(Math.pow(p.x - a.x, 2) + Math.pow(p.z - a.z, 2)), projection: { ...a }, ratio: 0 };
  let t = ((p.x - a.x) * (b.x - a.x) + (p.z - a.z) * (b.z - a.z)) / l2;
  t = Math.max(0, Math.min(1, t));
  const proj = { x: a.x + t * (b.x - a.x), z: a.z + t * (b.z - a.z) };
  return {
    distance: Math.sqrt(Math.pow(p.x - proj.x, 2) + Math.pow(p.z - proj.z, 2)),
    projection: proj,
    ratio: t
  };
};

export const formatDimension = (value: number): string => {
  return `${value.toFixed(2)} m`;
};



// Coordinate system mapping (Project: Z=depth -> Canvas: Y=depth)
export const projectToCanvas = (x: number, z: number) => {
  return { x, y: z }; // Z axis in project becomes Y axis in 2D canvas
};

export const canvasToProject = (x: number, y: number) => {
  return { x, z: y }; // Y axis in canvas becomes Z axis in project
};

export type RectProject = { minX: number; maxX: number; minZ: number; maxZ: number };

export const rectContainsPoint = (rect: RectProject, p: { x: number; z: number }): boolean => {
  return p.x >= rect.minX && p.x <= rect.maxX && p.z >= rect.minZ && p.z <= rect.maxZ;
};

export const rectIntersectsSegment = (rect: RectProject, p1: { x: number; z: number }, p2: { x: number; z: number }): boolean => {
  if (rectContainsPoint(rect, p1) || rectContainsPoint(rect, p2)) return true;
  
  // Check if line segment intersects any of the 4 rect edges
  const rMinX = rect.minX, rMaxX = rect.maxX, rMinZ = rect.minZ, rMaxZ = rect.maxZ;
  
  const checkLineIntersection = (a: {x:number,z:number}, b: {x:number,z:number}, c: {x:number,z:number}, d: {x:number,z:number}) => {
    const denominator = ((b.x - a.x) * (d.z - c.z)) - ((b.z - a.z) * (d.x - c.x));
    if (denominator === 0) return false;
    const numerator1 = ((a.z - c.z) * (d.x - c.x)) - ((a.x - c.x) * (d.z - c.z));
    const numerator2 = ((a.z - c.z) * (b.x - a.x)) - ((a.x - c.x) * (b.z - a.z));
    const r = numerator1 / denominator;
    const s = numerator2 / denominator;
    return (r > 0 && r < 1) && (s > 0 && s < 1);
  };

  const topleft = {x: rMinX, z: rMinZ};
  const topright = {x: rMaxX, z: rMinZ};
  const bottomleft = {x: rMinX, z: rMaxZ};
  const bottomright = {x: rMaxX, z: rMaxZ};

  if (checkLineIntersection(p1, p2, topleft, topright)) return true;
  if (checkLineIntersection(p1, p2, topright, bottomright)) return true;
  if (checkLineIntersection(p1, p2, bottomright, bottomleft)) return true;
  if (checkLineIntersection(p1, p2, bottomleft, topleft)) return true;
  
  return false;
};

export const rectIntersectsPolygon = (rect: RectProject, points: { x: number; z: number }[]): boolean => {
  if (!points || points.length < 3) return false;
  // If any polygon point is inside rect
  for (let p of points) {
    if (rectContainsPoint(rect, p)) return true;
  }
  // If any polygon edge intersects rect
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    if (rectIntersectsSegment(rect, points[i], points[j])) return true;
  }
  // Check if rect centroid is strictly inside the polygon
  const rectCentroid = { x: (rect.minX + rect.maxX) / 2, z: (rect.minZ + rect.maxZ) / 2 };
  
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x, zi = points[i].z;
    const xj = points[j].x, zj = points[j].z;
    const intersect = ((zi > rectCentroid.z) !== (zj > rectCentroid.z)) &&
        (rectCentroid.x < (xj - xi) * (rectCentroid.z - zi) / (zj - zi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

export interface MeasureCandidate {
  point: { x: number; z: number };
  label: string;
  distance: number; // distance to pointer
}

export const getMeasureSnapCandidates = (
  pointerX: number, 
  pointerZ: number, 
  project: import('../../types').IProject, 
  measureMode: string
): MeasureCandidate[] => {
  const candidates: MeasureCandidate[] = [];

  // Walls
  project.walls.forEach(wall => {
    const dx = wall.end.x - wall.start.x;
    const dz = wall.end.z - wall.start.z;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len === 0) return;

    // Normal vector
    const nx = -dz / len;
    const nz = dx / len;

    // Project pointer onto the infinite line defined by the wall
    // Line vector: L = (dx, dz) / len
    const lx = dx / len;
    const lz = dz / len;

    // Vector from start to pointer
    const vx = pointerX - wall.start.x;
    const vz = pointerZ - wall.start.z;

    // Dot product gives the projection along the line
    const t = vx * lx + vz * lz;
    // Clamp to segment
    const tClamped = Math.max(0, Math.min(len, t));

    // Projection point on centerline
    const px = wall.start.x + lx * tClamped;
    const pz = wall.start.z + lz * tClamped;

    // Distance to pointer
    const distCenter = Math.sqrt((pointerX - px)**2 + (pointerZ - pz)**2);

    if (measureMode === 'centerline' || measureMode === 'thickness') {
      candidates.push({ point: { x: px, z: pz }, label: 'Tim tường', distance: distCenter });
    }

    if (measureMode === 'innerFace' || measureMode === 'thickness') {
      // Face A (assume inner is normal direction)
      const hx = px + nx * (wall.thickness / 2);
      const hz = pz + nz * (wall.thickness / 2);
      const distA = Math.sqrt((pointerX - hx)**2 + (pointerZ - hz)**2);
      candidates.push({ point: { x: hx, z: hz }, label: 'Mép tường A', distance: distA });
    }

    if (measureMode === 'outerFace' || measureMode === 'thickness') {
      // Face B
      const hx = px - nx * (wall.thickness / 2);
      const hz = pz - nz * (wall.thickness / 2);
      const distB = Math.sqrt((pointerX - hx)**2 + (pointerZ - hz)**2);
      candidates.push({ point: { x: hx, z: hz }, label: 'Mép tường B', distance: distB });
    }
    
    // Also endpoints of wall
    candidates.push({ point: wall.start, label: 'Góc tường', distance: Math.sqrt((pointerX - wall.start.x)**2 + (pointerZ - wall.start.z)**2) });
    candidates.push({ point: wall.end, label: 'Góc tường', distance: Math.sqrt((pointerX - wall.end.x)**2 + (pointerZ - wall.end.z)**2) });
  });

  // Areas
  project.areas.forEach(area => {
    area.points.forEach((pt, i) => {
      const nextPt = area.points[(i + 1) % area.points.length];
      
      // Vertex candidate
      candidates.push({ point: pt, label: 'Góc khu vực', distance: Math.sqrt((pointerX - pt.x)**2 + (pointerZ - pt.z)**2) });
      
      // Edge candidate
      const dx = nextPt.x - pt.x;
      const dz = nextPt.z - pt.z;
      const len = Math.sqrt(dx * dx + dz * dz);
      if (len > 0) {
        const lx = dx / len;
        const lz = dz / len;
        const vx = pointerX - pt.x;
        const vz = pointerZ - pt.z;
        const t = Math.max(0, Math.min(len, vx * lx + vz * lz));
        const px = pt.x + lx * t;
        const pz = pt.z + lz * t;
        candidates.push({ point: { x: px, z: pz }, label: 'Cạnh khu vực', distance: Math.sqrt((pointerX - px)**2 + (pointerZ - pz)**2) });
      }
    });
  });

  return candidates;
};
