import React, { useRef, useMemo } from 'react';
import { Line, Group, Circle } from 'react-konva';
import { IWall } from '../../types';
import { projectToCanvas, getOffsetFromStartOnWall, normalizeCoord, getWallCenterline, getWallRenderLine, isPointOnSegment } from '../../core/geometry/math';
import { resolveBestSnap } from '../../core/geometry/snap';
import { useUIStore } from '../../store/useUIStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useTheme } from '../../theme/tokens';
import { useI18nStore } from '../../store/useI18nStore';

interface Props {
  walls: IWall[];
  scale: number;
  zoom?: number;
}

const getLineIntersection = (p1x: number, p1y: number, p2x: number, p2y: number, p3x: number, p3y: number, p4x: number, p4y: number) => {
  const d = (p1x - p2x) * (p3y - p4y) - (p1y - p2y) * (p3x - p4x);
  if (Math.abs(d) < 0.0001) return null;
  const t = ((p1x - p3x) * (p3y - p4y) - (p1y - p3y) * (p3x - p4x)) / d;
  return { x: p1x + t * (p2x - p1x), y: p1y + t * (p2y - p1y) };
};

const getWallOffsetLines = (w: IWall, allWalls: IWall[], scale: number) => {
   const renderLine = getWallRenderLine(w, allWalls);
   const sX = renderLine.start.x * scale;
   const sY = renderLine.start.z * scale;
   const eX = renderLine.end.x * scale;
   const eY = renderLine.end.z * scale;
   const dx = eX - sX;
   const dy = eY - sY;
   const len = Math.sqrt(dx*dx + dy*dy);
   if (len < 0.001) return null;
   const nx = -dy / len;
   const ny = dx / len;
   const hT = (w.thickness * scale) / 2;
   return {
      leftStart: { x: sX + nx * hT, y: sY + ny * hT },
      leftEnd:   { x: eX + nx * hT, y: eY + ny * hT },
      rightStart:{ x: sX - nx * hT, y: sY - ny * hT },
      rightEnd:  { x: eX - nx * hT, y: eY - ny * hT },
   };
};

