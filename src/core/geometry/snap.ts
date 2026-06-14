import { IProject } from '../../types';
import { getWallCenterline, getWallRenderLine, lineIntersection, getWallPolygon } from './math';
import { WORKSPACE_MIN_X, WORKSPACE_MAX_X, WORKSPACE_MIN_Z, WORKSPACE_MAX_Z } from '../config/workspace';

export interface SnapCandidate {
  x: number;
  z: number;
  type: 'siteCorner' | 'areaVertex' | 'wallEndpoint' | 'wallFace' | 'wallCenter' | 'areaEdge' | 'grid' | 'ortho';
  label: string;
  priority: number; // 1 = highest (corners), 2 = edges/faces, 3 = grid fallback
  wallId?: string;
  wallThickness?: number;
  wallJustification?: 'center' | 'left' | 'right';
}

export interface SnapResult {
  x: number;
  z: number;
  snapped: boolean;
  type?: SnapCandidate['type'];
  label?: string;
  priority?: number;
  guides?: { type: 'horizontal' | 'vertical', pos: number }[];
  wallThickness?: number;
  wallJustification?: 'center' | 'left' | 'right';
}

export function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function segmentIntersection(p1: {x: number, z: number}, p2: {x: number, z: number}, p3: {x: number, z: number}, p4: {x: number, z: number}) {
  const denom = (p4.z - p3.z) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.z - p1.z);
  if (Math.abs(denom) < 0.0001) return null;
  const ua = ((p4.x - p3.x) * (p1.z - p3.z) - (p4.z - p3.z) * (p1.x - p3.x)) / denom;
  const ub = ((p2.x - p1.x) * (p1.z - p3.z) - (p2.z - p1.z) * (p1.x - p3.x)) / denom;
  if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
    return {
      x: p1.x + ua * (p2.x - p1.x),
      z: p1.z + ua * (p2.z - p1.z)
    };
  }
  return null;
}

export function roundToDecimals(value: number, decimals: number): number {
  return Number(value.toFixed(decimals));
}

// Tolerance constants in screen pixels
const VERTEX_TOLERANCE_PX = 30; // Increased to make corners much stickier when closing loops
const EDGE_TOLERANCE_PX = 10;

