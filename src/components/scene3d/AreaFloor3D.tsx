import React, { useMemo } from 'react';
import * as THREE from 'three';
import { IArea } from '../../types';
import { useUIStore } from '../../store/useUIStore';
import { useTheme } from '../../theme/tokens';

export const AreaFloor3D: React.FC<{ area: IArea, baseHeight: number }> = ({ area, baseHeight }) => {
  const { selectedObjectId } = useUIStore();
  const theme = useTheme();

  const shape = useMemo(() => {
    if (!area.points || area.points.length < 3) return null;
    const s = new THREE.Shape();
    s.moveTo(area.points[0].x, -area.points[0].z);
    for (let i = 1; i < area.points.length; i++) {
      s.lineTo(area.points[i].x, -area.points[i].z);
    }
    s.lineTo(area.points[0].x, -area.points[0].z);
    return s;
  }, [area.points]);

  if (!area.visible || !shape) return null;

  const isSelected = selectedObjectId === area.id;
  const color = isSelected ? theme.selected3DColor : (theme.room3DFill.startsWith('rgba') ? '#cccccc' : theme.room3DFill);

  if (!area.elevation || area.elevation <= 0) {
    // Just a flat zone, render slightly above baseHeight to prevent z-fighting
    return (
      <mesh position={[0, baseHeight + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial color={color} roughness={0.7} transparent opacity={0.6} depthWrite={false} />
      </mesh>
    );
  }

  // Extrude from baseHeight to baseHeight + elevation
  const thickness = area.elevation;
  const cy = baseHeight;

  return (
    <mesh position={[0, cy, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <extrudeGeometry args={[shape, { depth: thickness, bevelEnabled: false }]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
  );
};
