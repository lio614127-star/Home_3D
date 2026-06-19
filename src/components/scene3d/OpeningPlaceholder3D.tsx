import React from 'react';
import { IOpening, IWall } from '../../types';
import { getOpeningCenter } from '../../core/geometry/math';
import { useUIStore } from '../../store/useUIStore';
import { useTheme } from '../../theme/tokens';

export const Door3D: React.FC<{ opening: IOpening, wall: IWall, baseHeight: number, center: any, isSelected: boolean }> = ({ opening, wall, baseHeight, center, isSelected }) => {
  const theme = useTheme();
  const cy = baseHeight + (opening.sillHeight || 0) + opening.height / 2;
  const frameThick = 0.08;
  const frameDepth = wall.thickness + 0.04; 
  
  const leafThickness = 0.04;
  const hLeft = opening.hingeSide !== 'right';
  const outward = opening.openDirection === 'outward';
  const swingAngle = opening.swingAngle !== undefined ? opening.swingAngle : 90;
  
  const pivotX = hLeft ? -opening.width / 2 + frameThick/2 : opening.width / 2 - frameThick/2;
  const dirY = outward ? 1 : -1;
  const rad = (swingAngle * Math.PI) / 180;
  
  const emissiveColor = isSelected ? theme.selected3DColor : theme.door3DColor;

  return (
    <group position={[center.x, cy, center.z]} rotation={[0, center.yaw, 0]}>
      <mesh position={[-opening.width/2 + frameThick/2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[frameThick, opening.height, frameDepth]} />
        <meshStandardMaterial color={theme.door3DColor} emissive={emissiveColor} emissiveIntensity={isSelected ? 0.3 : 0} />
      </mesh>
      <mesh position={[opening.width/2 - frameThick/2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[frameThick, opening.height, frameDepth]} />
        <meshStandardMaterial color={theme.door3DColor} emissive={emissiveColor} emissiveIntensity={isSelected ? 0.3 : 0} />
      </mesh>
      <mesh position={[0, opening.height/2 - frameThick/2, 0]} castShadow receiveShadow>
        <boxGeometry args={[opening.width - frameThick*2, frameThick, frameDepth]} />
        <meshStandardMaterial color={theme.door3DColor} emissive={emissiveColor} emissiveIntensity={isSelected ? 0.3 : 0} />
      </mesh>
      
      <group position={[pivotX, 0, dirY * frameDepth/2]} rotation={[0, dirY * (hLeft ? -rad : rad), 0]}>
        <mesh position={[-pivotX, 0, dirY * leafThickness/2]} castShadow receiveShadow>
          <boxGeometry args={[opening.width - frameThick*2, opening.height - frameThick, leafThickness]} />
          <meshStandardMaterial color={theme.door3DColor} />
        </mesh>
        
        <mesh position={[-pivotX + (hLeft ? opening.width/2 - 0.15 : -opening.width/2 + 0.15), 0, dirY * leafThickness/2 + dirY * 0.05]}>
          <boxGeometry args={[0.02, 0.15, 0.1]} />
          <meshStandardMaterial color="#B0BEC5" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
};

export const Window3D: React.FC<{ opening: IOpening, wall: IWall, baseHeight: number, center: any, isSelected: boolean }> = ({ opening, wall, baseHeight, center, isSelected }) => {
  const theme = useTheme();
  const cy = baseHeight + (opening.sillHeight || 0) + opening.height / 2;
  const frameThick = 0.06;
  const frameDepth = wall.thickness + 0.06;
  
  const emissiveColor = isSelected ? theme.selected3DColor : theme.window3DColor;
  
  return (
    <group position={[center.x, cy, center.z]} rotation={[0, center.yaw, 0]}>
      <mesh position={[-opening.width/2 + frameThick/2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[frameThick, opening.height, frameDepth]} />
        <meshStandardMaterial color={theme.window3DColor} emissive={emissiveColor} emissiveIntensity={isSelected ? 0.3 : 0} />
      </mesh>
      <mesh position={[opening.width/2 - frameThick/2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[frameThick, opening.height, frameDepth]} />
        <meshStandardMaterial color={theme.window3DColor} emissive={emissiveColor} emissiveIntensity={isSelected ? 0.3 : 0} />
      </mesh>
      <mesh position={[0, opening.height/2 - frameThick/2, 0]} castShadow receiveShadow>
        <boxGeometry args={[opening.width - frameThick*2, frameThick, frameDepth]} />
        <meshStandardMaterial color={theme.window3DColor} emissive={emissiveColor} emissiveIntensity={isSelected ? 0.3 : 0} />
      </mesh>
      <mesh position={[0, -opening.height/2 + frameThick/2, 0]} castShadow receiveShadow>
        <boxGeometry args={[opening.width - frameThick*2, frameThick, frameDepth]} />
        <meshStandardMaterial color={theme.window3DColor} emissive={emissiveColor} emissiveIntensity={isSelected ? 0.3 : 0} />
      </mesh>
      
      {opening.width >= 1.0 && (
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[frameThick/2, opening.height - frameThick*2, frameDepth - 0.02]} />
          <meshStandardMaterial color={theme.window3DColor} />
        </mesh>
      )}
      {opening.height >= 1.0 && (
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[opening.width - frameThick*2, frameThick/2, frameDepth - 0.02]} />
          <meshStandardMaterial color={theme.window3DColor} />
        </mesh>
      )}

      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[opening.width - frameThick*2, opening.height - frameThick*2, 0.02]} />
        <meshStandardMaterial color="#81D4FA" transparent opacity={0.4} roughness={0.1} metalness={0.9} depthWrite={false} />
      </mesh>
    </group>
  );
};

export const OpeningPlaceholder3D: React.FC<{ opening: IOpening, wall: IWall, baseHeight: number }> = ({ opening, wall, baseHeight }) => {
  const { selectedObjectId } = useUIStore();
  if (!opening.visible) return null;

  const center = getOpeningCenter(wall, opening.offsetFromStart, opening.width);
  if (!center) return null;

  const uiState = useUIStore.getState();
  const isSelected = selectedObjectId === opening.id || 
                     (opening.buildingId && selectedObjectId === opening.buildingId && uiState.selectedObjectType === 'building') || 
                     uiState.selectedItems.some(it => (it.type === 'opening' && it.id === opening.id) || (it.type === 'building' && it.id === opening.buildingId));

  if (opening.type === 'door') {
    return <Door3D opening={opening} wall={wall} baseHeight={baseHeight} center={center} isSelected={isSelected} />;
  } else {
    return <Window3D opening={opening} wall={wall} baseHeight={baseHeight} center={center} isSelected={isSelected} />;
  }
};
