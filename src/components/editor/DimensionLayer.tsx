import React from 'react';
import { Group, Text, Line, Circle } from 'react-konva';
import { IWall, IArea, IBuilding } from '../../types';
import { getWallLength, projectToCanvas, formatMeters } from '../../core/geometry/math';
import { resolveBestSnap } from '../../core/geometry/snap';
import { useI18nStore } from '../../store/useI18nStore';
import { useUIStore } from '../../store/useUIStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useTheme } from '../../theme/tokens';

interface Props {
  walls: IWall[];
  areas?: IArea[];
  building?: IBuilding;
  scale: number;
  zoom?: number;
}

interface DimensionProps {
  id: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
  offsetDist: number;
  text: string;
  scale: number;
  color?: string;
  isManual?: boolean;
  isSelected?: boolean;
  onClick?: (e: any) => void;
  onOffsetChange?: (newOffset: number) => void;
  onOffsetChange?: (newOffset: number) => void;
  onPointChange?: (point: 'start' | 'end' | 'end_drag', newPos: { x: number; y: number }, absScale: number, altKey?: boolean, shiftKey?: boolean) => void;
  zoom?: number;
}

export const DimensionCAD: React.FC<DimensionProps> = ({ start, end, offsetDist, text, scale, color = "#555", isManual, isSelected, onClick, onOffsetChange, onPointChange, zoom = 1 }) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.01) return null;

  const ux = dx / len;
  const uy = dy / len;
  
  // Normal vector (perpendicular)
  const nx = -uy;
  const ny = ux;

  // Offset points
  const p1x = start.x * scale;
  const p1y = start.y * scale;
  const p2x = end.x * scale;
  const p2y = end.y * scale;
  
  const offsetPx = offsetDist * scale;
  const op1x = p1x + nx * offsetPx;
  const op1y = p1y + ny * offsetPx;
  const op2x = p2x + nx * offsetPx;
  const op2y = p2y + ny * offsetPx;

  // Architectural tick marks (45 degree angles)
  const tickLen = 4 / zoom;
  const tick1 = [op1x - tickLen, op1y - tickLen, op1x + tickLen, op1y + tickLen];
  const tick2 = [op2x - tickLen, op2y - tickLen, op2x + tickLen, op2y + tickLen];

  // Text position and rotation
  const midX = (op1x + op2x) / 2;
  const midY = (op1y + op2y) / 2;
  
  let angle = Math.atan2(dy, dx) * (180 / Math.PI);
  // Keep text upright
  if (angle > 90 || angle < -90) {
    angle += 180;
  }

  // Push text exactly above the line
  const textPush = 6 / zoom;
  const txtX = midX + nx * textPush;
  const txtY = midY + ny * textPush;

  // Dynamic font size: scales between 11px and 26px based on dimension length
  const baseFontSize = Math.max(11, Math.min(len * 4, 26));
  const dynamicFontSize = baseFontSize / zoom;

  const [dragContext, setDragContext] = React.useState<{ ptrDist: number, initOffset: number } | null>(null);

  return (
    <Group 
      listening={!!isManual} 
      onClick={onClick} 
      onTap={onClick}
      onMouseEnter={(e) => {
        if (isManual) {
          const container = e.target.getStage()?.container();
          if (container) container.style.cursor = 'crosshair';
        }
      }}
      onMouseLeave={(e) => {
        if (isManual) {
          const container = e.target.getStage()?.container();
          if (container) container.style.cursor = 'crosshair';
        }
      }}
      draggable={!!isManual && isSelected && useUIStore.getState().selectedItems.length <= 1}
      onDragStart={(e) => {
        if (!isManual) return;
        useProjectStore.getState().commitHistory();

        const node = e.target;
        const stage = node.getStage();
        const ptr = stage.getPointerPosition();
        if (!ptr) return;
        
        const transform = stage.getAbsoluteTransform().copy().invert();
        const localPos = transform.point(ptr);
        const projX = localPos.x / scale;
        const projY = localPos.y / scale;
        
        const dxLine = end.x - start.x;
        const dyLine = end.y - start.y;
        const lenLine = Math.sqrt(dxLine*dxLine + dyLine*dyLine);
        const uxx = dxLine / lenLine;
        const uyy = dyLine / lenLine;
        const nxx = -uyy;
        const nyy = uxx;
        
        const vx = projX - start.x;
        const vy = projY - start.y;
        const dist = vx * nxx + vy * nyy;
        
        setDragContext({ ptrDist: dist, initOffset: offsetDist });
      }}
      onDragMove={(e) => {
        if (!isManual) return;
        const node = e.target;
        const stage = node.getStage();
        const ptr = stage.getPointerPosition();
        if (!ptr) return;

        const transform = stage.getAbsoluteTransform().copy().invert();
        const localPos = transform.point(ptr);
        const projX = localPos.x / scale;
        const projY = localPos.y / scale;

        const dxLine = end.x - start.x;
        const dyLine = end.y - start.y;
        const lenLine = Math.sqrt(dxLine*dxLine + dyLine*dyLine);
        const uxx = dxLine / lenLine;
        const uyy = dyLine / lenLine;
        const nxx = -uyy;
        const nyy = uxx;

        const vx = projX - start.x;
        const vy = projY - start.y;
        const dist = vx * nxx + vy * nyy;
        
        if (onOffsetChange) {
          if (dragContext) {
            onOffsetChange(dragContext.initOffset + (dist - dragContext.ptrDist));
          } else {
            onOffsetChange(dist);
          }
        }
        
        node.position({ x: 0, y: 0 });
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        e.target.position({ x: 0, y: 0 });
        setDragContext(null);
      }}
    >
      {/* Witness lines */}
      <Line points={[p1x + nx * (2/zoom), p1y + ny * (2/zoom), op1x + nx * (5/zoom), op1y + ny * (5/zoom)]} stroke={color} strokeWidth={1/zoom} opacity={0.6} listening={false} dash={[4/zoom, 4/zoom]} />
      <Line points={[p2x + nx * (2/zoom), p2y + ny * (2/zoom), op2x + nx * (5/zoom), op2y + ny * (5/zoom)]} stroke={color} strokeWidth={1/zoom} opacity={0.6} listening={false} dash={[4/zoom, 4/zoom]} />
      
      {/* Main dimension line */}
      <Line points={[op1x, op1y, op2x, op2y]} stroke={isSelected ? '#ffff00' : color} strokeWidth={isSelected ? 2/zoom : 1/zoom} listening={false} />
      {isManual && (
        <Line points={[op1x, op1y, op2x, op2y]} stroke="transparent" strokeWidth={20/zoom} />
      )}
      
      {/* Ticks */}
      <Line points={tick1} stroke={color} strokeWidth={1.5/zoom} listening={false} />
      <Line points={tick2} stroke={color} strokeWidth={1.5/zoom} listening={false} />
      
      {/* Text */}
      <Group x={txtX} y={txtY} rotation={angle} listening={false}>
        <Text
          x={-500}
          y={-(dynamicFontSize / 2)}
          text={text}
          fontSize={dynamicFontSize}
          fill={isSelected ? '#ffff00' : color}
          fontStyle={isSelected ? "bold" : "normal"}
          align="center"
          width={1000}
        />
      </Group>

      {/* Handles */}
      {isManual && isSelected && (
        <Group listening={true}>
          <Circle
            x={p1x} y={p1y} radius={5 / zoom} fill="#fff" stroke="#1976d2" strokeWidth={1.5 / zoom} draggable
            onDragStart={(e: any) => {
              e.cancelBubble = true;
              useProjectStore.getState().commitHistory();
            }}
            onDragMove={(e: any) => {
              e.cancelBubble = true;
              const node = e.target;
              const ptr = node.getStage().getPointerPosition();
              if (!ptr) return;
              const transform = node.getParent().getAbsoluteTransform().copy().invert();
              const localPos = transform.point(ptr);
              const absScale = node.getAbsoluteScale().x;
              
              if (onPointChange) onPointChange('start', { x: localPos.x / scale, y: localPos.y / scale }, absScale, e.evt.altKey, e.evt.shiftKey);
              node.position({ x: p1x, y: p1y });
            }}
            onDragEnd={(e: any) => { 
              e.cancelBubble = true; 
              e.target.position({ x: p1x, y: p1y }); 
              if (onPointChange) onPointChange('end_drag', { x: 0, y: 0 }, 1);
            }}
            onMouseEnter={(e: any) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = 'crosshair';
              e.target.scale({ x: 1.4, y: 1.4 });
            }}
            onMouseLeave={(e: any) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = 'crosshair';
              e.target.scale({ x: 1, y: 1 });
            }}
          />
          <Circle
            x={p2x} y={p2y} radius={5 / zoom} fill="#fff" stroke="#1976d2" strokeWidth={1.5 / zoom} draggable
            onDragStart={(e: any) => {
              e.cancelBubble = true;
              useProjectStore.getState().commitHistory();
            }}
            onDragMove={(e: any) => {
              e.cancelBubble = true;
              const node = e.target;
              const ptr = node.getStage().getPointerPosition();
              if (!ptr) return;
              const transform = node.getParent().getAbsoluteTransform().copy().invert();
              const localPos = transform.point(ptr);
              const absScale = node.getAbsoluteScale().x;
              
              if (onPointChange) onPointChange('end', { x: localPos.x / scale, y: localPos.y / scale }, absScale, e.evt.altKey, e.evt.shiftKey);
              node.position({ x: p2x, y: p2y });
            }}
            onDragEnd={(e: any) => { 
              e.cancelBubble = true; 
              e.target.position({ x: p2x, y: p2y }); 
              if (onPointChange) onPointChange('end_drag', { x: 0, y: 0 }, 1);
            }}
            onMouseEnter={(e: any) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = 'crosshair';
              e.target.scale({ x: 1.4, y: 1.4 });
            }}
            onMouseLeave={(e: any) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = 'crosshair';
              e.target.scale({ x: 1, y: 1 });
            }}
          />
        </Group>
      )}
    </Group>
  );
};

