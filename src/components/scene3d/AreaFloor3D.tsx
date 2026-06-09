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

  const cy = baseHeight + 0.01;
  const isSelected = selectedObjectId === area.id;

  return (
    <mesh position={[0, cy, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial color={isSelected ? theme.selected3DColor : theme.room3DFill} transparent opacity={0.5} roughness={0.7} side={2} />
    </mesh>
  );
};
