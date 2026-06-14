import { create } from 'zustand';
import { IValidationIssue, SelectedItem } from '../types';

interface UIState {
  themeMode: 'light' | 'dark';
  mode: 'select' | 'addSite' | 'addWall' | 'addArea' | 'addDoor' | 'addWindow' | 'measure';
  selectedObjectId: string | null;
  selectedObjectType: 'site' | 'building' | 'wall' | 'area' | 'opening' | 'dimension' | null;
  selectedItems: SelectedItem[];
  marqueeStart: { x: number; z: number } | null;
  marqueeEnd: { x: number; z: number } | null;
  toolDefaults: {
    wall: { thickness: number; height: number; levelId: string; layer: string; justification: 'center' | 'left' | 'right' };
    area: { name: string; type: string; layer: string };
    door: { width: number; height: number; sillHeight: number; hingeSide: 'left' | 'right'; openDirection: 'inward' | 'outward'; swingAngle: number };
    window: { width: number; height: number; sillHeight: number; hingeSide: 'left' | 'right'; openDirection: 'inward' | 'outward'; swingAngle: number };
    measure: { mode: 'pointToPoint', wallMeasureMode: 'centerline' | 'innerFace' | 'outerFace' | 'thickness', offsetDistance: number };
  };
  validationIssues: IValidationIssue[];
  snapToGrid: boolean;
  creationSnapToGrid: boolean;
  snapToPoints: boolean;
  orthoMode: boolean;
  showAlignmentGuides: boolean;
  gridMinorStep: number;
  gridMajorStep: number;
  snapTolerancePx: number;
  viewMode: '2d' | '3d' | 'split';
  show3DSite: boolean;
  show3DRooms: boolean;
  show3DWalls: boolean;
  show3DGrid: boolean;
  show3DOpenings: boolean;
  cameraMode: 'perspective' | 'top';
  
  showAreaName: boolean;
  showAreaArea: boolean;
  showManualDimensions: boolean;
  showOpeningLabels: boolean;
  showGrid2D: boolean;
  activeGuides: { type: 'horizontal' | 'vertical', pos: number }[];
  activeSnapPoint: { x: number; y: number; type: string; label?: string; priority?: number; wallThickness?: number; wallJustification?: 'center' | 'left' | 'right' } | null;
  
  setThemeMode: (mode: 'light' | 'dark') => void;
  toggleThemeMode: () => void;
  setMode: (mode: 'select' | 'addSite' | 'addWall' | 'addArea' | 'addDoor' | 'addWindow' | 'measure') => void;
  setSelectedObject: (id: string | null, type: 'site' | 'building' | 'wall' | 'area' | 'opening' | 'dimension' | null) => void;
  setSelectedItems: (items: SelectedItem[]) => void;
  setMarquee: (start: { x: number; z: number } | null, end: { x: number; z: number } | null) => void;
  setToolDefaults: (tool: 'wall' | 'area' | 'door' | 'window' | 'measure', defaults: any) => void;
  setValidationIssues: (issues: IValidationIssue[]) => void;
  setActiveGuides: (guides: { type: 'horizontal' | 'vertical', pos: number }[]) => void;
  setActiveSnapPoint: (point: { x: number; y: number; type: string; label?: string; priority?: number; wallThickness?: number; wallJustification?: 'center' | 'left' | 'right' } | null) => void;
  setDraftingToggle: (key: 'showGrid2D' | 'snapToGrid' | 'creationSnapToGrid' | 'snapToPoints' | 'orthoMode' | 'showAlignmentGuides', val: boolean) => void;
  setViewMode: (mode: '2d' | '3d' | 'split') => void;
  setCameraMode: (mode: 'perspective' | 'top') => void;
  setShowAreaName: (showAreaName: boolean) => void;
  setShowAreaArea: (showAreaArea: boolean) => void;
  setShowAlignmentGuides: (showAlignmentGuides: boolean) => void;
  toggle3DLayer: (layer: 'site' | 'areas' | 'walls' | 'grid' | 'openings') => void;
  toggle2DDisplay: (key: 'areaName' | 'areaArea' | 'manualDim' | 'openingLabel') => void;
}

