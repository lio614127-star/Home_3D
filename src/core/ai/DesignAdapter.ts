import { IAIDesignIntent, IAIRoofIntent, AssetIntentParams } from './types';
import { IProject, IPlacedAsset } from '../../types';
import { ASSET_CATALOG } from '../assets/catalog';
import { useProjectStore } from '../../store/useProjectStore';
import { ConstraintSolver } from './ConstraintSolver';

export class DesignAdapter {
  static applyIntent(intent: IAIDesignIntent, project: IProject) {
    if (intent.target === 'roof') {
      const params = intent.parameters as IAIRoofIntent;
      const store = useProjectStore.getState();
      
      store.commitHistory();
      
      // Map AI roof type to internal system
      const style = params.styleParameters?.style || 'japanese';
      let internalRoofType: 'flat' | 'japanese' | 'thai' = 'flat';
      if (style === 'japanese') internalRoofType = 'japanese';
      else if (style === 'thai') internalRoofType = 'thai';

      // Update all roofs to match AI
      project.roofs.forEach(roof => {
        const material = params.materialParameters?.material || 'tile';
        const color = params.materialParameters?.color || 'brown';
        let segments = params.geometryParameters?.segments || [];
        
        // --- PHASE 3B: SEMANTIC TRANSLATOR (Constraint Solver) ---
        segments = segments.map(seg => ConstraintSolver.solve(seg));

        // Take angle from first segment if available, otherwise default to 30
        const angle = segments.length > 0 && segments[0].angle !== undefined ? segments[0].angle : 30;

        store.updateRoof(roof.id, {
          type: internalRoofType,
          angle: angle,
          color: color,
          material: { type: material as any },
          segments: segments // Store V2 segments
        });
      });
      // In a real scenario, we might only update the roof belonging to a specific region or building
    } else if (intent.target === 'asset') {
      const params = intent.parameters as AssetIntentParams;
      const store = useProjectStore.getState();
      
      store.commitHistory();

      // Find best matching asset
      let matchedAssetId = 'sofa_basic'; // Fallback
      if (params.assetHint) {
        const matches = ASSET_CATALOG.filter(asset => asset.id.includes(params.assetHint!));
        if (matches.length > 0) {
          // Simple match, pick the first one (e.g., sofa_basic)
          matchedAssetId = matches[0].id;
        }
      }

      const assetDef = ASSET_CATALOG.find(a => a.id === matchedAssetId);
      if (!assetDef) return;

      // Determine position. If region exists, put it in center of region.
      // Else put it in center of screen (0, 0) for now.
      let px = 0;
      let pz = 0;
      
      const req = project.aiRequests.find(r => r.id === intent.requestId);
      if (req && req.regionId) {
        const region = project.aiRequests.find(r => r.id === req.regionId);
        if (region && region.geometry && region.geometry.points.length >= 2) {
           const p1 = region.geometry.points[0];
           const p2 = region.geometry.points[1];
           px = (p1.x + p2.x) / 2;
           pz = (p1.z + p2.z) / 2;
        }
      } else if (req && req.geometry && req.geometry.points.length >= 2) {
        // Fallback to the bounding box of the request itself if it was drawn
        const p1 = req.geometry.points[0];
        const p2 = req.geometry.points[1];
        px = (p1.x + p2.x) / 2;
        pz = (p1.z + p2.z) / 2;
      }

      const newAsset: IPlacedAsset = {
        id: crypto.randomUUID(),
        assetId: matchedAssetId,
        x: px,
        y: 0, // on floor
        z: pz,
        rotation: 0,
        scale: { x: 1, y: 1, z: 1 }
      };

      store.addPlacedAsset(newAsset);

    } else if (intent.target === 'garden') {
      // Future: add multiple structures/assets
      console.warn("Garden intent apply not fully implemented yet.");
    }
  }
}
