import React from 'react';
import { IPlacedAsset } from '../../types';
import { getAssetDefinition } from '../../core/assets/catalog';
import { useUIStore } from '../../store/useUIStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useTheme } from '../../theme/tokens';
import { SelectionManager } from '../../core/selection/SelectionManager';
import { Group, Rect, Circle, Text } from 'react-konva';

const PX_PER_METER = 20;

interface Asset2DProps {
  asset: IPlacedAsset;
}

export const Asset2D: React.FC<Asset2DProps> = ({ asset }) => {
  const { selectedObjectId, mode } = useUIStore();
  const project = useProjectStore(state => state.data);
  const theme = useTheme();
  
  const isSelected = selectedObjectId === asset.id;
  const dragCollision = useUIStore(state => state.draggedAssetCollisions[asset.id]);
  const definition = getAssetDefinition(asset.assetId);

  if (!definition || !asset.visible) return null;

  const w = (asset.scale?.x || 1) * definition.defaultSize.width;
  const d = (asset.scale?.z || 1) * definition.defaultSize.depth;

  const color = asset.materialOverride?.color || '#a0a0a0';
  const isSofa = definition.category === 'furniture' && definition.name.toLowerCase().includes('sofa');
  const isBed = definition.category === 'furniture' && definition.name.toLowerCase().includes('bed');
  const isTable = definition.category === 'furniture' && definition.name.toLowerCase().includes('table');

  // Check collision with other assets
  let isColliding = false;
  const assetMinX = asset.position.x - w / 2;
  const assetMaxX = asset.position.x + w / 2;
  const assetMinZ = asset.position.z - d / 2;
  const assetMaxZ = asset.position.z + d / 2;

  const otherAssets = project.placedAssets?.filter(a => a.id !== asset.id && a.visible) || [];
  for (const other of otherAssets) {
    const oDef = getAssetDefinition(other.assetId);
    if (!oDef) continue;
    const oW = other.scale?.x || oDef.defaultSize.width;
    const oD = other.scale?.z || oDef.defaultSize.depth;
    const oMinX = other.position.x - oW / 2;
    const oMaxX = other.position.x + oW / 2;
    const oMinZ = other.position.z - oD / 2;
    const oMaxZ = other.position.z + oD / 2;

    if (!(assetMaxX < oMinX || assetMinX > oMaxX || assetMaxZ < oMinZ || assetMinZ > oMaxZ)) {
      isColliding = true;
      break;
    }
  }

  const strokeColor = isColliding && !isSelected ? '#ff9800' : (isSelected ? theme.primary : '#333');
  const strokeWidth = isSelected || isColliding ? 0.05 * PX_PER_METER : 0.02 * PX_PER_METER;

  return (
    <Group
      x={asset.position.x * PX_PER_METER}
      y={asset.position.z * PX_PER_METER}
      rotation={-(asset.rotation || 0)}
      draggable={mode === 'select' && useUIStore.getState().selectedItems.length <= 1}
      onPointerDown={(e) => {
        e.cancelBubble = true;
        SelectionManager.handleSingleClick({ id: asset.id, type: 'asset' }, e);
      }}
      onDragStart={(e) => {
        e.cancelBubble = true;
        useProjectStore.getState().commitHistory();
        SelectionManager.handleSingleClick({ id: asset.id, type: 'asset' }, e.evt);
      }}
      onDragMove={(e: any) => {
        e.cancelBubble = true;
        const node = e.target;
        const stage = node.getStage();
        const ptr = stage.getPointerPosition();
        if (!ptr) return;
        
        const transform = stage.children[0].children[0].getAbsoluteTransform().copy().invert();
        const localPos = transform.point(ptr);
        
        const projX = localPos.x / PX_PER_METER;
        const projZ = localPos.y / PX_PER_METER;
        
        const { snapToGrid, gridMinorStep } = useUIStore.getState();
        const bypassSnap = e.evt.altKey;
        
        let finalX = projX;
        let finalZ = projZ;
        
        if (!bypassSnap) {
          if (snapToGrid) {
            finalX = Math.round(finalX / gridMinorStep) * gridMinorStep;
            finalZ = Math.round(finalZ / gridMinorStep) * gridMinorStep;
          }

          // Snap to room boundary
          const snapTolerance = 0.2;
          let minDx = snapTolerance;
          let minDz = snapTolerance;

          const projectData = useProjectStore.getState().data;
          projectData.areas?.forEach(area => {
            const assetHalfW = w / 2;
            const assetHalfD = d / 2;

            for (let i = 0; i < area.points.length; i++) {
              const p1 = area.points[i];
              const p2 = area.points[(i + 1) % area.points.length];

              // Check if segment is vertical
              if (Math.abs(p1.x - p2.x) < 0.01) {
                const wallX = p1.x;
                const minZ = Math.min(p1.z, p2.z);
                const maxZ = Math.max(p1.z, p2.z);
                
                // Only snap if the asset overlaps with this segment vertically
                if (finalZ + assetHalfD > minZ - 0.5 && finalZ - assetHalfD < maxZ + 0.5) {
                  const distToLeft = Math.abs(wallX - (finalX - assetHalfW));
                  const distToRight = Math.abs(wallX - (finalX + assetHalfW));

                  if (distToLeft < minDx) {
                    minDx = distToLeft;
                    finalX = wallX + assetHalfW;
                  } else if (distToRight < minDx) {
                    minDx = distToRight;
                    finalX = wallX - assetHalfW;
                  }
                }
              }

              // Check if segment is horizontal
              if (Math.abs(p1.z - p2.z) < 0.01) {
                const wallZ = p1.z;
                const minX = Math.min(p1.x, p2.x);
                const maxX = Math.max(p1.x, p2.x);

                // Only snap if the asset overlaps with this segment horizontally
                if (finalX + assetHalfW > minX - 0.5 && finalX - assetHalfW < maxX + 0.5) {
                  const distToTop = Math.abs(wallZ - (finalZ - assetHalfD));
                  const distToBottom = Math.abs(wallZ - (finalZ + assetHalfD));

                  if (distToTop < minDz) {
                    minDz = distToTop;
                    finalZ = wallZ + assetHalfD;
                  } else if (distToBottom < minDz) {
                    minDz = distToBottom;
                    finalZ = wallZ - assetHalfD;
                  }
                }
              }
            }
          });
        }
        
        useProjectStore.getState().updatePlacedAsset(asset.id, {
          position: { ...asset.position, x: finalX, z: finalZ }
        });
        
        node.position({
           x: finalX * PX_PER_METER,
           y: finalZ * PX_PER_METER
        });
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
      }}
    >
      {definition.model.type === 'cylinder' ? (
        <Circle 
          x={0} 
          y={0} 
          radius={(w / 2) * PX_PER_METER} 
          fill={color} 
          opacity={0.8}
          stroke={strokeColor} 
          strokeWidth={strokeWidth}
        />
      ) : (
        <Group>
          <Rect 
            x={(-w / 2) * PX_PER_METER} 
            y={(-d / 2) * PX_PER_METER} 
            width={w * PX_PER_METER} 
            height={d * PX_PER_METER} 
            fill={color} 
            opacity={0.8}
            stroke={strokeColor} 
            strokeWidth={strokeWidth}
            cornerRadius={0.05 * PX_PER_METER}
          />
          {/* Sofa backrest and armrests */}
          {isSofa && (
            <>
              {/* Backrest */}
              <Rect 
                x={(-w / 2) * PX_PER_METER} 
                y={(-d / 2) * PX_PER_METER} 
                width={w * PX_PER_METER} 
                height={(d * 0.25) * PX_PER_METER} 
                fill="#000" 
                opacity={0.15}
                cornerRadius={0.05 * PX_PER_METER}
              />
              {/* Armrests */}
              <Rect 
                x={(-w / 2) * PX_PER_METER} 
                y={(-d / 2) * PX_PER_METER} 
                width={(w * 0.15) * PX_PER_METER} 
                height={d * PX_PER_METER} 
                fill="#000" 
                opacity={0.1}
                cornerRadius={0.05 * PX_PER_METER}
              />
              <Rect 
                x={(w / 2 - w * 0.15) * PX_PER_METER} 
                y={(-d / 2) * PX_PER_METER} 
                width={(w * 0.15) * PX_PER_METER} 
                height={d * PX_PER_METER} 
                fill="#000" 
                opacity={0.1}
                cornerRadius={0.05 * PX_PER_METER}
              />
            </>
          )}
          {/* Bed pillows */}
          {isBed && (
            <Group>
              <Rect 
                x={(-w / 2 + w * 0.1) * PX_PER_METER} 
                y={(-d / 2 + d * 0.1) * PX_PER_METER} 
                width={(w * 0.35) * PX_PER_METER} 
                height={(d * 0.2) * PX_PER_METER} 
                fill="#fff" 
                opacity={0.5}
                cornerRadius={0.05 * PX_PER_METER}
                stroke="#333"
                strokeWidth={1}
              />
              <Rect 
                x={(w / 2 - w * 0.45) * PX_PER_METER} 
                y={(-d / 2 + d * 0.1) * PX_PER_METER} 
                width={(w * 0.35) * PX_PER_METER} 
                height={(d * 0.2) * PX_PER_METER} 
                fill="#fff" 
                opacity={0.5}
                cornerRadius={0.05 * PX_PER_METER}
                stroke="#333"
                strokeWidth={1}
              />
              {/* Blanket line */}
              <Rect 
                x={(-w / 2) * PX_PER_METER} 
                y={(-d / 2 + d * 0.4) * PX_PER_METER} 
                width={w * PX_PER_METER} 
                height={(d * 0.6) * PX_PER_METER} 
                fill="#000" 
                opacity={0.1}
              />
            </Group>
          )}
          {/* Table inner line */}
          {isTable && (
            <Rect 
              x={(-w / 2 + 0.1) * PX_PER_METER} 
              y={(-d / 2 + 0.1) * PX_PER_METER} 
              width={(w - 0.2) * PX_PER_METER} 
              height={(d - 0.2) * PX_PER_METER} 
              fill="none" 
              stroke="#000" 
              opacity={0.2}
              strokeWidth={2}
            />
          )}
        </Group>
      )}
      
      <Text
        x={0}
        y={0}
        offsetX={(Math.min(w, d) * PX_PER_METER * 0.8) / 2}
        offsetY={(Math.min(w, d) * PX_PER_METER * 0.4) / 2}
        width={Math.min(w, d) * PX_PER_METER * 0.8}
        text={definition.name.substring(0, 2).toUpperCase()}
        align="center"
        verticalAlign="middle"
        fontSize={Math.min(w, d) * PX_PER_METER * 0.4}
        fill="#ffffff"
        listening={false}
      />

      {isSelected && (
        <Group>
          <Rect 
            x={(-w / 2 - 0.05) * PX_PER_METER} 
            y={(-d / 2 - 0.05) * PX_PER_METER} 
            width={(w + 0.1) * PX_PER_METER} 
            height={(d + 0.1) * PX_PER_METER} 
            fillEnabled={false}
            stroke="#ffffff" 
            strokeWidth={0.03 * PX_PER_METER}
          />
          <Rect 
            x={(-w / 2 - 0.05) * PX_PER_METER} 
            y={(-d / 2 - 0.05) * PX_PER_METER} 
            width={(w + 0.1) * PX_PER_METER} 
            height={(d + 0.1) * PX_PER_METER} 
            fillEnabled={false}
            stroke="#000000" 
            strokeWidth={0.03 * PX_PER_METER}
            dash={[0.1 * PX_PER_METER, 0.1 * PX_PER_METER]}
          />
        </Group>
      )}
    </Group>
  );
};
