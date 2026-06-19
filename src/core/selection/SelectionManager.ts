import { useProjectStore } from '../../store/useProjectStore';
import { useUIStore } from '../../store/useUIStore';
import { SelectedItem, IProject } from '../../types';
import { rectContainsPoint, rectIntersectsSegment, rectIntersectsPolygon, getWallLength, RectProject } from '../geometry/math';
import { SELECTION_PRIORITY } from './selectionConfig';

export class SelectionManager {
  
  static handleSingleClick(item: SelectedItem, evt: any | boolean) {
    const isMultiSelect = typeof evt === 'boolean' ? evt : (evt?.shiftKey || evt?.ctrlKey || evt?.metaKey);

    const project = useProjectStore.getState().data;
    let obj: any = null;
    if (item.type === 'wall' || item.type === 'wallEndpoint') obj = project.walls.find(w => w.id === item.id);
    else if (item.type === 'area' || item.type === 'areaVertex') obj = project.areas.find(a => a.id === item.id);
    else if (item.type === 'opening' || item.type === 'door' || item.type === 'window') obj = project.openings?.find(o => o.id === item.id);
    else if (item.type === 'dimension' || item.type === 'dimensionEndpoint') obj = project.annotations?.find(a => a.id === item.id);
    else if (item.type === 'building') obj = project.buildings?.find(b => b.id === item.id);
    else if (item.type === 'site') obj = project.site;

    if (obj && (obj.locked || obj.selectable === false)) {
      if (!isMultiSelect) {
        useUIStore.getState().setSelectedItems([]);
        useUIStore.getState().setSelectedObject(null, null);
      }
      return;
    }

    // Intercept clicks on objects with a buildingId
    if (obj && obj.buildingId) {
      item = { id: obj.buildingId, type: 'building' };
    }

    const { selectedItems, setSelectedItems, setSelectedObject } = useUIStore.getState();
    
    if (isMultiSelect) {
      // Toggle selection
      const existsIdx = selectedItems.findIndex(i => i.id === item.id && i.type === item.type);
      if (existsIdx >= 0) {
         const newItems = [...selectedItems];
         newItems.splice(existsIdx, 1);
         setSelectedItems(newItems);
         
         if (newItems.length === 1) {
            setSelectedObject(newItems[0].id, this.mapTypeToObjectType(newItems[0].type));
         } else {
            setSelectedObject(null, null);
         }
      } else {
         const newItems = [...selectedItems, item];
         setSelectedItems(newItems);
         setSelectedObject(null, null);
      }
    } else {
      setSelectedItems([item]);
      setSelectedObject(item.id, this.mapTypeToObjectType(item.type));
    }
  }

  static handlePointerUp(
    mode: string,
    marqueeStart: { x: number; z: number } | null,
    marqueeEnd: { x: number; z: number } | null,
    shiftKey: boolean
  ) {
    if (mode === 'select' && marqueeStart && marqueeEnd) {
      const minX = Math.min(marqueeStart.x, marqueeEnd.x);
      const maxX = Math.max(marqueeStart.x, marqueeEnd.x);
      const minZ = Math.min(marqueeStart.z, marqueeEnd.z);
      const maxZ = Math.max(marqueeStart.z, marqueeEnd.z);
      
      const rect: RectProject = { minX, maxX, minZ, maxZ };
      const items: SelectedItem[] = [];
      const project = useProjectStore.getState().data;

      // Determine Marquee Mode: Left-to-Right (contains) vs Right-to-Left (intersects)
      // If marqueeEnd.x > marqueeStart.x => Left to Right => Contains
      const isLeftToRight = marqueeEnd.x > marqueeStart.x;

      this.selectWallsAndEndpoints(project, rect, items, isLeftToRight);
      this.selectAreasAndVertices(project, rect, items, isLeftToRight);
      this.selectOpenings(project, rect, items, isLeftToRight);
      this.selectDimensionsAndEndpoints(project, rect, items, isLeftToRight);

      const deduped = this.deduplicateItems(items, project);

      const { setSelectedItems, setSelectedObject, setMarquee, selectedItems } = useUIStore.getState();

      if (shiftKey) {
        // Add to existing
        const existing = selectedItems || [];
        const newSet = new Map<string, SelectedItem>();
        [...existing, ...deduped].forEach(it => newSet.set(JSON.stringify(it), it));
        setSelectedItems(Array.from(newSet.values()));
      } else {
        setSelectedItems(deduped);
      }
      
      const newItems = useUIStore.getState().selectedItems;
      if (newItems.length === 1) {
         setSelectedObject(newItems[0].id, this.mapTypeToObjectType(newItems[0].type));
      } else {
         setSelectedObject(null, null);
      }

      setMarquee(null, null);
    } else {
      useUIStore.getState().setMarquee(null, null);
    }
  }

  private static mapTypeToObjectType(type: string): any {
    if (type === 'wallEndpoint') return 'wall';
    if (type === 'areaVertex') return 'area';
    if (type === 'dimensionEndpoint') return 'dimension';
    return type;
  }

