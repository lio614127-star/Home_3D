import React from 'react';
import { Group, Line, Rect, Text, Circle } from 'react-konva';
import { useUIStore } from '../../store/useUIStore';
import { useI18nStore } from '../../store/useI18nStore';
import { useProjectStore } from '../../store/useProjectStore';
import { IOpening, IWall } from '../../types';
import { getOpeningCenter, projectToCanvas } from '../../core/geometry/math';

interface Props {
  openings: IOpening[];
  walls: IWall[];
  scale: number;
}

export const OpeningLayer: React.FC<Props> = ({ openings, walls, scale }) => {
  const { selectedObjectId, setSelectedObject, mode, showOpeningLabels } = useUIStore();
  const updateOpening = useProjectStore(state => state.updateOpening);
  const { t } = useI18nStore();

  return (
    <Group>
      {(openings || []).map(opening => {
        if (!opening.visible) return null;
        
        const wall = walls.find(w => w.id === opening.wallId);
        if (!wall) return null;

        const center = getOpeningCenter(wall, opening.offsetFromStart, opening.width);
        const pos = projectToCanvas(center.x, center.z);
        
        const dx = wall.end.x - wall.start.x;
        const dz = wall.end.z - wall.start.z;
        const wallYaw = Math.atan2(dz, dx) * (180 / Math.PI); // degrees
        
        const isSelected = selectedObjectId === opening.id || useUIStore.getState().selectedItems.some(it => it.kind === 'opening' && it.openingId === opening.id);
        const isDoor = opening.type === 'door';
        const color = isDoor ? '#f57c00' : '#00b0ff';
        const shadowColor = isSelected ? '#fff59d' : 'transparent';
        const hoverBoxThickness = wall.thickness * scale + 20; // Fat hit box
        const visualThickness = 6; // Thin and minimal 2D presentation

        const handleClick = (e: any) => {
          if (mode === 'select') {
            e.cancelBubble = true;
            setSelectedObject(opening.id, 'opening');
          }
        };

        const handleDragMove = (e: any) => {
          e.cancelBubble = true;
          const node = e.target;
          const stage = node.getStage();
          const ptr = stage.getPointerPosition();
          if (!ptr) return;

          const dx = wall.end.x - wall.start.x;
          const dz = wall.end.z - wall.start.z;
          const wallLen = Math.sqrt(dx*dx + dz*dz);
          const unitX = dx / wallLen;
          const unitZ = dz / wallLen;

          const transform = node.getParent().getAbsoluteTransform().copy().invert();
          const localPos = transform.point(ptr);

          const projX = localPos.x / scale;
          const projZ = localPos.y / scale;

          const vx = projX - wall.start.x;
          const vz = projZ - wall.start.z;

          let offset = vx * unitX + vz * unitZ - opening.width / 2;
          
          const bypassSnap = e.evt.altKey;
          const { snapToGrid, gridMinorStep } = useUIStore.getState();
          if (!bypassSnap && snapToGrid) {
            const absScale = node.getAbsoluteScale().x;
            const screenScale = scale * absScale;
            const activeStep = screenScale > 30 ? gridMinorStep : gridMinorStep * 2;
            offset = Math.round(offset / activeStep) * activeStep;
          }

          offset = Math.max(0, Math.min(wallLen - opening.width, offset));
          offset = Math.round(offset * 10000) / 10000;

          updateOpening(opening.id, { offsetFromStart: offset });
          
          const center = getOpeningCenter(wall, offset, opening.width);
          node.position({
            x: center.x * scale,
            y: center.z * scale,
          });
        };

        const handleDragEnd = (e: any) => {
          e.cancelBubble = true;
          // History already committed on drag start
        };

        return (
          <Group 
            key={opening.id} 
            x={pos.x * scale} 
            y={pos.y * scale} 
            rotation={wallYaw}
            onClick={handleClick}
            onTap={handleClick}
            listening={mode === 'select'}
            draggable={mode === 'select' && useUIStore.getState().selectedItems.length <= 1}
            onDragStart={(e) => {
              e.cancelBubble = true;
              useProjectStore.getState().commitHistory();
              setSelectedObject(opening.id, 'opening');
            }}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            onMouseEnter={(e) => {
              if (mode === 'select') {
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = 'grab';
              }
            }}
            onMouseLeave={(e) => {
              if (mode === 'select') {
                const container = e.target.getStage()?.container();
                if (container) container.style.cursor = 'default';
              }
            }}
          >
            {/* Invisible Hit Box for easy clicking */}
            <Rect
              x={- (opening.width * scale) / 2}
              y={- hoverBoxThickness / 2}
              width={opening.width * scale}
              height={hoverBoxThickness}
              fill="transparent"
            />
            
            {/* Visual Opening Box */}
            <Rect
              x={- (opening.width * scale) / 2}
              y={- visualThickness / 2}
              width={opening.width * scale}
              height={visualThickness}
              fill={color}
              stroke={isSelected ? '#ffff00' : '#555'}
              strokeWidth={isSelected ? 2 : 1}
              shadowColor={shadowColor}
              shadowBlur={isSelected ? 5 : 0}
            />
            
            {/* Text Label */}
            {(showOpeningLabels || isSelected) && (
              <Group x={0} y={-visualThickness / 2 - 22} listening={false}>
                <Rect 
                  x={-((opening.type === 'door' ? t("object.door") : t("object.window")).length * 5 + 40) / 2}
                  y={-6}
                  width={(opening.type === 'door' ? t("object.door") : t("object.window")).length * 5 + 40}
                  height={14}
                  fill="rgba(255,255,255,0.7)"
                  cornerRadius={2}
                />
                <Text
                  x={-50}
                  y={-4}
                  text={`${opening.type === 'door' ? t("object.door") : t("object.window")} ${opening.width.toFixed(2)}m`}
                  fill={isSelected ? '#000' : '#666'}
                  fontSize={11}
                  fontStyle="normal"
                  align="center"
                  width={100}
                  wrap="none"
                />
              </Group>
            )}

            {/* End Markers */}
            <Circle x={-(opening.width * scale) / 2} y={0} radius={isSelected ? 4 : 2} fill="#fff" stroke={color} strokeWidth={1} listening={false} />
            <Circle x={(opening.width * scale) / 2} y={0} radius={isSelected ? 4 : 2} fill="#fff" stroke={color} strokeWidth={1} listening={false} />

            {/* Swing Arc for Door */}
            {isDoor && (
               <Group listening={false}>
                 {/* Hinge point */}
                 {(() => {
                   const hLeft = opening.hingeSide !== 'right'; // default left
                   const outward = opening.openDirection === 'outward';
                   const angle = opening.swingAngle !== undefined ? opening.swingAngle : 90;
                   const startX = hLeft ? -(opening.width * scale) / 2 : (opening.width * scale) / 2;
                   const dirY = outward ? 1 : -1;
                   
                   // Draw leaf line
                   const leafLen = opening.width * scale;
                   // Radian rotation
                   const rad = (angle * Math.PI) / 180;
                   const endX = startX + (hLeft ? 1 : -1) * leafLen * Math.cos(rad);
                   const endY = dirY * visualThickness / 2 + dirY * leafLen * Math.sin(rad);

                   return (
                     <>
                       <Line
                         points={[startX, dirY * visualThickness / 2, endX, endY]}
                         stroke={color}
                         strokeWidth={1}
                       />
                       {/* Simple arc approximation */}
                       <Line
                         points={[
                           endX, endY,
                           startX + (hLeft ? 1 : -1) * leafLen * Math.cos(rad / 2), dirY * visualThickness / 2 + dirY * leafLen * Math.sin(rad / 2),
                           startX + (hLeft ? 1 : -1) * leafLen, dirY * visualThickness / 2
                         ]}
                         stroke={color}
                         strokeWidth={1}
                         dash={[4, 4]}
                         tension={0.5}
                       />
                     </>
                   );
                 })()}
               </Group>
            )}
          </Group>
        );
      })}
    </Group>
  );
};