const getInitialTheme = (): 'light' | 'dark' => {
  const saved = localStorage.getItem('garden_house_3d_theme');
  if (saved === 'dark' || saved === 'light') return saved;
  return 'light';
};

export const useUIStore = create<UIState>((set) => ({
  themeMode: getInitialTheme(),
  mode: 'select',
  selectedObjectId: null,
  selectedObjectType: null,
  selectedItems: [],
  marqueeStart: null,
  marqueeEnd: null,
  toolDefaults: {
    wall: { thickness: 0.2, height: 3.6, levelId: 'level_1', layer: 'walls', justification: 'center' },
    area: { name: '', type: 'custom_area', layer: 'areas' },
    door: { width: 0.9, height: 2.2, sillHeight: 0, hingeSide: 'left', openDirection: 'inward', swingAngle: 90 },
    window: { width: 1.4, height: 1.2, sillHeight: 0.9, hingeSide: 'left', openDirection: 'inward', swingAngle: 0 },
    measure: { mode: 'pointToPoint', wallMeasureMode: 'centerline', offsetDistance: 0.6 }
  },
  validationIssues: [],
  snapToGrid: false,
  creationSnapToGrid: true,
  snapToPoints: true,
  orthoMode: false,
  showAreaName: true,
  showAreaArea: true,
  showAlignmentGuides: true,
  gridMinorStep: 0.2,
  gridMajorStep: 1.0,
  snapTolerancePx: 12,
  activeGuides: [],
  activeSnapPoint: null,
  viewMode: '2d',
  show3DSite: true,
  show3DRooms: true,
  show3DWalls: true,
  show3DGrid: true,
  show3DOpenings: true,
  showManualDimensions: true,
  showOpeningLabels: true,
  showGrid2D: true,
  cameraMode: 'perspective',
  setThemeMode: (mode) => {
    localStorage.setItem('garden_house_3d_theme', mode);
    set({ themeMode: mode });
  },
  toggleThemeMode: () => set((state) => {
    const newMode = state.themeMode === 'light' ? 'dark' : 'light';
    localStorage.setItem('garden_house_3d_theme', newMode);
    return { themeMode: newMode };
  }),
  setMode: (mode) => set({ mode, selectedObjectId: null, selectedObjectType: null, selectedItems: [], marqueeStart: null, marqueeEnd: null }),
  setSelectedObject: (id, type) => set({ selectedObjectId: id, selectedObjectType: type }),
  setSelectedItems: (items) => set({ selectedItems: items }),
  setMarquee: (start, end) => set({ marqueeStart: start, marqueeEnd: end }),
  setToolDefaults: (tool, defaults) => set((state) => ({ toolDefaults: { ...state.toolDefaults, [tool]: { ...(state.toolDefaults as any)[tool], ...defaults } } })),
  setValidationIssues: (issues) => set({ validationIssues: issues }),
  setActiveGuides: (guides) => set({ activeGuides: guides }),
  setActiveSnapPoint: (point) => set({ activeSnapPoint: point }),
  setDraftingToggle: (key, val) => set({ [key]: val }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setCameraMode: (mode) => set({ cameraMode: mode }),
  setShowAreaName: (showAreaName) => set({ showAreaName }),
  setShowAreaArea: (showAreaArea) => set({ showAreaArea }),
  setShowAlignmentGuides: (showAlignmentGuides) => set({ showAlignmentGuides }),
  toggle3DLayer: (layer) => set((state) => {
    switch (layer) {
      case 'site': return { show3DSite: !state.show3DSite };
      case 'areas': return { show3DRooms: !state.show3DRooms };
      case 'walls': return { show3DWalls: !state.show3DWalls };
      case 'grid': return { show3DGrid: !state.show3DGrid };
      case 'openings': return { show3DOpenings: !state.show3DOpenings };
    }
    return state;
  }),
  toggle2DDisplay: (key) => set((state) => {
    switch (key) {
      case 'areaName': return { showAreaName: !state.showAreaName };
      case 'areaArea': return { showAreaArea: !state.showAreaArea };
      case 'manualDim': return { showManualDimensions: !state.showManualDimensions };
      case 'openingLabel': return { showOpeningLabels: !state.showOpeningLabels };
    }
    return state;
  })
}));