  private static selectWallsAndEndpoints(project: IProject, rect: RectProject, items: SelectedItem[], isLeftToRight: boolean) {
    project.walls.forEach(wall => {
      if (wall.locked || !wall.visible || wall.selectable === false) return;
      const startIn = rectContainsPoint(rect, wall.start);
      const endIn = rectContainsPoint(rect, wall.end);
      
      if (startIn && endIn) {
        items.push({ type: 'wall', id: wall.id });
      } else if (!isLeftToRight && (startIn || endIn || rectIntersectsSegment(rect, wall.start, wall.end))) {
        items.push({ type: 'wall', id: wall.id });
      } else if (startIn) {
        items.push({ type: 'wallEndpoint', id: wall.id, endpoint: 'start' });
      } else if (endIn) {
        items.push({ type: 'wallEndpoint', id: wall.id, endpoint: 'end' });
      }
    });
  }

  private static selectAreasAndVertices(project: IProject, rect: RectProject, items: SelectedItem[], isLeftToRight: boolean) {
    project.areas.forEach(area => {
      if (area.locked || !area.visible || area.selectable === false) return;
      let allIn = true;
      let anyVertexSelected = false;
      area.points.forEach((pt, idx) => {
        if (rectContainsPoint(rect, pt)) {
          items.push({ type: 'areaVertex', id: area.id, pointIndex: idx });
          anyVertexSelected = true;
        } else {
          allIn = false;
        }
      });
      
      if (allIn) {
        items.push({ type: 'area', id: area.id });
      } else if (!isLeftToRight && !anyVertexSelected && rectIntersectsPolygon(rect, area.points)) {
        items.push({ type: 'area', id: area.id });
      }
    });
  }

  private static selectOpenings(project: IProject, rect: RectProject, items: SelectedItem[], isLeftToRight: boolean) {
    const openings = project.openings || [];
    openings.forEach(o => {
      if (o.locked || !o.visible || o.selectable === false) return;
      const wall = project.walls.find(w => w.id === o.wallId);
      if (!wall) return;
      const dx = wall.end.x - wall.start.x;
      const dz = wall.end.z - wall.start.z;
      const len = getWallLength(wall);
      if (len === 0) return;
      const cx = wall.start.x + (dx / len) * (o.offsetFromStart + o.width / 2);
      const cz = wall.start.z + (dz / len) * (o.offsetFromStart + o.width / 2);
      
      if (rectContainsPoint(rect, {x: cx, z: cz})) {
         items.push({ type: o.type === 'door' ? 'door' : 'window', id: o.id });
         // Opening is historically 'opening', we can push 'opening' to keep type compatibility
         items.push({ type: 'opening', id: o.id }); 
      }
    });
  }

  private static selectDimensionsAndEndpoints(project: IProject, rect: RectProject, items: SelectedItem[], isLeftToRight: boolean) {
    const dimensionsList = project.annotations?.filter(a => a.type === 'dimension') || [];
    dimensionsList.forEach(dim => {
      if (dim.locked || !dim.visible || dim.selectable === false) return;
      const startIn = rectContainsPoint(rect, dim.start);
      const endIn = rectContainsPoint(rect, dim.end);
      if (startIn && endIn) {
         items.push({ type: 'dimension', id: dim.id });
      } else if (startIn) {
         items.push({ type: 'dimensionEndpoint', id: dim.id, endpoint: 'start' });
      } else if (endIn) {
         items.push({ type: 'dimensionEndpoint', id: dim.id, endpoint: 'end' });
      } else if (!isLeftToRight && rectIntersectsSegment(rect, dim.start, dim.end)) {
         items.push({ type: 'dimension', id: dim.id });
      }
    });
  }

  private static deduplicateItems(items: SelectedItem[], project: IProject): SelectedItem[] {
    const deduped: SelectedItem[] = [];
    const selectedWallIds = new Set(items.filter(i => i.type === 'wall').map(i => i.id));
    const selectedAreaIds = new Set(items.filter(i => i.type === 'area').map(i => i.id));
    
    for (const item of items) {
      if (item.type === 'wallEndpoint' && selectedWallIds.has(item.id)) continue;
      if (item.type === 'areaVertex' && selectedAreaIds.has(item.id)) continue;
      if (item.type === 'opening' || item.type === 'door' || item.type === 'window') {
         const op = project.openings.find(o => o.id === item.id);
         if (op && selectedWallIds.has(op.wallId)) continue;
      }
      // Ensure we only have 'opening' or 'door'/'window', stick to 'opening' for simplicity right now
      if (item.type === 'door' || item.type === 'window') continue; // keep 'opening'

      // Map to building if part of one
      let mappedItem = item;
      if (item.type === 'wall' || item.type === 'wallEndpoint') {
        const w = project.walls.find(w => w.id === item.id);
        if (w && w.buildingId) mappedItem = { type: 'building', id: w.buildingId };
      } else if (item.type === 'area' || item.type === 'areaVertex') {
        const a = project.areas.find(a => a.id === item.id);
        if (a && a.buildingId) mappedItem = { type: 'building', id: a.buildingId };
      } else if (item.type === 'opening' || item.type === 'door' || item.type === 'window') {
        const o = project.openings.find(o => o.id === item.id);
        if (o && o.buildingId) mappedItem = { type: 'building', id: o.buildingId };
      }

      deduped.push(mappedItem);
    }
    
    // Final dedupe for buildings
    const finalDeduped: SelectedItem[] = [];
    const seen = new Set<string>();
    for (const item of deduped) {
      const key = item.type + '_' + item.id;
      if (!seen.has(key)) {
        seen.add(key);
        finalDeduped.push(item);
      }
    }
    
    return finalDeduped;
  }
}
