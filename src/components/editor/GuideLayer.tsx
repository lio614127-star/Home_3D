import React from 'react';
import { Group, Line, Circle } from 'react-konva';
import { useUIStore } from '../../store/useUIStore';
import { useTheme } from '../../theme/tokens';

interface Props {
  scale: number;
  zoom: number;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

import { Text } from 'react-konva';

export const GuideLayer: React.FC<Props> = ({ scale, zoom, width, height, offsetX, offsetY }) => {
  const { activeGuides, showAlignmentGuides, activeSnapPoint } = useUIStore();
  const theme = useTheme();

  if (!showAlignmentGuides || (activeGuides.length === 0 && !activeSnapPoint)) return null;

  return (
    <Group listening={false}>
      {activeGuides.map((guide, idx) => {
        if (guide.type === 'vertical') {
          return (
            <Line
              key={`guide-v-${idx}`}
              points={[guide.pos * scale, offsetY, guide.pos * scale, offsetY + height]}
              stroke={theme.guideLine}
              strokeWidth={1 / zoom}
              dash={[5 / zoom, 5 / zoom]}
              opacity={0.6}
            />
          );
        } else {
          return (
            <Line
              key={`guide-h-${idx}`}
              points={[offsetX, guide.pos * scale, offsetX + width, guide.pos * scale]}
              stroke={theme.guideLine}
              strokeWidth={1 / zoom}
              dash={[5 / zoom, 5 / zoom]}
              opacity={0.6}
            />
          );
        }
      })}
      
      {activeSnapPoint && (
        <Group x={activeSnapPoint.x * scale} y={activeSnapPoint.y * scale}>
          {activeSnapPoint.priority === 1 ? (
            // Geometry Corner / Vertex
            <Group>
              <Circle radius={6 / zoom} stroke="#d32f2f" strokeWidth={2 / zoom} />
              <Circle radius={2 / zoom} fill="#d32f2f" />
            </Group>
          ) : activeSnapPoint.priority === 2 ? (
            // Geometry Edge / Face
            <Line 
              points={[-4/zoom, -4/zoom, 4/zoom, -4/zoom, 4/zoom, 4/zoom, -4/zoom, 4/zoom]} 
              closed 
              stroke="#f57c00" 
              strokeWidth={2 / zoom} 
              opacity={0.9} 
            />
          ) : (
            // Grid Fallback
            <Circle radius={3 / zoom} fill={theme.guideLine} opacity={0.6} />
          )}

          {activeSnapPoint.label && (
            <Text
              x={10 / zoom}
              y={-10 / zoom}
              text={activeSnapPoint.label}
              fontSize={12 / zoom}
              fill={activeSnapPoint.priority && activeSnapPoint.priority <= 2 ? "#d32f2f" : "#666"}
              fontStyle="bold"
            />
          )}
        </Group>
      )}
    </Group>
  );
};
