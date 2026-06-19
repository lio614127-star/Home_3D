import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { IProject, ISite, IBuilding, IWall, IArea, IOpening, SelectedItem, IRoof } from '../types';
import { buildAreaConstraints, resolveAreaConstraints } from '../core/geometry/constraints';
import { createDefaultProject } from '../core/project/createDefaultProject';
import { rotatePoint, getCentroid, getBoundingBox } from '../core/geometry/transform';
import { getWallEndFromLength, computeBuildingFootprint } from '../core/geometry/math';

function recomputeBuildingFootprints(data: IProject, buildingIds: Set<string>) {
  buildingIds.forEach(bId => {
    const building = data.buildings.find(b => b.id === bId);
    if (building) {
      building.footprint = computeBuildingFootprint(bId, data.walls) || undefined;
      building.footprintVersion = (building.footprintVersion || 0) + 1;
    }
  });
}

interface ProjectState {
  data: IProject;
  setProject: (project: IProject) => void;
  updateSite: (updates: Partial<ISite>) => void;
  deleteSite: () => void;
  updateBuilding: (updates: Partial<IBuilding> & { id: string }) => void;
  deleteBuilding: (id: string) => void;
  createBuildingFromSelection: (selection: SelectedItem[]) => void;
  ungroupBuilding: (buildingId: string) => void;
  addWall: (wall: IWall) => void;
  updateWall: (id: string, updates: Partial<IWall>) => void;
  updateConnectedWallEndpoints: (updates: { wallId: string; type: 'start' | 'end'; point: { x: number; z: number } }[]) => void;
  deleteWall: (id: string) => void;
  addArea: (area: IArea) => void;
  updateArea: (id: string, updates: Partial<IArea>) => void;
  insertAreaPoint: (id: string, edgeIndex: number, point: { x: number; z: number }) => void;
  deleteArea: (id: string) => void;
  addOpening: (opening: IOpening) => void;
  updateOpening: (id: string, updates: Partial<IOpening>) => void;
  deleteOpening: (id: string) => void;
  addRoof: (roof: IRoof) => void;
  updateRoof: (id: string, updates: Partial<IRoof>) => void;
  deleteRoof: (id: string) => void;
  addAnnotation: (annotation: any) => void;
  updateAnnotation: (id: string, updates: any) => void;
  deleteAnnotation: (id: string) => void;

  translateSelection: (selection: SelectedItem[], deltaX: number, deltaZ: number) => void;
  rotateSelection: (selection: SelectedItem[], angleDegrees: number, pivot?: {x: number, z: number}) => void;
  duplicateSelection: (selection: SelectedItem[]) => SelectedItem[];
  alignSelection: (selection: SelectedItem[], type: 'left'|'right'|'top'|'bottom'|'centerX'|'centerZ') => void;
  distributeSelection: (selection: SelectedItem[], type: 'horizontal'|'vertical') => void;
  mirrorSelection: (selection: SelectedItem[], axis: 'horizontal'|'vertical') => void;

  groupDragSnapshot: IProject | null;
  startGroupDrag: () => void;
  updateGroupDrag: (deltaX: number, deltaZ: number, items: SelectedItem[]) => void;
  endGroupDrag: (commit: boolean) => void;

  past: IProject[];
  future: IProject[];
  commitHistory: () => void;
  undo: () => void;
  redo: () => void;
}