export const DimensionLayer: React.FC<Props> = ({ walls, areas, building, scale, zoom = 1 }) => {
  const { showManualDimensions, selectedObjectId, setSelectedObject, mode, snapToGrid, snapToPoints, gridMinorStep, snapTolerancePx, showAlignmentGuides, setActiveGuides, setActiveSnapPoint } = useUIStore();
  const annotations = useProjectStore(state => state.data.annotations || []);
  const theme = useTheme();
  
  return (
    <Group listening={mode === 'select' || mode === 'measure'}>
      {/* Manual Dimensions */}


      {/* Manual Dimensions */}
      {showManualDimensions && annotations.filter(a => a.type === 'dimension').map(dim => {
        const dx = dim.end.x - dim.start.x;
        const dz = dim.end.z - dim.start.z;
        const len = Math.sqrt(dx*dx + dz*dz);
        return (
          <DimensionCAD
            key={dim.id}
            id={dim.id}
            start={{ x: dim.start.x, y: dim.start.z }}
            end={{ x: dim.end.x, y: dim.end.z }}
            offsetDist={dim.offsetDistance || 1}
            text={formatMeters(len)}
            scale={scale}
            zoom={zoom}
            color={theme.dimensionStroke}
            isManual={true}
            isSelected={selectedObjectId === dim.id || useUIStore.getState().selectedItems.some(it => it.kind === 'dimension' && it.annotationId === dim.id)}
            onClick={(e) => {
              e.cancelBubble = true;
              setSelectedObject(dim.id, 'dimension');
            }}
            onOffsetChange={(dist) => {
               useProjectStore.getState().updateAnnotation(dim.id, { offsetDistance: dist });
            }}
            onPointChange={(point, newPos, absScale, altKey, shiftKey) => {
               if (point === 'end_drag') {
                 setActiveGuides([]);
                 setActiveSnapPoint(null);
                 return;
               }

               let finalX = newPos.x;
               let finalZ = newPos.y;
               let guides: any[] = [];
               let snapType = null;
               let snapped = false;

               if (!altKey) {
                 const orthoActive = !!shiftKey;
                 
                 let adjustedX = newPos.x;
                 let adjustedZ = newPos.y;
                 if (orthoActive) {
                    const anchor = point === 'start' ? dim.end : dim.start;
                    const dx = newPos.x - anchor.x;
                    const dz = newPos.y - anchor.z;
                    if (Math.abs(dx) > Math.abs(dz)) adjustedZ = anchor.z;
                    else adjustedX = anchor.x;
                 }

                 const snapState = resolveBestSnap(adjustedX, adjustedZ, useProjectStore.getState().data, {
                   snapToGrid, snapToPoints, orthoMode: orthoActive, startPoint: orthoActive ? (point === 'start' ? dim.end : dim.start) : undefined, gridMinorStep, snapTolerancePx, scale: scale * absScale, showAlignmentGuides
                 });
                 finalX = snapState.x;
                 finalZ = snapState.z;
                 guides = snapState.guides || [];
                 snapType = snapState.type;
                 snapped = snapState.snapped;
               }
               
               const updates: any = {};
               if (point === 'start') {
                 if (Math.abs(finalX - dim.end.x) > 0.01 || Math.abs(finalZ - dim.end.z) > 0.01) {
                   updates.start = { x: finalX, z: finalZ };
                 }
               } else {
                 if (Math.abs(finalX - dim.start.x) > 0.01 || Math.abs(finalZ - dim.start.z) > 0.01) {
                   updates.end = { x: finalX, z: finalZ };
                 }
               }
               
               if (Object.keys(updates).length > 0) {
                 useProjectStore.getState().updateAnnotation(dim.id, updates);
                 setActiveGuides(guides);
                 if (snapped && snapType && !altKey) {
                   setActiveSnapPoint({ x: finalX, y: finalZ, type: snapType });
                 } else {
                   setActiveSnapPoint(null);
                 }
               }
            }}
          />
        );
      })}
    </Group>
  );
};
