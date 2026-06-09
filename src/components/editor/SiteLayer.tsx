import React from 'react';
import { Rect, Text, Group } from 'react-konva';
import { ISite } from '../../types';
import { projectToCanvas, formatArea } from '../../core/geometry/math';
import { useUIStore } from '../../store/useUIStore';
import { useI18nStore } from '../../store/useI18nStore';

import { useTheme } from '../../theme/tokens';

interface Props {
  site: ISite;
  scale: number;
}

export const SiteLayer: React.FC<Props> = ({ site, scale }) => {
  const { selectedObjectId, setSelectedObject, mode, showAreaName, showAreaArea } = useUIStore();
  const { t } = useI18nStore();
  const theme = useTheme();
  
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
      draggable={mode === 'select' && isSelected}
      onDragStart={(e) => {
        e.cancelBubble = true;
        const uiState = useUIStore.getState();
        const projStore = useProjectStore.getState();
        
        if (!uiState.selectedItems.some(it => it.kind === 'site')) {
           uiState.setSelectedItems([{ kind: 'site' }]);
           uiState.setSelectedObject(site.id, 'site');
        }
        
        projStore.startGroupDrag();
        
        const stage = e.target.getStage();
        const pos = stage?.getPointerPosition();
        if (!pos) return;
        const transform = e.target.getParent()?.getAbsoluteTransform().copy().invert();
        if (transform) {
          const proj = transform.point(pos);
          e.target.setAttr('dragStartProj', proj);
        }
      }}
      onDragMove={(e) => {
        e.cancelBubble = true;
        const stage = e.target.getStage();
        const pos = stage?.getPointerPosition();
        if (!pos) return;
        
        const transform = e.target.getParent()?.getAbsoluteTransform().copy().invert();
        if (!transform) return;
        
        const proj = transform.point(pos);
        const startProj = e.target.getAttr('dragStartProj');
        if (!startProj) return;

        const rawDeltaX = (proj.x - startProj.x) / scale;
        const rawDeltaZ = (proj.y - startProj.y) / scale;

        let adjustedDeltaX = rawDeltaX;
        let adjustedDeltaZ = rawDeltaZ;
        
        const projStore = useProjectStore.getState();
        const { snapToGrid, gridMinorStep } = useUIStore.getState();
        
        if (snapToGrid && !e.evt.altKey) {
           const snapshotOrigin = projStore.groupDragSnapshot?.site?.origin;
           if (snapshotOrigin) {
             // Snap absolute position
             const snappedX = Math.round((snapshotOrigin.x + rawDeltaX) / gridMinorStep) * gridMinorStep;
             const snappedZ = Math.round((snapshotOrigin.z + rawDeltaZ) / gridMinorStep) * gridMinorStep;
             adjustedDeltaX = snappedX - snapshotOrigin.x;
             adjustedDeltaZ = snappedZ - snapshotOrigin.z;
           } else {
             adjustedDeltaX = Math.round(adjustedDeltaX / gridMinorStep) * gridMinorStep;
             adjustedDeltaZ = Math.round(adjustedDeltaZ / gridMinorStep) * gridMinorStep;
           }
        }

        projStore.updateGroupDrag(adjustedDeltaX, adjustedDeltaZ, useUIStore.getState().selectedItems);
        // CRITICAL: reset Konva node position so React state takes full control
        e.target.position({ x: 0, y: 0 });
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        useProjectStore.getState().endGroupDrag(true);
        e.target.setAttr('dragStartProj', null);
        e.target.position({ x: 0, y: 0 });
      }}
    >
      <Rect
        x={pos.x * scale}
        y={pos.y * scale}
        width={site.width * scale}
        height={site.depth * scale}
        fill={theme.siteFill}
        stroke={isSelected ? theme.selectionStroke : theme.siteStroke}
        strokeWidth={isSelected ? 4 : 2}
        dash={isSelected ? [] : [10, 5]}
      />
      <Group x={centerX} y={centerY} listening={false}>
        {showAreaName && (
          <Text 
            x={-site.width * scale / 2} 
            y={showAreaArea ? -12 : -7} 
            width={site.width * scale}
            text={t("canvas.siteLabel")} 
            fontSize={16} 
            fontStyle="bold"
            align="center"
            fill="#00695c"
            listening={false}
          />
        )}
        {showAreaArea && (
          <Text 
            x={-site.width * scale / 2} 
            y={showAreaName ? 8 : -6} 
            width={site.width * scale}
            text={formatArea(siteArea)} 
            fontSize={13} 
            align="center"
            fill="#004d40"
            listening={false}
          />
        )}
      </Group>
    </Group>
  );
};
