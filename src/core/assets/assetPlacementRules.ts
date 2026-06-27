import { IAssetDefinition, IAssetPlacementRules } from '../../types';

export function getDefaultPlacementRules(asset: IAssetDefinition): IAssetPlacementRules {
  // Safe default
  const defaultRules: IAssetPlacementRules = {
    layer: 'floor',
    collisionMode: 'solid',
    allowedSupportTypes: ['floor'],
    blocksFloorSpace: true
  };

  if (!asset) return defaultRules;

  const category = (asset.category || '').toLowerCase();
  const name = (asset.name || '').toLowerCase();
  
  // A. Floor solid furniture
  // e.g. bed, sofa, table, chair, cabinet, wardrobe, toilet, bathtub, sink, fridge, stove
  if (
    category.includes('furniture/sofa') || 
    category.includes('sofa') ||
    category.includes('chair') ||
    category.includes('armchair') ||
    category.includes('wardrobe') ||
    category.includes('toilet') ||
    category.includes('bathtub') ||
    category.includes('sink') ||
    category.includes('fridge') ||
    category.includes('stove')
  ) {
    return {
      layer: 'floor',
      collisionMode: 'solid',
      allowedSupportTypes: ['floor'],
      blocksFloorSpace: true
    };
  }

  // B. Support providers
  if (category.includes('bed') || name.includes('bed')) {
    return {
      layer: 'floor',
      collisionMode: 'solid',
      allowedSupportTypes: ['floor'],
      blocksFloorSpace: true,
      providesSupportTypes: ['bedTop'],
      supportHeight: 0.55
    };
  }

  if (category.includes('table') || category.includes('desk') || name.includes('table')) {
    return {
      layer: 'floor',
      collisionMode: 'solid',
      allowedSupportTypes: ['floor'],
      blocksFloorSpace: true,
      providesSupportTypes: ['tableTop'],
      supportHeight: 0.75
    };
  }

  if (category.includes('cabinet') || category.includes('nightstand') || name.includes('cabinet')) {
    return {
      layer: 'floor',
      collisionMode: 'solid',
      allowedSupportTypes: ['floor'],
      blocksFloorSpace: true,
      providesSupportTypes: ['cabinetTop'],
      supportHeight: 0.8
    };
  }

  if (category.includes('shelf') || category.includes('bookcase')) {
    return {
      layer: 'floor',
      collisionMode: 'solid',
      allowedSupportTypes: ['floor'],
      blocksFloorSpace: true,
      providesSupportTypes: ['shelf'],
      supportHeight: 1.2
    };
  }

  // D. Underlay objects
  if (category.includes('rug') || category.includes('carpet') || category.includes('mat') || 
      name.includes('rug') || name.includes('carpet') || name.includes('mat') || name.includes('tapis') ||
      name.includes('thảm') || name.includes('trải sàn') || name.includes('chùi chân')) {
    return {
      layer: 'underlay',
      collisionMode: 'soft',
      allowedSupportTypes: ['floor'],
      blocksFloorSpace: false,
      canBeUnderFurniture: true
    };
  }

  // E. Wall-mounted objects
  if (
    category.includes('door') || 
    category.includes('window') || 
    category.includes('painting') || 
    category.includes('picture') ||
    category.includes('wall') ||
    name.includes('wall lamp') ||
    name.includes('air conditioner')
  ) {
    return {
      layer: 'wall',
      collisionMode: 'hosted',
      allowedSupportTypes: ['wall'],
      blocksFloorSpace: false
    };
  }

  // C. Hosted decorative objects (fallback for small items)
  if (
    category.includes('decoration') ||
    category.includes('office') ||
    category.includes('kitchenware') ||
    category.includes('bathroom') ||
    category.includes('electronics') ||
    category.includes('plants') ||
    name.includes('pillow') ||
    name.includes('blanket') ||
    name.includes('lamp') ||
    name.includes('vase') ||
    name.includes('book') ||
    name.includes('pot') ||
    name.includes('comb') ||
    name.includes('scissors')
  ) {
    
    // Pillows and blankets prefer beds but can be on sofas (we'll just use bedTop/floor for now)
    if (name.includes('pillow') || name.includes('blanket') || name.includes('cushion') || name.includes('gối') || name.includes('chăn') || name.includes('đệm')) {
      return {
        layer: 'surface',
        collisionMode: 'hosted',
        allowedSupportTypes: ['bedTop'],
        blocksFloorSpace: false
      };
    }
    
    // Plant pots can be floor or table
    if (name.includes('plant') || name.includes('pot') || category.includes('plant')) {
      return {
        layer: 'surface',
        collisionMode: 'hosted',
        allowedSupportTypes: ['floor', 'tableTop', 'cabinetTop', 'shelf'],
        blocksFloorSpace: true // Large plants block floor
      };
    }

    // Default small decor
    return {
      layer: 'surface',
      collisionMode: 'hosted',
      allowedSupportTypes: ['tableTop', 'cabinetTop', 'shelf'],
      blocksFloorSpace: false
    };
  }

  // Fallback safe default
  return defaultRules;
}
