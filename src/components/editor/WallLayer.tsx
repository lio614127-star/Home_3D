import React, { useRef } from 'react';
import { Line, Group, Circle } from 'react-konva';
import { IWall } from '../../types';
import { projectToCanvas, getOffsetFromStartOnWall, normalizeCoord } from '../../core/geometry/math';
import { resolveBestSnap } from '../../core/geometry/snap';
import { useUIStore } from '../../store/useUIStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useTheme } from '../../theme/tokens';
import { useI18nStore } from '../../store/useI18nStore';

interface Props {
  walls: IWall[];
  scale: number;
}

export const WallLayer: React.FC<Props> = ({ walls, scale }) => {
  const { selectedObjectId, setSelectedObject, mode, setMode, snapToGrid, snapToPoints, orthoMode, gridMinorStep, snapTolerancePx, showAlignmentGuides, setActiveGuides, setActiveSnapPoint } = useUIStore();
  const addWall = useProjectStore(state => state.addWall);
  const updateWall = useProjectStore(state => state.updateWall);
  const updateConnectedWallEndpoints = useProjectStore(state => state.updateConnectedWallEndpoints);
  const updateOpening = useProjectStore(state => state.updateOpening);
  const projectData = useProjectStore(state => state.data);
  const theme = useTheme();
  const { t } = useI18nStore();

  const dragState = useRef<{
    connectedEndpoints: { wallId: string; type: 'start' | 'end'; originalWall: IWall }[];
    draggedVertexInitialPoint: { x: number; z: number } | null;
  }>({
    connectedEndpoints: [],
    draggedVertexInitialPoint: null
  });

  return (
    <Group>
      {walls.map(wall => {
        if (!wall.visible) return null;
        
        const start = projectToCanvas(wall.start.x, wall.start.z);
        const end = projectToCanvas(wall.end.x, wall.end.z);
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
              points={[start.x * scale, start.y * scale, end.x * scale, end.y * scale]}
              stroke={theme.wallStroke}
              strokeWidth={wall.thickness * scale}
              hitStrokeWidth={Math.max(wall.thickness * scale + 10, 15)}
              lineCap="square"
              onClick={handleClick}
              onMouseDown={handleMouseDown}
              onTap={handleClick}
              onMouseEnter={(e) => {
                 if (mode === 'select') {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'move';
                 }
              }}
              onMouseLeave={(e) => {
                 if (mode === 'select') {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'default';
                 }
              }}
            />

            {/* Selection overlay */}
            {isSelected && mode === 'select' && (
              <Line
                points={[start.x * scale, start.y * scale, end.x * scale, end.y * scale]}
                stroke={theme.selectionStroke}
                strokeWidth={wall.thickness * scale + 4}
                lineCap="square"
                opacity={0.3}
                listening={false}
              />
            )}

            {isSelected && mode === 'select' && (
              <>
                <Circle
                  name="endpoint-handle"
                  x={start.x * scale}
                  y={start.y * scale}
                  radius={5}
                  fill={theme.appBg}
                  stroke={theme.selectionStroke}
                  strokeWidth={1.5}
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
                    if (container) container.style.cursor = 'move';
                    e.target.scale({ x: 1.4, y: 1.4 });
                  }}
                  onMouseLeave={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'default';
                    e.target.scale({ x: 1, y: 1 });
                  }}
                />
                <Circle
                  name="endpoint-handle"
                  x={end.x * scale}
                  y={end.y * scale}
                  radius={5}
                  fill={theme.appBg}
                  stroke={theme.selectionStroke}
                  strokeWidth={1.5}
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
                    if (container) container.style.cursor = 'move';
                    e.target.scale({ x: 1.4, y: 1.4 });
                  }}
                  onMouseLeave={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'default';
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
