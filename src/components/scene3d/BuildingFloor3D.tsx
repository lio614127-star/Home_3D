import React from 'react';
import { IBuilding } from '../../types';
import { useTheme } from '../../theme/tokens';

export const BuildingFloor3D: React.FC<{ building: IBuilding }> = ({ building }) => {
  const theme = useTheme();
  if (!building.visible) return null;
  
  const cx = (building.origin?.x || 0) + building.width / 2;
  const cz = (building.origin?.z || 0) + building.depth / 2;
  const cy = building.floorHeight / 2;

  return (
    <mesh position={[cx, cy, cz]} receiveShadow>
      <boxGeometry args={[building.width, building.floorHeight, building.depth]} />
      <meshStandardMaterial color={theme.floor3DFill} roughness={0.8} />
    </mesh>
  );
};
