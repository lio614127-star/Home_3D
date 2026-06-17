import React, { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Line, Rect, Text, Group, Circle } from 'react-konva';
import { useProjectStore } from '../../store/useProjectStore';
import { useUIStore } from '../../store/useUIStore';
import { SiteLayer } from './SiteLayer';
import { BuildingLayer } from './BuildingLayer';
import { WallLayer } from './WallLayer';
import { AreaLayer, AreaHandles } from './AreaLayer';
import { OpeningLayer } from './OpeningLayer';
import { DimensionLayer, DimensionCAD } from './DimensionLayer';
import { GridLayer } from './GridLayer';
import { GuideLayer } from './GuideLayer';
import { canvasToProject, projectToCanvas, rectContainsPoint, rectIntersectsSegment, rectIntersectsPolygon, getWallLength, getWallCenterline, getWallRenderLine, RectProject, getMeasureSnapCandidates, MeasureCandidate, formatMeters, formatArea, formatSize, normalizeCoord } from '../../core/geometry/math';
import { resolveBestSnap, SnapCandidate } from '../../core/geometry/snap';
import { SelectedItem } from '../../types';
import { useI18nStore } from '../../store/useI18nStore';
import { useTheme } from '../../theme/tokens';
import { WORKSPACE_WIDTH, WORKSPACE_DEPTH } from '../../core/config/workspace';

