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
export function getWallLength(wall: { start: {x: number, z: number}, end: {x: number, z: number} }) {
  const dx = wall.end.x - wall.start.x;
  const dz = wall.end.z - wall.start.z;
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Returns the visually offset centerline of the wall based on its justification.
 * If justification is 'left' or 'right', it offsets the start and end by half the thickness
 * along the wall's normal vector.
 */
export function getWallCenterline(wall: { start: {x: number, z: number}, end: {x: number, z: number}, thickness?: number, justification?: 'center' | 'left' | 'right' }): { start: { x: number; z: number }, end: { x: number; z: number } } {
  if (!wall.justification || wall.justification === 'center') {
    return { start: { ...wall.start }, end: { ...wall.end } };
  }

  const dx = wall.end.x - wall.start.x;
  const dz = wall.end.z - wall.start.z;
  const len = Math.sqrt(dx * dx + dz * dz);

  if (len === 0) return { start: { ...wall.start }, end: { ...wall.end } };

  // Normal vector (left side)
  const nx = -dz / len;
  const nz = dx / len;

  const offsetAmount = ((wall.thickness || 0.2) / 2);
  // Invert direction: "Mép ngoài" (left) now shifts inward/right (-1) when drawn clockwise.
  const direction = wall.justification === 'left' ? -1 : (wall.justification === 'right' ? 1 : 0);

  return {
    start: {
      x: wall.start.x + nx * offsetAmount * direction,
      z: wall.start.z + nz * offsetAmount * direction
    },
    end: {
      x: wall.end.x + nx * offsetAmount * direction,
      z: wall.end.z + nz * offsetAmount * direction
    }
  };
}

export function lineIntersection(p1: {x: number, z: number}, p2: {x: number, z: number}, p3: {x: number, z: number}, p4: {x: number, z: number}) {
  const denominator = (p1.x - p2.x) * (p3.z - p4.z) - (p1.z - p2.z) * (p3.x - p4.x);
  if (Math.abs(denominator) < 0.0001) return null; // parallel
  
  const t = ((p1.x - p3.x) * (p3.z - p4.z) - (p1.z - p3.z) * (p3.x - p4.x)) / denominator;
  return {
    x: p1.x + t * (p2.x - p1.x),
    z: p1.z + t * (p2.z - p1.z)
  };
}

export function getWallRenderLine(wall: IWall, allWalls: IWall[]): { start: {x: number, z: number}, end: {x: number, z: number} } {
  const { start: baseStart, end: baseEnd } = getWallCenterline(wall);
  let renderStart = { ...baseStart };
  let renderEnd = { ...baseEnd };

  const eps = 0.05; // 5cm tolerance to robustly detect corners even if slightly misaligned
  const isSamePoint = (p1: {x: number, z: number}, p2: {x: number, z: number}) => Math.abs(p1.x - p2.x) < eps && Math.abs(p1.z - p2.z) < eps;

  // Find walls connected to start
  const startConnected = allWalls.filter(w => w.id !== wall.id && w.visible && (isSamePoint(w.start, wall.start) || isSamePoint(w.end, wall.start)));
  if (startConnected.length === 1) {
    const other = getWallCenterline(startConnected[0]);
    const pInt = lineIntersection(baseStart, baseEnd, other.start, other.end);
    if (pInt) renderStart = pInt;
  } else if (startConnected.length === 0) {
    // Unconnected start: shrink by t/2 to compensate for square lineCap
    const dx = baseEnd.x - baseStart.x;
    const dz = baseEnd.z - baseStart.z;
    const len = Math.sqrt(dx*dx + dz*dz);
    const t = (wall.thickness || 0.2) / 2;
    if (len > t) {
      renderStart.x += (dx / len) * t;
      renderStart.z += (dz / len) * t;
    }
  }

  // Find walls connected to end
  const endConnected = allWalls.filter(w => w.id !== wall.id && w.visible && (isSamePoint(w.start, wall.end) || isSamePoint(w.end, wall.end)));
  if (endConnected.length === 1) {
    const other = getWallCenterline(endConnected[0]);
    const pInt = lineIntersection(baseStart, baseEnd, other.start, other.end);
    if (pInt) renderEnd = pInt;
  } else if (endConnected.length === 0) {
    // Unconnected end: shrink by t/2 to compensate for square lineCap
    const dx = baseStart.x - baseEnd.x;
    const dz = baseStart.z - baseEnd.z;
    const len = Math.sqrt(dx*dx + dz*dz);
    const t = (wall.thickness || 0.2) / 2;
    if (len > t) {
      renderEnd.x += (dx / len) * t;
      renderEnd.z += (dz / len) * t;
    }
  }

  return { start: renderStart, end: renderEnd };
}

export function getWallPolygon(wall: IWall, allWalls: IWall[]) {
  const { start: baseStart, end: baseEnd } = getWallCenterline(wall);
  const dx = baseEnd.x - baseStart.x;
  const dz = baseEnd.z - baseStart.z;
  const len = Math.sqrt(dx*dx + dz*dz);
  if (len === 0) return null;
  const nx = -dz / len;
  const nz = dx / len;
  const t = (wall.thickness || 0.2) / 2;

  const lLeft = { s: { x: baseStart.x + nx * t, z: baseStart.z + nz * t }, e: { x: baseEnd.x + nx * t, z: baseEnd.z + nz * t } };
  const lRight = { s: { x: baseStart.x - nx * t, z: baseStart.z - nz * t }, e: { x: baseEnd.x - nx * t, z: baseEnd.z - nz * t } };

  let pLeftStart = lLeft.s;
  let pRightStart = lRight.s;
  let pLeftEnd = lLeft.e;
  let pRightEnd = lRight.e;

  const eps = 0.05;
  const isSamePoint = (p1: any, p2: any) => Math.abs(p1.x - p2.x) < eps && Math.abs(p1.z - p2.z) < eps;

  const startConnected = allWalls.filter(w => w.id !== wall.id && w.visible && (isSamePoint(w.start, wall.start) || isSamePoint(w.end, wall.start)));
  if (startConnected.length === 1) {
    const otherCenter = getWallCenterline(startConnected[0]);
    const odx = otherCenter.end.x - otherCenter.start.x;
    const odz = otherCenter.end.z - otherCenter.start.z;
    const olen = Math.sqrt(odx*odx + odz*odz);
    if (olen > 0) {
      const onx = -odz / olen;
      const onz = odx / olen;
      const ot = (startConnected[0].thickness || 0.2) / 2;
      const oLeft = { s: { x: otherCenter.start.x + onx * ot, z: otherCenter.start.z + onz * ot }, e: { x: otherCenter.end.x + onx * ot, z: otherCenter.end.z + onz * ot } };
      const oRight = { s: { x: otherCenter.start.x - onx * ot, z: otherCenter.start.z - onz * ot }, e: { x: otherCenter.end.x - onx * ot, z: otherCenter.end.z - onz * ot } };

      const iLL = lineIntersection(lLeft.s, lLeft.e, oLeft.s, oLeft.e);
      const iLR = lineIntersection(lLeft.s, lLeft.e, oRight.s, oRight.e);
      const iRL = lineIntersection(lRight.s, lRight.e, oLeft.s, oLeft.e);
      const iRR = lineIntersection(lRight.s, lRight.e, oRight.s, oRight.e);

      const vAx = dx / len;
      const vAz = dz / len;
      const isStartOther = isSamePoint(startConnected[0].start, wall.start);
      const vBx = (isStartOther ? odx : -odx) / olen;
      const vBz = (isStartOther ? odz : -odz) / olen;

      const bisectorX = vAx + vBx;
      const bisectorZ = vAz + vBz;
      
      const dotLL_RR = (iLL && iRR) ? Math.abs((iLL.x - iRR.x) * bisectorX + (iLL.z - iRR.z) * bisectorZ) : -1;
      const dotLR_RL = (iLR && iRL) ? Math.abs((iLR.x - iRL.x) * bisectorX + (iLR.z - iRL.z) * bisectorZ) : -1;

      if (dotLL_RR >= dotLR_RL && iLL && iRR) {
         pLeftStart = iLL;
         pRightStart = iRR;
      } else if (iLR && iRL) {
         pLeftStart = iLR;
         pRightStart = iRL;
      }
    }
  }

  const endConnected = allWalls.filter(w => w.id !== wall.id && w.visible && (isSamePoint(w.start, wall.end) || isSamePoint(w.end, wall.end)));
  if (endConnected.length === 1) {
    const otherCenter = getWallCenterline(endConnected[0]);
    const odx = otherCenter.end.x - otherCenter.start.x;
    const odz = otherCenter.end.z - otherCenter.start.z;
    const olen = Math.sqrt(odx*odx + odz*odz);
    if (olen > 0) {
      const onx = -odz / olen;
      const onz = odx / olen;
      const ot = (endConnected[0].thickness || 0.2) / 2;
      const oLeft = { s: { x: otherCenter.start.x + onx * ot, z: otherCenter.start.z + onz * ot }, e: { x: otherCenter.end.x + onx * ot, z: otherCenter.end.z + onz * ot } };
      const oRight = { s: { x: otherCenter.start.x - onx * ot, z: otherCenter.start.z - onz * ot }, e: { x: otherCenter.end.x - onx * ot, z: otherCenter.end.z - onz * ot } };

      const iLL = lineIntersection(lLeft.s, lLeft.e, oLeft.s, oLeft.e);
      const iLR = lineIntersection(lLeft.s, lLeft.e, oRight.s, oRight.e);
      const iRL = lineIntersection(lRight.s, lRight.e, oLeft.s, oLeft.e);
      const iRR = lineIntersection(lRight.s, lRight.e, oRight.s, oRight.e);

      const vAx = -dx / len;
      const vAz = -dz / len;
      const isStartOther = isSamePoint(endConnected[0].start, wall.end);
      const vBx = (isStartOther ? odx : -odx) / olen;
      const vBz = (isStartOther ? odz : -odz) / olen;

      const bisectorX = vAx + vBx;
      const bisectorZ = vAz + vBz;
      
      const dotLL_RR = (iLL && iRR) ? Math.abs((iLL.x - iRR.x) * bisectorX + (iLL.z - iRR.z) * bisectorZ) : -1;
      const dotLR_RL = (iLR && iRL) ? Math.abs((iLR.x - iRL.x) * bisectorX + (iLR.z - iRL.z) * bisectorZ) : -1;

      if (dotLL_RR >= dotLR_RL && iLL && iRR) {
         pLeftEnd = iLL;
         pRightEnd = iRR;
      } else if (iLR && iRL) {
         pLeftEnd = iLR;
         pRightEnd = iRL;
      }
    }
  }

  return { pLeftStart, pRightStart, pLeftEnd, pRightEnd, nx, nz, baseStart, len };
}

export function subtractOverlappingWalls(p1: {x: number, z: number}, p2: {x: number, z: number}, walls: IWall[]): {start: {x: number, z: number}, end: {x: number, z: number}}[] {
  let intervals: {t1: number, t2: number}[] = [{t1: 0, t2: 1}];
  
  const dx = p2.x - p1.x;
  const dz = p2.z - p1.z;
  const lenSq = dx * dx + dz * dz;
  if (lenSq < 0.0001) return [{start: p1, end: p2}];
  const len = Math.sqrt(lenSq);

  const distToLine = (p: {x: number, z: number}, a: {x: number, z: number}, b: {x: number, z: number}) => {
    return Math.abs((b.z - a.z) * p.x - (b.x - a.x) * p.z + b.x * a.z - b.z * a.x) / len;
  };

  walls.forEach(w => {
    if (!w.visible) return;
    
    const center = getWallCenterline(w);
    const t = (w.thickness || 0.2) / 2 + 0.05;
    
    // Check if the area edge is within the wall's physical footprint
    if (distToLine(center.start, p1, p2) > t || distToLine(center.end, p1, p2) > t) return;

    // Project center.start and center.end onto p1-p2
    const dxA = center.start.x - p1.x;
    const dzA = center.start.z - p1.z;
    const tStartProj = (dxA * dx + dzA * dz) / lenSq;
    
    const dxB = center.end.x - p1.x;
    const dzB = center.end.z - p1.z;
    const tEndProj = (dxB * dx + dzB * dz) / lenSq;

    let minT = Math.min(tStartProj, tEndProj);
    let maxT = Math.max(tStartProj, tEndProj);
    
    const newIntervals: {t1: number, t2: number}[] = [];
    for (const iv of intervals) {
      if (maxT <= iv.t1 || minT >= iv.t2) {
        newIntervals.push(iv);
      } else {
        if (iv.t1 < minT) {
          newIntervals.push({t1: iv.t1, t2: minT});
        }
        if (iv.t2 > maxT) {
          newIntervals.push({t1: maxT, t2: iv.t2});
        }
      }
    }
    intervals = newIntervals;
  });

  return intervals.filter(iv => iv.t2 - iv.t1 > 0.01).map(iv => ({
    start: { x: p1.x + dx * iv.t1, z: p1.z + dz * iv.t1 },
    end: { x: p1.x + dx * iv.t2, z: p1.z + dz * iv.t2 }
  }));
}

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
  const { start, end } = getWallCenterline(wall);
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const len = Math.sqrt(dx*dx + dz*dz);
  if (len === 0) return { x: start.x, z: start.z, yaw: 0 };
  
  const dirX = dx / len;
  const dirZ = dz / len;
  
  const centerDistance = offset + openingWidth / 2;
  return {
    x: start.x + dirX * centerDistance,
    z: start.z + dirZ * centerDistance,
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

export function isPointInPolygon(point: { x: number; z: number }, vs: { x: number; z: number }[]) {
  let x = point.x, z = point.z;
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    let xi = vs[i].x, zi = vs[i].z;
    let xj = vs[j].x, zj = vs[j].z;
    let intersect = ((zi > z) != (zj > z))
        && (x < (xj - xi) * (z - zi) / (zj - zi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Sutherland-Hodgman Polygon Clipping algorithm
export function clipPolygon(subjectPolygon: {x: number, z: number}[], clipPolygon: {x: number, z: number}[]): {x: number, z: number}[] {
  let outputList = subjectPolygon;
  const cp1 = clipPolygon[clipPolygon.length - 1];

  for (let j = 0; j < clipPolygon.length; j++) {
    let cp2 = clipPolygon[j];
    let cp1ToUse = j === 0 ? cp1 : clipPolygon[j - 1];
    let inputList = outputList;
    outputList = [];
    if (inputList.length === 0) break;

    let s = inputList[inputList.length - 1];
    
    // Function to check if a point is inside the clip edge
    const isInside = (p: {x: number, z: number}) => {
      return (cp2.x - cp1ToUse.x) * (p.z - cp1ToUse.z) - (cp2.z - cp1ToUse.z) * (p.x - cp1ToUse.x) >= 0;
    };
    
    // Compute intersection of line s-e with line cp1-cp2
    const computeIntersection = (s: {x: number, z: number}, e: {x: number, z: number}) => {
      const dcx = cp1ToUse.x - cp2.x;
      const dcz = cp1ToUse.z - cp2.z;
      const dpx = s.x - e.x;
      const dpz = s.z - e.z;
      const n1 = cp1ToUse.x * cp2.z - cp1ToUse.z * cp2.x;
      const n2 = s.x * e.z - s.z * e.x;
      const n3 = 1.0 / (dcx * dpz - dcz * dpx);
      return {
        x: (n1 * dpx - n2 * dcx) * n3,
        z: (n1 * dpz - n2 * dcz) * n3
      };
    };

    for (let i = 0; i < inputList.length; i++) {
      let e = inputList[i];
      if (isInside(e)) {
        if (!isInside(s)) {
          outputList.push(computeIntersection(s, e));
        }
        outputList.push(e);
      } else if (isInside(s)) {
        outputList.push(computeIntersection(s, e));
      }
      s = e;
    }
  }
  return outputList;
}

export function getAreaNetSize(area: IArea, walls: IWall[]): number {
  const grossArea = getPolygonArea(area.points);
  let totalWallOverlap = 0;

  walls.forEach(wall => {
    if (!wall.visible) return;
    
    const poly = getWallPolygon(wall, walls);
    if (!poly) return;
    
    // The 4 corners of the wall polygon (counter-clockwise order)
    const wallPolygon = [poly.pLeftStart, poly.pRightStart, poly.pRightEnd, poly.pLeftEnd];
    
    try {
      const clipped = clipPolygon(area.points, wallPolygon);
      if (clipped.length >= 3) {
        totalWallOverlap += getPolygonArea(clipped);
      }
    } catch (e) {
      console.warn("Failed to clip wall", e);
    }
  });

  return Math.max(0, grossArea - totalWallOverlap);
}
