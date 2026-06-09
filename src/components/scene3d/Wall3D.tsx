import React from 'react';
import { IWall, IOpening } from '../../types';
import { getWallLength } from '../../core/geometry/math';
import { useUIStore } from '../../store/useUIStore';
import { useTheme } from '../../theme/tokens';

interface Props {
  wall: IWall;
  baseHeight: number;
  openings?: IOpening[];
}

export const Wall3D: React.FC<Props> = ({ wall, baseHeight, openings = [] }) => {
  const { selectedObjectId } = useUIStore();
  const theme = useTheme();
  if (!wall.visible) return null;

  const length = getWallLength(wall);
  if (length <= 0) return null;

  const cx = (wall.start.x + wall.end.x) / 2;
  const cz = (wall.start.z + wall.end.z) / 2;
  const yaw = -Math.atan2(wall.end.z - wall.start.z, wall.end.x - wall.start.x);
  const isSelected = selectedObjectId === wall.id;
  const matColor = isSelected ? theme.selected3DColor : theme.wall3DFill;

  const renderSegment = (uStart: number, uEnd: number, vStart: number, vEnd: number, key: string) => {
    const w = uEnd - uStart;
    const h = vEnd - vStart;
    if (w <= 0.001 || h <= 0.001) return null;

    const uCenter = uStart + w / 2;
    const vCenter = vStart + h / 2;

    const localX = uCenter - length / 2;
    const localY = vCenter;

    return (
      <mesh key={key} position={[localX, localY, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, wall.thickness]} />
        <meshStandardMaterial color={matColor} roughness={0.8} metalness={0} />
      </mesh>
    );
  };

  const segments: React.ReactNode[] = [];
  
  // Sort openings left to right
  const sortedOpenings = [...openings].sort((a, b) => a.offsetFromStart - b.offsetFromStart);
  
  let currentU = 0;
  
  sortedOpenings.forEach((op) => {
    // Solid piece before the opening
    if (op.offsetFromStart > currentU) {
      segments.push(renderSegment(currentU, op.offsetFromStart, 0, wall.height, `solid_before_${op.id}`));
    }
    
    // The opening slice
    const opEnd = op.offsetFromStart + op.width;
    const opVStart = op.sillHeight || 0;
    const opVEnd = opVStart + op.height;

    // Sill segment
    if (opVStart > 0) {
      segments.push(renderSegment(Math.max(currentU, op.offsetFromStart), Math.max(currentU, opEnd), 0, opVStart, `sill_${op.id}`));
    }

    // Lintel segment
    if (opVEnd < wall.height) {
      segments.push(renderSegment(Math.max(currentU, op.offsetFromStart), Math.max(currentU, opEnd), opVEnd, wall.height, `lintel_${op.id}`));
    }

    currentU = Math.max(currentU, opEnd);
  });

  // Final solid segment
  if (currentU < length) {
    segments.push(renderSegment(currentU, length, 0, wall.height, `solid_final_${wall.id}`));
  }

  return (
    <group position={[cx, baseHeight, cz]} rotation={[0, yaw, 0]}>
      {segments}
    </group>
  );
};
