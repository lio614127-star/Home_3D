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

  const modelType = definition.model?.type || 'box';
  const w = definition.defaultSize?.width || 1;
  const h = definition.defaultSize?.height || 1;
  const d = definition.defaultSize?.depth || 1;

  if (modelType === 'box') {
    return (
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial 
          color={color} 
          map={texture} 
          roughness={roughness} 
          metalness={metalness} 
        />
      </mesh>
    );
  }

  if (modelType === 'cylinder') {
    return (
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[w / 2, w / 2, h, 32]} />
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
    <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={color} wireframe />
    </mesh>
  );
};
