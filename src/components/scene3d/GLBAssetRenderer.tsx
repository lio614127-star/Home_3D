import React, { useMemo, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { IAssetDefinition, IPlacedAsset } from '../../types';
import * as THREE from 'three';
import { getAssetRuntimeTransform } from '../../core/assets/assetNormalization';

interface Props {
  definition: IAssetDefinition;
  asset: IPlacedAsset;
  color: string;
}

export const GLBAssetRenderer: React.FC<Props> = ({ definition, asset, color }) => {
  const url = definition.modelUrl || definition.url || definition.model?.url;

  if ((import.meta as any).env?.DEV) {
    console.log('[ASSET3D LOAD]', { assetId: asset.assetId, modelUrl: url });
    if (url && !url.endsWith('.glb') && !url.endsWith('.gltf')) {
      console.warn('[ASSET3D WARNING] modelUrl does not end with .glb/.gltf:', url);
    }
  }
  
  if (!url) {
    const w = definition.defaultSize?.width || 1;
    const h = definition.defaultSize?.height || 1;
    const d = definition.defaultSize?.depth || 1;
    return (
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="red" wireframe />
      </mesh>
    );
  }

  // useGLTF handles caching automatically based on URL
  const { scene } = useGLTF(url);
  
  // Clone the scene so we can mutate materials per instance safely
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  // Compute bounding box to auto-scale and center
  const { positionOffset, finalScale } = useMemo(() => {
    return getAssetRuntimeTransform(definition, asset, clonedScene);
  }, [clonedScene, definition, asset.scale]);

  // Apply material overrides to the GLB meshes
  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        // If there's an override, apply it
        if (asset.materialOverride?.color) {
          if (!child.userData.originalMaterial) {
            child.userData.originalMaterial = child.material;
            // Create a new material to avoid mutating shared materials
            child.material = child.material.clone();
          }
          child.material.color.set(asset.materialOverride.color);
        }
        if (asset.materialOverride?.roughness !== undefined) {
          child.material.roughness = asset.materialOverride.roughness;
        }
        if (asset.materialOverride?.metalness !== undefined) {
          child.material.metalness = asset.materialOverride.metalness;
        }
      }
    });
  }, [clonedScene, asset.materialOverride]);

  return (
    <group scale={[finalScale.x, finalScale.y, finalScale.z]}>
      <group position={[positionOffset.x, positionOffset.y, positionOffset.z]}>
        <primitive object={clonedScene} />
      </group>
    </group>
  );
};
