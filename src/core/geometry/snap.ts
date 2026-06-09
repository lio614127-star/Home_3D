import { IProject, IWall } from '../../types';
import { WORKSPACE_MIN_X, WORKSPACE_MAX_X, WORKSPACE_MIN_Z, WORKSPACE_MAX_Z } from '../config/workspace';

export interface SnapCandidate {
  x: number;
  z: number;
  type: 'siteCorner' | 'areaVertex' | 'wallEndpoint' | 'wallFace' | 'wallCenter' | 'areaEdge' | 'grid' | 'ortho';
  label: string;
  priority: number; // 1 = highest (corners), 2 = edges/faces, 3 = grid fallback
}

export interface SnapResult {
  x: number;
  z: number;
  snapped: boolean;
  type?: SnapCandidate['type'];
  label?: string;
  priority?: number;
  guides?: { type: 'horizontal' | 'vertical', pos: number }[];
}

export function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function roundToDecimals(value: number, decimals: number): number {
  return Number(value.toFixed(decimals));
}

// Tolerance constants in screen pixels
const VERTEX_TOLERANCE_PX = 18;
const EDGE_TOLERANCE_PX = 10;

export function getUnifiedSnapCandidates(pointerX: number, pointerZ: number, project: IProject, measureMode?: string): SnapCandidate[] {
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

  // 3. Walls (Endpoints, Faces, Centerline)
  project.walls.forEach(wall => {
    // Endpoints
    candidates.push({ x: wall.start.x, z: wall.start.z, type: 'wallEndpoint', label: 'Đầu tường', priority: 1 });
    candidates.push({ x: wall.end.x, z: wall.end.z, type: 'wallEndpoint', label: 'Đầu tường', priority: 1 });

    // Edge/Faces projections
    const dx = wall.end.x - wall.start.x;
    const dz = wall.end.z - wall.start.z;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len > 0) {
      const nx = -dz / len;
      const nz = dx / len;
      const lx = dx / len;
      const lz = dz / len;
      
      const vx = pointerX - wall.start.x;
      const vz = pointerZ - wall.start.z;
      const t = Math.max(0, Math.min(len, vx * lx + vz * lz));
      const px = wall.start.x + lx * t;
      const pz = wall.start.z + lz * t;

      if (!measureMode || measureMode === 'centerline' || measureMode === 'thickness') {
        candidates.push({ x: px, z: pz, type: 'wallCenter', label: 'Tim tường', priority: 2 });
      }
      
      if (!measureMode || measureMode === 'innerFace' || measureMode === 'thickness') {
        const hx = px + nx * (wall.thickness / 2);
        const hz = pz + nz * (wall.thickness / 2);
        candidates.push({ x: hx, z: hz, type: 'wallFace', label: 'Mép tường', priority: 2 });
      }
      
      if (!measureMode || measureMode === 'outerFace' || measureMode === 'thickness') {
        const hx = px - nx * (wall.thickness / 2);
        const hz = pz - nz * (wall.thickness / 2);
        candidates.push({ x: hx, z: hz, type: 'wallFace', label: 'Mép tường', priority: 2 });
      }
    }
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
    measureMode?: string;
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
    const candidates = getUnifiedSnapCandidates(pointerX, pointerZ, project, opts.measureMode);
    
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
    finalX = roundToStep(projX, activeStep);
    finalZ = roundToStep(projZ, activeStep);
    snapped = true;
    finalType = 'grid';
    finalLabel = `Giao điểm lưới ${activeStep.toFixed(2)}m`;
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
    guides
  };
}