function expandSelection(selection: SelectedItem[], data: IProject): SelectedItem[] {
  let expanded: SelectedItem[] = [];
  selection.forEach(item => {
    if (item.type === 'building') {
      data.walls.forEach(w => { if (w.buildingId === item.id) expanded.push({ id: w.id, type: 'wall' }); });
      data.areas.forEach(a => { if (a.buildingId === item.id) expanded.push({ id: a.id, type: 'area' }); });
      (data.openings || []).forEach(o => { if (o.buildingId === item.id) expanded.push({ id: o.id, type: 'opening' }); });
      (data.annotations || []).forEach(an => { if (an.buildingId === item.id) expanded.push({ id: an.id, type: 'dimension' }); });
    } else {
      expanded.push(item);
    }
  });
  // Deduplicate
  const unique = new Map<string, SelectedItem>();
  expanded.forEach(i => unique.set(i.id + i.type, i));
  return Array.from(unique.values());
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      data: createDefaultProject(),
      groupDragSnapshot: null,
      past: [],
      future: [],
  
  commitHistory: () => set((state) => {
    const cloned = JSON.parse(JSON.stringify(state.data));
    return { past: [...state.past, cloned].slice(-50), future: [] };
  }),

  undo: () => set((state) => {
    if (state.past.length === 0) return state;
    const previous = state.past[state.past.length - 1];
    const newPast = state.past.slice(0, state.past.length - 1);
    const cloned = JSON.parse(JSON.stringify(state.data));
    return { past: newPast, future: [cloned, ...state.future], data: previous };
  }),

  redo: () => set((state) => {
    if (state.future.length === 0) return state;
    const next = state.future[0];
    const newFuture = state.future.slice(1);
    const cloned = JSON.parse(JSON.stringify(state.data));
    return { past: [...state.past, cloned], future: newFuture, data: next };
  }),

  startGroupDrag: () => set((state) => ({
    groupDragSnapshot: JSON.parse(JSON.stringify(state.data))
  })),

  updateGroupDrag: (deltaX, deltaZ, items) => set((state) => {
    if (!state.groupDragSnapshot) return state;
    const newData: IProject = JSON.parse(JSON.stringify(state.groupDragSnapshot));
    
    const expandedSelection = expandSelection(items, newData);
    // Calculate new positions based on snapshot
    for (const item of expandedSelection) {
      if (item.type === 'site') {
        if (newData.site && newData.site.origin) {
          newData.site.origin.x += deltaX;
          newData.site.origin.z += deltaZ;
        }
      } else if (item.type === 'wall') {
        const wall = newData.walls.find(w => w.id === item.id);
        if (wall) {
          wall.start.x += deltaX; wall.start.z += deltaZ;
          wall.end.x += deltaX; wall.end.z += deltaZ;
        }
      } else if (item.type === 'wallEndpoint') {
        const wall = newData.walls.find(w => w.id === item.id);
        if (wall) {
           if (item.endpoint === 'start') {
              wall.start.x += deltaX; wall.start.z += deltaZ;
           } else {
              wall.end.x += deltaX; wall.end.z += deltaZ;
           }
        }
      } else if (item.type === 'area') {
        const area = newData.areas.find(a => a.id === item.id);
        if (area) {
           for (const p of area.points) {
              p.x += deltaX; p.z += deltaZ;
           }
        }
      } else if (item.type === 'areaVertex') {
        const area = newData.areas.find(a => a.id === item.id);
        if (area && area.points[item.pointIndex as number]) {
           area.points[item.pointIndex as number].x += deltaX;
           area.points[item.pointIndex as number].z += deltaZ;
        }
      } else if (item.type === 'dimension') {
        const dim = newData.annotations?.find(a => a.id === item.id);
        if (dim && dim.type === 'dimension') {
           dim.start.x += deltaX; dim.start.z += deltaZ;
           dim.end.x += deltaX; dim.end.z += deltaZ;
        }
      } else if (item.type === 'dimensionEndpoint') {
        const dim = newData.annotations?.find(a => a.id === item.id);
        if (dim && dim.type === 'dimension') {
           if (item.endpoint === 'start') {
              dim.start.x += deltaX; dim.start.z += deltaZ;
           } else {
              dim.end.x += deltaX; dim.end.z += deltaZ;
           }
        }
      }
      // Note: Openings are constrained to walls. If a wall moves, its openings implicitly move in 2D/3D (handled by render logic or offset).
      // If ONLY opening is dragged along the wall, that requires a different logic (projecting delta onto wall axis).
      // Since M3.9 doesn't strictly define complex standalone opening drag inside groups without walls, we will keep offset unchanged in group drag for simplicity unless wall is dragged.
    }
    
    return { data: newData };
  }),

  endGroupDrag: (commit) => set((state) => {
    if (commit && state.groupDragSnapshot) {
      const clonedPast = JSON.parse(JSON.stringify(state.groupDragSnapshot));
      return { 
        groupDragSnapshot: null, 
        past: [...state.past, clonedPast].slice(-50), 
        future: [] 
      };
    }
    // Revert if not committed
    return { data: state.groupDragSnapshot || state.data, groupDragSnapshot: null };
  }),

  translateSelection: (selection, deltaX, deltaZ) => set((state) => {
    const newData: IProject = JSON.parse(JSON.stringify(state.data));
    const expandedSelection = expandSelection(selection, newData);
    expandedSelection.forEach(item => {
      if (item.type === 'site') {
        if (newData.site && newData.site.origin) {
          newData.site.origin.x += deltaX;
          newData.site.origin.z += deltaZ;
        }
      } else if (item.type === 'wall') {
        const wall = newData.walls.find(w => w.id === item.id);
        if (wall && !wall.locked) {
          wall.start.x += deltaX; wall.start.z += deltaZ;
          wall.end.x += deltaX; wall.end.z += deltaZ;
        }
      } else if (item.type === 'wallEndpoint') {
        const wall = newData.walls.find(w => w.id === item.id);
        if (wall && !wall.locked) {
           if (item.endpoint === 'start') {
              wall.start.x += deltaX; wall.start.z += deltaZ;
           } else {
              wall.end.x += deltaX; wall.end.z += deltaZ;
           }
        }
      } else if (item.type === 'area') {
        const area = newData.areas.find(a => a.id === item.id);
        if (area && !area.locked) {
           for (const p of area.points) {
              p.x += deltaX; p.z += deltaZ;
           }
        }
      } else if (item.type === 'areaVertex') {
        const area = newData.areas.find(a => a.id === item.id);
        if (area && !area.locked && area.points[item.pointIndex as number]) {
           area.points[item.pointIndex as number].x += deltaX;
           area.points[item.pointIndex as number].z += deltaZ;
        }
      } else if (item.type === 'dimension') {
        const dim = newData.annotations?.find(a => a.id === item.id);
        if (dim && dim.type === 'dimension' && !dim.locked) {
           dim.start.x += deltaX; dim.start.z += deltaZ;
           dim.end.x += deltaX; dim.end.z += deltaZ;
        }
      } else if (item.type === 'dimensionEndpoint') {
        const dim = newData.annotations?.find(a => a.id === item.id);
        if (dim && dim.type === 'dimension' && !dim.locked) {
           if (item.endpoint === 'start') {
              dim.start.x += deltaX; dim.start.z += deltaZ;
           } else {
              dim.end.x += deltaX; dim.end.z += deltaZ;
           }
        }
      }
    });
    return { data: newData };
  }),

  rotateSelection: (selection, angleDegrees, customPivot) => set((state) => {
    const newData: IProject = JSON.parse(JSON.stringify(state.data));
    const expandedSelection = expandSelection(selection, newData);
    
    let pivot = customPivot;
    if (!pivot) {
      const pointsToConsider: {x: number, z: number}[] = [];
      expandedSelection.forEach(item => {
        if (item.type === 'wall') {
          const w = newData.walls.find(w => w.id === item.id);
          if (w) { pointsToConsider.push(w.start, w.end); }
        } else if (item.type === 'area') {
          const a = newData.areas.find(a => a.id === item.id);
          if (a) { pointsToConsider.push(...a.points); }
        }
      });
      pivot = getCentroid(pointsToConsider) || { x: 0, z: 0 };
    }

    expandedSelection.forEach(item => {
      if (item.type === 'wall') {
        const wall = newData.walls.find(w => w.id === item.id);
        if (wall && !wall.locked) {
          wall.start = rotatePoint(wall.start, pivot!, angleDegrees);
          wall.end = rotatePoint(wall.end, pivot!, angleDegrees);
          wall.rotation = ((wall.rotation || 0) + angleDegrees) % 360;
        }
      } else if (item.type === 'area') {
        const area = newData.areas.find(a => a.id === item.id);
        if (area && !area.locked) {
           area.points = area.points.map(p => rotatePoint(p, pivot!, angleDegrees));
           area.rotation = ((area.rotation || 0) + angleDegrees) % 360;
        }
      } else if (item.type === 'site') {
         if (newData.site && newData.site.origin) {
            newData.site.origin = rotatePoint(newData.site.origin, pivot!, angleDegrees);
            newData.site.rotation = ((newData.site.rotation || 0) + angleDegrees) % 360;
         }
      }
    });
    
    return { data: newData };
  }),

  duplicateSelection: (selection) => {
    let newSelection: SelectedItem[] = [];
    set((state) => {
      const genId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newData: IProject = JSON.parse(JSON.stringify(state.data));
      const idsMap = new Map<string, string>();
      
      const wallsToClone: IWall[] = [];
      const areasToClone: IArea[] = [];
      const openingsToClone: IOpening[] = [];
      const buildingsToClone: IBuilding[] = [];

      for (const item of selection) {
        if (item.type === 'building') {
          const b = newData.buildings?.find(x => x.id === item.id);
          if (b) buildingsToClone.push(b);
        }
      }

      const expandedSelection = expandSelection(selection, newData);

      for (const item of expandedSelection) {
        if (item.type === 'wall') {
          const w = newData.walls.find(x => x.id === item.id);
          if (w) wallsToClone.push(w);
        } else if (item.type === 'area') {
          const a = newData.areas.find(x => x.id === item.id);
          if (a) areasToClone.push(a);
        } else if (item.type === 'opening') {
          const o = newData.openings.find(x => x.id === item.id);
          if (o) openingsToClone.push(o);
        }
      }

      const clonedWallIds = new Set(wallsToClone.map(w => w.id));

      for (const w of wallsToClone) {
        const childOpenings = newData.openings.filter(o => o.wallId === w.id);
        for (const child of childOpenings) {
          if (!openingsToClone.find(o => o.id === child.id)) {
            openingsToClone.push(child);
          }
        }
      }

      const dx = 1;
      const dz = 1;

      // Map old building ID to new building ID
      const buildingIdMap = new Map<string, string>();
      const newBuildings = buildingsToClone.map(b => {
        const newId = genId('building');
        buildingIdMap.set(b.id, newId);
        newSelection.push({ id: newId, type: 'building' });
        return { ...b, id: newId };
      });
      if (newData.buildings) newData.buildings.push(...newBuildings);

      const newWalls = wallsToClone.map(w => {
        const newId = genId('wall');
        idsMap.set(w.id, newId);
        if (selection.find(s => s.id === w.id)) {
          newSelection.push({ id: newId, type: 'wall' });
        }
        return {
          ...w,
          id: newId,
          buildingId: w.buildingId ? buildingIdMap.get(w.buildingId) || w.buildingId : undefined,
          start: { x: w.start.x + dx, z: w.start.z + dz },
          end: { x: w.end.x + dx, z: w.end.z + dz }
        };
      });

      const newAreas = areasToClone.map(a => {
        const newId = genId('area');
        idsMap.set(a.id, newId);
        if (selection.find(s => s.id === a.id)) {
          newSelection.push({ id: newId, type: 'area' });
        }
        return {
          ...a,
          id: newId,
          buildingId: a.buildingId ? buildingIdMap.get(a.buildingId) || a.buildingId : undefined,
          points: a.points.map(p => ({ x: p.x + dx, z: p.z + dz }))
        };
      });

      const newOpenings = openingsToClone.map(o => {
        const newId = genId('opening');
        idsMap.set(o.id, newId);
        if (selection.find(s => s.id === o.id)) {
          newSelection.push({ id: newId, type: 'opening' });
        }

        let newOffset = o.offsetFromStart;
        let newWallId = o.wallId;

        if (clonedWallIds.has(o.wallId)) {
          newWallId = idsMap.get(o.wallId) || o.wallId;
        } else {
          newOffset += 1; 
        }

        return {
          ...o,
          id: newId,
          wallId: newWallId,
          buildingId: o.buildingId ? buildingIdMap.get(o.buildingId) || o.buildingId : undefined,
          offsetFromStart: newOffset
        };
      });

      newData.walls.push(...newWalls);
      newData.areas.push(...newAreas);
      newData.openings.push(...newOpenings);

      return { data: newData };
    });
    return newSelection;
  },

  alignSelection: (selection, type) => set((state) => {
    const newData: IProject = JSON.parse(JSON.stringify(state.data));

    const itemsBBoxes: { item: SelectedItem, bbox: any }[] = [];
    let globalMinX = Infinity, globalMaxX = -Infinity, globalMinZ = Infinity, globalMaxZ = -Infinity;

    for (const item of selection) {
      let points: {x: number, z: number}[] = [];
      if (item.type === 'wall') {
        const w = newData.walls.find(x => x.id === item.id);
        if (w) points = [w.start, w.end];
      } else if (item.type === 'area') {
        const a = newData.areas.find(x => x.id === item.id);
        if (a) points = a.points;
      } else if (item.type === 'opening') {
        const o = newData.openings.find(x => x.id === item.id);
        const w = o ? newData.walls.find(x => x.id === o.wallId) : undefined;
        if (o && w) {
          const startPt = getWallEndFromLength(w.start, w.end, o.offsetFromStart);
          const endPt = getWallEndFromLength(startPt, w.end, o.width);
          points = [startPt, endPt];
        }
      }
      
      if (points.length > 0) {
        const bbox = getBoundingBox(points);
        if (bbox) {
          itemsBBoxes.push({ item, bbox });
          if (bbox.minX < globalMinX) globalMinX = bbox.minX;
          if (bbox.maxX > globalMaxX) globalMaxX = bbox.maxX;
          if (bbox.minZ < globalMinZ) globalMinZ = bbox.minZ;
          if (bbox.maxZ > globalMaxZ) globalMaxZ = bbox.maxZ;
        }
      }
    }

    if (itemsBBoxes.length === 0) return state;

    const globalCenterX = (globalMinX + globalMaxX) / 2;
    const globalCenterZ = (globalMinZ + globalMaxZ) / 2;

    for (const { item, bbox } of itemsBBoxes) {
      let dx = 0;
      let dz = 0;
      const centerX = (bbox.minX + bbox.maxX) / 2;
      const centerZ = (bbox.minZ + bbox.maxZ) / 2;

      switch (type) {
        case 'left': dx = globalMinX - bbox.minX; break;
        case 'right': dx = globalMaxX - bbox.maxX; break;
        case 'centerX': dx = globalCenterX - centerX; break;
        case 'top': dz = globalMinZ - bbox.minZ; break;
        case 'bottom': dz = globalMaxZ - bbox.maxZ; break;
        case 'centerZ': dz = globalCenterZ - centerZ; break;
      }

      if (dx !== 0 || dz !== 0) {
        if (item.type === 'wall') {
          const w = newData.walls.find(x => x.id === item.id);
          if (w && !w.locked) {
            w.start.x += dx; w.start.z += dz;
            w.end.x += dx; w.end.z += dz;
          }
        } else if (item.type === 'area') {
          const a = newData.areas.find(x => x.id === item.id);
          if (a && !a.locked) {
            a.points = a.points.map(p => ({ x: p.x + dx, z: p.z + dz }));
          }
        } else if (item.type === 'opening') {
          const o = newData.openings.find(x => x.id === item.id);
          const w = o ? newData.walls.find(x => x.id === o.wallId) : undefined;
          if (o && w && !o.locked) {
            if (dx !== 0) o.offsetFromStart += dx * Math.sign(w.end.x - w.start.x || 1);
            else if (dz !== 0) o.offsetFromStart += dz * Math.sign(w.end.z - w.start.z || 1);
          }
        }
      }
    }
    return { data: newData };
  }),

  distributeSelection: (selection, type) => set((state) => {
    const newData: IProject = JSON.parse(JSON.stringify(state.data));

    const itemsData = selection.map(item => {
      let points: {x: number, z: number}[] = [];
      let refObj: any = null;
      if (item.type === 'wall') {
        const w = newData.walls.find(x => x.id === item.id);
        if (w && !w.locked) { points = [w.start, w.end]; refObj = w; }
      } else if (item.type === 'area') {
        const a = newData.areas.find(x => x.id === item.id);
        if (a && !a.locked) { points = a.points; refObj = a; }
      }
      return { item, refObj, bbox: points.length > 0 ? getBoundingBox(points) : null };
    }).filter(x => x.bbox && x.refObj);

    if (itemsData.length < 3) return state;

    if (type === 'horizontal') {
      itemsData.sort((a, b) => a.bbox.minX - b.bbox.minX);
      const totalWidth = itemsData[itemsData.length - 1].bbox.maxX - itemsData[0].bbox.minX;
      const elementsWidth = itemsData.reduce((sum, el) => sum + (el.bbox.maxX - el.bbox.minX), 0);
      const gap = (totalWidth - elementsWidth) / (itemsData.length - 1);
      
      let currentX = itemsData[0].bbox.maxX + gap;
      for (let i = 1; i < itemsData.length - 1; i++) {
        const el = itemsData[i];
        const dx = currentX - el.bbox.minX;
        if (el.item.type === 'wall') {
          el.refObj.start.x += dx; el.refObj.end.x += dx;
        } else if (el.item.type === 'area') {
          el.refObj.points = el.refObj.points.map((p: any) => ({ ...p, x: p.x + dx }));
        }
        currentX += (el.bbox.maxX - el.bbox.minX) + gap;
      }
    } else if (type === 'vertical') {
      itemsData.sort((a, b) => a.bbox.minZ - b.bbox.minZ);
      const totalHeight = itemsData[itemsData.length - 1].bbox.maxZ - itemsData[0].bbox.minZ;
      const elementsHeight = itemsData.reduce((sum, el) => sum + (el.bbox.maxZ - el.bbox.minZ), 0);
      const gap = (totalHeight - elementsHeight) / (itemsData.length - 1);
      
      let currentZ = itemsData[0].bbox.maxZ + gap;
      for (let i = 1; i < itemsData.length - 1; i++) {
        const el = itemsData[i];
        const dz = currentZ - el.bbox.minZ;
        if (el.item.type === 'wall') {
          el.refObj.start.z += dz; el.refObj.end.z += dz;
        } else if (el.item.type === 'area') {
          el.refObj.points = el.refObj.points.map((p: any) => ({ ...p, z: p.z + dz }));
        }
        currentZ += (el.bbox.maxZ - el.bbox.minZ) + gap;
      }
    }

    return { data: newData };
  }),

  mirrorSelection: (selection, axis) => set((state) => {
    const newData: IProject = JSON.parse(JSON.stringify(state.data));

    let globalMinX = Infinity, globalMaxX = -Infinity, globalMinZ = Infinity, globalMaxZ = -Infinity;
    let hasItems = false;

    for (const item of selection) {
      let points: {x: number, z: number}[] = [];
      if (item.type === 'wall') {
        const w = newData.walls.find(x => x.id === item.id);
        if (w) points = [w.start, w.end];
      } else if (item.type === 'area') {
        const a = newData.areas.find(x => x.id === item.id);
        if (a) points = a.points;
      }
      
      if (points.length > 0) {
        const bbox = getBoundingBox(points);
        if (bbox) {
          hasItems = true;
          if (bbox.minX < globalMinX) globalMinX = bbox.minX;
          if (bbox.maxX > globalMaxX) globalMaxX = bbox.maxX;
          if (bbox.minZ < globalMinZ) globalMinZ = bbox.minZ;
          if (bbox.maxZ > globalMaxZ) globalMaxZ = bbox.maxZ;
        }
      }
    }

    if (!hasItems) return state;

    const centerX = (globalMinX + globalMaxX) / 2;
    const centerZ = (globalMinZ + globalMaxZ) / 2;

    for (const item of selection) {
      if (item.type === 'wall') {
        const w = newData.walls.find(x => x.id === item.id);
        if (w && !w.locked) {
          if (axis === 'horizontal') {
            w.start.x = centerX + (centerX - w.start.x);
            w.end.x = centerX + (centerX - w.end.x);
          } else {
            w.start.z = centerZ + (centerZ - w.start.z);
            w.end.z = centerZ + (centerZ - w.end.z);
          }
        }
      } else if (item.type === 'area') {
        const a = newData.areas.find(x => x.id === item.id);
        if (a && !a.locked) {
          a.points = a.points.map(p => ({
            x: axis === 'horizontal' ? centerX + (centerX - p.x) : p.x,
            z: axis === 'vertical' ? centerZ + (centerZ - p.z) : p.z
          }));
        }
      }
    }
    return { data: newData };
  }),

  setProject: (project) => set({ data: project, past: [], future: [] }),
  
  updateSite: (updates) => set((state) => ({
    data: { ...state.data, site: { ...state.data.site, ...updates } }
  })),

  deleteSite: () => set((state) => ({
    data: { ...state.data, site: { ...state.data.site, width: 0, depth: 0, visible: false } }
  })),

  updateBuilding: (updates) => set((state) => ({
    data: { 
      ...state.data, 
      buildings: (state.data.buildings || []).map(b => b.id === updates.id ? { ...b, ...updates } : b) 
    }
  })),

  deleteBuilding: (id) => set((state) => {
    // Delete building and clear buildingId from all its children
    const newData = JSON.parse(JSON.stringify(state.data));
    newData.buildings = (newData.buildings || []).filter((b: IBuilding) => b.id !== id);
    newData.walls.forEach((w: IWall) => { if (w.buildingId === id) delete w.buildingId; });
    newData.areas.forEach((a: IArea) => { if (a.buildingId === id) delete a.buildingId; });
    if (newData.openings) newData.openings.forEach((o: IOpening) => { if (o.buildingId === id) delete o.buildingId; });
    if (newData.annotations) newData.annotations.forEach((a: any) => { if (a.buildingId === id) delete a.buildingId; });
    if (newData.roofs) newData.roofs = newData.roofs.filter((r: IRoof) => r.buildingId !== id);
    return { data: newData };
  }),

  createBuildingFromSelection: (selection) => set((state) => {
    if (!selection || selection.length === 0) return state;
    
    const newBuildingId = 'building_' + Date.now();
    const newBuilding: IBuilding = {
      id: newBuildingId,
      name: 'Tòa nhà mới',
      rotation: 0,
      createdAt: Date.now()
    };

    const newData = JSON.parse(JSON.stringify(state.data));
    newData.buildings = newData.buildings || [];
    newData.buildings.push(newBuilding);

    // Assign buildingId to all items in selection
    selection.forEach(item => {
      if (item.type === 'wall') {
        const w = newData.walls.find((x: IWall) => x.id === item.id);
        if (w) {
           w.buildingId = newBuildingId;
           // Auto-assign child openings to the building
           if (newData.openings) {
             newData.openings.forEach((o: IOpening) => {
               if (o.wallId === w.id) o.buildingId = newBuildingId;
             });
           }
        }
      } else if (item.type === 'area') {
        const a = newData.areas.find((x: IArea) => x.id === item.id);
        if (a) a.buildingId = newBuildingId;
      } else if (item.type === 'opening' || item.type === 'door' || item.type === 'window') {
        const o = newData.openings?.find((x: IOpening) => x.id === item.id);
        if (o) o.buildingId = newBuildingId;
      }
    });

    const dirty = new Set<string>();
    dirty.add(newBuildingId);
    recomputeBuildingFootprints(newData, dirty);

    return { data: newData };
  }),

  ungroupBuilding: (buildingId) => set((state) => {
    const newData = JSON.parse(JSON.stringify(state.data));
    newData.buildings = (newData.buildings || []).filter((b: IBuilding) => b.id !== buildingId);
    
    newData.walls.forEach((w: IWall) => { if (w.buildingId === buildingId) delete w.buildingId; });
    newData.areas.forEach((a: IArea) => { if (a.buildingId === buildingId) delete a.buildingId; });
    if (newData.openings) newData.openings.forEach((o: IOpening) => { if (o.buildingId === buildingId) delete o.buildingId; });
    if (newData.annotations) newData.annotations.forEach((a: any) => { if (a.buildingId === buildingId) delete a.buildingId; });
    if (newData.roofs) newData.roofs = newData.roofs.filter((r: IRoof) => r.buildingId !== buildingId);
    
    return { data: newData };
  }),

  addWall: (wall) => set((state) => ({
    data: { ...state.data, walls: [...state.data.walls, wall] }
  })),

  updateWall: (id, updates) => set((state) => {
    const existingWall = state.data.walls.find(w => w.id === id);
    if (existingWall?.locked && updates.locked !== false) return state; // Chặn nếu đang khoá (trừ khi đang mở khoá)
    
    const oldWalls = state.data.walls;
    const oldAreas = state.data.areas;
    
    // 1. Detect constraints before changes
    const constraints = buildAreaConstraints(oldAreas, oldWalls);

    // 2. Apply updates to the specific wall
    const newWalls = oldWalls.map(w => w.id === id ? { ...w, ...updates } : w);

    // 3. Resolve constraints using new wall geometry
    const newAreas = resolveAreaConstraints(oldAreas, newWalls, constraints);

    const newData = { 
      ...state.data, 
      walls: newWalls,
      areas: newAreas
    };
    const dirty = new Set<string>();
    const w = newWalls.find(w => w.id === id);
    if (w && w.buildingId) dirty.add(w.buildingId);
    recomputeBuildingFootprints(newData, dirty);

    return { data: newData };
  }),

  updateConnectedWallEndpoints: (updates) => set((state) => {
    const oldWalls = state.data.walls;
    const oldAreas = state.data.areas;

    // 1. Detect constraints before changes
    const constraints = buildAreaConstraints(oldAreas, oldWalls);

    const wallMap = new Map<string, Partial<IWall>>();
    updates.forEach(u => {
      if (!wallMap.has(u.wallId)) wallMap.set(u.wallId, {});
      wallMap.get(u.wallId)![u.type] = u.point;
    });
    
    const newWalls = oldWalls.map(w => {
      if (wallMap.has(w.id)) {
        if (w.locked) return w; // Không cho phép thay đổi toạ độ nếu tường bị khoá
        return { ...w, ...wallMap.get(w.id) };
      }
      return w;
    });

    // 3. Resolve constraints using new wall geometry
    const newAreas = resolveAreaConstraints(oldAreas, newWalls, constraints);

    const newData = {
      ...state.data,
      walls: newWalls,
      areas: newAreas
    };
    const dirty = new Set<string>();
    updates.forEach(u => {
      const w = newWalls.find(w => w.id === u.wallId);
      if (w && w.buildingId) dirty.add(w.buildingId);
    });
    recomputeBuildingFootprints(newData, dirty);

    return { data: newData };
  }),

  deleteWall: (id) => set((state) => {
    const existingWall = state.data.walls.find(w => w.id === id);
    if (existingWall?.locked) return state; // Chặn xoá nếu đang khoá

    const oldWalls = state.data.walls;
    const oldAreas = state.data.areas;

    // 1. Detect constraints before changes
    const constraints = buildAreaConstraints(oldAreas, oldWalls);

    const newWalls = oldWalls.filter(w => w.id !== id);

    // 3. Resolve constraints using new wall geometry
    const newAreas = resolveAreaConstraints(oldAreas, newWalls, constraints);

    const newData = { 
      ...state.data, 
      walls: newWalls,
      areas: newAreas,
      openings: (state.data.openings || []).filter(o => o.wallId !== id)
    };
    const dirty = new Set<string>();
    const w = oldWalls.find(w => w.id === id);
    if (w && w.buildingId) dirty.add(w.buildingId);
    recomputeBuildingFootprints(newData, dirty);

    return { data: newData };
  }),

  addArea: (area) => set((state) => ({
    data: { ...state.data, areas: [...state.data.areas, area] }
  })),

  updateArea: (id, updates) => set((state) => {
    const existingArea = state.data.areas.find(a => a.id === id);
    if (existingArea?.locked && updates.locked !== false) return state;
    
    return {
    data: { 
      ...state.data, 
      areas: state.data.areas.map(a => a.id === id ? { ...a, ...updates } : a) 
    }
    };
  }),

  insertAreaPoint: (id, edgeIndex, point) => set((state) => ({
    data: {
      ...state.data,
      areas: state.data.areas.map(a => {
        if (a.id === id) {
          const newPoints = [...a.points];
          newPoints.splice(edgeIndex + 1, 0, point);
          return { ...a, points: newPoints };
        }
        return a;
      })
    }
  })),

  deleteArea: (id) => set((state) => {
    const existingArea = state.data.areas.find(a => a.id === id);
    if (existingArea?.locked) return state;

    return {
      data: { ...state.data, areas: state.data.areas.filter(a => a.id !== id) }
    };
  }),

  addOpening: (opening) => set((state) => ({
    data: { ...state.data, openings: [...(state.data.openings || []), opening] }
  })),

  updateOpening: (id, updates) => set((state) => {
    const existingOpening = state.data.openings?.find(o => o.id === id);
    if (existingOpening?.locked && updates.locked !== false) return state;

    return {
      data: {
        ...state.data,
        openings: (state.data.openings || []).map(o => o.id === id ? { ...o, ...updates } : o)
      }
    };
  }),

  deleteOpening: (id) => set((state) => {
    const existingOpening = state.data.openings?.find(o => o.id === id);
    if (existingOpening?.locked) return state;

    return {
      data: {
        ...state.data,
        openings: (state.data.openings || []).filter(o => o.id !== id)
      }
    };
  }),

  addRoof: (roof) => set((state) => ({
    data: { ...state.data, roofs: [...(state.data.roofs || []), roof] }
  })),

  updateRoof: (id, updates) => set((state) => {
    const existingRoof = state.data.roofs?.find(r => r.id === id);
    if (existingRoof?.locked && updates.locked !== false) return state;

    return {
      data: {
        ...state.data,
        roofs: (state.data.roofs || []).map(r => r.id === id ? { ...r, ...updates } : r)
      }
    };
  }),

  deleteRoof: (id) => set((state) => {
    const existingRoof = state.data.roofs?.find(r => r.id === id);
    if (existingRoof?.locked) return state;

    return {
      data: {
        ...state.data,
        roofs: (state.data.roofs || []).filter(r => r.id !== id)
      }
    };
  }),

  addAnnotation: (annotation) => set((state) => ({
    data: { ...state.data, annotations: [...(state.data.annotations || []), annotation] }
  })),

  updateAnnotation: (id, updates) => set((state) => {
    const existingAnnotation = state.data.annotations?.find(a => a.id === id);
    if (existingAnnotation?.locked && updates.locked !== false) return state;

    return {
      data: {
        ...state.data,
        annotations: (state.data.annotations || []).map(a => a.id === id ? { ...a, ...updates } : a)
      }
    };
  }),

  deleteAnnotation: (id) => set((state) => {
    const existingAnnotation = state.data.annotations?.find(a => a.id === id);
    if (existingAnnotation?.locked) return state;

    return {
      data: {
        ...state.data,
        annotations: (state.data.annotations || []).filter(a => a.id !== id)
      }
    };
  }),
    }),
    {
      name: 'garden-house-project-storage',
      partialize: (state) => ({ data: state.data }),
    }
  )
);