export function getUnifiedSnapCandidates(pointerX: number, pointerZ: number, project: IProject, gridOpts?: { snapToGrid: boolean, gridMinorStep: number }): SnapCandidate[] {
  const candidates: SnapCandidate[] = [];

  // 1. Site Corners
  if (project.site) {
    const s = project.site;
    candidates.push({ x: s.origin.x, z: s.origin.z, type: 'siteCorner', label: 'Góc khu đất', priority: 1 });
    candidates.push({ x: s.origin.x + s.width, z: s.origin.z, type: 'siteCorner', label: 'Góc khu đất', priority: 1 });
    candidates.push({ x: s.origin.x, z: s.origin.z + s.depth, type: 'siteCorner', label: 'Góc khu đất', priority: 1 });
    candidates.push({ x: s.origin.x + s.width, z: s.origin.z + s.depth, type: 'siteCorner', label: 'Góc khu đất', priority: 1 });
  }

  // 2. Area Vertices & Edges
  if (Array.isArray(project.areas)) {
    project.areas.forEach(area => {
      if (area.points && Array.isArray(area.points)) {
        area.points.forEach((p, i) => {
          // Vertex
          candidates.push({ x: p.x, z: p.z, type: 'areaVertex', label: 'Góc khu vực', priority: 1 });
          
          // Edge projection
          const nextPt = area.points[(i + 1) % area.points.length];
          const dx = nextPt.x - p.x;
          const dz = nextPt.z - p.z;
          const len = Math.sqrt(dx * dx + dz * dz);
          if (len > 0) {
            const lx = dx / len;
            const lz = dz / len;
            const vx = pointerX - p.x;
            const vz = pointerZ - p.z;
            const t = Math.max(0, Math.min(len, vx * lx + vz * lz));
            const px = p.x + lx * t;
            const pz = p.z + lz * t;
            candidates.push({ x: px, z: pz, type: 'areaEdge', label: 'Cạnh khu vực', priority: 2 });
          }
        });
      }
    });
  }

  // 3. Walls (Endpoints, Faces, Centerline, Corners)
  project.walls.forEach(wall => {
    // Use the render line to account for miter joints
    const { start, end } = getWallRenderLine(wall, project.walls);
    
    // Edge/Faces projections and Corners
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len > 0) {
      const nx = -dz / len;
      const nz = dx / len;
      const lx = dx / len;
      const lz = dz / len;
      
      const t2 = (wall.thickness || 0.2) / 2;

      const eps = 0.05;
      const isSamePoint = (p1: {x: number, z: number}, p2: {x: number, z: number}) => Math.abs(p1.x - p2.x) < eps && Math.abs(p1.z - p2.z) < eps;

      // Centerline endpoints (topological connections) - MUST be pushed FIRST so they win ties over visual corners!
      candidates.push({ x: wall.start.x, z: wall.start.z, type: 'wallCenter', label: 'Điểm nối tường', priority: 1, wallId: wall.id, wallThickness: wall.thickness, wallJustification: wall.justification });
      candidates.push({ x: wall.end.x, z: wall.end.z, type: 'wallCenter', label: 'Điểm nối tường', priority: 1, wallId: wall.id, wallThickness: wall.thickness, wallJustification: wall.justification });

      const poly = getWallPolygon(wall, project.walls);
      if (poly) {
        // Dedup points to avoid double pushing
        const pts = [poly.pLeftStart, poly.pRightStart, poly.pLeftEnd, poly.pRightEnd];
        pts.forEach(p => {
          candidates.push({ x: p.x, z: p.z, type: 'wallEndpoint', label: 'Góc mép tường', priority: 1 });
        });
      } else {
        const t2 = (wall.thickness || 0.2) / 2;
        const pushCornersForEndpoint = (isStart: boolean) => {
          const pt = isStart ? start : end;
          const pLeft = { x: pt.x + nx * t2, z: pt.z + nz * t2 };
          const pRight = { x: pt.x - nx * t2, z: pt.z - nz * t2 };
          candidates.push({ x: pLeft.x, z: pLeft.z, type: 'wallEndpoint', label: 'Góc mép tường', priority: 1 });
          candidates.push({ x: pRight.x, z: pRight.z, type: 'wallEndpoint', label: 'Góc mép tường', priority: 1 });
        };
        pushCornersForEndpoint(true);
        pushCornersForEndpoint(false);
      }

      const vx = pointerX - start.x;
      const vz = pointerZ - start.z;
      let t = Math.max(0, Math.min(len, vx * lx + vz * lz));
      let px = start.x + lx * t;
      let pz = start.z + lz * t;
      
      // Snap along the line if it's axis-aligned and grid snap is enabled
      if (gridOpts?.snapToGrid && gridOpts.gridMinorStep) {
        const step = gridOpts.gridMinorStep;
        if (Math.abs(lz) < 0.001) { // Horizontal
           px = Math.round(px / step) * step;
           px = Math.max(Math.min(px, Math.max(start.x, end.x)), Math.min(start.x, end.x));
        } else if (Math.abs(lx) < 0.001) { // Vertical
           pz = Math.round(pz / step) * step;
           pz = Math.max(Math.min(pz, Math.max(start.z, end.z)), Math.min(start.z, end.z));
        }
      }

      // Always emit candidates for measurement/snapping
      candidates.push({ x: px, z: pz, type: 'wallCenter', label: 'Tim tường', priority: 2 });
      
      const hx1 = px + nx * (wall.thickness / 2);
      const hz1 = pz + nz * (wall.thickness / 2);
      candidates.push({ x: hx1, z: hz1, type: 'wallFace', label: 'Mép tường', priority: 2 });
      
      const hx2 = px - nx * (wall.thickness / 2);
      const hz2 = pz - nz * (wall.thickness / 2);
      candidates.push({ x: hx2, z: hz2, type: 'wallFace', label: 'Mép tường', priority: 2 });
    }
  });

  // Calculate visual intersections between all wall edges to handle unconnected walls forming visual corners
  const allPolys = project.walls.filter(w => w.visible).map(w => getWallPolygon(w, project.walls)).filter(p => p !== null) as any[];
  for (let i = 0; i < allPolys.length; i++) {
    for (let j = i + 1; j < allPolys.length; j++) {
      const p1 = allPolys[i];
      const p2 = allPolys[j];
      
      const edges1 = [
        { s: p1.pLeftStart, e: p1.pLeftEnd },
        { s: p1.pRightStart, e: p1.pRightEnd },
        { s: p1.pLeftStart, e: p1.pRightStart },
        { s: p1.pLeftEnd, e: p1.pRightEnd }
      ];
      const edges2 = [
        { s: p2.pLeftStart, e: p2.pLeftEnd },
        { s: p2.pRightStart, e: p2.pRightEnd },
        { s: p2.pLeftStart, e: p2.pRightStart },
        { s: p2.pLeftEnd, e: p2.pRightEnd }
      ];
      
      for (const e1 of edges1) {
        for (const e2 of edges2) {
          const int = segmentIntersection(e1.s, e1.e, e2.s, e2.e);
          if (int) {
            candidates.push({ x: int.x, z: int.z, type: 'wallEndpoint', label: 'Góc mép tường', priority: 1 });
          }
        }
      }
    }
  }

  // Areas
  project.areas.forEach(area => {
    area.points.forEach((pt, i) => {
      const nextPt = area.points[(i + 1) % area.points.length];
      
      // Vertex candidate
      candidates.push({ x: pt.x, z: pt.z, type: 'areaVertex', label: 'Góc khu vực', priority: 1 });
      
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
        candidates.push({ x: px, z: pz, type: 'areaEdge', label: 'Cạnh khu vực', priority: 2 });
      }
    });
  });

  return candidates;
}

