import React, { useMemo, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { IAssetDefinition, IPlacedAsset } from '../../types';
import * as THREE from 'three';

interface Props {
  definition: IAssetDefinition;
  asset: IPlacedAsset;
  color: string;
}

export const GLBAssetRenderer: React.FC<Props> = ({ definition, asset, color }) => {
  const url = definition.url || definition.model.url;
  
  if (!url) {
    return (
      <mesh position={[0, definition.defaultSize.height / 2, 0]}>
        <boxGeometry args={[definition.defaultSize.width, definition.defaultSize.height, definition.defaultSize.depth]} />
        <meshStandardMaterial color="red" wireframe />
      </mesh>
    );
  }

  // useGLTF handles caching automatically based on URL
  const { scene } = useGLTF(url);
  
  // Clone the scene so we can mutate materials per instance safely
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  // Compute bounding box to auto-scale
  const scaleRatio = useMemo(() => {
    const box = new THREE.Box3().setFromObject(clonedScene);
    const size = new THREE.Vector3();
    box.getSize(size);
    
    // Fallback size to prevent division by zero
    const w = size.x || 1;
    const h = size.y || 1;
    const d = size.z || 1;

    // Calculate ratio to fit inside defaultSize
    // Assuming the user wants the bounding box to match the defined width/depth/height exactly
    return [
      definition.defaultSize.width / w,
      definition.defaultSize.height / h,
      definition.defaultSize.depth / d
    ] as [number, number, number];
  }, [clonedScene, definition.defaultSize]);

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
    <primitive 
      object={clonedScene} 
      scale={scaleRatio}
      // Assuming the pivot of the GLB is at the bottom center. If it's at the center, we might need position adjustments
    />
  );
};
