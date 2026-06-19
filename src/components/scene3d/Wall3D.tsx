import React, { useMemo } from 'react';
import * as THREE from 'three';
import { IWall, IOpening } from '../../types';
import { getWallPolygon } from '../../core/geometry/math';
import { useUIStore } from '../../store/useUIStore';
import { useTheme } from '../../theme/tokens';

interface Props {
  wall: IWall;
  allWalls: IWall[];
  baseHeight: number;
  openings?: IOpening[];
}

export const Wall3D: React.FC<Props> = ({ wall, allWalls, baseHeight, openings = [] }) => {
  const { selectedObjectId } = useUIStore();
  const theme = useTheme();

  const poly = useMemo(() => getWallPolygon(wall, allWalls), [wall, allWalls]);

  if (!wall.visible || !poly) return null;

  const uiState = useUIStore.getState();
  const isSelected = selectedObjectId === wall.id || 
                     (wall.buildingId && selectedObjectId === wall.buildingId && uiState.selectedObjectType === 'building') || 
                     uiState.selectedItems.some(it => (it.type === 'wall' && it.id === wall.id) || (it.type === 'building' && it.id === wall.buildingId));
  const matColor = isSelected ? theme.selected3DColor : theme.wall3DFill;
  const t = (wall.thickness || 0.2) / 2;

  const renderSegment = (uStart: number, uEnd: number, vStart: number, vEnd: number, key: string) => {
    const w = uEnd - uStart;
    const h = vEnd - vStart;
    if (w <= 0.001 || h <= 0.001) return null;

    const getLeftPt = (u: number) => {
      if (u <= 0.001) return poly.pLeftStart;
      if (u >= poly.len - 0.001) return poly.pLeftEnd;
      return { x: poly.baseStart.x + poly.nz * u + poly.nx * t, z: poly.baseStart.z - poly.nx * u + poly.nz * t };
    };
    const getRightPt = (u: number) => {
      if (u <= 0.001) return poly.pRightStart;
      if (u >= poly.len - 0.001) return poly.pRightEnd;
      return { x: poly.baseStart.x + poly.nz * u - poly.nx * t, z: poly.baseStart.z - poly.nx * u - poly.nz * t };
    };

    // Calculate direction properly
    // original dir was (dx, dz) / len. 
    // nx = -dz/len, nz = dx/len. So dirX = nz, dirZ = -nx.
    const dirX = poly.nz;
    const dirZ = -poly.nx;

    const p1 = uStart <= 0.001 ? poly.pLeftStart : { x: poly.baseStart.x + dirX * uStart + poly.nx * t, z: poly.baseStart.z + dirZ * uStart + poly.nz * t };
    const p2 = uStart <= 0.001 ? poly.pRightStart : { x: poly.baseStart.x + dirX * uStart - poly.nx * t, z: poly.baseStart.z + dirZ * uStart - poly.nz * t };
    const p3 = uEnd >= poly.len - 0.001 ? poly.pRightEnd : { x: poly.baseStart.x + dirX * uEnd - poly.nx * t, z: poly.baseStart.z + dirZ * uEnd - poly.nz * t };
    const p4 = uEnd >= poly.len - 0.001 ? poly.pLeftEnd : { x: poly.baseStart.x + dirX * uEnd + poly.nx * t, z: poly.baseStart.z + dirZ * uEnd + poly.nz * t };

    const shape = new THREE.Shape();
    shape.moveTo(p1.x, -p1.z);
    shape.lineTo(p2.x, -p2.z);
    shape.lineTo(p3.x, -p3.z);
    shape.lineTo(p4.x, -p4.z);
    shape.lineTo(p1.x, -p1.z);

    const extrudeSettings = {
      depth: h,
      bevelEnabled: false
    };

    return (
      <mesh key={key} position={[0, baseHeight + vStart, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <extrudeGeometry args={[shape, extrudeSettings]} />
        <meshStandardMaterial color={matColor} roughness={0.8} metalness={0} />
      </mesh>
    );
  };

  const segments: React.ReactNode[] = [];
  const sortedOpenings = [...openings].sort((a, b) => a.offsetFromStart - b.offsetFromStart);
  let currentU = 0;
  
  sortedOpenings.forEach((op) => {
    if (op.offsetFromStart > currentU) {
      segments.push(renderSegment(currentU, op.offsetFromStart, 0, wall.height, `solid_before_${op.id}`));
    }
    
    const opEnd = op.offsetFromStart + op.width;
    const opVStart = op.sillHeight || 0;
    const opVEnd = opVStart + op.height;

    if (opVStart > 0) {
      segments.push(renderSegment(Math.max(currentU, op.offsetFromStart), Math.max(currentU, opEnd), 0, opVStart, `sill_${op.id}`));
    }

    if (opVEnd < wall.height) {
      segments.push(renderSegment(Math.max(currentU, op.offsetFromStart), Math.max(currentU, opEnd), opVEnd, wall.height, `lintel_${op.id}`));
    }

    currentU = Math.max(currentU, opEnd);
  });

  if (currentU < poly.len) {
    segments.push(renderSegment(currentU, poly.len, 0, wall.height, `solid_final_${wall.id}`));
  }

  return (
    <group>
      {segments}
    </group>
  );
};
