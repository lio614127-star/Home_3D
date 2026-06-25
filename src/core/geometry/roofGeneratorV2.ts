import * as THREE from 'three';
import { Vector2 } from 'three';
import { RoofSegmentParams } from '../ai/types';

import { 
  createHipRoofGeometry, 
  createGableRoofGeometry,
  createFlatRoofGeometry,
  createShedRoofGeometry,
  createPyramidRoofGeometry
} from './roofGenerator';
export type RoofRenderSegment = {
  id: string;
  kind: string;
  roofType: string;
  geometry: THREE.BufferGeometry;
  material?: any;
  debugColor?: string;
  world: {
    centerX: number;
    centerZ: number;
    width: number;
    depth: number;
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    baseY: number;
    height: number;
    tierIndex: number;
  };
};

import { getBuildingOrientationFrame } from './buildingOrientation';
import { BuildingFrontSide } from '../../types';

// ... (skipping up to the function) ...

export function generateVietnameseGardenHouseRoof(
  buildingFootprint: Vector2[],
  elevation: number,
  baseOverhang: number,
  frontSide: BuildingFrontSide = 'minZ',
  doorCenterX?: number,
  doorCenterZ?: number
): RoofRenderSegment[] {
  const result: RoofRenderSegment[] = [];
  if (!buildingFootprint || buildingFootprint.length < 3) return result;

  const minX = Math.min(...buildingFootprint.map(p => p.x));
  const maxX = Math.max(...buildingFootprint.map(p => p.x));
  const minZ = Math.min(...buildingFootprint.map(p => p.z));
  const maxZ = Math.max(...buildingFootprint.map(p => p.z));

  const bWidth = maxX - minX;
  const bDepth = maxZ - minZ;
  const bCenterX = (minX + maxX) / 2;
  const bCenterZ = (minZ + maxZ) / 2;

  // 1. Main Hip Roof
  const mainOverhang = 0.8;
  const mainRect = {
    minX: minX - mainOverhang,
    maxX: maxX + mainOverhang,
    minZ: minZ - mainOverhang,
    maxZ: maxZ + mainOverhang
  };
  const mainGeom = createHipRoofGeometry(mainRect, 26, 'horizontal', 0.2);
  const mainMaterial = { color: '#2f3f4f', roughness: 0.88, metalness: 0.03 };
  
  result.push({
    id: 'main-hip-roof',
    kind: 'main',
    roofType: 'japanese',
    geometry: mainGeom,
    material: mainMaterial,
    world: {
      centerX: bCenterX, centerZ: bCenterZ,
      width: mainRect.maxX - mainRect.minX, depth: mainRect.maxZ - mainRect.minZ,
      minX: mainRect.minX, maxX: mainRect.maxX, minZ: mainRect.minZ, maxZ: mainRect.maxZ,
      baseY: 0, height: 1.0, tierIndex: 0
    }
  });

  // 2. Front Porch Gable Roof
  const porchWidth = bWidth * 0.35;
  const porchDepth = bDepth * 0.25;
  
  // Use door position if available, else center of building
  const px = doorCenterX !== undefined ? doorCenterX : bCenterX;
  const pz = doorCenterZ !== undefined ? doorCenterZ : bCenterZ;

  let porchRect = { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
  let ridgeDir: 'horizontal' | 'vertical' = 'vertical';
  
  // Simplified door position check based on frontSide
  if (frontSide === 'minZ') {
    const porchZ = minZ - mainOverhang * 0.2; // attached near eave
    porchRect = {
      minX: px - porchWidth/2, maxX: px + porchWidth/2,
      minZ: porchZ - porchDepth, maxZ: porchZ
    };
    ridgeDir = 'vertical';
  } else if (frontSide === 'maxZ') {
    const porchZ = maxZ + mainOverhang * 0.2;
    porchRect = {
      minX: px - porchWidth/2, maxX: px + porchWidth/2,
      minZ: porchZ, maxZ: porchZ + porchDepth
    };
    ridgeDir = 'vertical';
  } else if (frontSide === 'minX') {
    const porchX = minX - mainOverhang * 0.2;
    porchRect = {
      minX: porchX - porchDepth, maxX: porchX,
      minZ: pz - porchWidth/2, maxZ: pz + porchWidth/2
    };
    ridgeDir = 'horizontal';
  } else if (frontSide === 'maxX') {
    const porchX = maxX + mainOverhang * 0.2;
    porchRect = {
      minX: porchX, maxX: porchX + porchDepth,
      minZ: pz - porchWidth/2, maxZ: pz + porchWidth/2
    };
    ridgeDir = 'horizontal';
  }

  const porchGeom = createGableRoofGeometry(porchRect, 34, ridgeDir, 0.15);
  // Lower porch slightly
  porchGeom.translate(0, -0.12, 0);

  result.push({
    id: 'front-entry-porch-roof',
    kind: 'porch',
    roofType: 'gable',
    geometry: porchGeom,
    material: mainMaterial,
    world: {
      centerX: (porchRect.minX + porchRect.maxX) / 2, centerZ: (porchRect.minZ + porchRect.maxZ) / 2,
      width: porchRect.maxX - porchRect.minX, depth: porchRect.maxZ - porchRect.minZ,
      minX: porchRect.minX, maxX: porchRect.maxX, minZ: porchRect.minZ, maxZ: porchRect.maxZ,
      baseY: -0.12, height: 0.85, tierIndex: 0
    }
  });

  // 3. Right Flat Annex
  const annexDepth = bDepth * 0.72;
  const annexWidth = bWidth * 0.28;
  let annexRect = { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
  
  if (frontSide === 'minZ') {
    // Right is +X
    annexRect = { minX: maxX, maxX: maxX + annexWidth, minZ: minZ + 0.5, maxZ: minZ + 0.5 + annexDepth };
  } else if (frontSide === 'maxZ') {
    // Right is -X
    annexRect = { minX: minX - annexWidth, maxX: minX, minZ: maxZ - 0.5 - annexDepth, maxZ: maxZ - 0.5 };
  } else if (frontSide === 'minX') {
    // Right is -Z
    annexRect = { minX: minX + 0.5, maxX: minX + 0.5 + annexDepth, minZ: minZ - annexWidth, maxZ: minZ };
  } else {
    // Right is +Z
    annexRect = { minX: maxX - 0.5 - annexDepth, maxX: maxX - 0.5, minZ: maxZ, maxZ: maxZ + annexWidth };
  }
  
  const annexGeom = createFlatRoofGeometry(annexRect, 0.2);
  const annexMaterial = { color: '#b8b8b0', roughness: 0.92, metalness: 0 };
  
  result.push({
    id: 'right-flat-annex-roof',
    kind: 'secondary',
    roofType: 'flat',
    geometry: annexGeom,
    material: annexMaterial,
    world: {
      centerX: (annexRect.minX + annexRect.maxX) / 2, centerZ: (annexRect.minZ + annexRect.maxZ) / 2,
      width: annexRect.maxX - annexRect.minX, depth: annexRect.maxZ - annexRect.minZ,
      minX: annexRect.minX, maxX: annexRect.maxX, minZ: annexRect.minZ, maxZ: annexRect.maxZ,
      baseY: 0.05, height: 0.2, tierIndex: 0
    }
  });

  return result;
}


export function generateComplexRoof(
  segments: RoofSegmentParams[],
  buildingFootprint: Vector2[],
  elevation: number,
  baseOverhang: number,
  frontSide: BuildingFrontSide = 'minZ'
): RoofRenderSegment[] {
  const result: RoofRenderSegment[] = [];
  
  if (!buildingFootprint || buildingFootprint.length < 3) return result;

  const minX = Math.min(...buildingFootprint.map(p => p.x));
  const maxX = Math.max(...buildingFootprint.map(p => p.x));
  const minZ = Math.min(...buildingFootprint.map(p => p.z));
  const maxZ = Math.max(...buildingFootprint.map(p => p.z));

  const bbox = { minX, maxX, minZ, maxZ };
  const bWidth = maxX - minX;
  const bDepth = maxZ - minZ;

  if (!Array.isArray(segments)) return result;

  const orientation = getBuildingOrientationFrame(frontSide);

  const mapAIRoofSegmentToWorld = (seg: any, b: typeof bbox) => {
    const bCenterX = (b.minX + b.maxX) / 2;
    const bCenterZ = (b.minZ + b.maxZ) / 2;

    let cX = seg.relativeFootprint?.centerX ?? seg.centerX ?? 0;
    let cZ = seg.relativeFootprint?.centerZ ?? seg.centerZ ?? 0;
    let wR = seg.relativeFootprint?.widthRatio ?? seg.widthRatio ?? 1;
    let dR = seg.relativeFootprint?.depthRatio ?? seg.depthRatio ?? 1;

    cX = THREE.MathUtils.clamp(cX, -1, 1);
    cZ = THREE.MathUtils.clamp(cZ, -1, 1);
    wR = THREE.MathUtils.clamp(wR, 0.01, 2.0);
    dR = THREE.MathUtils.clamp(dR, 0.01, 2.0);

    let worldWidth = bWidth * wR;
    let worldDepth = bDepth * dR;
    
    let worldCenterX = bCenterX + (cX * bWidth) / 2;
    let worldCenterZ = bCenterZ + (cZ * bDepth) / 2;

    const semanticSide = seg.side ?? seg.attachToSide ?? seg.semanticPosition;
    
    if (semanticSide) {
      const isMinXMaxX = frontSide === 'minX' || frontSide === 'maxX';
      if (isMinXMaxX) {
         worldWidth = bDepth * wR;
         worldDepth = bWidth * dR;
      }

      const sideStr = semanticSide.toLowerCase();
      
      if (sideStr.includes('front')) {
        worldCenterX = bCenterX + orientation.front.x * (bWidth / 2 + worldDepth * 0.15);
        worldCenterZ = bCenterZ + orientation.front.z * (bDepth / 2 + worldDepth * 0.15);
      } else if (sideStr.includes('back')) {
        worldCenterX = bCenterX + orientation.back.x * (bWidth / 2 + worldDepth * 0.15);
        worldCenterZ = bCenterZ + orientation.back.z * (bDepth / 2 + worldDepth * 0.15);
      } else if (sideStr.includes('left')) {
        worldCenterX = bCenterX + orientation.left.x * (bWidth / 2 - worldWidth * 0.5);
        worldCenterZ = bCenterZ + orientation.left.z * (bDepth / 2 - worldDepth * 0.5);
      } else if (sideStr.includes('right')) {
        worldCenterX = bCenterX + orientation.right.x * (bWidth / 2 - worldWidth * 0.5);
        worldCenterZ = bCenterZ + orientation.right.z * (bDepth / 2 - worldDepth * 0.5);
      }
    }

    const kind = seg.kind ?? 'main';
    const roofType = seg.roofType ?? 'hip';
    const pitchDeg = seg.pitchDeg ?? 30;
    const relativeHeight = seg.relativeHeight ?? seg.heightRatio ?? 1;
    
    let overhang = baseOverhang;
    if (seg.overhang !== undefined) overhang = seg.overhang;
    else if (seg.overhangRatio !== undefined) overhang = Math.min(worldWidth, worldDepth) * seg.overhangRatio;
    
    const thickness = seg.thickness ?? 0.15;
    const fasciaHeight = seg.fasciaHeight ?? 0.2;
    const tierIndex = seg.tierIndex ?? 0;
    const elevationOffset = seg.elevationOffset ?? 0; // Use 0 fallback, add tier logic later
    
    let ridgeDirection = seg.ridgeDirection ?? 'auto';
    
    if (ridgeDirection === 'frontBack') {
      ridgeDirection = (frontSide === 'minZ' || frontSide === 'maxZ') ? 'vertical' : 'horizontal';
    } else if (ridgeDirection === 'leftRight') {
      ridgeDirection = (frontSide === 'minZ' || frontSide === 'maxZ') ? 'horizontal' : 'vertical';
    }
    
    if (ridgeDirection === 'auto' || !['horizontal', 'vertical'].includes(ridgeDirection)) {
       ridgeDirection = worldWidth >= worldDepth ? 'horizontal' : 'vertical';
    }

    let slopeDirection = seg.slopeDirection ?? 'auto';
    if (slopeDirection === 'auto') {
      if (kind === 'porch' || kind === 'eave') {
        if (Math.abs(cX) > Math.abs(cZ)) {
          slopeDirection = cX > 0 ? 'right' : 'left';
        } else {
          slopeDirection = cZ > 0 ? 'front' : 'back';
        }
      } else {
        slopeDirection = ridgeDirection === 'horizontal' ? 'front' : 'right';
      }
    }

    // Map semantic slope direction to absolute world slope direction
    let absoluteSlopeDirection = slopeDirection;
    if (['front', 'back', 'left', 'right'].includes(slopeDirection)) {
      if (slopeDirection === 'front') {
        if (frontSide === 'minZ') absoluteSlopeDirection = 'back';
        else if (frontSide === 'maxZ') absoluteSlopeDirection = 'front';
        else if (frontSide === 'minX') absoluteSlopeDirection = 'left';
        else if (frontSide === 'maxX') absoluteSlopeDirection = 'right';
      } else if (slopeDirection === 'back') {
        if (frontSide === 'minZ') absoluteSlopeDirection = 'front';
        else if (frontSide === 'maxZ') absoluteSlopeDirection = 'back';
        else if (frontSide === 'minX') absoluteSlopeDirection = 'right';
        else if (frontSide === 'maxX') absoluteSlopeDirection = 'left';
      } else if (slopeDirection === 'left') {
        if (frontSide === 'minZ') absoluteSlopeDirection = 'left';
        else if (frontSide === 'maxZ') absoluteSlopeDirection = 'right';
        else if (frontSide === 'minX') absoluteSlopeDirection = 'back';
        else if (frontSide === 'maxX') absoluteSlopeDirection = 'front';
      } else if (slopeDirection === 'right') {
        if (frontSide === 'minZ') absoluteSlopeDirection = 'right';
        else if (frontSide === 'maxZ') absoluteSlopeDirection = 'left';
        else if (frontSide === 'minX') absoluteSlopeDirection = 'front';
        else if (frontSide === 'maxX') absoluteSlopeDirection = 'back';
      }
    }

    return {
      ...seg,
      kind,
      roofType,
      pitchDeg,
      relativeHeight,
      overhang,
      thickness,
      fasciaHeight,
      tierIndex,
      elevationOffset,
      ridgeDirection,
      slopeDirection: absoluteSlopeDirection,
      worldCenterX,
      worldCenterZ,
      worldWidth,
      worldDepth,
      clampedCenterX: cX,
      clampedCenterZ: cZ,
      clampedWidthRatio: wR,
      clampedDepthRatio: dR
    };
  };

  const mappedSegments = segments.map(seg => mapAIRoofSegmentToWorld(seg, bbox));

  mappedSegments.sort((a, b) => {
    if (a.tierIndex !== b.tierIndex) {
      return a.tierIndex - b.tierIndex;
    }
    const order: Record<string, number> = {
      main: 0,
      porch: 1,
      eave: 1,
      secondary: 2,
      dormer: 3,
      tower: 4,
      decorative: 5,
    };
    return (order[a.kind] ?? 99) - (order[b.kind] ?? 99);
  });

  mappedSegments.forEach((mapped, index) => {
    const width = mapped.worldWidth + mapped.overhang * 2;
    const depth = mapped.worldDepth + mapped.overhang * 2;
    
    const cx = mapped.worldCenterX;
    const cz = mapped.worldCenterZ;

    const rect = {
      minX: -width/2,
      maxX: width/2,
      minZ: -depth/2,
      maxZ: depth/2
    };

    if (isNaN(rect.minX) || isNaN(rect.maxX) || isNaN(rect.minZ) || isNaN(rect.maxZ) || isNaN(width) || isNaN(depth)) {
      return;
    }

    let segmentGeometry: THREE.BufferGeometry | null = null;
    const angle = mapped.pitchDeg;
    const rType = mapped.roofType;
    
    if (rType === 'flat') {
      segmentGeometry = createFlatRoofGeometry(rect, mapped.thickness);
    } else if (rType === 'shed' || rType === 'leanTo') {
      segmentGeometry = createShedRoofGeometry(rect, angle, mapped.ridgeDirection, mapped.slopeDirection, mapped.thickness);
    } else if (rType === 'pyramid' || (mapped.tierIndex > 0 && rType === 'hip')) {
      segmentGeometry = createPyramidRoofGeometry(rect, angle, mapped.thickness);
    } else if (rType === 'gable' || rType === 'thai') {
      segmentGeometry = createGableRoofGeometry(rect, angle, mapped.ridgeDirection, mapped.thickness);
    } else {
      segmentGeometry = createHipRoofGeometry(rect, angle, mapped.ridgeDirection, mapped.thickness);
    }

    if (segmentGeometry) {
      const relHeight = THREE.MathUtils.clamp(mapped.relativeHeight, 0.1, 3.0);
      
      segmentGeometry.scale(1, relHeight, 1);
      segmentGeometry.computeVertexNormals();
      
      const bWidth = bbox.maxX - bbox.minX;
      const bDepth = bbox.maxZ - bbox.minZ;
      const mainRoofHeight = Math.tan(24 * Math.PI / 180) * Math.min(bWidth, bDepth) * 0.5;
      let tierLift = 0;
      if (mapped.tierIndex > 0) {
        tierLift = Math.max(1.2, mainRoofHeight * 0.65);
      }
      
      let kindBias = 0;
      if (mapped.kind === 'secondary') kindBias = 0.05;
      if (mapped.kind === 'porch' || mapped.kind === 'eave') kindBias = -0.05;
      
      const baseY = mapped.elevationOffset + tierLift + kindBias;
      
      if (import.meta.env.DEV) {
        console.log('[AI ROOF V2 SEGMENT]', {
          id: mapped.id || `seg-${index}`,
          roofType: rType,
          kind: mapped.kind,
          baseY,
          height: relHeight,
          width,
          depth,
          pitchDeg: mapped.pitchDeg,
          vertexCount: segmentGeometry.attributes.position?.count,
        });
      }
      
      result.push({ 
        id: mapped.id || `seg-${index}`,
        kind: mapped.kind,
        roofType: rType,
        geometry: segmentGeometry, 
        material: mapped.materialData || mapped.material,
        world: {
          centerX: cx,
          centerZ: cz,
          width,
          depth,
          minX: cx - width/2,
          maxX: cx + width/2,
          minZ: cz - depth/2,
          maxZ: cz + depth/2,
          baseY,
          height: relHeight,
          tierIndex: mapped.tierIndex
        }
      });
    }
  });

  if (import.meta.env.DEV) {
    console.log('[AI ROOF V2] input segments:', segments.length);
    console.log('[AI ROOF V2] mapped segments:', mappedSegments.length);
    console.log('[AI ROOF V2] generated render segments:', result.length);
  }

  return result;
}
