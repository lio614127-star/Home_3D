import React, { useRef } from 'react';
import { Line, Group, Text, Circle } from 'react-konva';
import { IArea } from '../../types';
import { projectToCanvas, getPolygonArea, getPolygonCentroid, distanceToSegment, formatArea, subtractOverlappingWalls, getAreaNetSize } from '../../core/geometry/math';
import { resolveBestSnap } from '../../core/geometry/snap';
import { useUIStore } from '../../store/useUIStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useTheme } from '../../theme/tokens';
import { useI18nStore } from '../../store/useI18nStore';
import { SelectionManager } from '../../core/selection/SelectionManager';

interface Props {
  scale: number;
  zoom?: number;
}

export const AreaLayer: React.FC<Props> = ({ areas, scale, zoom = 1 }) => {
  const { selectedObjectId, setSelectedObject, mode, snapToGrid, snapToPoints, gridMinorStep, snapTolerancePx, showAreaName, showAreaArea, showAlignmentGuides, setActiveGuides, setActiveSnapPoint } = useUIStore();
  const updateArea = useProjectStore(state => state.updateArea);
  const insertAreaPoint = useProjectStore(state => state.insertAreaPoint);
  const projectData = useProjectStore(state => state.data);
  const theme = useTheme();
  const { t } = useI18nStore();
  
  const dragState = useRef({
    initialPoints: [] as {x: number, z: number}[]
  });

  // Only listen to events in select mode — in drawing modes, Canvas2D handles clicks
  const isSelectMode = mode === 'select';

  const getClickProjectCoord = (e: any): {x: number, z: number} | null => {
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!stage || !pos) return null;
    // Go up to the scaled Group (Layer > Group[zoom])
    const zoomGroup = stage.children?.[0]?.children?.[0];
    if (!zoomGroup) return null;
    const transform = zoomGroup.getAbsoluteTransform().copy().invert();
    const proj = transform.point(pos);
    return { x: proj.x / scale, z: proj.y / scale };
  };

  const handleMiddleClickInsert = (e: any, area: IArea) => {
    // Middle click (button===1) or Alt+Left click
    const isMiddle = e.evt.button === 1;
    const isAltClick = e.evt.button === 0 && e.evt.altKey;
    if (!isMiddle && !isAltClick) return false;
    
    e.evt.preventDefault();
    e.cancelBubble = true;
    
    const clickP = getClickProjectCoord(e);
    if (!clickP) return true;
    
    // Find closest edge
    let minDistance = Infinity;
    let bestEdgeIndex = -1;
    let bestProj: {x: number, z: number} | null = null;
    
    for (let i = 0; i < area.points.length; i++) {
      const p1 = area.points[i];
      const p2 = area.points[(i + 1) % area.points.length];
      const res = distanceToSegment(clickP, p1, p2);
      if (res.distance < minDistance) {
        minDistance = res.distance;
        bestEdgeIndex = i;
        bestProj = res.projection;
      }
    }
    
    // Tolerance: 0.5m for edge detection
    if (minDistance < 0.5 && bestProj && bestEdgeIndex !== -1) {
      const p1 = area.points[bestEdgeIndex];
      const p2 = area.points[(bestEdgeIndex + 1) % area.points.length];
      const distToP1 = Math.sqrt(Math.pow(bestProj.x - p1.x, 2) + Math.pow(bestProj.z - p1.z, 2));
      const distToP2 = Math.sqrt(Math.pow(bestProj.x - p2.x, 2) + Math.pow(bestProj.z - p2.z, 2));
      
      if (distToP1 > 0.2 && distToP2 > 0.2) {
        const exactP = { x: Number(bestProj.x.toFixed(4)), z: Number(bestProj.z.toFixed(4)) };
        useProjectStore.getState().commitHistory();
        insertAreaPoint(area.id, bestEdgeIndex, exactP);
        SelectionManager.handleSingleClick({ type: 'area', id: area.id }, false);
        return true;
      }
    }
    return true; // consumed the event even if we didn't insert
  };

  return (
    <Group listening={isSelectMode}>
      {areas.map((area, index) => {
        if (!area.visible) return null;
        
        const uiState = useUIStore.getState();
        const isSelected = selectedObjectId === area.id || 
                           (area.buildingId && selectedObjectId === area.buildingId && uiState.selectedObjectType === 'building') || 
                           uiState.selectedItems.some(it => (it.type === 'area' && it.id === area.id) || (it.type === 'building' && it.id === area.buildingId));
        const flatPoints = area.points.flatMap(p => [p.x * scale, p.z * scale]);
        const areaValue = getAreaNetSize(area, projectData.walls);
        const centroid = getPolygonCentroid(area.points);
        const centroidCanvas = projectToCanvas(centroid.x, centroid.z);
        
        const xs = area.points.map(p => p.x);
        const zs = area.points.map(p => p.z);
        const areaWidth = Math.max(...xs) - Math.min(...xs);
        const areaDepth = Math.max(...zs) - Math.min(...zs);
        const dynamicTextSize = Math.max(0.2, Math.min(areaWidth, areaDepth) * 0.15);
        const actualTextSize = area.textSize || dynamicTextSize;

        return (
          <Group 
            key={area.id}
            onMouseDown={(e: any) => {
              if (!isSelectMode) return;
              // Handle middle-click / alt-click insert vertex
              if (e.evt.button === 1 || (e.evt.button === 0 && e.evt.altKey)) {
                handleMiddleClickInsert(e, area);
                return;
              }
              // Left click: select
              if (e.evt.button === 0) {
                e.cancelBubble = true;
                SelectionManager.handleSingleClick({ type: 'area', id: area.id }, e.evt);
              }
            }}
            onContextMenu={(e: any) => {
              if (isSelectMode) {
                e.evt.preventDefault();
              }
            }}
          >
            {/* Fill and Hit Area */}
            <Line
              points={flatPoints}
              closed={true}
              fill={isSelected ? theme.selectionFill : (area.color ? area.color : theme.roomFill)}
              strokeEnabled={false}
              hitStrokeWidth={10}
              onMouseEnter={(e) => {
                if (isSelectMode) {
                  const container = e.target.getStage()?.container();
                  if (container) container.style.cursor = 'crosshair';
                }
              }}
              onMouseLeave={(e) => {
                if (isSelectMode) {
                  const container = e.target.getStage()?.container();
                  if (container) container.style.cursor = 'crosshair';
                }
              }}
            />
            
            {/* Subtracted Borders */}
            {area.points.map((p1, i) => {
              const p2 = area.points[(i + 1) % area.points.length];
              const visibleSegments = subtractOverlappingWalls(p1, p2, projectData.walls);
              return visibleSegments.map((seg, segIdx) => (
                <Line
                  key={`edge-${i}-${segIdx}`}
                  points={[seg.start.x * scale, seg.start.z * scale, seg.end.x * scale, seg.end.z * scale]}
                  stroke={isSelected ? theme.selectionStroke : theme.roomStroke}
                  strokeWidth={isSelected ? 3 : 1.5}
                  dash={area.locked ? [5, 5] : [10, 5]}
                  listening={false}
                />
              ));
            })}

            {(() => {
              const shouldShowName = area.showName ?? showAreaName;
              const shouldShowArea = area.showArea ?? showAreaArea;
              const namePart = shouldShowName ? (area.name || `Phòng ${index + 1}`) : '';
              const areaPart = shouldShowArea && areaValue > 0 ? formatArea(getAreaNetSize(area, projectData.walls)) : '';
              const displayText = [namePart, areaPart].filter(Boolean).join('\n');
              
              if (!displayText && !isSelected) return null;

              return (
                <Group x={centroidCanvas.x * scale} y={centroidCanvas.y * scale} listening={false}>
                    {displayText && (
                      <Text
                        text={displayText}
                        fontSize={actualTextSize * scale}
                        fill={theme.textPrimary}
                        align="center"
                        fontStyle={showAreaName ? "bold" : "normal"}
                        verticalAlign="middle"
                        x={-10000}
                        y={-10000}
                        width={20000}
                        height={20000}
                      />
                    )}
                </Group>
              );
            })()}

            {/* Handles are now rendered separately in AreaHandles */}
          </Group>
        );
      })}
    </Group>
  );
};

