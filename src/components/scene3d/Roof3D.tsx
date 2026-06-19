import React, { useMemo } from 'react';
import * as THREE from 'three';
import { IRoof, IBuilding } from '../../types';
import { offsetPolygon } from '../../core/geometry/math';
import { generateJapaneseRoofV1, generateThaiRoofV1 } from '../../core/geometry/roofGenerator';
import { useUIStore } from '../../store/useUIStore';

interface Props {
  roof: IRoof;
  building: IBuilding;
}

// Base settings for materials
const materialSettings = { roughness: 0.8, side: THREE.DoubleSide, flatShading: true };

export const Roof3D: React.FC<Props> = ({ roof, building }) => {
  const selectedObjectId = useUIStore(state => state.selectedObjectId);
  const selectedItems = useUIStore(state => state.selectedItems);

  const geometry = useMemo(() => {
    if (!building.footprint || building.footprint.length < 3) return null;

    const outerPoints = offsetPolygon(building.footprint, roof.overhang || 0.6);
    
    const shape = new THREE.Shape();
    shape.moveTo(outerPoints[0].x, outerPoints[0].z);
    for (let i = 1; i < outerPoints.length; i++) {
      shape.lineTo(outerPoints[i].x, outerPoints[i].z);
    }
    shape.lineTo(outerPoints[0].x, outerPoints[0].z); // Close

    if (roof.type === 'flat') {
      const extrudeSettings = {
        depth: roof.height || 0.2,
        bevelEnabled: false
      };
      const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geom.rotateX(Math.PI / 2); 
      return geom;
    }
    if (roof.type === 'japanese') {
      return generateJapaneseRoofV1(outerPoints, roof.angle || 30, roof.ridgeDirection || 'auto');
    }
    
    if (roof.type === 'thai') {
      return generateThaiRoofV1(outerPoints, roof.angle || 30, roof.ridgeDirection || 'auto');
    }
    
    // Fallback
    return null;
  }, [building.footprint, roof.overhang, roof.type, roof.height, roof.angle]);

  if (!geometry) return null;

  const isSelected = selectedObjectId === roof.id || 
                     selectedItems.some(it => it.type === 'roof' && it.id === roof.id) ||
                     selectedObjectId === roof.buildingId ||
                     selectedItems.some(it => it.type === 'building' && it.id === roof.buildingId);

  const material = useMemo(() => {
    const color = roof.color || '#8b4513';
    let specificSettings = {};
    if (roof.material?.type === 'metal') specificSettings = { roughness: 0.3, metalness: 0.5 };
    else if (roof.material?.type === 'concrete') specificSettings = { roughness: 0.9 };
    
    return new THREE.MeshStandardMaterial({ ...materialSettings, color, ...specificSettings });
  }, [roof.color, roof.material?.type]);

  return (
    <group position={[0, roof.elevation || 3.0, 0]}>
      <mesh geometry={geometry} material={material} castShadow receiveShadow />
      {isSelected && (
        <mesh geometry={geometry}>
          <meshBasicMaterial color="#ffeb3b" opacity={0.3} transparent depthTest={false} />
        </mesh>
      )}
    </group>
  );
};
