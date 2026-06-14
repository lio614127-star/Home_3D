import { IArea, IWall } from '../../types';
import { getWallPolygon } from './math';

export type CornerType = 'pLeftStart' | 'pRightStart' | 'pLeftEnd' | 'pRightEnd';

export interface AreaConstraint {
  areaId: string;
  pointIndex: number;
  corners: { wallId: string; corner: CornerType }[];
  edges: { wallId: string; side: 'Left' | 'Right'; distFromStart: number }[];
}

const eps = 0.05;
const isSamePoint = (p1: {x: number, z: number}, p2: {x: number, z: number}) => Math.abs(p1.x - p2.x) < eps && Math.abs(p1.z - p2.z) < eps;

const distToSegment = (pt: {x: number, z: number}, a: {x: number, z: number}, b: {x: number, z: number}) => {
  const l2 = (b.x - a.x)**2 + (b.z - a.z)**2;
  if (l2 === 0) return Math.sqrt((pt.x - a.x)**2 + (pt.z - a.z)**2);
  let t = ((pt.x - a.x) * (b.x - a.x) + (pt.z - a.z) * (b.z - a.z)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt((pt.x - (a.x + t * (b.x - a.x)))**2 + (pt.z - (a.z + t * (b.z - a.z)))**2);
};

export function buildAreaConstraints(areas: IArea[], walls: IWall[]): AreaConstraint[] {
  const constraints: AreaConstraint[] = [];
  const polys = new Map<string, ReturnType<typeof getWallPolygon>>();
  
  walls.forEach(w => {
    if (w.visible) polys.set(w.id, getWallPolygon(w, walls));
  });

  areas.forEach(area => {
    area.points.forEach((p, idx) => {
      const corners: { wallId: string; corner: CornerType }[] = [];
      const edges: { wallId: string; side: 'Left' | 'Right'; distFromStart: number }[] = [];

      polys.forEach((poly, wallId) => {
        if (!poly) return;
        
        // Check corners
        if (isSamePoint(p, poly.pLeftStart)) corners.push({ wallId, corner: 'pLeftStart' });
        if (isSamePoint(p, poly.pRightStart)) corners.push({ wallId, corner: 'pRightStart' });
        if (isSamePoint(p, poly.pLeftEnd)) corners.push({ wallId, corner: 'pLeftEnd' });
        if (isSamePoint(p, poly.pRightEnd)) corners.push({ wallId, corner: 'pRightEnd' });

        if (corners.some(c => c.wallId === wallId)) return;

        // Check edges
        if (distToSegment(p, poly.pLeftStart, poly.pLeftEnd) < eps) {
          const dx = p.x - poly.baseStart.x;
          const dz = p.z - poly.baseStart.z;
          const dist = dx * poly.nz - dz * poly.nx;
          edges.push({ wallId, side: 'Left', distFromStart: dist });
        } else if (distToSegment(p, poly.pRightStart, poly.pRightEnd) < eps) {
          const dx = p.x - poly.baseStart.x;
          const dz = p.z - poly.baseStart.z;
          const dist = dx * poly.nz - dz * poly.nx;
          edges.push({ wallId, side: 'Right', distFromStart: dist });
        }
      });

      if (corners.length > 0 || edges.length > 0) {
        constraints.push({ areaId: area.id, pointIndex: idx, corners, edges });
      }
    });
  });

  return constraints;
}

export function resolveAreaConstraints(areas: IArea[], walls: IWall[], constraints: AreaConstraint[]): IArea[] {
  const polys = new Map<string, ReturnType<typeof getWallPolygon>>();
  walls.forEach(w => {
    if (w.visible) polys.set(w.id, getWallPolygon(w, walls));
  });

  const newAreas = areas.map(a => ({ ...a, points: a.points.map(p => ({ ...p })) }));

  constraints.forEach(c => {
    const area = newAreas.find(a => a.id === c.areaId);
    if (!area || !area.points[c.pointIndex]) return;

    let newPoint: {x: number, z: number} | null = null;

    // Resolve corners
    for (const corner of c.corners) {
      const poly = polys.get(corner.wallId);
      if (poly && poly[corner.corner]) {
        newPoint = { ...poly[corner.corner] };
        break;
      }
    }

    // Resolve edges
    if (!newPoint) {
      for (const edge of c.edges) {
        const poly = polys.get(edge.wallId);
        if (poly) {
          const dirX = poly.nz;
          const dirZ = -poly.nx;
          const t = (walls.find(w => w.id === edge.wallId)?.thickness || 0.2) / 2;
          
          if (edge.side === 'Left') {
            newPoint = {
              x: poly.baseStart.x + dirX * edge.distFromStart + poly.nx * t,
              z: poly.baseStart.z + dirZ * edge.distFromStart + poly.nz * t
            };
          } else {
            newPoint = {
              x: poly.baseStart.x + dirX * edge.distFromStart - poly.nx * t,
              z: poly.baseStart.z + dirZ * edge.distFromStart - poly.nz * t
            };
          }
          break;
        }
      }
    }

    if (newPoint) {
      area.points[c.pointIndex] = newPoint;
    }
  });

  return newAreas;
}
