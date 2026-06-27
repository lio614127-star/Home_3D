import * as THREE from 'three';
import { IAssetDefinition, IPlacedAsset } from '../../types';

export function getAssetRuntimeTransform(
  assetDefinition: IAssetDefinition,
  placedAsset: IPlacedAsset,
  scene: THREE.Group | THREE.Object3D
) {
    // Heuristic for pillows and blankets (often authored standing up)
  const name = (assetDefinition.name || '').toLowerCase();
  if (name.includes('pillow') || name.includes('cushion') || name.includes('blanket') || name.includes('gối') || name.includes('chăn') || name.includes('đệm')) {
    scene.rotation.x = -Math.PI / 2; // Rotate 90 degrees to lay flat
    scene.updateMatrixWorld(true);
  }

  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const rawWidth = size.x;
  const rawHeight = size.y;
  const rawDepth = size.z;

  const positionOffset = {
    x: -center.x,
    y: -box.min.y,
    z: -center.z
  };

  let normalizationScale = 1;

  if (rawWidth > 0 && rawHeight > 0 && rawDepth > 0) {
    if (assetDefinition.defaultSize) {
      const targetWidth = (assetDefinition.defaultSize as any).width || (assetDefinition.defaultSize as any).x;
      const targetHeight = (assetDefinition.defaultSize as any).height || (assetDefinition.defaultSize as any).y;
      const targetDepth = (assetDefinition.defaultSize as any).depth || (assetDefinition.defaultSize as any).z;

      if (targetWidth && targetDepth) {
        const scaleX = targetWidth / rawWidth;
        const scaleZ = targetDepth / rawDepth;
        // Prefer uniform scale to prevent distortion
        normalizationScale = Math.min(scaleX, scaleZ);
      } else if (targetHeight) {
        normalizationScale = targetHeight / rawHeight;
      }
    }
  }

  const finalScale = {
    x: normalizationScale * (placedAsset.scale?.x ?? 1),
    y: normalizationScale * (placedAsset.scale?.y ?? 1),
    z: normalizationScale * (placedAsset.scale?.z ?? 1)
  };

  if ((import.meta as any).env?.DEV) {
    const isSuspicious = (w: number, h: number, d: number) => w < 0.02 || w > 20 || h < 0.02 || h > 20 || d < 0.02 || d > 20;
    
    if (isSuspicious(rawWidth, rawHeight, rawDepth) || isSuspicious(rawWidth * normalizationScale, rawHeight * normalizationScale, rawDepth * normalizationScale)) {
      console.warn('[ASSET3D NORMALIZE WARN] Suspicious dimensions:', {
        assetId: assetDefinition.id,
        name: assetDefinition.name,
        rawBounds: { width: rawWidth, height: rawHeight, depth: rawDepth },
        defaultSize: assetDefinition.defaultSize,
        normalizationScale,
        reason: 'Dimensions < 0.02m or > 20m'
      });
    }

    console.log('[ASSET3D NORMALIZE]', {
      assetId: assetDefinition.id,
      name: assetDefinition.name,
      modelUrl: assetDefinition.modelUrl,
      rawBounds: { width: rawWidth, height: rawHeight, depth: rawDepth },
      normalizedBounds: { width: rawWidth * normalizationScale, height: rawHeight * normalizationScale, depth: rawDepth * normalizationScale },
      defaultSize: assetDefinition.defaultSize,
      normalizationScale,
      positionOffset,
      finalScale,
      placedPosition: placedAsset.position,
      rotation: placedAsset.rotation
    });
  }

  return {
    normalizationScale,
    positionOffset,
    rawBounds: { width: rawWidth, height: rawHeight, depth: rawDepth },
    normalizedBounds: { width: rawWidth * normalizationScale, height: rawHeight * normalizationScale, depth: rawDepth * normalizationScale },
    finalScale
  };
}