export const WallLayer: React.FC<Props> = ({ walls, scale, zoom = 1 }) => {
  const { selectedObjectId, setSelectedObject, mode, setMode, snapToGrid, snapToPoints, orthoMode, gridMinorStep, snapTolerancePx, showAlignmentGuides, setActiveGuides, setActiveSnapPoint } = useUIStore();
  const addWall = useProjectStore(state => state.addWall);
  const updateWall = useProjectStore(state => state.updateWall);
  const updateConnectedWallEndpoints = useProjectStore(state => state.updateConnectedWallEndpoints);
  const updateOpening = useProjectStore(state => state.updateOpening);
  const projectData = useProjectStore(state => state.data);
  const theme = useTheme();
  const { t } = useI18nStore();

  const hatchCanvas = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // White background for CAD style
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 16, 16);
      
      // Use a slightly darker gray for the hatch lines
      ctx.strokeStyle = '#aaaaaa';
      ctx.lineWidth = 1;
      
      // Draw 45 degree diagonal lines for seamless tiling
      ctx.beginPath();
      ctx.moveTo(-4, 20); ctx.lineTo(20, -4);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(12, 20); ctx.lineTo(20, 12);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-4, 4); ctx.lineTo(4, -4);
      ctx.stroke();
    }
    return canvas;
  }, []);

  const dragState = useRef<{
    connectedEndpoints: { wallId: string; type: 'start' | 'end'; originalWall: IWall }[];
    draggedVertexInitialPoint: { x: number; z: number } | null;
  }>({
    connectedEndpoints: [],
    draggedVertexInitialPoint: null
  });

  const wallPolygons = useMemo(() => {
    return walls.filter(w => w.visible).map(wall => {
      const renderLine = getWallRenderLine(wall, walls);
      const start = projectToCanvas(renderLine.start.x, renderLine.start.z);
      const end = projectToCanvas(renderLine.end.x, renderLine.end.z);
      
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const len = Math.sqrt(dx*dx + dy*dy);
      if (len < 0.001) return { wall, points: [], isSelected: false };
      const nx = -dy / len;
      const ny = dx / len;
      const hT = (wall.thickness * scale) / 2;
      
      let p1x = start.x * scale + nx * hT;
      let p1y = start.y * scale + ny * hT;
      let p4x = start.x * scale - nx * hT;
      let p4y = start.y * scale - ny * hT;
      
      let p2x = end.x * scale + nx * hT;
      let p2y = end.y * scale + ny * hT;
      let p3x = end.x * scale - nx * hT;
      let p3y = end.y * scale - ny * hT;

      const eps = 0.005;

      // Check start connections
      const conStart = projectData.walls.filter(w => w.id !== wall.id && w.visible && (
        (Math.abs(w.start.x - wall.start.x) < eps && Math.abs(w.start.z - wall.start.z) < eps) ||
        (Math.abs(w.end.x - wall.start.x) < eps && Math.abs(w.end.z - wall.start.z) < eps) ||
        isPointOnSegment(wall.start, w.start, w.end, eps)
      ));
      
      if (conStart.length === 1) {
        const other = conStart[0];
        const oLines = getWallOffsetLines(other, walls, scale);
        if (oLines) {
          const isOtherOutgoing = Math.abs(other.start.x - wall.start.x) < eps && Math.abs(other.start.z - wall.start.z) < eps;
          const L1 = {s: {x: p1x, y: p1y}, e: {x: p2x, y: p2y}};
          const R1 = {s: {x: p4x, y: p4y}, e: {x: p3x, y: p3y}};
          const oL = {s: oLines.leftStart, e: oLines.leftEnd};
          const oR = {s: oLines.rightStart, e: oLines.rightEnd};
          
          const targetL = isOtherOutgoing ? oR : oL;
          const targetR = isOtherOutgoing ? oL : oR;
          
          const iL = getLineIntersection(L1.s.x, L1.s.y, L1.e.x, L1.e.y, targetL.s.x, targetL.s.y, targetL.e.x, targetL.e.y);
          const iR = getLineIntersection(R1.s.x, R1.s.y, R1.e.x, R1.e.y, targetR.s.x, targetR.s.y, targetR.e.x, targetR.e.y);
          
          if (iL) { p1x = iL.x; p1y = iL.y; }
          if (iR) { p4x = iR.x; p4y = iR.y; }
        }
      }

      // Check end connections
      const conEnd = projectData.walls.filter(w => w.id !== wall.id && w.visible && (
        (Math.abs(w.start.x - wall.end.x) < eps && Math.abs(w.start.z - wall.end.z) < eps) ||
        (Math.abs(w.end.x - wall.end.x) < eps && Math.abs(w.end.z - wall.end.z) < eps) ||
        isPointOnSegment(wall.end, w.start, w.end, eps)
      ));

      if (conEnd.length === 1) {
        const other = conEnd[0];
        const oLines = getWallOffsetLines(other, walls, scale);
        if (oLines) {
          const isOtherOutgoing = Math.abs(other.start.x - wall.end.x) < eps && Math.abs(other.start.z - wall.end.z) < eps;
          const L1 = {s: {x: p1x, y: p1y}, e: {x: p2x, y: p2y}};
          const R1 = {s: {x: p4x, y: p4y}, e: {x: p3x, y: p3y}};
          const oL = {s: oLines.leftStart, e: oLines.leftEnd};
          const oR = {s: oLines.rightStart, e: oLines.rightEnd};
          
          const targetL = isOtherOutgoing ? oL : oR;
          const targetR = isOtherOutgoing ? oR : oL;
          
          const iL = getLineIntersection(L1.s.x, L1.s.y, L1.e.x, L1.e.y, targetL.s.x, targetL.s.y, targetL.e.x, targetL.e.y);
          const iR = getLineIntersection(R1.s.x, R1.s.y, R1.e.x, R1.e.y, targetR.s.x, targetR.s.y, targetR.e.x, targetR.e.y);
          
          if (iL) { p2x = iL.x; p2y = iL.y; }
          if (iR) { p3x = iR.x; p3y = iR.y; }
        }
      }

      const isSelected = selectedObjectId === wall.id || useUIStore.getState().selectedItems.some(it => it.kind === 'wall' && it.wallId === wall.id);

      return {
        wall,
        isSelected,
        points: [p1x, p1y, p2x, p2y, p3x, p3y, p4x, p4y]
      };
    });
  }, [walls, scale, projectData.walls, selectedObjectId]);

  return (
    <Group>
      {/* Background Pass: All black walls to form union boundary */}
      <Group listening={false}>
         {wallPolygons.map(wp => {
            if (wp.points.length === 0) return null;
            return <Line key={`bg-${wp.wall.id}`} points={wp.points} closed fill={wp.isSelected && mode === 'select' ? theme.accent : '#000000'} stroke={wp.isSelected && mode === 'select' ? theme.accent : '#000000'} strokeWidth={3/zoom} lineJoin="miter" />;
         })}
      </Group>

      {/* Foreground Pass: All hatched interiors */}
      <Group listening={false}>
         {wallPolygons.map(wp => {
            if (wp.points.length === 0) return null;
            return <Line key={`fg-${wp.wall.id}`} points={wp.points} closed fillPatternImage={hatchCanvas} fillPatternScale={{x: 1/zoom, y: 1/zoom}} strokeEnabled={false} lineJoin="miter" />;
         })}
      </Group>

      {/* Interactive Pass: Invisible groups mapping exactly to the walls for hit detection and dragging */}
      {walls.map(wall => {
        if (!wall.visible) return null;
        
        const renderLine = getWallRenderLine(wall, walls);
        const start = projectToCanvas(renderLine.start.x, renderLine.start.z);
        const end = projectToCanvas(renderLine.end.x, renderLine.end.z);
        const isSelected = selectedObjectId === wall.id || useUIStore.getState().selectedItems.some(it => it.kind === 'wall' && it.wallId === wall.id);

        const handleClick = (e: any) => {
          if (mode === 'select') {
            e.cancelBubble = true;
            setSelectedObject(wall.id, 'wall');
          } else if (mode === 'addDoor' || mode === 'addWindow') {
            e.cancelBubble = true;
            const stage = e.target.getStage();
            const point = stage.getPointerPosition();
            if (!point) return;
            
            const transform = e.target.getAbsoluteTransform().copy().invert();
            const localPos = transform.point(point);
            const projX = localPos.x / scale;
            const projZ = localPos.y / scale;
            
            const rawOffset = getOffsetFromStartOnWall(wall, { x: projX, z: projZ });
            const dx = wall.end.x - wall.start.x;
            const dz = wall.end.z - wall.start.z;
            const wallLength = Math.sqrt(dx*dx + dz*dz);
            
            const toolDefaults = useUIStore.getState().toolDefaults;
            const defaultWidth = mode === 'addDoor' ? toolDefaults.door.width : toolDefaults.window.width;
            const offset = normalizeCoord(Math.max(0, Math.min(wallLength - defaultWidth, rawOffset - defaultWidth / 2)));
            
            const newId = `opening_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            
            if (mode === 'addDoor') {
              useProjectStore.getState().addOpening({
                id: newId,
                type: 'door',
                wallId: wall.id,
                offsetFromStart: offset,
                width: normalizeCoord(defaultWidth),
                height: normalizeCoord(toolDefaults.door.height),
                sillHeight: normalizeCoord(toolDefaults.door.sillHeight),
                hingeSide: toolDefaults.door.hingeSide,
                openDirection: toolDefaults.door.openDirection,
                swingAngle: toolDefaults.door.swingAngle,
                layer: 'openings',
                visible: true,
                locked: false
              });
            } else {
              useProjectStore.getState().addOpening({
                id: newId,
                type: 'window',
                wallId: wall.id,
                offsetFromStart: offset,
                width: normalizeCoord(defaultWidth),
                height: normalizeCoord(toolDefaults.window.height),
                sillHeight: normalizeCoord(toolDefaults.window.sillHeight),
                hingeSide: toolDefaults.window.hingeSide,
                openDirection: toolDefaults.window.openDirection,
                swingAngle: toolDefaults.window.swingAngle,
                layer: 'openings',
                visible: true,
                locked: false
              });
            }
            // Keep the tool active to add more doors, but select the newly created one
            setSelectedObject(newId, 'opening');
          }
        };

        const handleMouseDown = (e: any) => {
          if (mode === 'select' && (e.evt.button === 1 || (e.evt.button === 0 && e.evt.altKey))) {
            e.cancelBubble = true;
            e.evt.preventDefault(); // prevent browser scroll
            
            const stage = e.target.getStage();
            const point = stage.getPointerPosition();
            if (!point) return;
            
            const transform = e.target.getAbsoluteTransform().copy().invert();
            const localPos = transform.point(point);
            const projX = localPos.x / scale;
            const projZ = localPos.y / scale;
            
            const P = { x: projX, z: projZ };
            const splitOffset = getOffsetFromStartOnWall(wall, P);
            
            const dx = wall.end.x - wall.start.x;
            const dz = wall.end.z - wall.start.z;
            const wallLength = Math.sqrt(dx*dx + dz*dz);
            
            // Re-project P strictly onto the wall segment and normalize
            const ratio = splitOffset / wallLength;
            const exactP = { 
              x: Number((wall.start.x + dx * ratio).toFixed(4)), 
              z: Number((wall.start.z + dz * ratio).toFixed(4)) 
            };
            
            if (splitOffset < 0.2 || wallLength - splitOffset < 0.2) {
               useUIStore.getState().setValidationIssues([{ id: 'split_error_1', message: t("warning.wallTooShort"), severity: 'warning' }]);
               return; // or toast
            }
            
            // Check openings
            const openingsOnWall = (projectData.openings || []).filter(o => o.wallId === wall.id);
            for (let o of openingsOnWall) {
               if (splitOffset > o.offsetFromStart && splitOffset < o.offsetFromStart + o.width) {
                  useUIStore.getState().setValidationIssues([{ id: 'split_error_2', message: t("warning.cannotSplitOpening"), severity: 'warning' }]);
                  return;
               }
            }
            useUIStore.getState().setValidationIssues([]);
            
            useProjectStore.getState().commitHistory();
            
            // Old wall becomes A -> P
            const oldEnd = { ...wall.end };
            updateWall(wall.id, { end: exactP });
            
            // New wall becomes P -> B
            const newWallId = `wall_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            addWall({
               ...wall,
               id: newWallId,
               start: exactP,
               end: oldEnd
            });
            
            // Move openings to new wall if they are past the split point
            for (let o of openingsOnWall) {
               if (o.offsetFromStart >= splitOffset) {
                  updateOpening(o.id, {
                     wallId: newWallId,
                     offsetFromStart: o.offsetFromStart - splitOffset
                  });
               }
            }
          }
        };

        return (
          <Group 
            key={wall.id}
            draggable={mode === 'select' && useUIStore.getState().selectedItems.length <= 1}
            onDragStart={(e) => {
               if (e.target.name() === 'endpoint-handle') return;
               const uiState = useUIStore.getState();
               const projStore = useProjectStore.getState();
               
               if (!uiState.selectedItems.some(it => it.kind === 'wall' && it.wallId === wall.id)) {
                  uiState.setSelectedItems([{ kind: 'wall', wallId: wall.id }]);
                  uiState.setSelectedObject(wall.id, 'wall');
               }
               
               projStore.startGroupDrag();
               
               const stage = e.target.getStage();
               const pos = stage.getPointerPosition();
               if (!pos) return;
               const transform = e.target.getParent().getAbsoluteTransform().copy().invert();
               const proj = transform.point(pos);
               e.target.setAttr('dragStartProj', proj);
            }}
            onDragMove={(e) => {
               if (e.target.name() === 'endpoint-handle') return;
               const stage = e.target.getStage();
               const pos = stage.getPointerPosition();
               if (!pos) return;
               
               const transform = e.target.getParent().getAbsoluteTransform().copy().invert();
               const proj = transform.point(pos);
               
               const startProj = e.target.getAttr('dragStartProj');
               if (!startProj) return;
               
               const rawDeltaX = (proj.x - startProj.x) / scale;
               const rawDeltaZ = (proj.y - startProj.y) / scale;
               
               const bypassSnap = e.evt.altKey;
               const isShift = e.evt.shiftKey || orthoMode;
               
               let adjustedDeltaX = rawDeltaX;
               let adjustedDeltaZ = rawDeltaZ;
               
               if (isShift) {
                  if (Math.abs(rawDeltaX) > Math.abs(rawDeltaZ)) adjustedDeltaZ = 0;
                  else adjustedDeltaX = 0;
               }
               
               let finalDeltaX = adjustedDeltaX;
               let finalDeltaZ = adjustedDeltaZ;
               let guides: any[] = [];
               let snapType = null;
               
               if (!bypassSnap) {
                 const absScale = e.target.getAbsoluteScale().x;
                 const px = (startProj.x / scale) + adjustedDeltaX;
                 const pz = (startProj.y / scale) + adjustedDeltaZ;
                 const snapState = resolveBestSnap(px, pz, projectData, {
                    snapToGrid, snapToPoints, orthoMode: false, gridMinorStep, snapTolerancePx, scale: scale * absScale, showAlignmentGuides
                 });
                 finalDeltaX = snapState.x - (startProj.x / scale);
                 finalDeltaZ = snapState.z - (startProj.y / scale);
                 guides = snapState.guides || [];
                 snapType = snapState.type;
               }
               
               const items = useUIStore.getState().selectedItems;
               useProjectStore.getState().updateGroupDrag(finalDeltaX, finalDeltaZ, items);
               
               setActiveGuides(guides);
               if (snapType && !bypassSnap) {
                  setActiveSnapPoint({ x: (startProj.x / scale) + finalDeltaX, y: (startProj.y / scale) + finalDeltaZ, type: snapType });
               } else {
                  setActiveSnapPoint(null);
               }
               
               e.target.position({ x: 0, y: 0 });
            }}
            onDragEnd={(e) => {
               if (e.target.name() === 'endpoint-handle') return;
               setActiveGuides([]);
               setActiveSnapPoint(null);
               useProjectStore.getState().endGroupDrag(true);
            }}
          >
            {/* Base wall */}
            <Line
              points={wallPolygons.find(p => p.wall.id === wall.id)?.points || []}
              closed={true}
              opacity={0} // Invisible, only for hit detection
              hitStrokeWidth={10}
              onClick={handleClick}
              onMouseDown={handleMouseDown}
              onTap={handleClick}
              onMouseEnter={(e) => {
                 if (mode === 'select') {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'crosshair';
                 }
              }}
              onMouseLeave={(e) => {
                 if (mode === 'select') {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'crosshair';
                 }
              }}
            />

            {/* Topological Skeleton Line - Always visible in addWall mode or when selected to guide snapping */}
            {(mode === 'addWall' || isSelected) && (
              <Line
                points={[wall.start.x * scale, wall.start.z * scale, wall.end.x * scale, wall.end.z * scale]}
                stroke="#00bcd4"
                strokeWidth={1.5 / zoom}
                dash={[5 / zoom, 5 / zoom]}
                opacity={0.8}
                listening={false}
              />
            )}

            {isSelected && mode === 'select' && (
              <>
                <Circle
                  name="endpoint-handle"
                  x={start.x * scale}
                  y={start.y * scale}
                  radius={4.5 / zoom}
                  fill={theme.accent}
                  stroke="#ffffff"
                  strokeWidth={2 / zoom}
                  draggable
                  onDragStart={(e) => {
                     e.cancelBubble = true;
                     useProjectStore.getState().commitHistory();
                     
                     // Find connected endpoints using fresh state
                     const endpoints: { wallId: string; type: 'start' | 'end'; originalWall: IWall }[] = [];
                     const eps = 0.005;
                     const currentWalls = useProjectStore.getState().data.walls;
                     currentWalls.forEach(w => {
                        if (Math.abs(w.start.x - wall.start.x) <= eps && Math.abs(w.start.z - wall.start.z) <= eps) {
                           endpoints.push({ wallId: w.id, type: 'start', originalWall: { ...w } });
                        }
                        if (Math.abs(w.end.x - wall.start.x) <= eps && Math.abs(w.end.z - wall.start.z) <= eps) {
                           endpoints.push({ wallId: w.id, type: 'end', originalWall: { ...w } });
                        }
                     });
                     
                     dragState.current = {
                        connectedEndpoints: endpoints,
                        draggedVertexInitialPoint: { ...wall.start }
                     };
                  }}
                  onDragMove={(e) => {
                    e.cancelBubble = true;
                    const stage = e.target.getStage();
                    const pointer = stage.getPointerPosition();
                    if (!pointer) return;

                    const transform = e.target.getParent().getAbsoluteTransform().copy().invert();
                    const localPos = transform.point(pointer);
                    const rawX = localPos.x / scale;
                    const rawZ = localPos.y / scale;

                    const isShift = e.evt.shiftKey;
                    const orthoActive = isShift || orthoMode;
                    
                    let adjustedX = rawX;
                    let adjustedZ = rawZ;
                    
                    if (orthoActive) {
                       const dx = rawX - wall.end.x; // anchor is end
                       const dz = rawZ - wall.end.z;
                       if (Math.abs(dx) > Math.abs(dz)) {
                          adjustedZ = wall.end.z; // lock Z
                       } else {
                          adjustedX = wall.end.x; // lock X
                       }
                    }

                    const bypassSnap = e.evt.altKey;
                    let finalX = adjustedX;
                    let finalZ = adjustedZ;
                    let guides: any[] = [];
                    let snapType = null;
                    let snapped = false;

                    if (!bypassSnap) {
                       const absScale = e.target.getAbsoluteScale().x;
                       const snapState = resolveBestSnap(adjustedX, adjustedZ, projectData, {
                         snapToGrid, snapToPoints, orthoMode: false, startPoint: orthoActive ? wall.end : undefined, gridMinorStep, snapTolerancePx, scale: scale * absScale, showAlignmentGuides
                       });
                       finalX = snapState.x;
                       finalZ = snapState.z;
                       guides = snapState.guides || [];
                       snapType = snapState.type;
                       snapped = snapState.snapped;
                    }

                    finalX = Number(finalX.toFixed(4));
                    finalZ = Number(finalZ.toFixed(4));

                    // Validation
                    let isValid = true;
                    for (let conn of dragState.current.connectedEndpoints) {
                       const w = conn.originalWall;
                       const newStart = conn.type === 'start' ? { x: finalX, z: finalZ } : w.start;
                       const newEnd = conn.type === 'end' ? { x: finalX, z: finalZ } : w.end;
                       
                       const dx = newEnd.x - newStart.x;
                       const dz = newEnd.z - newStart.z;
                       const newLength = Math.sqrt(dx*dx + dz*dz);
                       
                       if (newLength < 0.1) {
                          isValid = false;
                          break;
                       }
                       
                       // Check openings
                       const openings = (projectData.openings || []).filter(o => o.wallId === w.id);
                       for (let o of openings) {
                          if (o.offsetFromStart + o.width > newLength) {
                             isValid = false;
                             break;
                          }
                       }
                       if (!isValid) break;
                    }
                    
                    if (!isValid) return;

                    e.target.position({ x: finalX * scale, y: finalZ * scale });
                    
                    if (dragState.current.connectedEndpoints.length > 0) {
                       const updates = dragState.current.connectedEndpoints.map(conn => ({
                          wallId: conn.wallId,
                          type: conn.type,
                          point: { x: finalX, z: finalZ }
                       }));
                       updateConnectedWallEndpoints(updates);
                    }

                    setActiveGuides(guides);
                    if (snapped && snapType && !bypassSnap) {
                      setActiveSnapPoint({ x: finalX, y: finalZ, type: snapType });
                    } else {
                      setActiveSnapPoint(null);
                    }
                  }}
                  onDragEnd={(e) => {
                    e.cancelBubble = true;
                    setActiveGuides([]);
                    setActiveSnapPoint(null);
                    dragState.current = { connectedEndpoints: [], draggedVertexInitialPoint: null };
                  }}
                  onMouseEnter={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'crosshair';
                    e.target.scale({ x: 1.4, y: 1.4 });
                  }}
                  onMouseLeave={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'crosshair';
                    e.target.scale({ x: 1, y: 1 });
                  }}
                />
                <Circle
                  name="endpoint-handle"
                  x={end.x * scale}
                  y={end.y * scale}
                  radius={4.5 / zoom}
                  fill={theme.accent}
                  stroke="#ffffff"
                  strokeWidth={2 / zoom}
                  draggable
                  onDragStart={(e) => {
                     e.cancelBubble = true;
                     useProjectStore.getState().commitHistory();
                     
                     // Find connected endpoints using fresh state
                     const endpoints: { wallId: string; type: 'start' | 'end'; originalWall: IWall }[] = [];
                     const eps = 0.005;
                     const currentWalls = useProjectStore.getState().data.walls;
                     currentWalls.forEach(w => {
                        if (Math.abs(w.start.x - wall.end.x) <= eps && Math.abs(w.start.z - wall.end.z) <= eps) {
                           endpoints.push({ wallId: w.id, type: 'start', originalWall: { ...w } });
                        }
                        if (Math.abs(w.end.x - wall.end.x) <= eps && Math.abs(w.end.z - wall.end.z) <= eps) {
                           endpoints.push({ wallId: w.id, type: 'end', originalWall: { ...w } });
                        }
                     });
                     
                     dragState.current = {
                        connectedEndpoints: endpoints,
                        draggedVertexInitialPoint: { ...wall.end }
                     };
                  }}
                  onDragMove={(e) => {
                    e.cancelBubble = true;
                    const stage = e.target.getStage();
                    const pointer = stage.getPointerPosition();
                    if (!pointer) return;

                    const transform = e.target.getParent().getAbsoluteTransform().copy().invert();
                    const localPos = transform.point(pointer);
                    const rawX = localPos.x / scale;
                    const rawZ = localPos.y / scale;

                    const isShift = e.evt.shiftKey;
                    const orthoActive = isShift || orthoMode;
                    
                    let adjustedX = rawX;
                    let adjustedZ = rawZ;
                    
                    if (orthoActive) {
                       const dx = rawX - wall.start.x; // anchor is start
                       const dz = rawZ - wall.start.z;
                       if (Math.abs(dx) > Math.abs(dz)) {
                          adjustedZ = wall.start.z; // lock Z
                       } else {
                          adjustedX = wall.start.x; // lock X
                       }
                    }

                    const bypassSnap = e.evt.altKey;
                    let finalX = adjustedX;
                    let finalZ = adjustedZ;
                    let guides: any[] = [];
                    let snapType = null;
                    let snapped = false;

                    if (!bypassSnap) {
                       const absScale = e.target.getAbsoluteScale().x;
                       const snapState = resolveBestSnap(adjustedX, adjustedZ, projectData, {
                         snapToGrid, snapToPoints, orthoMode: false, startPoint: orthoActive ? wall.start : undefined, gridMinorStep, snapTolerancePx, scale: scale * absScale, showAlignmentGuides
                       });
                       finalX = snapState.x;
                       finalZ = snapState.z;
                       guides = snapState.guides || [];
                       snapType = snapState.type;
                       snapped = snapState.snapped;
                    }

                    finalX = Number(finalX.toFixed(4));
                    finalZ = Number(finalZ.toFixed(4));

                    // Validation
                    let isValid = true;
                    for (let conn of dragState.current.connectedEndpoints) {
                       const w = conn.originalWall;
                       const newStart = conn.type === 'start' ? { x: finalX, z: finalZ } : w.start;
                       const newEnd = conn.type === 'end' ? { x: finalX, z: finalZ } : w.end;
                       
                       const dx = newEnd.x - newStart.x;
                       const dz = newEnd.z - newStart.z;
                       const newLength = Math.sqrt(dx*dx + dz*dz);
                       
                       if (newLength < 0.1) {
                          isValid = false;
                          break;
                       }
                       
                       // Check openings
                       const openings = (projectData.openings || []).filter(o => o.wallId === w.id);
                       for (let o of openings) {
                          if (o.offsetFromStart + o.width > newLength) {
                             isValid = false;
                             break;
                          }
                       }
                       if (!isValid) break;
                    }
                    
                    if (!isValid) return;

                    e.target.position({ x: finalX * scale, y: finalZ * scale });
                    
                    if (dragState.current.connectedEndpoints.length > 0) {
                       const updates = dragState.current.connectedEndpoints.map(conn => ({
                          wallId: conn.wallId,
                          type: conn.type,
                          point: { x: finalX, z: finalZ }
                       }));
                       updateConnectedWallEndpoints(updates);
                    }
                    
                    setActiveGuides(guides);
                    if (snapped && snapType && !bypassSnap) {
                      setActiveSnapPoint({ x: finalX, y: finalZ, type: snapType });
                    } else {
                      setActiveSnapPoint(null);
                    }
                  }}
                  onDragEnd={(e) => {
                    e.cancelBubble = true;
                    setActiveGuides([]);
                    setActiveSnapPoint(null);
                    dragState.current = { connectedEndpoints: [], draggedVertexInitialPoint: null };
                  }}
                  onMouseEnter={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'crosshair';
                    e.target.scale({ x: 1.4, y: 1.4 });
                  }}
                  onMouseLeave={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'crosshair';
                    e.target.scale({ x: 1, y: 1 });
                  }}
                />
              </>
            )}
          </Group>
        );
      })}
    </Group>
  );
};
