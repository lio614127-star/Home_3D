import React from 'react';
import { Group, Rect, Circle, Line } from 'react-konva';
import { IAIRequest } from '../../types';
import { useUIStore } from '../../store/useUIStore';
import { useTheme } from '../../theme/tokens';

interface Props {
  region: IAIRequest;
  zoom: number;
  pxPerMeter: number;
}

export const AIRegion2D: React.FC<Props> = ({ region, zoom, pxPerMeter }) => {
  const { selectedObjectId, setSelectedObject } = useUIStore();
  const theme = useTheme();

  const isSelected = selectedObjectId === region.id;
  const strokeColor = isSelected ? theme.accent : '#9c27b0'; // Purple for AI regions
  const strokeWidth = (isSelected ? 3 : 2) / zoom;
  const dash = [10 / zoom, 5 / zoom];

  const handleClick = (e: any) => {
    e.cancelBubble = true;
    setSelectedObject(region.id, 'aiRegion');
  };

  if (!region.geometry) return null;

  return (
    <Group onClick={handleClick} onTap={handleClick}>
      {region.geometry.type === 'rectangle' && region.geometry.points.length >= 2 && (
        <Rect
          x={Math.min(region.geometry.points[0].x, region.geometry.points[1].x) * pxPerMeter}
          y={Math.min(region.geometry.points[0].z, region.geometry.points[1].z) * pxPerMeter}
          width={Math.abs(region.geometry.points[1].x - region.geometry.points[0].x) * pxPerMeter}
          height={Math.abs(region.geometry.points[1].z - region.geometry.points[0].z) * pxPerMeter}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          dash={dash}
          fill={isSelected ? `${strokeColor}22` : 'transparent'}
        />
      )}
      {region.geometry.type === 'circle' && region.geometry.points.length >= 1 && region.geometry.radius && (
        <Circle
          x={region.geometry.points[0].x * pxPerMeter}
          y={region.geometry.points[0].z * pxPerMeter}
          radius={region.geometry.radius * pxPerMeter}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          dash={dash}
          fill={isSelected ? `${strokeColor}22` : 'transparent'}
        />
      )}
      {/* Label */}
      {region.geometry.points.length > 0 && (
        <Group x={region.geometry.points[0].x * pxPerMeter} y={region.geometry.points[0].z * pxPerMeter - (20 / zoom)}>
          <Rect
            x={0} y={0}
            width={100 / zoom} height={20 / zoom}
            fill={strokeColor}
            cornerRadius={4 / zoom}
          />
          <Line points={[0,0]} />
          <text
            x={5 / zoom} y={15 / zoom}
            text={`AI: ${region.category || 'Region'}`}
            fill="#fff"
            fontSize={12 / zoom}
          />
        </Group>
      )}
    </Group>
  );
};
