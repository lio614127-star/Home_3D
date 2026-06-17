import React, { useMemo } from 'react';
import * as THREE from 'three';
import { IArea } from '../../types';
import { useUIStore } from '../../store/useUIStore';
import { useTheme } from '../../theme/tokens';

export const AreaFloor3D: React.FC<{ area: IArea, baseHeight: number, index?: number }> = ({ area, baseHeight, index = 0 }) => {
  const { selectedObjectId, selectedItems } = useUIStore();
  const theme = useTheme();

  const shape = useMemo(() => {
    if (!area.points || area.points.length < 3) return null;
    const s = new THREE.Shape();
    s.moveTo(area.points[0].x, -area.points[0].z);
    for (let i = 1; i < area.points.length; i++) {
      s.lineTo(area.points[i].x, -area.points[i].z);
    }
    // Do NOT explicitly close the shape with lineTo, Three.js handles it. Closing it manually can cause Earcut to fail.
    return s;
  }, [area.points]);

  if (!area.visible || !shape) return null;

  const isSelected = selectedObjectId === area.id || selectedItems.some(it => it.kind === 'area' && it.areaId === area.id);
  // Default to floor color in 3D, don't use 2D area.color unless we want to map it. 
  // User requested white/default when not selected, and highlighted when selected.
  const color = isSelected ? theme.selected3DColor : theme.floor3DFill;

  if (!area.elevation || area.elevation <= 0) {
    // If it's a 0m elevation logical zone, ONLY render it in 3D if it's currently selected to highlight it.
    if (!isSelected) return null;

    // Offset slightly above floor to avoid z-fighting with the site
    const yOffset = baseHeight + 0.02 + (index * 0.002);
    return (
      <mesh position={[0, yOffset, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial color={color} roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
    );
  }

  // Extrude from baseHeight to baseHeight + elevation
  const thickness = area.elevation;
  const cy = baseHeight + (index * 0.001); // Tiny offset even for extruded ones to prevent identical bottom faces z-fighting

  return (
    <mesh position={[0, cy, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <extrudeGeometry args={[shape, { depth: thickness, bevelEnabled: false }]} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  );
};
