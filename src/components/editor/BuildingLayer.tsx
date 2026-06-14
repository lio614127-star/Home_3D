import React from 'react';
import { Rect, Text, Group } from 'react-konva';
import { IBuilding } from '../../types';
import { projectToCanvas } from '../../core/geometry/math';
import { useUIStore } from '../../store/useUIStore';
import { useI18nStore } from '../../store/useI18nStore';
import { useTheme } from '../../theme/tokens';

interface Props {
  building: IBuilding;
  scale: number;
}

export const BuildingLayer: React.FC<Props> = ({ building, scale }) => {
  const { selectedObjectId, setSelectedObject, mode } = useUIStore();
  const { t } = useI18nStore();
  const theme = useTheme();
  if (!building.visible) return null;

  const pos = projectToCanvas(building.origin.x, building.origin.z);
  const isSelected = selectedObjectId === building.id;

  const handleMouseDown = (e: any) => {
    if (mode === 'select') {
      if (e.evt.button === 1 || (e.evt.button === 0 && e.evt.altKey)) {
        e.cancelBubble = true;
        e.evt.preventDefault();
        window.alert(t("warning.polygonRoomLater"));
        return;
      }
      if (e.evt.button === 0) {
        e.cancelBubble = true;
        setSelectedObject(building.id, 'building');
      }
    }
  };

  return (
    <Group onMouseDown={handleMouseDown} onContextMenu={(e) => { if (mode === 'select') e.evt.preventDefault(); }}>
      <Rect
        x={pos.x * scale}
        y={pos.y * scale}
        width={building.width * scale}
        height={building.depth * scale}
        fill={isSelected ? theme.selectionFill : 'transparent'}
        stroke={isSelected ? theme.selectionStroke : theme.buildingFootprintStroke}
        strokeWidth={isSelected ? 4 : 3}
        dash={isSelected ? [] : [8, 6]}
      />
      <Group x={(building.origin.x + building.width / 2) * scale} y={(building.origin.z + building.depth / 2) * scale} listening={false}>
        <Text 
          x={-10000} 
          y={-10000} 
          width={20000}
          height={20000}
          text={t("canvas.mainBuilding")} 
          fontSize={(building.textSize || 1.0) * scale} 
          fill={theme.textPrimary}
          align="center"
          verticalAlign="middle"
          listening={false}
        />
      </Group>
    </Group>
  );
};
