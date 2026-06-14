import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { IProject, ISite, IBuilding, IWall, IArea, IOpening, SelectedItem } from '../types';
import { createDefaultProject } from '../core/project/createDefaultProject';

interface ProjectState {
  data: IProject;
  setProject: (project: IProject) => void;
  updateSite: (updates: Partial<ISite>) => void;
  deleteSite: () => void;
  updateBuilding: (updates: Partial<IBuilding>) => void;
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
  addAnnotation: (annotation: any) => void;
  updateAnnotation: (id: string, updates: any) => void;
  deleteAnnotation: (id: string) => void;
  deleteAnnotation: (id: string) => void;

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
    
    // Calculate new positions based on snapshot
    for (const item of items) {
      if (item.kind === 'site') {
        if (newData.site && newData.site.origin) {
          newData.site.origin.x += deltaX;
          newData.site.origin.z += deltaZ;
        }
      } else if (item.kind === 'wall') {
        const wall = newData.walls.find(w => w.id === item.wallId);
        if (wall) {
          wall.start.x += deltaX; wall.start.z += deltaZ;
          wall.end.x += deltaX; wall.end.z += deltaZ;
        }
      } else if (item.kind === 'wallEndpoint') {
        const wall = newData.walls.find(w => w.id === item.wallId);
        if (wall) {
           if (item.endpoint === 'start') {
              wall.start.x += deltaX; wall.start.z += deltaZ;
           } else {
              wall.end.x += deltaX; wall.end.z += deltaZ;
           }
        }
      } else if (item.kind === 'area') {
        const area = newData.areas.find(a => a.id === item.areaId);
        if (area) {
           for (const p of area.points) {
              p.x += deltaX; p.z += deltaZ;
           }
        }
      } else if (item.kind === 'areaVertex') {
        const area = newData.areas.find(a => a.id === item.areaId);
        if (area && area.points[item.pointIndex]) {
           area.points[item.pointIndex].x += deltaX;
           area.points[item.pointIndex].z += deltaZ;
        }
      } else if (item.kind === 'dimension') {
        const dim = newData.annotations?.find(a => a.id === item.annotationId);
        if (dim && dim.type === 'dimension') {
           dim.start.x += deltaX; dim.start.z += deltaZ;
           dim.end.x += deltaX; dim.end.z += deltaZ;
        }
      } else if (item.kind === 'dimensionEndpoint') {
        const dim = newData.annotations?.find(a => a.id === item.annotationId);
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
        past: [...state.past, clonedPast].slice(-50), 
        future: [],
        groupDragSnapshot: null 
      };
    }
    return { groupDragSnapshot: null };
  }),

  setProject: (project) => set({ data: project, past: [], future: [] }),
  
  updateSite: (updates) => set((state) => ({
    data: { ...state.data, site: { ...state.data.site, ...updates } }
  })),

  deleteSite: () => set((state) => ({
    data: { ...state.data, site: { ...state.data.site, width: 0, depth: 0, visible: false } }
  })),

  updateBuilding: (updates) => set((state) => ({
    data: { ...state.data, building: { ...state.data.building, ...updates } }
  })),

  addWall: (wall) => set((state) => ({
    data: { ...state.data, walls: [...state.data.walls, wall] }
  })),

  updateWall: (id, updates) => set((state) => ({
    data: { 
      ...state.data, 
      walls: state.data.walls.map(w => w.id === id ? { ...w, ...updates } : w) 
    }
  })),

  updateConnectedWallEndpoints: (updates) => set((state) => {
    const wallMap = new Map<string, Partial<IWall>>();
    updates.forEach(u => {
      if (!wallMap.has(u.wallId)) wallMap.set(u.wallId, {});
      wallMap.get(u.wallId)![u.type] = u.point;
    });
    
    return {
      data: {
        ...state.data,
        walls: state.data.walls.map(w => {
          if (wallMap.has(w.id)) {
            return { ...w, ...wallMap.get(w.id) };
          }
          return w;
        })
      }
    };
  }),

  deleteWall: (id) => set((state) => ({
    data: { 
      ...state.data, 
      walls: state.data.walls.filter(w => w.id !== id),
      openings: (state.data.openings || []).filter(o => o.wallId !== id)
    }
  })),

  addArea: (area) => set((state) => ({
    data: { ...state.data, areas: [...state.data.areas, area] }
  })),

  updateArea: (id, updates) => set((state) => ({
    data: { 
      ...state.data, 
      areas: state.data.areas.map(a => a.id === id ? { ...a, ...updates } : a) 
    }
  })),

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

  deleteArea: (id) => set((state) => ({
    data: { 
      ...state.data, 
      areas: state.data.areas.filter(a => a.id !== id) 
    }
  })),

  addOpening: (opening) => set((state) => ({
    data: { ...state.data, openings: [...(state.data.openings || []), opening] }
  })),

  updateOpening: (id, updates) => set((state) => ({
    data: { 
      ...state.data, 
      openings: (state.data.openings || []).map(o => o.id === id ? { ...o, ...updates } : o) 
    }
  })),

  deleteOpening: (id) => set((state) => ({
    data: { ...state.data, openings: (state.data.openings || []).filter(o => o.id !== id) }
  })),

  addAnnotation: (annotation) => set((state) => ({
    data: { ...state.data, annotations: [...(state.data.annotations || []), annotation] }
  })),

  updateAnnotation: (id, updates) => set((state) => ({
    data: { 
      ...state.data, 
      annotations: (state.data.annotations || []).map(a => a.id === id ? { ...a, ...updates } : a) 
    }
  })),

  deleteAnnotation: (id) => set((state) => ({
    data: { ...state.data, annotations: (state.data.annotations || []).filter(a => a.id !== id) }
  })),
    }),
    {
      name: 'garden-house-project-storage',
      partialize: (state) => ({ data: state.data }),
    }
  )
);
