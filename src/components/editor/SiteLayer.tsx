import React from 'react';
import { Rect, Text, Group, Line } from 'react-konva';
import { ISite } from '../../types';
import { projectToCanvas, formatArea, subtractOverlappingWalls } from '../../core/geometry/math';
import { useUIStore } from '../../store/useUIStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useI18nStore } from '../../store/useI18nStore';
import { SelectionManager } from '../../core/selection/SelectionManager';

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
      SelectionManager.handleSingleClick({ type: 'site', id: site.id }, e.evt);
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
          SelectionManager.handleSingleClick({ type: 'site', id: site.id }, e.evt);
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
            x={-10000} 
            y={showAreaArea ? -10000 - ((site.textSize || 1.2) * scale) / 2 : -10000} 
            width={20000}
            height={20000}
            text={t("canvas.siteLabel")} 
            fontSize={(site.textSize || 1.2) * scale} 
            fontStyle="bold"
            align="center"
            verticalAlign="middle"
            fill={theme.textSecondary}
            listening={false}
          />
        )}
        {showAreaArea && (
          <Text 
            x={-10000} 
            y={showAreaName ? -10000 + ((site.textSize || 1.2) * scale) / 2 : -10000} 
            width={20000}
            height={20000}
            text={formatArea(siteArea)} 
            fontSize={(site.textSize || 1.2) * 0.8 * scale} 
            align="center"
            verticalAlign="middle"
            fill={theme.textSecondary}
            listening={false}
          />
        )}
      </Group>
    </Group>
  );
};