export function resolveBestSnap(
  pointerX: number, 
  pointerZ: number, 
  project: IProject, 
  opts: {
    snapToGrid: boolean;
    snapToPoints: boolean;
    orthoMode: boolean;
    gridMinorStep: number;
    scale: number; // Pixels per meter * zoom
    startPoint?: { x: number; z: number }; // For ortho
    showAlignmentGuides?: boolean;
    isCreationMode?: boolean;
  }
): SnapResult {
  let bestCandidate: SnapCandidate | null = null;
  let minScreenDist = Infinity;
  let guides: { type: 'horizontal' | 'vertical', pos: number }[] = [];

  let projX = pointerX;
  let projZ = pointerZ;

  if (opts.orthoMode && opts.startPoint) {
    const dx = Math.abs(pointerX - opts.startPoint.x);
    const dz = Math.abs(pointerZ - opts.startPoint.z);
    if (dx > dz) {
      projZ = opts.startPoint.z;
    } else {
      projX = opts.startPoint.x;
    }
  }

  let finalX = projX;
  let finalZ = projZ;
  let snapped = false;
  let finalType: SnapCandidate['type'] | undefined = undefined;
  let finalLabel: string | undefined = undefined;
  let finalPriority: number = 99;

  if (opts.snapToPoints) {
    const candidates = getUnifiedSnapCandidates(pointerX, pointerZ, project, { snapToGrid: opts.snapToGrid, gridMinorStep: opts.gridMinorStep });
    
    // Evaluate candidates with strict priority logic
    for (const c of candidates) {
      let cx = c.x;
      let cz = c.z;

      if (opts.orthoMode && opts.startPoint) {
         if (projZ === opts.startPoint.z) cz = projZ;
         if (projX === opts.startPoint.x) cx = projX;
      }

      const screenDx = (cx - projX) * opts.scale;
      const screenDz = (cz - projZ) * opts.scale;
      const screenDist = Math.sqrt(screenDx * screenDx + screenDz * screenDz);

      const tolerance = c.priority === 1 ? VERTEX_TOLERANCE_PX : EDGE_TOLERANCE_PX;

      if (screenDist <= tolerance) {
        // Strict priority check
        // If we found a priority 1 earlier, we ONLY replace it if this priority 1 is closer.
        // If we found a priority 2, and this is priority 1, it ALWAYS wins.
        if (!bestCandidate || c.priority < finalPriority || (c.priority === finalPriority && screenDist < minScreenDist)) {
          bestCandidate = c;
          minScreenDist = screenDist;
          finalPriority = c.priority;
        }
      }
    }
    
    // Alignment guides (only calculate if we aren't strongly snapped to a point)
    if (opts.showAlignmentGuides && !bestCandidate) {
       let bestAlignXDist = EDGE_TOLERANCE_PX;
       let bestAlignZDist = EDGE_TOLERANCE_PX;
       let alignX: number | null = null;
       let alignZ: number | null = null;

       for (const c of candidates) {
         if (c.priority > 1) continue; // Only align to strong corners
         
         const screenDx = Math.abs((c.x - pointerX) * opts.scale);
         const screenDz = Math.abs((c.z - pointerZ) * opts.scale);

         if (screenDx < bestAlignXDist) {
           bestAlignXDist = screenDx;
           alignX = c.x;
         }
         if (screenDz < bestAlignZDist) {
           bestAlignZDist = screenDz;
           alignZ = c.z;
         }
       }

       if (alignX !== null && !opts.orthoMode) {
         projX = alignX;
         guides.push({ type: 'vertical', pos: alignX });
       }
       if (alignZ !== null && !opts.orthoMode) {
         projZ = alignZ;
         guides.push({ type: 'horizontal', pos: alignZ });
       }
    }
  }

  // Final resolution order
  if (bestCandidate) {
    finalX = bestCandidate.x;
    finalZ = bestCandidate.z;
    snapped = true;
    finalType = bestCandidate.type;
    finalLabel = bestCandidate.label;
    finalPriority = bestCandidate.priority;
  } else if (opts.snapToGrid) {
    const activeStep = opts.gridMinorStep || 0.5;
    
    // If drawing from a start point, snap relative to the start point so dimensions are exact multiples of the grid
    if (opts.startPoint) {
      finalX = opts.startPoint.x + roundToStep(projX - opts.startPoint.x, activeStep);
      finalZ = opts.startPoint.z + roundToStep(projZ - opts.startPoint.z, activeStep);
      finalLabel = `Kéo dài ${activeStep.toFixed(2)}m`;
    } else {
      finalX = roundToStep(projX, activeStep);
      finalZ = roundToStep(projZ, activeStep);
      finalLabel = `Giao điểm lưới ${activeStep.toFixed(2)}m`;
    }
    
    snapped = true;
    finalType = 'grid';
    finalPriority = 3;
    
    if (opts.showAlignmentGuides) {
      guides = [
        { type: 'horizontal', pos: finalZ },
        { type: 'vertical', pos: finalX }
      ];
    }
  } else if (opts.orthoMode && !!opts.startPoint) {
    snapped = true;
    finalType = 'ortho';
  }

  // ENFORCE STRICT ORTHO LOCK AT THE END
  // This ensures that even if we snapped to a point/edge, the line remains perfectly horizontal/vertical
  if (opts.orthoMode && opts.startPoint) {
    if (projZ === opts.startPoint.z) {
      finalZ = opts.startPoint.z;
      if (snapped && finalType !== 'ortho' && finalType !== 'grid') {
        finalLabel = (finalLabel ? finalLabel + ' ' : '') + '(Vuông góc)';
      }
    } else if (projX === opts.startPoint.x) {
      finalX = opts.startPoint.x;
      if (snapped && finalType !== 'ortho' && finalType !== 'grid') {
        finalLabel = (finalLabel ? finalLabel + ' ' : '') + '(Vuông góc)';
      }
    }
  }

  if (opts.isCreationMode) {
    finalX = Math.max(WORKSPACE_MIN_X, Math.min(finalX, WORKSPACE_MAX_X));
    finalZ = Math.max(WORKSPACE_MIN_Z, Math.min(finalZ, WORKSPACE_MAX_Z));
  }

  return {
    x: roundToDecimals(finalX, 4),
    z: roundToDecimals(finalZ, 4),
    snapped,
    type: finalType,
    label: finalLabel,
    priority: finalPriority,
    guides,
    wallThickness: bestCandidate?.wallThickness,
    wallJustification: bestCandidate?.wallJustification
  };
}
