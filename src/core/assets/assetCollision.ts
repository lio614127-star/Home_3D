import { IAssetDefinition, IPlacedAsset, AssetSupportType } from '../../types';
import { getDefaultPlacementRules } from './assetPlacementRules';

export type CollisionSeverity = 'none' | 'warning' | 'error';

export interface CollisionResult {
  severity: CollisionSeverity;
  reason?: string;
  blockingAssetIds?: string[];
  suggestedHostAssetId?: string;
  suggestedSupportType?: AssetSupportType;
  suggestedY?: number;
}

// A simple AABB definition
export interface AABB {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * Computes AABB for a placed asset in world space.
 * Swaps width/depth if rotation is approx 90 or 270 degrees.
 */
export function getAssetFootprintAABB(placedAsset: Partial<IPlacedAsset>, assetDef: IAssetDefinition): AABB {
  const w = (assetDef.defaultSize?.width || 1) * (placedAsset.scale?.x || 1);
  const d = (assetDef.defaultSize?.depth || 1) * (placedAsset.scale?.z || 1);
  
  const rot = (placedAsset.rotation || 0) % 360;
  // If rotation is roughly 90 or 270, swap width and depth for AABB
  let actualW = w;
  let actualD = d;
  const absRot = Math.abs(rot);
  if ((absRot >= 45 && absRot <= 135) || (absRot >= 225 && absRot <= 315)) {
    actualW = d;
    actualD = w;
  }

  const px = placedAsset.position?.x || 0;
  const pz = placedAsset.position?.z || 0;

  // Assuming position represents the center in X/Z plane (which it does based on our rendering setup)
  return {
    minX: px - actualW / 2,
    maxX: px + actualW / 2,
    minZ: pz - actualD / 2,
    maxZ: pz + actualD / 2
  };
}

function checkAABBIntersect(a: AABB, b: AABB): boolean {
  const eps = 0.05; // 5cm epsilon to provide generous tolerance for edge-snapping
  return (
    a.minX < b.maxX - eps &&
    a.maxX > b.minX + eps &&
    a.minZ < b.maxZ - eps &&
    a.maxZ > b.minZ + eps
  );
}

/**
 * Validates placement of a candidate asset against all existing assets.
 */
export function checkAssetPlacementCollision(
  candidate: Partial<IPlacedAsset>,
  candidateDef: IAssetDefinition,
  existingAssets: IPlacedAsset[],
  getDef: (assetId: string) => IAssetDefinition | undefined
): CollisionResult {
  
  const rules = candidateDef.placementRules || getDefaultPlacementRules(candidateDef);
  
  // Wall-mounted objects currently not supported for floor dragging in this phase
  if (rules.layer === 'wall') {
    return {
      severity: 'warning',
      reason: 'Wall-mounted objects must be placed on walls (not fully supported yet).'
    };
  }

  const candidateAABB = getAssetFootprintAABB(candidate, candidateDef);
  
  const blockingIds: string[] = [];
  let possibleHostId: string | undefined;
  let possibleSupportType: AssetSupportType | undefined;
  let possibleY: number | undefined;

  for (const asset of existingAssets) {
    if (asset.id === candidate.id) continue; // skip self if moving

    const def = getDef(asset.assetId);
    if (!def) continue;

    const assetRules = def.placementRules || getDefaultPlacementRules(def);
    const assetAABB = getAssetFootprintAABB(asset, def);

    if (checkAABBIntersect(candidateAABB, assetAABB)) {
      
      // Case 1: Underlay vs Anything (Allowed)
      if (
        (rules.layer === 'underlay' && rules.collisionMode === 'soft' && rules.blocksFloorSpace === false && rules.canBeUnderFurniture === true) ||
        (assetRules.layer === 'underlay' && assetRules.collisionMode === 'soft' && assetRules.blocksFloorSpace === false && assetRules.canBeUnderFurniture === true)
      ) {
        continue; // Rug under anything is fine, Anything over rug is fine
      }

      // Case 2: Hosted vs Host provider
      if (rules.collisionMode === 'hosted') {
        if (assetRules.providesSupportTypes && assetRules.providesSupportTypes.length > 0) {
          // Check if candidate accepts any of the provided support types
          const match = rules.allowedSupportTypes?.find(t => assetRules.providesSupportTypes?.includes(t));
          if (match) {
            // Found a valid host!
            possibleHostId = asset.id;
            possibleSupportType = match;
            // The elevation should be host's base Y + host's support height
            possibleY = (asset.position?.y || 0) + (assetRules.supportHeight || 0);
            continue;
          }
        }
      }

      // Case 3: Solid vs Solid (Error)
      if (rules.collisionMode === 'solid' && assetRules.collisionMode === 'solid') {
        blockingIds.push(asset.id);
      }
      
      // Case 4: Hosted vs Solid without support (Error)
      if (rules.collisionMode === 'hosted' && assetRules.collisionMode === 'solid') {
        // Did we find a match? If not, it's an error because it's overlapping a solid thing it can't sit on
        if (!possibleHostId) {
          blockingIds.push(asset.id);
        }
      }
    }
  }

  // If there are blocking assets, reject
  if (blockingIds.length > 0) {
    return {
      severity: 'error',
      reason: 'Invalid overlap with other furniture.',
      blockingAssetIds: blockingIds
    };
  }

  // If it's a hosted object, it MUST have a host OR floor if allowed
  if (rules.collisionMode === 'hosted') {
    if (possibleHostId) {
      return {
        severity: 'none',
        suggestedHostAssetId: possibleHostId,
        suggestedSupportType: possibleSupportType,
        suggestedY: possibleY
      };
    } else {
      // No host found. Is it allowed on floor?
      if (rules.allowedSupportTypes?.includes('floor')) {
        return {
          severity: 'none',
          suggestedY: 0
        };
      } else {
        return {
          severity: 'error',
          reason: 'This object must be placed on a valid support surface (e.g. table or bed).'
        };
      }
    }
  }

  // Valid floor placement
  return {
    severity: 'none',
    suggestedY: 0
  };
}
