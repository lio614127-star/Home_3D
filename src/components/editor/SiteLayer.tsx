import React from 'react';
import { Rect, Text, Group, Line } from 'react-konva';
import { ISite } from '../../types';
import { projectToCanvas, formatArea, subtractOverlappingWalls } from '../../core/geometry/math';
import { useUIStore } from '../../store/useUIStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useI18nStore } from '../../store/useI18nStore';

import { useTheme } from '../../theme/tokens';

interface Props {
  site: ISite;
  scale: number;
  zoom?: number;
}

export const SiteLayer: React.FC<Props> = ({ site, scale, zoom = 1 }) => {
  const { selectedObjectId, setSelectedObject, mode, showAreaName, showAreaArea } = useUIStore();
  const { t } = useI18nStore();
  const theme = useTheme();
  
  const projectData = useProjectStore(state => state.data);

  if (!site.visible) return null;

  const pos = projectToCanvas(site.origin.x, site.origin.z);
  const isSelected = selectedObjectId === site.id;

  const handleClick = (e: any) => {
    if (mode === 'select') {
      e.cancelBubble = true;
      setSelectedObject(site.id, 'site');
    }
  };

  const centerX = (site.origin.x + site.width / 2) * scale;
  const centerY = (site.origin.z + site.depth / 2) * scale;
  const siteArea = site.width * site.depth;

  return (
    <Group 
      onMouseDown={(e: any) => {
        if (mode === 'select' && e.evt.button === 0) {
          e.cancelBubble = true;
          setSelectedObject(site.id, 'site');
        }
      }}
    >
      <Rect
        x={pos.x * scale}
        y={pos.y * scale}
        width={site.width * scale}
        height={site.depth * scale}
        fill={theme.siteFill}
        strokeEnabled={false}
      />
      
      {/* Subtracted Borders */}
      {(() => {
         const p1 = { x: site.origin.x, z: site.origin.z };
         const p2 = { x: site.origin.x + site.width, z: site.origin.z };
         const p3 = { x: site.origin.x + site.width, z: site.origin.z + site.depth };
         const p4 = { x: site.origin.x, z: site.origin.z + site.depth };
         const edges = [[p1, p2], [p2, p3], [p3, p4], [p4, p1]];
         return edges.map((edge, i) => {
           const visibleSegments = subtractOverlappingWalls(edge[0], edge[1], projectData.walls);
           return visibleSegments.map((seg, segIdx) => (
             <Line
               key={`site-edge-${i}-${segIdx}`}
               points={[seg.start.x * scale, seg.start.z * scale, seg.end.x * scale, seg.end.z * scale]}
               stroke={isSelected ? theme.selectionStroke : theme.siteStroke}
               strokeWidth={isSelected ? 4 : 2}
               dash={isSelected ? [] : [10, 5]}
               listening={false}
             />
           ));
         });
      })()}

      <Group x={centerX} y={centerY} listening={false}>
        {showAreaName && (
          <Text 
            x={-site.width * scale / 2} 
            y={showAreaArea ? -12 / zoom : -7 / zoom} 
            width={site.width * scale}
            text={t("canvas.siteLabel")} 
            fontSize={16 / zoom} 
            fontStyle="bold"
            align="center"
            fill={theme.textSecondary}
            listening={false}
          />
        )}
        {showAreaArea && (
          <Text 
            x={-site.width * scale / 2} 
            y={showAreaName ? 8 / zoom : -6 / zoom} 
            width={site.width * scale}
            text={formatArea(siteArea)} 
            fontSize={13 / zoom} 
            align="center"
            fill={theme.textSecondary}
            listening={false}
          />
        )}
      </Group>
    </Group>
  );
};