export const AreaHandles: React.FC<Props & { areas: IArea[] }> = ({ areas, scale, zoom = 1 }) => {
  const { selectedObjectId, mode, snapToGrid, snapToPoints, gridMinorStep, snapTolerancePx, showAlignmentGuides, setActiveGuides, setActiveSnapPoint } = useUIStore();
  const updateArea = useProjectStore(state => state.updateArea);
  const projectData = useProjectStore(state => state.data);
  const theme = useTheme();
  const isSelectMode = mode === 'select';

  return (
    <Group listening={isSelectMode}>
      {areas.map((area) => {
        if (!area.visible) return null;
        const uiState = useUIStore.getState();
        const isSelected = selectedObjectId === area.id || 
                           (area.buildingId && selectedObjectId === area.buildingId && uiState.selectedObjectType === 'building') || 
                           uiState.selectedItems.some(it => (it.type === 'area' && it.id === area.id) || (it.type === 'building' && it.id === area.buildingId));
        
        if (!isSelected || !isSelectMode) return null;

        return (
          <Group key={`handles-${area.id}`}>
            {area.points.map((pt, idx) => (
               <Circle
                 key={`vertex-${idx}`}
                 name="vertex-handle"
                 x={pt.x * scale}
                 y={pt.z * scale}
                 radius={6 / zoom}
                 fill={theme.appBg}
                 stroke={theme.accent}
                 strokeWidth={2 / zoom}
                 draggable
                 onMouseEnter={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'crosshair';
                    e.target.scale({ x: 1.5, y: 1.5 });
                 }}
                 onMouseLeave={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'crosshair';
                    e.target.scale({ x: 1, y: 1 });
                 }}
                 onDragStart={(e) => {
                    e.cancelBubble = true;
                    useProjectStore.getState().commitHistory();
                 }}
                 onDragMove={(e) => {
                    e.cancelBubble = true;
                    const stage = e.target.getStage();
                    const pos = stage.getPointerPosition();
                    if (!pos) return;
                    
                    const zoomGroup = stage.children?.[0]?.children?.[0] || stage.children?.[2]?.children?.[0];
                    if (!zoomGroup) return;
                    const transform = zoomGroup.getAbsoluteTransform().copy().invert();
                    const proj = transform.point(pos);
                    
                    let rawX = proj.x / scale;
                    let rawZ = proj.y / scale;
                    
                    const bypassSnap = e.evt.altKey;
                    const isShift = e.evt.shiftKey;
                    
                    let finalX = rawX;
                    let finalZ = rawZ;
                    let guides: any[] = [];
                    let snapType = null;
                    let snapped = false;
                    
                    if (!bypassSnap) {
                       const absScale = zoomGroup.getAbsoluteScale().x;
                       const snapState = resolveBestSnap(rawX, rawZ, projectData, {
                          snapToGrid, snapToPoints, orthoMode: false, gridMinorStep, snapTolerancePx, scale: scale * absScale, showAlignmentGuides
                       });
                       finalX = snapState.x;
                       finalZ = snapState.z;
                       guides = snapState.guides || [];
                       snapType = snapState.type;
                       snapped = snapState.snapped;
                    }
                    
                    if (isShift) {
                       const originalPt = area.points[idx];
                       if (Math.abs(finalX - originalPt.x) > Math.abs(finalZ - originalPt.z)) {
                          finalZ = originalPt.z;
                       } else {
                          finalX = originalPt.x;
                       }
                    }
                    
                    finalX = Number(finalX.toFixed(4));
                    finalZ = Number(finalZ.toFixed(4));
                    
                    const newPoints = [...area.points];
                    newPoints[idx] = { x: finalX, z: finalZ };
                    const newArea = getPolygonArea(newPoints);
                    if (newArea >= 0.01) {
                       updateArea(area.id, { points: newPoints });
                    }
                    
                    setActiveGuides(guides);
                    if (snapped) {
                       setActiveSnapPoint({ x: finalX, y: finalZ, type: snapType || 'point' });
                    } else {
                       setActiveSnapPoint(null);
                    }
                    
                    e.target.position({x: finalX * scale, y: finalZ * scale});
                 }}
                 onDragEnd={(e) => {
                    e.cancelBubble = true;
                    setActiveGuides([]);
                    setActiveSnapPoint(null);
                 }}
               />
            ))}
          </Group>
        );
      })}
    </Group>
  );
};
