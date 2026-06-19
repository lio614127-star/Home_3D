import React from 'react';
import { Group, Line, Shape } from 'react-konva';
import { useProjectStore } from '../../store/useProjectStore';
import { useUIStore } from '../../store/useUIStore';
import { useTheme } from '../../theme/tokens';
import { offsetPolygon } from '../../core/geometry/math';

interface Props {
  scale: number;
}

export const RoofLayer: React.FC<Props> = ({ scale }) => {
  const project = useProjectStore(state => state.data);
  const selectedObjectId = useUIStore(state => state.selectedObjectId);
  const selectedItems = useUIStore(state => state.selectedItems);
  const theme = useTheme();

  if (!project.roofs || project.roofs.length === 0) return null;

  return (
    <Group listening={false}>
      {project.roofs.map(roof => {
        if (!roof.visible) return null;
        
        const building = project.buildings.find(b => b.id === roof.buildingId);
        if (!building || !building.footprint || building.footprint.length < 3) return null;

        // Offset footprint by overhang
        const outerPoints = offsetPolygon(building.footprint, roof.overhang || 0.6);
        const flatPoints = outerPoints.flatMap(p => [p.x * scale, p.z * scale]);

        const isSelected = selectedObjectId === roof.id || 
                           selectedItems.some(it => it.type === 'roof' && it.id === roof.id) ||
                           selectedObjectId === roof.buildingId ||
                           selectedItems.some(it => it.type === 'building' && it.id === roof.buildingId);

        return (
          <Group key={roof.id}>
            <Line
              points={flatPoints}
              closed={true}
              stroke={isSelected ? theme.accent : theme.textPrimary}
              strokeWidth={isSelected ? 2 : 1}
              dash={[10, 5]}
              fill={isSelected ? `${theme.accent}22` : 'rgba(0,0,0,0.05)'}
            />
          </Group>
        );
      })}
    </Group>
  );
};
