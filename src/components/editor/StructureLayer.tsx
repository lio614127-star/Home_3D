import React from 'react';
import { Group, Rect, Line, Text } from 'react-konva';
import { useProjectStore } from '../../store/useProjectStore';
import { useUIStore } from '../../store/useUIStore';
import { useTheme } from '../../theme/tokens';
import { projectToCanvas } from '../../core/geometry/math';
import { SelectionManager } from '../../core/selection/SelectionManager';

interface Props {
  scale: number;
}

export const StructureLayer: React.FC<Props> = ({ scale }) => {
  const structures = useProjectStore(state => state.data.structures) || [];
  const selectedObjectId = useUIStore(state => state.selectedObjectId);
  const mode = useUIStore(state => state.mode);
  const theme = useTheme();

  return (
    <Group>
      {structures.map(structure => {
        const isSelected = selectedObjectId === structure.id;

        if (structure.type === 'fence') {
          // Render fence
          const points = structure.path.flatMap(p => {
            const pos = projectToCanvas(p.x, p.z);
            return [pos.x * scale, pos.y * scale];
          });

          return (
            <Group key={structure.id}>
              <Line
                points={points}
                stroke={isSelected ? theme.selectionStroke : theme.structureStroke}
                strokeWidth={isSelected ? 6 : 4}
                dash={[10, 5]}
                lineCap="round"
                lineJoin="round"
                onMouseDown={(e: any) => {
                  if (mode === 'select' && e.evt.button === 0) {
                    e.cancelBubble = true;
                    SelectionManager.handleSingleClick({ type: 'structure', id: structure.id }, e.evt);
                  }
                }}
              />
              {/* Optional: Render fence vertices if selected for future dragging */}
            </Group>
          );
        } else {
          // Render box structures
          const pos = projectToCanvas(structure.position.x, structure.position.z);
          const w = structure.dimensions.width * scale;
          const h = structure.dimensions.depth * scale;
          
          return (
            <Group
              key={structure.id}
              x={pos.x * scale}
              y={pos.y * scale}
              rotation={structure.rotation || 0}
              draggable={mode === 'select' && useUIStore.getState().selectedItems.length <= 1}
              onMouseDown={(e: any) => {
                if (mode === 'select' && e.evt.button === 0) {
                  e.cancelBubble = true;
                  SelectionManager.handleSingleClick({ type: 'structure', id: structure.id }, e.evt);
                }
              }}
              onDragStart={(e) => {
                e.cancelBubble = true;
                useProjectStore.getState().commitHistory();
                SelectionManager.handleSingleClick({ type: 'structure', id: structure.id }, e.evt);
              }}
              onDragMove={(e: any) => {
                e.cancelBubble = true;
                const node = e.target;
                const stage = node.getStage();
                const ptr = stage.getPointerPosition();
                if (!ptr) return;
                
                const transform = stage.children[0].children[0].getAbsoluteTransform().copy().invert();
                const localPos = transform.point(ptr);
                
                const projX = localPos.x / scale;
                const projZ = localPos.y / scale;
                
                const { snapToGrid, gridMinorStep } = useUIStore.getState();
                const bypassSnap = e.evt.altKey;
                
                let finalX = projX;
                let finalZ = projZ;
                
                if (!bypassSnap && snapToGrid) {
                  finalX = Math.round(finalX / gridMinorStep) * gridMinorStep;
                  finalZ = Math.round(finalZ / gridMinorStep) * gridMinorStep;
                }
                
                useProjectStore.getState().updateStructure(structure.id, {
                  position: { x: finalX, z: finalZ }
                });
                
                node.position({
                   x: finalX * scale,
                   y: finalZ * scale
                });
              }}
              onDragEnd={(e) => {
                e.cancelBubble = true;
              }}
            >
              <Rect
                x={-w / 2}
                y={-h / 2}
                width={w}
                height={h}
                fill={isSelected ? theme.selectionFill : theme.structureFill}
                stroke={isSelected ? theme.selectionStroke : theme.structureStroke}
                strokeWidth={isSelected ? 3 : 2}
              />
              <Text
                x={-w / 2}
                y={-h / 2}
                width={w}
                height={h}
                text={structure.type === 'stairs' ? 'Bậc tam cấp' : structure.type === 'patio' ? 'Sân phơi' : structure.type === 'sideKitchen' ? 'Bếp hông' : 'Gara'}
                align="center"
                verticalAlign="middle"
                fontSize={14}
                fill={theme.textPrimary}
                listening={false}
              />
            </Group>
          );
        }
      })}
    </Group>
  );
};
