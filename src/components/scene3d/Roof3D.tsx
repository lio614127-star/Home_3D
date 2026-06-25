import React, { useMemo } from 'react';
import * as THREE from 'three';
import { IRoof, IBuilding } from '../../types';
import { offsetPolygon } from '../../core/geometry/math';
import { generateJapaneseRoofV1, generateThaiRoofV1 } from '../../core/geometry/roofGenerator';
import { generateComplexRoof, generateVietnameseGardenHouseRoof } from '../../core/geometry/roofGeneratorV2';
import { useUIStore } from '../../store/useUIStore';
import { useProjectStore } from '../../store/useProjectStore';
import { getResolvedBuildingFrontSide } from '../../core/geometry/buildingOrientation';
import { Edges, Text } from '@react-three/drei';

interface Props {
  roof: IRoof;
  building: IBuilding;
}

// Base settings for materials
const materialSettings = { roughness: 0.8, side: THREE.DoubleSide, flatShading: true };

export const Roof3D: React.FC<Props> = ({ roof, building }) => {
  const selectedObjectId = useUIStore(state => state.selectedObjectId);
  const selectedItems = useUIStore(state => state.selectedItems);
  const project = useProjectStore(state => state.data);
  const frontSide = getResolvedBuildingFrontSide(building, project);

  const geometry = useMemo(() => {
    if (!building.footprint || building.footprint.length < 3) return null;

    const outerPoints = offsetPolygon(building.footprint, roof.overhang || 0.6);
    
    // Three.js Shape expects CCW for the outer ring. If it's CW, it treats it as a hole and fails.
    let signedArea = 0;
    for (let i = 0; i < outerPoints.length; i++) {
      const p1 = outerPoints[i];
      const p2 = outerPoints[(i + 1) % outerPoints.length];
      signedArea += (p1.x * p2.z - p2.x * p1.z);
    }
    const pts = signedArea < 0 ? [...outerPoints].reverse() : outerPoints;

    const shape = new THREE.Shape();
    shape.moveTo(pts[0].x, pts[0].z);
    for (let i = 1; i < pts.length; i++) {
      shape.lineTo(pts[i].x, pts[i].z);
    }
    shape.lineTo(pts[0].x, pts[0].z); // Close

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
      return generateThaiRoofV1(outerPoints, roof.angle || 30, (roof as any).ridgeDirection || 'auto');
    }
    
    // Fallback
    return null;
  }, [building.footprint, roof.overhang, roof.type, (roof as any).height, roof.angle, roof.segments]);

  const complexSegments = useMemo(() => {
    console.log("[DEBUG] AI Roof Segments in Roof3D:", roof.segments);
    if (!roof.segments || roof.segments.length === 0) return [];
    
    // Fallback detection for presetType
    const presetType = (roof as any).geometryParameters?.presetType ?? roof.segments[0]?.presetType;

    if (presetType === 'vnGardenHouse') {
      let doorCenterX = undefined;
      let doorCenterZ = undefined;
      
      if (project.openings && project.walls) {
        const doors = project.openings.filter(o => o.type === 'door');
        for (const door of doors) {
          const wall = project.walls.find(w => w.id === door.wallId);
          if (wall && wall.buildingId === building.id) {
            const dx = wall.end.x - wall.start.x;
            const dz = wall.end.z - wall.start.z;
            const ratio = door.offsetFromStart / Math.hypot(dx, dz);
            doorCenterX = wall.start.x + dx * ratio;
            doorCenterZ = wall.start.z + dz * ratio;
            break; // take first valid door
          }
        }
      }
      
      return generateVietnameseGardenHouseRoof(building.footprint, 0, roof.overhang || 0.6, frontSide, doorCenterX, doorCenterZ);
    }

    // Calculate elevation. Usually the elevation is handled by the group, but we offset it.
    // We pass 0 for elevation because the wrapping <group> in Roof3D will lift it up to roof.elevation
    return generateComplexRoof(roof.segments, building.footprint, 0, roof.overhang || 0.6, frontSide);
  }, [roof.segments, building.footprint, roof.overhang, frontSide, project.openings, project.walls, building.id]);

  const material = useMemo(() => {
    let colorStr = roof.color || '#8b4513';
    // Normalize AI color outputs to valid ThreeJS colors
    colorStr = colorStr.replace(/_/g, '').toLowerCase();
    const colorMap: Record<string, string> = {
      'wood': '#8b4513', 'timber': '#8b4513', 'tile': '#8B3A3A',
      'metal': '#708090', 'concrete': '#A9A9A9', 'darkgrey': '#a9a9a9',
      'lightgrey': '#d3d3d3', 'grey': '#808080', 'gray': '#808080'
    };
    if (colorMap[colorStr]) colorStr = colorMap[colorStr];
    
    // Safely parse color
    let safeColor = new THREE.Color('#8b4513');
    try {
      safeColor.setStyle(colorStr);
    } catch (e) {
      console.warn(`[DEBUG] Invalid color string: ${colorStr}, falling back to default.`);
    }

    let specificSettings = {};
    if (roof.material?.type === 'metal') specificSettings = { roughness: 0.3, metalness: 0.5 };
    else if (roof.material?.type === 'concrete') specificSettings = { roughness: 0.9 };
    
    return new THREE.MeshStandardMaterial({ ...materialSettings, color: safeColor, ...specificSettings });
  }, [roof.color, roof.material?.type]);

  if (roof.visible === false) return null;
  if (!geometry && complexSegments.length === 0) return null;

  console.log("[DEBUG] Roof3D Rendering. complexSegments length:", complexSegments.length);

  const isSelected = selectedObjectId === roof.id || 
                     selectedItems.some(it => it.type === 'roof' && it.id === roof.id) ||
                     selectedObjectId === roof.buildingId ||
                     selectedItems.some(it => it.type === 'building' && it.id === roof.buildingId);

  const getDevSegmentColor = (segment: any, index: number) => {
    if (!import.meta.env.DEV) return undefined;
    const colors: Record<string, string> = {
      'main-roof': '#8f8a72',
      'front-porch-roof': '#d89022',
      'left-secondary-roof': '#8a45a5',
      'upper-tier-roof': '#9fc8a0'
    };
    return colors[segment.id] || ['#4caf50', '#f44336', '#e91e63'][index % 3];
  };

  const useDebugRoofColors = import.meta.env.DEV && complexSegments.length > 0;
  const showRoofDebugLabels = false;

  if (complexSegments.length > 0) {
    const presetType = (roof as any).geometryParameters?.presetType ?? roof.segments?.[0]?.presetType;
    const isVnPreset = presetType === 'vnGardenHouse';
    const isDev = import.meta.env.DEV && !isVnPreset; // Disable generic dev debug overlays for deterministic preset

    return (
      <group position={[0, roof.elevation || 3.0, 0]}>
        {complexSegments.map((seg, idx) => {
          const devColor = getDevSegmentColor(seg, idx);
          const isMain = seg.id === 'main-roof';
          const devOpacity = isMain ? 1.0 : 1.0;
          const isDevTransparent = isDev ? (devOpacity < 1.0) : false;

          let matColor: THREE.Color | string = material.color;
          let matRoughness = 0.8;
          let matMetalness = 0.05;

          if (seg.material) {
            matColor = seg.material.color || material.color;
            matRoughness = seg.material.roughness ?? 0.8;
            matMetalness = seg.material.metalness ?? 0.05;
          } else if (isDev) {
            matColor = devColor || material.color;
          }

          return (
            <group key={seg.id || idx} position={[seg.world.centerX, seg.world.baseY, seg.world.centerZ]}>
              <mesh geometry={seg.geometry} castShadow receiveShadow>
                <meshStandardMaterial 
                  color={matColor} 
                  roughness={matRoughness} 
                  metalness={matMetalness} 
                  transparent={isDevTransparent} 
                  opacity={devOpacity} 
                  side={THREE.DoubleSide}
                  polygonOffset={true}
                  polygonOffsetFactor={-1}
                  polygonOffsetUnits={-1}
                />
              </mesh>
              {isDev && (
                <>
                  <lineSegments>
                    <edgesGeometry args={[seg.geometry]} />
                    <lineBasicMaterial color="black" />
                  </lineSegments>
                  {showRoofDebugLabels && (
                    <Text 
                      position={[0, seg.world.height + 0.5, 0]} 
                      fontSize={0.25} 
                      color="white" 
                      outlineColor="black" 
                      outlineWidth={0.03}
                    >
                      {seg.id || seg.kind}
                    </Text>
                  )}
                </>
              )}
              {isSelected && (
                <mesh geometry={seg.geometry}>
                  <meshBasicMaterial color="#ffeb3b" opacity={0.3} transparent depthTest={false} />
                </mesh>
              )}
            </group>
          );
        })}
      </group>
    );
  }

  return (
    <group position={[0, roof.elevation || 3.0, 0]}>
      <mesh geometry={geometry!} material={material} castShadow receiveShadow />
      {isSelected && (
        <mesh geometry={geometry!}>
          <meshBasicMaterial color="#ffeb3b" opacity={0.3} transparent depthTest={false} />
        </mesh>
      )}
    </group>
  );
};
