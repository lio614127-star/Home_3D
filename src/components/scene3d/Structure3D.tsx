import React, { useMemo } from 'react';
import * as THREE from 'three';
import { IStructure, Structure } from '../../types';
import { getStructureMaterialColor } from '../../core/material/materialConfig';

interface StructureProps {
  structure: IStructure;
  material: THREE.Material;
}

const Patio3D: React.FC<StructureProps> = ({ structure, material }) => {
  const { width, depth, height } = structure.dimensions;
  
  return (
    <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[width, height, depth]} />
      <primitive object={material} />
    </mesh>
  );
};

const BoxStructure3D: React.FC<StructureProps> = ({ structure, material }) => {
  const { width, depth, height } = structure.dimensions;
  
  return (
    <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[width, height, depth]} />
      <primitive object={material} />
    </mesh>
  );
};

const Stairs3D: React.FC<StructureProps> = ({ structure, material }) => {
  const { width, depth, height } = structure.dimensions;
  const stepCount = structure.stepCount || 3;
  
  const stepDepth = depth / stepCount;
  const stepHeight = height / stepCount;

  return (
    <group>
      {Array.from({ length: stepCount }).map((_, index) => {
        const zOffset = (depth / 2) - (stepDepth / 2) - (index * stepDepth);
        const yOffset = (stepHeight / 2) + (index * stepHeight);
        
        return (
          <mesh key={index} position={[0, yOffset, zOffset]} castShadow receiveShadow>
            <boxGeometry args={[width, stepHeight, stepDepth]} />
            <primitive object={material} />
          </mesh>
        );
      })}
    </group>
  );
};

export const Structure3D: React.FC<{ structure: Structure }> = ({ structure }) => {
  const material = useMemo(() => {
    const color = getStructureMaterialColor(structure.type);
    return new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  }, [structure.type]);

  if (structure.type === 'fence') {
    const { path, height } = structure;
    const postThickness = 0.15;
    const panelThickness = 0.05;
    const fenceHeight = height || 1.5;

    return (
      <group>
        {path.map((p, i) => (
          <mesh key={`post-${i}`} position={[p.x, fenceHeight / 2, p.z]} castShadow receiveShadow>
            <boxGeometry args={[postThickness, fenceHeight, postThickness]} />
            <primitive object={material} />
          </mesh>
        ))}
        {path.map((p1, i) => {
          if (i === path.length - 1) return null;
          const p2 = path[i + 1];
          const dx = p2.x - p1.x;
          const dz = p2.z - p1.z;
          const len = Math.sqrt(dx * dx + dz * dz);
          const angle = Math.atan2(dz, dx);
          const midX = (p1.x + p2.x) / 2;
          const midZ = (p1.z + p2.z) / 2;

          return (
            <mesh key={`panel-${i}`} position={[midX, fenceHeight / 2, midZ]} rotation={[0, -angle, 0]} castShadow receiveShadow>
              <boxGeometry args={[len, fenceHeight * 0.9, panelThickness]} />
              <primitive object={material} />
            </mesh>
          );
        })}
      </group>
    );
  }

  const { position, rotation, type } = structure as IStructure;
  const rotationRad = -(rotation || 0) * (Math.PI / 180);

  const renderContent = () => {
    switch (type) {
      case 'patio':
        return <Patio3D structure={structure as IStructure} material={material} />;
      case 'stairs':
        return <Stairs3D structure={structure as IStructure} material={material} />;
      case 'garage':
      case 'sideKitchen':
        return <BoxStructure3D structure={structure as IStructure} material={material} />;
      default:
        return null;
    }
  };

  return (
    <group position={[position.x, 0, position.z]} rotation={[0, rotationRad, 0]}>
      {renderContent()}
    </group>
  );
};
