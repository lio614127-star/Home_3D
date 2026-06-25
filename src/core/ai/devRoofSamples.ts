import { RoofSegmentParams } from './types';

export const DEV_MULTI_PART_ROOF_SAMPLE: RoofSegmentParams[] = [
  {
    id: 'main-roof',
    kind: 'main',
    roofType: 'japanese',
    centerX: 0,
    centerZ: 0,
    widthRatio: 1.0,
    depthRatio: 1.0,
    pitchDeg: 24,
    overhangRatio: 0.05,
    relativeHeight: 1,
    tierIndex: 0,
    ridgeDirection: 'horizontal'
  },
  {
    id: 'front-porch-roof',
    kind: 'porch',
    roofType: 'shed',
    side: 'front',
    attachToSide: 'front',
    centerX: 0,
    centerZ: -1.08,
    widthRatio: 0.72,
    depthRatio: 0.22,
    pitchDeg: 18,
    overhangRatio: 0.04,
    relativeHeight: 0.65,
    tierIndex: 0,
    elevationOffset: -0.05,
    slopeDirection: 'front'
  },
  {
    id: 'left-secondary-roof',
    kind: 'secondary',
    roofType: 'gable',
    side: 'left',
    attachToSide: 'left',
    centerX: -0.98,
    centerZ: 0.02,
    widthRatio: 0.28,
    depthRatio: 0.52,
    pitchDeg: 36,
    overhangRatio: 0.04,
    relativeHeight: 0.85,
    tierIndex: 0,
    elevationOffset: 0.05,
    ridgeDirection: 'vertical'
  },
  {
    id: 'upper-tier-roof',
    kind: 'secondary',
    roofType: 'hip',
    centerX: 0,
    centerZ: 0,
    widthRatio: 0.34,
    depthRatio: 0.28,
    pitchDeg: 38,
    overhangRatio: 0.04,
    relativeHeight: 1.0,
    tierIndex: 1,
    elevationOffset: 1.35,
    ridgeDirection: 'horizontal'
  }
];

export const DEV_VIETNAMESE_GARDEN_HOUSE_ROOF_SAMPLE: RoofSegmentParams[] = [
  {
    presetType: 'vnGardenHouse', // Temporary dev-only compatibility hack
    id: 'main-hip-roof',
    kind: 'main',
    roofType: 'japanese',
    side: 'center',
    centerX: 0,
    centerZ: 0,
    widthRatio: 1.08,
    depthRatio: 1.08,
    pitchDeg: 24,
    overhangRatio: 0.08,
    relativeHeight: 1.0,
    tierIndex: 0,
    ridgeDirection: 'horizontal',
    material: {
      color: '#2f3f4f',
      roughness: 0.88,
      metalness: 0.03
    }
  },
  {
    id: 'front-entry-porch-roof',
    kind: 'porch',
    roofType: 'gable',
    side: 'front',
    attachToSide: 'front',
    centerX: 0,
    centerZ: -1.04,
    widthRatio: 0.36,
    depthRatio: 0.32,
    pitchDeg: 34,
    overhangRatio: 0.05,
    relativeHeight: 0.85,
    tierIndex: 0,
    elevationOffset: -0.12,
    ridgeDirection: 'frontBack',
    slopeDirection: 'front',
    material: {
      color: '#2f3f4f',
      roughness: 0.88,
      metalness: 0.03
    }
  },
  {
    id: 'right-flat-annex-roof',
    kind: 'secondary',
    roofType: 'flat',
    side: 'right',
    attachToSide: 'right',
    centerX: 0.92,
    centerZ: 0.05,
    widthRatio: 0.28,
    depthRatio: 0.72,
    pitchDeg: 0,
    overhangRatio: 0.02,
    relativeHeight: 0.2,
    tierIndex: 0,
    elevationOffset: 0.05,
    material: {
      color: '#b8b8b0',
      roughness: 0.92,
      metalness: 0
    }
  }
];