export const Canvas2D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const PX_PER_METER = 20;
  const [zoom, setZoom] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const initRef = useRef(false);
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  
  const project = useProjectStore(state => state.data);
  const addWall = useProjectStore(state => state.addWall);
  const addArea = useProjectStore(state => state.addArea);
  const addAnnotation = useProjectStore(state => state.addAnnotation);
  
  const { setSelectedObject, selectedObjectId, selectedObjectType, mode, snapToGrid, snapToPoints, orthoMode, gridMinorStep, gridMajorStep, snapTolerancePx, setMode, show3DOpenings, showGrid2D, marqueeStart, marqueeEnd } = useUIStore();
  const { t } = useI18nStore();

  // Separate state for each drawing tool
  const [wallChainAnchor, setWallChainAnchor] = useState<{x: number, z: number} | null>(null);
  const [measureDraftStart, setMeasureDraftStart] = useState<{x: number, z: number} | null>(null);
  const [measureDraftEnd, setMeasureDraftEnd] = useState<{x: number, z: number} | null>(null);
  const [areaDraftStart, setAreaDraftStart] = useState<{x: number, z: number} | null>(null);
  const [siteDraftStart, setSiteDraftStart] = useState<{x: number, z: number} | null>(null);
  const [mousePos, setMousePos] = useState<{x: number, z: number} | null>(null);
  const snappedPointerRef = useRef<{x: number, z: number, type?: SnapCandidate['type']} | null>(null);
  const [lastSnapType, setLastSnapType] = useState<SnapCandidate['type'] | undefined>(undefined);
  const [measureCandidate, setMeasureCandidate] = useState<MeasureCandidate | null>(null);
  const [globalDrag, setGlobalDrag] = useState<{ startX: number, startZ: number, isDragging: boolean } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpaceDown(e.type === 'keydown');
      if (e.type === 'keydown' && (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey))) {
        if ((e.target instanceof HTMLInputElement && (e.target.type === 'text' || e.target.type === 'number')) || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).isContentEditable) return;
        e.preventDefault();
        if (e.shiftKey) {
          useProjectStore.getState().redo();
        } else {
          useProjectStore.getState().undo();
        }
      }
      
      if (e.type === 'keydown' && (e.code === 'KeyY' && (e.ctrlKey || e.metaKey))) {
        if ((e.target instanceof HTMLInputElement && (e.target.type === 'text' || e.target.type === 'number')) || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).isContentEditable) return;
        e.preventDefault();
        useProjectStore.getState().redo();
      }

      if (e.type === 'keydown' && (e.code === 'Delete' || e.code === 'Backspace')) {
        if ((e.target instanceof HTMLInputElement && (e.target.type === 'text' || e.target.type === 'number')) || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).isContentEditable) return;
        
        const { selectedObjectId, selectedObjectType, setSelectedObject, selectedItems, setSelectedItems } = useUIStore.getState();
        
        let deletedAny = false;

        if (selectedItems && selectedItems.length > 0) {
          useProjectStore.getState().commitHistory();
          selectedItems.forEach(item => {
            if (item.kind === 'site') useProjectStore.getState().deleteSite();
            if (item.kind === 'wall') useProjectStore.getState().deleteWall(item.wallId);
            if (item.kind === 'area') useProjectStore.getState().deleteArea(item.areaId);
            if (item.kind === 'opening') useProjectStore.getState().deleteOpening(item.openingId);
            if (item.kind === 'dimension') useProjectStore.getState().deleteAnnotation(item.annotationId);
          });
          setSelectedItems([]);
          deletedAny = true;
        }

        if (selectedObjectId && selectedObjectType) {
          if (!deletedAny) useProjectStore.getState().commitHistory();
          if (selectedObjectType === 'site') useProjectStore.getState().deleteSite();
          if (selectedObjectType === 'wall') useProjectStore.getState().deleteWall(selectedObjectId);
          if (selectedObjectType === 'area') useProjectStore.getState().deleteArea(selectedObjectId);
          if (selectedObjectType === 'opening') useProjectStore.getState().deleteOpening(selectedObjectId);
          if (selectedObjectType === 'dimension') useProjectStore.getState().deleteAnnotation(selectedObjectId);
          deletedAny = true;
        }
        
        if (deletedAny) {
          setSelectedObject(null, null);
        }
      }
      
      if (e.type === 'keydown' && (e.key === 'Escape' || e.key === 'Esc')) {
        const { setMode, setSelectedObject, setSelectedItems, setActiveGuides } = useUIStore.getState();
        setMode('select');
        setWallChainAnchor(null);
        setMeasureChainAnchor(null);
        setAreaDraftStart(null);
        setSiteDraftStart(null);
        setMousePos(null);
        setSelectedObject(null, null);
        setSelectedItems([]);
        setActiveGuides([]);
      }
      
      if (e.type === 'keydown' && e.code === 'Tab') {
        if ((e.target instanceof HTMLInputElement && (e.target.type === 'text' || e.target.type === 'number')) || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).isContentEditable) return;
        e.preventDefault();
        const { mode, setMode } = useUIStore.getState();
        if (mode !== 'measure') {
          setMode('measure');
        } else {
          setMode('select');
        }
      }

      if (e.type === 'keydown' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).isContentEditable) return;
        const { setMode, viewMode, setViewMode } = useUIStore.getState();
        if (e.code === 'Digit1') setMode('addSite');
        if (e.code === 'Digit2') setMode('addWall');
        if (e.code === 'Digit3') setMode('addArea');
        if (e.code === 'Digit4') setMode('addDoor');
        if (e.code === 'Digit5') setMode('addWindow');
        if (e.code === 'KeyQ') {
           e.preventDefault();
           if (viewMode === '2d') setViewMode('3d');
           else if (viewMode === '3d') setViewMode('split');
           else setViewMode('2d');
        }
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); };
  }, [mode, selectedObjectId, selectedObjectType]);

  useEffect(() => {
    if (dimensions.width && !initRef.current) {
      setStagePos({
        x: (dimensions.width - (WORKSPACE_WIDTH * PX_PER_METER)) / 2,
        y: (dimensions.height - (WORKSPACE_DEPTH * PX_PER_METER)) / 2,
      });
      initRef.current = true;
    }
  }, [dimensions.width, dimensions.height]);

  // Clear area draft when mode changes away from addArea
  useEffect(() => {
    if (mode !== 'addArea') {
      setAreaDraftStart(null);
    }
  }, [mode]);

  const theme = useTheme();

  const getProjectCoords = (e: any): {x: number, z: number} | null => {
    const stage = e.target.getStage();
    const point = stage?.getPointerPosition();
    if (!stage || !point) return null;
    
    const layerGroup = stage.children[0].children[0];
    const transform = layerGroup.getAbsoluteTransform().copy().invert();
    const localPos = transform.point(point);
    const rawProjX = localPos.x / PX_PER_METER;
    const rawProjZ = localPos.y / PX_PER_METER;

    const currentMode = useUIStore.getState().mode;
    if (currentMode === 'select') {
      return { x: rawProjX, z: rawProjZ }; // In select mode, rely on raw pointer or hit testing
    }

    // Synchronously resolve draft snap point
    const dynamicGridMinorStep = zoom >= 1.5 ? 0.25 : 0.5;

    const bypassSnap = e.evt?.altKey;
    if (bypassSnap) {
      return { x: rawProjX, z: rawProjZ };
    }

    const snapState = resolveBestSnap(rawProjX, rawProjZ, project, {
      snapToGrid: snapToGrid,
      snapToPoints,
      orthoMode: orthoMode || e.evt?.shiftKey,
      gridMinorStep: dynamicGridMinorStep,
      scale: PX_PER_METER * zoom,
      startPoint: currentMode === 'addWall' ? (wallChainAnchor || undefined) : (currentMode === 'measure' ? (measureDraftStart && !measureDraftEnd ? measureDraftStart : undefined) : undefined)
    });

    return { x: snapState.x, z: snapState.z };
  };

  const hitTestSelectedItems = (projX: number, projZ: number, selectedItems: SelectedItem[]): boolean => {
    const hitRadius = 0.5; // half meter detection radius
    const rect: RectProject = { minX: projX - hitRadius, maxX: projX + hitRadius, minZ: projZ - hitRadius, maxZ: projZ + hitRadius };
    for (const item of selectedItems) {
       if (item.kind === 'wall') {
          const w = project.walls.find(w => w.id === item.wallId);
          if (w && rectIntersectsSegment(rect, w.start, w.end)) return true;
       }
       if (item.kind === 'area') {
          const a = project.areas.find(a => a.id === item.areaId);
          if (a && rectIntersectsPolygon(rect, a.points)) return true;
       }
    }
    return false;
  };

  const handlePointerDown = (e: any) => {
    if (isSpaceDown) return;
    
    if (mode === 'select') {
      const coords = getProjectCoords(e);
      if (!coords) return;
      
      const isBackground = e.target === e.target.getStage();
      const items = useUIStore.getState().selectedItems;
      
      if (items.length > 1 && !isBackground) {
         if (hitTestSelectedItems(coords.x, coords.z, items)) {
             setGlobalDrag({ startX: coords.x, startZ: coords.z, isDragging: true });
             useProjectStore.getState().startGroupDrag();
             return;
         }
      }
      
      if (isBackground && !isSpaceDown) {
        useUIStore.getState().setSelectedObject(null, null);
        useUIStore.getState().setSelectedItems([]);
        useUIStore.getState().setMarquee(coords, coords);
      }
    }
  };

  const handlePointerMove = (e: any) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const point = stage.getPointerPosition();
    if (!point) return;

    const layerGroup = stage.children[0].children[0];
    const transform = layerGroup.getAbsoluteTransform().copy().invert();
    const localPos = transform.point(point);
    const rawProjX = localPos.x / PX_PER_METER;
    const rawProjZ = localPos.y / PX_PER_METER;

    const currentMode = useUIStore.getState().mode;
    
    // Adaptive grid step: zoom >= 1.5 -> 0.25m, else 0.5m
    const dynamicGridMinorStep = zoom >= 1.5 ? 0.25 : 0.5;
    
    // === Handle Global Drag ===
    if (globalDrag?.isDragging) {
      const rawDeltaX = rawProjX - globalDrag.startX;
      const rawDeltaZ = rawProjZ - globalDrag.startZ;
      
      const bypassSnap = e.evt.altKey;
      let finalDeltaX = rawDeltaX;
      let finalDeltaZ = rawDeltaZ;
      let guides: any[] = [];
      let snapType = null;
               
      if (!bypassSnap) {
          const snapState = resolveBestSnap(rawProjX, rawProjZ, project, {
            snapToGrid, snapToPoints, orthoMode: false, gridMinorStep: dynamicGridMinorStep, scale: PX_PER_METER * zoom, showAlignmentGuides: useUIStore.getState().showAlignmentGuides
          });
          finalDeltaX = snapState.x - globalDrag.startX;
          finalDeltaZ = snapState.z - globalDrag.startZ;
          guides = snapState.guides || [];
          snapType = snapState.type;
      }
               
      useProjectStore.getState().updateGroupDrag(finalDeltaX, finalDeltaZ, useUIStore.getState().selectedItems);
      useUIStore.getState().setActiveGuides(guides);
      setMousePos({ x: globalDrag.startX + finalDeltaX, z: globalDrag.startZ + finalDeltaZ });
      return;
    }

    const bypassSnap = e.evt.altKey;
    let snapState = { x: rawProjX, z: rawProjZ, snapped: false, type: undefined as any, label: undefined as any, priority: undefined as any, guides: [] as any[] };
    
    if (!bypassSnap) {
      snapState = resolveBestSnap(rawProjX, rawProjZ, project, {
        snapToGrid,
        snapToPoints,
        orthoMode: orthoMode || e.evt?.shiftKey,
        gridMinorStep: dynamicGridMinorStep,
        scale: PX_PER_METER * zoom,
        startPoint: currentMode === 'addWall' ? (wallChainAnchor || undefined) : (currentMode === 'measure' ? (measureDraftStart && !measureDraftEnd ? measureDraftStart : undefined) : undefined),
        showAlignmentGuides: useUIStore.getState().showAlignmentGuides
      });
    }

    let finalX = snapState.x;
    let finalZ = snapState.z;
    
    setMeasureCandidate(null); // Completely replaced by the unified snap engine
    
    let finalType = snapState.snapped ? snapState.type : undefined;
    
    setLastSnapType(finalType);
    setMousePos({ x: finalX, z: finalZ });
    snappedPointerRef.current = { x: finalX, z: finalZ, type: finalType, label: snapState.label, priority: snapState.priority };
    useUIStore.getState().setActiveGuides(snapState.guides || []);
    useUIStore.getState().setActiveSnapPoint(
      snapState.snapped ? { 
        x: finalX, y: finalZ, type: finalType || 'unknown', label: snapState.label, priority: snapState.priority,
        wallThickness: snapState.wallThickness, wallJustification: snapState.wallJustification, wallHeight: snapState.wallHeight
      } : null
    );

    if (currentMode !== 'select') {
      useUIStore.getState().setActiveGuides(snapState.guides || []);
    } else {
      const { marqueeStart, setMarquee } = useUIStore.getState();
      if (marqueeStart && e.evt.buttons === 1) { // Left mouse button is held down
        setMarquee(marqueeStart, { x: rawProjX, z: rawProjZ });
      }
    }
  };

  const handlePointerUp = (e: any) => {
    if (globalDrag?.isDragging) {
      useUIStore.getState().setActiveGuides([]);
      useUIStore.getState().setActiveSnapPoint(null);
      useProjectStore.getState().endGroupDrag(true);
      setGlobalDrag(null);
      return;
    }

    const { mode, marqueeStart, marqueeEnd, setMarquee, setSelectedItems, setSelectedObject } = useUIStore.getState();
    
    if (mode === 'select' && marqueeStart && marqueeEnd) {
      const minX = Math.min(marqueeStart.x, marqueeEnd.x);
      const maxX = Math.min(marqueeStart.x, marqueeEnd.x) === marqueeStart.x ? Math.max(marqueeStart.x, marqueeEnd.x) : Math.max(marqueeStart.x, marqueeEnd.x);
      const minZ = Math.min(marqueeStart.z, marqueeEnd.z);
      const maxZ = Math.min(marqueeStart.z, marqueeEnd.z) === marqueeStart.z ? Math.max(marqueeStart.z, marqueeEnd.z) : Math.max(marqueeStart.z, marqueeEnd.z);
      
      const rect: RectProject = { minX, maxX, minZ, maxZ };
      const items: SelectedItem[] = [];

      // Check walls & endpoints
      project.walls.forEach(wall => {
        const startIn = rectContainsPoint(rect, wall.start);
        const endIn = rectContainsPoint(rect, wall.end);
        
        if (startIn && endIn) {
          items.push({ kind: 'wall', wallId: wall.id });
        } else if (startIn) {
          items.push({ kind: 'wallEndpoint', wallId: wall.id, endpoint: 'start' });
        } else if (endIn) {
          items.push({ kind: 'wallEndpoint', wallId: wall.id, endpoint: 'end' });
        } else if (rectIntersectsSegment(rect, wall.start, wall.end)) {
          items.push({ kind: 'wall', wallId: wall.id });
        }
      });

      // Check areas & vertices
      project.areas.forEach(area => {
        let allIn = true;
        let anyVertexSelected = false;
        area.points.forEach((pt, idx) => {
          if (rectContainsPoint(rect, pt)) {
            items.push({ kind: 'areaVertex', areaId: area.id, pointIndex: idx });
            anyVertexSelected = true;
          } else {
            allIn = false;
          }
        });
        
        if (allIn) {
          // If all points are in, select the area block, remove duplicate vertices
          items.push({ kind: 'area', areaId: area.id });
        } else if (!anyVertexSelected && rectIntersectsPolygon(rect, area.points)) {
          items.push({ kind: 'area', areaId: area.id });
        }
      });

      // Check openings (simplified bounding check via center)
      const openings = project.openings || [];
      openings.forEach(o => {
        const wall = project.walls.find(w => w.id === o.wallId);
        if (!wall) return;
        const dx = wall.end.x - wall.start.x;
        const dz = wall.end.z - wall.start.z;
        const len = getWallLength(wall);
        if (len === 0) return;
        const cx = wall.start.x + (dx / len) * (o.offsetFromStart + o.width / 2);
        const cz = wall.start.z + (dz / len) * (o.offsetFromStart + o.width / 2);
        if (rectContainsPoint(rect, {x: cx, z: cz})) {
           items.push({ kind: 'opening', openingId: o.id });
        }
      });

      // Check dimensions
      const dimensionsList = project.annotations?.filter(a => a.type === 'dimension') || [];
      dimensionsList.forEach(dim => {
        const startIn = rectContainsPoint(rect, dim.start);
        const endIn = rectContainsPoint(rect, dim.end);
        if (startIn && endIn) {
           items.push({ kind: 'dimension', annotationId: dim.id });
        } else if (startIn) {
           items.push({ kind: 'dimensionEndpoint', annotationId: dim.id, endpoint: 'start' });
        } else if (endIn) {
           items.push({ kind: 'dimensionEndpoint', annotationId: dim.id, endpoint: 'end' });
        } else if (rectIntersectsSegment(rect, dim.start, dim.end)) {
           items.push({ kind: 'dimension', annotationId: dim.id });
        }
      });

      // Deduplicate logic
      const deduped: SelectedItem[] = [];
      const selectedWallIds = new Set(items.filter(i => i.kind === 'wall').map(i => (i as any).wallId));
      const selectedAreaIds = new Set(items.filter(i => i.kind === 'area').map(i => (i as any).areaId));
      
      for (const item of items) {
        if (item.kind === 'wallEndpoint' && selectedWallIds.has(item.wallId)) continue;
        if (item.kind === 'areaVertex' && selectedAreaIds.has(item.areaId)) continue;
        if (item.kind === 'opening') {
           const op = project.openings.find(o => o.id === item.openingId);
           if (op && selectedWallIds.has(op.wallId)) continue;
        }
        deduped.push(item);
      }

      if (e.evt.shiftKey) {
        // Add to existing
        const existing = useUIStore.getState().selectedItems || [];
        // Deep deduplication is complex, but basic is fine. We will just append for now and let sets naturally handle it or we can just append
        const newSet = new Map<string, SelectedItem>();
        [...existing, ...deduped].forEach(it => newSet.set(JSON.stringify(it), it));
        setSelectedItems(Array.from(newSet.values()));
      } else {
        setSelectedItems(deduped);
      }
      
      // Keep single selectedObjectId compatible if len === 1
      if (deduped.length === 1) {
         if (deduped[0].kind === 'wall' || deduped[0].kind === 'wallEndpoint') setSelectedObject(deduped[0].wallId, 'wall');
         if (deduped[0].kind === 'area' || deduped[0].kind === 'areaVertex') setSelectedObject(deduped[0].areaId, 'area');
         if (deduped[0].kind === 'opening') setSelectedObject(deduped[0].openingId, 'opening');
         if (deduped[0].kind === 'dimension' || deduped[0].kind === 'dimensionEndpoint') setSelectedObject(deduped[0].annotationId, 'dimension');
      } else {
         setSelectedObject(null, null);
      }

      setMarquee(null, null);
    } else {
      setMarquee(null, null);
    }
  };

  const handleStageClick = (e: any) => {
    if (isSpaceDown) return;

    // If right click, cancel chain/draft but stay in the current mode
    if (e.evt.button === 2) {
      if (mode === 'addWall') setWallChainAnchor(null);
      if (mode === 'measure') {
        setMeasureDraftStart(null);
        setMeasureDraftEnd(null);
      }
      if (mode === 'addArea') setAreaDraftStart(null);
      
      useUIStore.getState().setActiveGuides([]);
      return;
    }

    // Middle click: ignore in drawing modes, let layers handle in select
    if (e.evt.button === 1) return;

    const isBackground = e.target === e.target.getStage();
    
    if (mode === 'select') {
      return; // Handled by handlePointerDown
    }

    if (mode === 'addDoor' || mode === 'addWindow') {
      if (isBackground) {
        setMode('select');
        useUIStore.getState().setActiveGuides([]);
      }
      return; // WallLayer will handle the actual creation
    }

    const coords = getProjectCoords(e);
    if (!coords) return;
    const projX = coords.x;
    const projZ = coords.z;

    // === ADD AREA: dedicated two-click flow, no chain ===
    if (mode === 'addArea') {
      if (!areaDraftStart) {
        // First click: set start point
        setAreaDraftStart({ x: normalizeCoord(projX), z: normalizeCoord(projZ) });
      } else {
        // Second click: create the area
        const p1 = areaDraftStart;
        const p2 = { x: normalizeCoord(projX), z: normalizeCoord(projZ) };
        const width = Math.abs(p2.x - p1.x);
        const depth = Math.abs(p2.z - p1.z);
        
        if (width > 0.1 && depth > 0.1) {
          const newId = `area_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          const minX = normalizeCoord(Math.min(p1.x, p2.x));
          const minZ = normalizeCoord(Math.min(p1.z, p2.z));
          const maxX = normalizeCoord(Math.max(p1.x, p2.x));
          const maxZ = normalizeCoord(Math.max(p1.z, p2.z));
          useProjectStore.getState().commitHistory();
          addArea({
            id: newId,
            name: useUIStore.getState().toolDefaults.area.name,
            type: useUIStore.getState().toolDefaults.area.type,
            points: [
              { x: minX, z: minZ },
              { x: maxX, z: minZ },
              { x: maxX, z: maxZ },
              { x: minX, z: maxZ }
            ],
            levelId: 'level_1',
            layer: useUIStore.getState().toolDefaults.area.layer,
            visible: true,
            locked: false
          });
          setSelectedObject(newId, 'area');
        }
        // Always clear draft regardless of whether area was created
        setAreaDraftStart(null);
        useUIStore.getState().setActiveGuides([]);
      }
      return;
    }

    // === ADD SITE: dedicated two-click flow ===
    if (mode === 'addSite') {
      if (!siteDraftStart) {
        setSiteDraftStart({ x: normalizeCoord(projX), z: normalizeCoord(projZ) });
      } else {
        const p1 = siteDraftStart;
        const p2 = { x: normalizeCoord(projX), z: normalizeCoord(projZ) };
        const width = normalizeCoord(Math.abs(p2.x - p1.x));
        const depth = normalizeCoord(Math.abs(p2.z - p1.z));
        
        if (width > 0.1 && depth > 0.1) {
          const minX = normalizeCoord(Math.min(p1.x, p2.x));
          const minZ = normalizeCoord(Math.min(p1.z, p2.z));
          useProjectStore.getState().commitHistory();
          useProjectStore.getState().updateSite({
            width,
            depth,
            origin: { x: minX, y: 0, z: minZ },
            visible: true
          });
          setMode('select');
          setSelectedObject(project.site.id, 'site');
        }
        setSiteDraftStart(null);
        useUIStore.getState().setActiveGuides([]);
      }
      return;
    }

    // === ADD WALL: chain drawing ===
    const currentAnchor = mode === 'addWall' ? wallChainAnchor : null;

    if (!currentAnchor) {
      if (mode === 'addWall') {
        const snapPoint = useUIStore.getState().activeSnapPoint;
        if (snapPoint && (snapPoint.wallJustification || snapPoint.wallThickness || snapPoint.wallHeight)) {
          const currentDefaults = useUIStore.getState().toolDefaults;
          useUIStore.getState().setToolDefaults('wall', {
            ...currentDefaults.wall,
            justification: snapPoint.wallJustification || currentDefaults.wall.justification,
            thickness: snapPoint.wallThickness || currentDefaults.wall.thickness,
            height: snapPoint.wallHeight || currentDefaults.wall.height
          });
        }
        setWallChainAnchor({ x: normalizeCoord(projX), z: normalizeCoord(projZ) });
      }
      setMousePos({ x: normalizeCoord(projX), z: normalizeCoord(projZ) });
    } else {
      useUIStore.getState().setActiveGuides([]);
      
      const p2 = { x: normalizeCoord(projX), z: normalizeCoord(projZ) };

      if (mode === 'addWall') {
        const p1 = currentAnchor;
        const dx = p2.x - p1.x;
        const dz = p2.z - p1.z;
        const length = normalizeCoord(Math.sqrt(dx*dx + dz*dz));
        if (length > 0.1) {
          const newId = `wall_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          useProjectStore.getState().commitHistory();
          addWall({
            id: newId,
            start: p1,
            end: p2,
            thickness: useUIStore.getState().toolDefaults.wall.thickness,
            height: useUIStore.getState().toolDefaults.wall.height,
            levelId: useUIStore.getState().toolDefaults.wall.levelId,
            layer: useUIStore.getState().toolDefaults.wall.layer,
            justification: useUIStore.getState().toolDefaults.wall.justification,
            visible: true,
            locked: false
          });
          setWallChainAnchor(p2); // Continue chain
        }
      }
    }

    // === ADD MEASURE: 3-click smart dimension ===
    if (mode === 'measure') {
      if (!measureDraftStart) {
        setMeasureDraftStart({ x: normalizeCoord(projX), z: normalizeCoord(projZ) });
        setMousePos({ x: normalizeCoord(projX), z: normalizeCoord(projZ) });
      } else if (!measureDraftEnd) {
        setMeasureDraftEnd({ x: normalizeCoord(projX), z: normalizeCoord(projZ) });
        setMousePos({ x: normalizeCoord(projX), z: normalizeCoord(projZ) });
        useUIStore.getState().setActiveGuides([]);
      } else {
        const p1 = measureDraftStart;
        const p2 = measureDraftEnd;
        const m = { x: normalizeCoord(projX), z: normalizeCoord(projZ) };
        
        let start, end;
        const dx = Math.abs(p2.x - p1.x);
        const dz = Math.abs(p2.z - p1.z);

        let isHorizontalDim = Math.abs(m.z - p1.z) > Math.abs(m.x - p1.x);
        if (dx < 0.01) isHorizontalDim = false;
        if (dz < 0.01) isHorizontalDim = true;

        if (isHorizontalDim) {
           start = { x: p1.x, z: p1.z };
           end = { x: p2.x, z: p1.z };
        } else {
           start = { x: p1.x, z: p1.z };
           end = { x: p1.x, z: p2.z };
        }

        const dxLine = end.x - start.x;
        const dyLine = end.z - start.z;
        const lenLine = Math.sqrt(dxLine*dxLine + dyLine*dyLine);
        
        if (lenLine > 0.01) {
          const uxx = dxLine / lenLine;
          const uyy = dyLine / lenLine;
          const nxx = -uyy;
          const nyy = uxx;

          const vx = m.x - start.x;
          const vy = m.z - start.z;
          const offsetDist = vx * nxx + vy * nyy;

          const newId = `dim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          useProjectStore.getState().commitHistory();
          addAnnotation({
            id: newId,
            type: 'dimension',
            layer: 'annotations',
            visible: true,
            locked: false,
            start,
            end,
            offsetDistance: offsetDist
          });
        }
        setMeasureDraftStart(null);
        setMeasureDraftEnd(null);
        useUIStore.getState().setActiveGuides([]);
      }
    }
  };

  // Render preview
  const renderPreview = () => {
    const elements: React.ReactNode[] = [];

    if (mode === 'select' && marqueeStart && marqueeEnd) {
       const p1 = projectToCanvas(marqueeStart.x, marqueeStart.z);
       const p2 = projectToCanvas(marqueeEnd.x, marqueeEnd.z);
       elements.push(
         <Rect
           key="marquee-rect"
           x={Math.min(p1.x, p2.x) * PX_PER_METER}
           y={Math.min(p1.y, p2.y) * PX_PER_METER}
           width={Math.abs(p1.x - p2.x) * PX_PER_METER}
           height={Math.abs(p1.y - p2.y) * PX_PER_METER}
           fill="rgba(0, 188, 212, 0.15)"
           stroke="#00bcd4"
           strokeWidth={1 / zoom}
           listening={false}
         />
       );
    }

    if (!mousePos) return <Group listening={false}>{elements}</Group>;

    // Crosshair rendering is now handled by standard CSS cursor: crosshair

    // Wall preview
    if (mode === 'addWall' && wallChainAnchor) {
      const { thickness, justification } = useUIStore.getState().toolDefaults.wall;
      const dummyWall = { id: 'dummy', start: wallChainAnchor, end: mousePos, thickness, justification, visible: true };
      const renderLine = getWallRenderLine(dummyWall as any, project.walls);

      const p1 = projectToCanvas(renderLine.start.x, renderLine.start.z);
      const p2 = projectToCanvas(renderLine.end.x, renderLine.end.z);
      
      const dx = mousePos.x - wallChainAnchor.x;
      const dz = mousePos.z - wallChainAnchor.z;
      const len = Math.sqrt(dx*dx + dz*dz);

      elements.push(
        <Group key="preview-wall" listening={false}>
          <Line
            points={[p1.x * PX_PER_METER, p1.y * PX_PER_METER, p2.x * PX_PER_METER, p2.y * PX_PER_METER]}
            stroke="#ff9800"
            strokeWidth={thickness * PX_PER_METER * zoom}
            opacity={0.5}
            lineCap="square"
          />
          <Line
            points={[p1.x * PX_PER_METER, p1.y * PX_PER_METER, p2.x * PX_PER_METER, p2.y * PX_PER_METER]}
            stroke="#ff9800"
            strokeWidth={4 / zoom}
            dash={[10 / zoom, 5 / zoom]}
          />
          <Text
            x={(p1.x + p2.x) / 2 * PX_PER_METER}
            y={(p1.y + p2.y) / 2 * PX_PER_METER - 15 / zoom}
            text={formatMeters(len)}
            fill="#ff9800"
            fontSize={12 / zoom}
            align="center"
          />
        </Group>
      );
    }

    // Area preview
    if (mode === 'addArea' && areaDraftStart) {
      const minX = Math.min(areaDraftStart.x, mousePos.x);
      const minZ = Math.min(areaDraftStart.z, mousePos.z);
      const rawWidth = Math.abs(mousePos.x - areaDraftStart.x);
      const rawDepth = Math.abs(mousePos.z - areaDraftStart.z);
      const width = Number(rawWidth.toFixed(2));
      const depth = Number(rawDepth.toFixed(2));
      const pos = projectToCanvas(minX, minZ);

      elements.push(
        <Group key="preview-area" listening={false}>
          <Rect
            x={pos.x * PX_PER_METER}
            y={pos.y * PX_PER_METER}
            width={width * PX_PER_METER}
            height={depth * PX_PER_METER}
            stroke="#ff9800"
            strokeWidth={2 / zoom}
            dash={[5 / zoom, 5 / zoom]}
            fill="rgba(255, 152, 0, 0.2)"
          />
          <Text
            x={pos.x * PX_PER_METER + (width * PX_PER_METER) / 2}
            y={pos.y * PX_PER_METER + (depth * PX_PER_METER) / 2 - 10 / zoom}
            text={`${formatSize(width, depth)}\n${formatArea(width * depth)}`}
            fill="#ff9800"
            fontSize={12 / zoom}
            fontStyle="bold"
            align="center"
            offsetX={(width * PX_PER_METER) / 2} // approximate centering
          />
        </Group>
      );
    }

    // Opening (Door/Window) preview
    if (mode === 'addDoor' || mode === 'addWindow') {
      const { width } = mode === 'addDoor' ? useUIStore.getState().toolDefaults.door : useUIStore.getState().toolDefaults.window;
      let hoveredWall: any = null;
      let minDistance = Infinity;
      let projP = mousePos;

      for (const w of project.walls) {
         const dx = w.end.x - w.start.x;
         const dz = w.end.z - w.start.z;
         const len = Math.sqrt(dx*dx + dz*dz);
         if (len < 0.001) continue;
         const u = ((mousePos.x - w.start.x)*dx + (mousePos.z - w.start.z)*dz) / (len*len);
         if (u >= 0 && u <= 1) {
            const px = w.start.x + u*dx;
            const pz = w.start.z + u*dz;
            const dist = Math.sqrt((mousePos.x - px)**2 + (mousePos.z - pz)**2);
            if (dist < 0.5 && dist < minDistance) { // within half meter
               minDistance = dist;
               hoveredWall = w;
               projP = { x: px, z: pz };
            }
         }
      }

      if (hoveredWall) {
         const { start: cStart, end: cEnd } = getWallCenterline(hoveredWall);
         const cDx = cEnd.x - cStart.x;
         const cDz = cEnd.z - cStart.z;
         
         const dx = hoveredWall.end.x - hoveredWall.start.x;
         const dz = hoveredWall.end.z - hoveredWall.start.z;
         const wallYaw = Math.atan2(dz, dx) * (180 / Math.PI);
         const thickness = hoveredWall.thickness;

         const distToStart = Math.sqrt((projP.x - hoveredWall.start.x)**2 + (projP.z - hoveredWall.start.z)**2);
         const distToEnd = Math.sqrt((projP.x - hoveredWall.end.x)**2 + (projP.z - hoveredWall.end.z)**2);

         const wallLen = Math.sqrt(dx*dx + dz*dz);
         const uLine = wallLen > 0 ? distToStart / wallLen : 0;
         const visualX = cStart.x + uLine * cDx;
         const visualZ = cStart.z + uLine * cDz;

         const leftDist = Math.max(0, distToStart - width / 2);
         const rightDist = Math.max(0, distToEnd - width / 2);
         
         const color = mode === 'addDoor' ? '#f57c00' : '#00b0ff';
         const textRotation = Math.abs(wallYaw) > 90 ? 180 : 0;

         elements.push(
            <Group key="preview-opening" x={visualX * PX_PER_METER} y={visualZ * PX_PER_METER} rotation={wallYaw} listening={false}>
              <Rect 
                 x={- (width * PX_PER_METER) / 2} 
                 y={- (thickness * PX_PER_METER) / 2}
                 width={width * PX_PER_METER}
                 height={thickness * PX_PER_METER}
                 fill={color}
                 opacity={0.8}
                 stroke="#fff"
                 strokeWidth={2 / zoom}
              />
              <Text 
                 x={0}
                 y={- (thickness * PX_PER_METER) / 2 - 9 / zoom}
                 offsetX={20 / zoom}
                 offsetY={6 / zoom}
                 rotation={textRotation}
                 text={`${width.toFixed(2)}m`}
                 fontSize={12 / zoom}
                 fill="#fff"
                 align="center"
                 width={40 / zoom}
              />
              
              {/* Left dimension line */}
              <Group>
                <Line points={[- (width * PX_PER_METER) / 2, 0, - (width * PX_PER_METER) / 2 - leftDist * PX_PER_METER, 0]} stroke="#00bcd4" strokeWidth={1.5 / zoom} dash={[5 / zoom, 5 / zoom]} />
                <Line points={[- (width * PX_PER_METER) / 2 - leftDist * PX_PER_METER, -10 / zoom, - (width * PX_PER_METER) / 2 - leftDist * PX_PER_METER, 10 / zoom]} stroke="#00bcd4" strokeWidth={2 / zoom} />
                <Text 
                  x={- (width * PX_PER_METER) / 2 - (leftDist * PX_PER_METER) / 2} 
                  y={-9 / zoom} 
                  offsetX={20 / zoom}
                  offsetY={6 / zoom}
                  rotation={textRotation}
                  text={leftDist.toFixed(2)} 
                  fontSize={12 / zoom} 
                  fill="#00bcd4" 
                  align="center" 
                  width={40 / zoom} 
                />
              </Group>
              
              {/* Right dimension line */}
              <Group>
                <Line points={[(width * PX_PER_METER) / 2, 0, (width * PX_PER_METER) / 2 + rightDist * PX_PER_METER, 0]} stroke="#00bcd4" strokeWidth={1.5 / zoom} dash={[5 / zoom, 5 / zoom]} />
                <Line points={[(width * PX_PER_METER) / 2 + rightDist * PX_PER_METER, -10 / zoom, (width * PX_PER_METER) / 2 + rightDist * PX_PER_METER, 10 / zoom]} stroke="#00bcd4" strokeWidth={2 / zoom} />
                <Text 
                  x={(width * PX_PER_METER) / 2 + (rightDist * PX_PER_METER) / 2} 
                  y={-9 / zoom} 
                  offsetX={20 / zoom}
                  offsetY={6 / zoom}
                  rotation={textRotation}
                  text={rightDist.toFixed(2)} 
                  fontSize={12 / zoom} 
                  fill="#00bcd4" 
                  align="center" 
                  width={40 / zoom} 
                />
              </Group>
            </Group>
         );
      }
    }

    // Site preview
    if (mode === 'addSite' && siteDraftStart) {
      const minX = Math.min(siteDraftStart.x, mousePos.x);
      const minZ = Math.min(siteDraftStart.z, mousePos.z);
      const rawWidth = Math.abs(mousePos.x - siteDraftStart.x);
      const rawDepth = Math.abs(mousePos.z - siteDraftStart.z);
      const width = Number(rawWidth.toFixed(2));
      const depth = Number(rawDepth.toFixed(2));
      const pos = projectToCanvas(minX, minZ);

      elements.push(
        <Group key="preview-site" listening={false}>
          <Rect
            x={pos.x * PX_PER_METER}
            y={pos.y * PX_PER_METER}
            width={width * PX_PER_METER}
            height={depth * PX_PER_METER}
            stroke="#4caf50"
            strokeWidth={2 / zoom}
            dash={[5 / zoom, 5 / zoom]}
            fill="rgba(76, 175, 80, 0.1)"
          />
          {/* Center Area Label */}
          <Text
            x={pos.x * PX_PER_METER}
            y={pos.y * PX_PER_METER + (depth * PX_PER_METER) / 2 - 12 / zoom}
            width={width * PX_PER_METER}
            text={`${t("canvas.siteLabel")}\n${formatArea(width * depth)}`}
            fill="#00695c"
            fontSize={14 / zoom}
            fontStyle="bold"
            align="center"
          />
          {/* Top Width Dimension */}
          <Group>
            <Line points={[pos.x * PX_PER_METER, pos.y * PX_PER_METER - 15 / zoom, (pos.x + width) * PX_PER_METER, pos.y * PX_PER_METER - 15 / zoom]} stroke="#1976d2" strokeWidth={1.5 / zoom} dash={[4 / zoom, 4 / zoom]} />
            <Line points={[pos.x * PX_PER_METER, pos.y * PX_PER_METER - 20 / zoom, pos.x * PX_PER_METER, pos.y * PX_PER_METER - 10 / zoom]} stroke="#1976d2" strokeWidth={1.5 / zoom} />
            <Line points={[(pos.x + width) * PX_PER_METER, pos.y * PX_PER_METER - 20 / zoom, (pos.x + width) * PX_PER_METER, pos.y * PX_PER_METER - 10 / zoom]} stroke="#1976d2" strokeWidth={1.5 / zoom} />
            <Text
              x={pos.x * PX_PER_METER}
              y={pos.y * PX_PER_METER - 30 / zoom}
              width={width * PX_PER_METER}
              text={formatMeters(width)}
              fill="#1976d2"
              fontSize={12 / zoom}
              fontStyle="bold"
              align="center"
            />
          </Group>
          {/* Right Depth Dimension */}
          <Group>
            <Line points={[(pos.x + width) * PX_PER_METER + 15 / zoom, pos.y * PX_PER_METER, (pos.x + width) * PX_PER_METER + 15 / zoom, (pos.y + depth) * PX_PER_METER]} stroke="#1976d2" strokeWidth={1.5 / zoom} dash={[4 / zoom, 4 / zoom]} />
            <Line points={[(pos.x + width) * PX_PER_METER + 10 / zoom, pos.y * PX_PER_METER, (pos.x + width) * PX_PER_METER + 20 / zoom, pos.y * PX_PER_METER]} stroke="#1976d2" strokeWidth={1.5 / zoom} />
            <Line points={[(pos.x + width) * PX_PER_METER + 10 / zoom, (pos.y + depth) * PX_PER_METER, (pos.x + width) * PX_PER_METER + 20 / zoom, (pos.y + depth) * PX_PER_METER]} stroke="#1976d2" strokeWidth={1.5 / zoom} />
            <Text
              x={(pos.x + width) * PX_PER_METER + 25 / zoom}
              y={pos.y * PX_PER_METER + (depth * PX_PER_METER) / 2 - 6 / zoom}
              text={formatMeters(depth)}
              fill="#1976d2"
              fontSize={12 / zoom}
              fontStyle="bold"
            />
          </Group>
        </Group>
      );
    }

    // Measure preview
    if (mode === 'measure') {
      if (measureDraftStart && !measureDraftEnd) {
        const p1 = projectToCanvas(measureDraftStart.x, measureDraftStart.z);
        const p2 = projectToCanvas(mousePos.x, mousePos.z);
        const distance = Math.sqrt((mousePos.x - measureDraftStart.x)**2 + (mousePos.z - measureDraftStart.z)**2);
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        
        elements.push(
          <Group key="measure-draft" listening={false}>
            <Circle
              x={p1.x * PX_PER_METER}
              y={p1.y * PX_PER_METER}
              radius={5 / zoom}
              fill={theme.dimensionStroke}
              stroke="#fff"
              strokeWidth={1.5 / zoom}
            />
            <Line
              points={[p1.x * PX_PER_METER, p1.y * PX_PER_METER, p2.x * PX_PER_METER, p2.y * PX_PER_METER]}
              stroke={theme.dimensionStroke}
              strokeWidth={1.5 / zoom}
              dash={[5 / zoom, 5 / zoom]}
            />
            <Text
              x={midX * PX_PER_METER}
              y={midY * PX_PER_METER - 15 / zoom}
              text={formatMeters(distance)}
              fill={theme.dimensionStroke}
              fontSize={14 / zoom}
              fontStyle="bold"
              align="center"
              offsetX={40 / zoom}
              width={80 / zoom}
            />
          </Group>
        );
      } else if (measureDraftStart && measureDraftEnd) {
        const p1 = measureDraftStart;
        const p2 = measureDraftEnd;
        const m = mousePos;
        
        let start, end;
        const dx = Math.abs(p2.x - p1.x);
        const dz = Math.abs(p2.z - p1.z);

        let isHorizontalDim = Math.abs(m.z - p1.z) > Math.abs(m.x - p1.x);
        if (dx < 0.01) isHorizontalDim = false;
        if (dz < 0.01) isHorizontalDim = true;

        if (isHorizontalDim) {
           start = { x: p1.x, z: p1.z };
           end = { x: p2.x, z: p1.z };
        } else {
           start = { x: p1.x, z: p1.z };
           end = { x: p1.x, z: p2.z };
        }

        const dxLine = end.x - start.x;
        const dyLine = end.z - start.z;
        const lenLine = Math.sqrt(dxLine*dxLine + dyLine*dyLine);
        
        if (lenLine >= 0.01) {
          const uxx = dxLine / lenLine;
          const uyy = dyLine / lenLine;
          const nxx = -uyy;
          const nyy = uxx;

          const vx = m.x - start.x;
          const vy = m.z - start.z;
          const offsetDist = vx * nxx + vy * nyy;
          
          elements.push(
            <Group key="measure-preview" listening={false}>
              <Circle x={start.x * PX_PER_METER} y={start.z * PX_PER_METER} radius={4 / zoom} fill={theme.dimensionStroke} stroke="#fff" strokeWidth={1 / zoom} />
              <Circle x={end.x * PX_PER_METER} y={end.z * PX_PER_METER} radius={4 / zoom} fill={theme.dimensionStroke} stroke="#fff" strokeWidth={1 / zoom} />
              <DimensionCAD
                id="preview-dim"
                start={{ x: start.x, y: start.z }}
                end={{ x: end.x, y: end.z }}
                offsetDist={offsetDist}
                text={formatMeters(lenLine)}
                scale={PX_PER_METER}
                zoom={zoom}
                color={theme.dimensionStroke}
                isManual={false}
                isSelected={false}
              />
            </Group>
          );
        }
      }
    }

    // Measure Candidate hint
    if (mode === 'measure' && measureCandidate) {
      const pos = projectToCanvas(measureCandidate.point.x, measureCandidate.point.z);
      elements.push(
        <Group key="preview-measure-cand" listening={false}>
          <Circle
            x={pos.x * PX_PER_METER}
            y={pos.y * PX_PER_METER}
            radius={4 / zoom}
            fill="#e91e63"
          />
          <Text
            x={pos.x * PX_PER_METER + 10 / zoom}
            y={pos.y * PX_PER_METER - 10 / zoom}
            text={measureCandidate.label}
            fill="#e91e63"
            fontSize={10 / zoom}
          />
        </Group>
      );
    }

    return <Group listening={false}>{elements}</Group>;
  };



  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const projX = (pointer.x - stage.x()) / (PX_PER_METER * zoom);
    const projZ = (pointer.y - stage.y()) / (PX_PER_METER * zoom);

    const scaleBy = 1.1;
    let newZoom = e.evt.deltaY < 0 ? zoom * scaleBy : zoom / scaleBy;
    newZoom = Math.max(0.2, Math.min(newZoom, 10)); 

    setZoom(newZoom);
    setStagePos({
      x: pointer.x - projX * PX_PER_METER * newZoom,
      y: pointer.y - projZ * PX_PER_METER * newZoom,
    });
  };

  // Calculate visible bounds in meters for infinite grid
  const visibleStartX = (-stagePos.x / zoom) / PX_PER_METER;
  const visibleStartY = (-stagePos.y / zoom) / PX_PER_METER;
  const visibleEndX = ((dimensions.width - stagePos.x) / zoom) / PX_PER_METER;
  const visibleEndY = ((dimensions.height - stagePos.y) / zoom) / PX_PER_METER;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%', background: theme.canvasBg, cursor: isSpaceDown ? 'grab' : 'crosshair' }}>
      {dimensions.width > 0 && dimensions.height > 0 && (
        <Stage 
          width={dimensions.width} 
          height={dimensions.height}
        onMouseDown={(e) => {
          if (!isSpaceDown) {
             e.evt.preventDefault(); // Stop text cursor
          }
          handlePointerDown(e);
          handleStageClick(e);
        }}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onWheel={handleWheel}
        onContextMenu={(e) => {
          e.evt.preventDefault();
          if (mode === 'addWall') setWallChainAnchor(null);
          if (mode === 'measure') {
            setMeasureDraftStart(null);
            setMeasureDraftEnd(null);
          }
          if (mode === 'addArea') setAreaDraftStart(null);
          useUIStore.getState().setMarquee(null, null);
        }}
        draggable={isSpaceDown}
        onDragEnd={(e) => {
          if (e.target === e.target.getStage()) {
            setStagePos({ x: e.target.x(), y: e.target.y() });
          }
        }}
        x={stagePos.x}
        y={stagePos.y}
      >
        <Layer>
          <Group scaleX={zoom} scaleY={zoom} listening={!isSpaceDown}>
            {showGrid2D && (
              <GridLayer 
                startX={visibleStartX} 
                startY={visibleStartY} 
                endX={visibleEndX} 
                endY={visibleEndY} 
                scale={PX_PER_METER} 
                zoom={zoom} 
              />
            )}
            <SiteLayer site={project.site} scale={PX_PER_METER} zoom={zoom} />
          </Group>
        </Layer>
        <Layer opacity={0.65}>
          <Group scaleX={zoom} scaleY={zoom} listening={!isSpaceDown}>
            <AreaLayer areas={project.areas} scale={PX_PER_METER} zoom={zoom} />
          </Group>
        </Layer>
        <Layer>
          <Group scaleX={zoom} scaleY={zoom} listening={!isSpaceDown}>
            <BuildingLayer building={project.building} scale={PX_PER_METER} />
            <WallLayer walls={project.walls} scale={PX_PER_METER} zoom={zoom} />
            <AreaHandles areas={project.areas} scale={PX_PER_METER} zoom={zoom} />
            {show3DOpenings && <OpeningLayer openings={project.openings || []} walls={project.walls} scale={PX_PER_METER} zoom={zoom} />}
            <DimensionLayer walls={project.walls} areas={project.areas} building={project.building} scale={PX_PER_METER} zoom={zoom} />
            <GuideLayer 
              scale={PX_PER_METER} 
              zoom={zoom} 
              width={(dimensions.width / zoom) + Math.abs(stagePos.x / zoom)} 
              height={(dimensions.height / zoom) + Math.abs(stagePos.y / zoom)} 
              offsetX={Math.min(-stagePos.x / zoom, -100)} 
              offsetY={Math.min(-stagePos.y / zoom, -100)} 
            />
            {renderPreview()}
          </Group>
        </Layer>
      </Stage>
      )}
      {(mode === 'addWall') && wallChainAnchor && (
        <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '8px 16px', borderRadius: '4px', fontSize: '14px', pointerEvents: 'none', zIndex: 10 }}>
          {t("hint.wallChainActive")}
        </div>
      )}
      {(mode === 'addArea') && (
        <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '8px 16px', borderRadius: '4px', fontSize: '14px', pointerEvents: 'none', zIndex: 10 }}>
          {areaDraftStart ? (t("hint.areaClickSecond") || "Nhấn điểm thứ hai để tạo khu vực. Esc để hủy.") : (t("hint.areaClickFirst") || "Nhấn điểm đầu tiên của khu vực.")}
        </div>
      )}
      {(mode === 'measure') && (measureDraftStart || measureDraftEnd) && (
        <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '8px 16px', borderRadius: '4px', fontSize: '14px', pointerEvents: 'none', zIndex: 10 }}>
          {measureDraftStart && measureDraftEnd ? "Di chuyển chuột để chọn vị trí hiển thị kết quả đo. Nhấn Esc để hủy." : (measureDraftStart ? "Nhấn điểm thứ hai để kết thúc đo. Esc để hủy." : "Nhấn điểm bắt đầu để đo. Esc để hủy.")}
        </div>
      )}
      {(mode === 'addDoor' || mode === 'addWindow') && (
        <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '8px 16px', borderRadius: '4px', fontSize: '14px', pointerEvents: 'none', zIndex: 10 }}>
          {mode === 'addDoor' ? t("hint.clickWallDoor") : t("hint.clickWallWindow")}
        </div>
      )}
    </div>
  );
};
