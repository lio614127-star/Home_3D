import React from 'react';
import { IAssetDefinition, IPlacedAsset } from '../../types';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

interface Props {
  definition: IAssetDefinition;
  asset: IPlacedAsset;
  color: string;
}

export const AssetPrimitiveRenderer: React.FC<Props> = ({ definition, asset, color }) => {
  const { model, defaultSize } = definition;
  
  const textureUrl = asset.materialOverride?.textureUrl;
  const texture = textureUrl ? useTexture(textureUrl) : null;
  if (texture) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
  }

  const roughness = asset.materialOverride?.roughness ?? 0.8;
  const metalness = asset.materialOverride?.metalness ?? 0.1;

  if (model.type === 'box') {
    return (
      <mesh position={[0, defaultSize.height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[defaultSize.width, defaultSize.height, defaultSize.depth]} />
        <meshStandardMaterial 
          color={color} 
          map={texture} 
          roughness={roughness} 
          metalness={metalness} 
        />
      </mesh>
    );
  }

  if (model.type === 'cylinder') {
    return (
      <mesh position={[0, defaultSize.height / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[defaultSize.width / 2, defaultSize.width / 2, defaultSize.height, 32]} />
        <meshStandardMaterial 
          color={color} 
          map={texture} 
          roughness={roughness} 
          metalness={metalness} 
        />
      </mesh>
    );
  }

  // Fallback for unknown primitive
  return (
    <mesh position={[0, defaultSize.height / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[defaultSize.width, defaultSize.height, defaultSize.depth]} />
      <meshStandardMaterial color={color} wireframe />
    </mesh>
  );
};
