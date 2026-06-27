import React, { useState } from 'react';
import { ASSET_CATALOG, getAssetFootprintDefinition, AssetFootprintKind } from '../../core/assets/catalog';
import { useUIStore } from '../../store/useUIStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useTheme } from '../../theme/tokens';

const transparentPixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

const CategoryIcon: React.FC<{ kind: AssetFootprintKind; color: string }> = ({ kind, color }) => {
  const style = { width: '24px', height: '24px', fill: 'none', stroke: color, strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  
  switch(kind) {
    case 'bed': return <svg style={style} viewBox="0 0 24 24"><path d="M3 7v10M21 7v10M3 14h18M6 14v-4a2 2 0 012-2h8a2 2 0 012 2v4M8 10h8" /></svg>;
    case 'sofa': return <svg style={style} viewBox="0 0 24 24"><path d="M4 11V8a2 2 0 012-2h12a2 2 0 012 2v3M4 11v5a2 2 0 002 2h12a2 2 0 002-2v-5M4 11h16" /></svg>;
    case 'table': return <svg style={style} viewBox="0 0 24 24"><path d="M4 8h16v3H4zM6 11v8M18 11v8M9 11v4M15 11v4" /></svg>;
    case 'chair': return <svg style={style} viewBox="0 0 24 24"><path d="M6 5v7M18 5v7M6 12h12M8 12v7M16 12v7" /></svg>;
    case 'cabinet': return <svg style={style} viewBox="0 0 24 24"><path d="M5 4h14v16H5zM5 12h14M12 4v16M9 8v1M15 8v1M9 16v1M15 16v1" /></svg>;
    case 'plant': return <svg style={style} viewBox="0 0 24 24"><path d="M12 22v-6M12 8a4 4 0 00-4-4 4 4 0 00-4 4c0 3 8 8 8 8s8-5 8-8a4 4 0 00-4-4 4 4 0 00-4 4z" /></svg>;
    case 'door': return <svg style={style} viewBox="0 0 24 24"><path d="M5 21V4a1 1 0 011-1h12a1 1 0 011 1v17M5 21h14M15 12v.01" /></svg>;
    case 'window': return <svg style={style} viewBox="0 0 24 24"><path d="M4 4h16v16H4zM12 4v16M4 12h16" /></svg>;
    case 'lamp': return <svg style={style} viewBox="0 0 24 24"><path d="M9 18h6M12 18v3M12 11l-4-3h8l-4 3zM12 3v5" /></svg>;
    default: return <svg style={style} viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /></svg>;
  }
};

interface AssetCatalogPanelProps {
  onClose: () => void;
}

export const AssetCatalogPanel: React.FC<AssetCatalogPanelProps> = ({ onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'glb' | 'primitive' | 'sweethome3d'>('all');
  const theme = useTheme();
  const { setMode } = useUIStore();
  const ghostRef = React.useRef<HTMLImageElement>(null);

  const getSpawnPosition = () => {
    const project = useProjectStore.getState().data;
    
    if (project.buildings && project.buildings.length > 0) {
      const bId = project.buildings[0].id;
      const bWalls = project.walls.filter(w => w.buildingId === bId);
      if (bWalls.length > 0) {
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        bWalls.forEach(w => {
          minX = Math.min(minX, w.start.x, w.end.x);
          maxX = Math.max(maxX, w.start.x, w.end.x);
          minZ = Math.min(minZ, w.start.z, w.end.z);
          maxZ = Math.max(maxZ, w.start.z, w.end.z);
        });
        return { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 };
      }
    }

    if (project.site && project.site.origin) {
      return { x: project.site.origin.x, z: project.site.origin.z };
    }

    return { x: 0, z: 0 };
  };

  const categories = ['all', ...Array.from(new Set(ASSET_CATALOG.map(a => a.category)))];

  const filteredAssets = ASSET_CATALOG.filter(a => {
    const isGlb = a.format === 'glb' || !!a.modelUrl || a.type === 'model';
    const isPrimitive = a.source === 'primitive' || a.model?.type === 'box' || a.model?.type === 'cylinder';
    const isPlaceholder = a.source === 'Generated Placeholder';
    const isSweetHome = a.source === 'Sweet Home 3D';
    
    // Runtime-ready check for Sweet Home 3D assets
    // For Sweet Home 3D, it MUST explicitly be runtimeReady === true
    if (isSweetHome && a.runtimeReady !== true) {
      return false; // Do not show broken/unvalidated SH3D assets in standard lists
    }
    
    const matchesCategory = selectedCategory === 'all' || a.category === selectedCategory;
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesFilter = true;
    if (isPlaceholder) return false;
    if (filterType === 'glb') matchesFilter = isGlb;
    if (filterType === 'primitive') matchesFilter = isPrimitive;
    if (filterType === 'sweethome3d') matchesFilter = isSweetHome;
    
    return matchesCategory && matchesSearch && matchesFilter;
  });

  return (
    <div style={{
      width: '100%', height: '100%',
      background: theme.panelBg,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Search and Category Filter */}
      <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px', borderBottom: `1px solid ${theme.border}` }}>
        <input 
          type="text" 
          placeholder="Tìm kiếm nội thất..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '8px',
            borderRadius: '4px',
            border: `1px solid ${theme.border}`,
            background: theme.canvasBg,
            color: theme.textPrimary,
            width: '100%',
            boxSizing: 'border-box'
          }}
        />
        <select 
          value={selectedCategory} 
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{
            padding: '8px',
            borderRadius: '4px',
            border: `1px solid ${theme.border}`,
            background: theme.canvasBg,
            color: theme.textPrimary,
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>
              {cat === 'all' ? 'Tất cả danh mục' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setFilterType('all')} 
            style={{ flex: 1, padding: '4px', fontSize: '10px', background: filterType === 'all' ? theme.primary : 'transparent', color: filterType === 'all' ? '#fff' : theme.textPrimary, border: `1px solid ${theme.border}`, borderRadius: '4px', cursor: 'pointer' }}>Tất cả</button>
          <button 
            onClick={() => setFilterType('glb')} 
            style={{ flex: 1, padding: '4px', fontSize: '10px', background: filterType === 'glb' ? theme.primary : 'transparent', color: filterType === 'glb' ? '#fff' : theme.textPrimary, border: `1px solid ${theme.border}`, borderRadius: '4px', cursor: 'pointer' }}>GLB</button>
          <button 
            onClick={() => setFilterType('sweethome3d')} 
            style={{ flex: 1, padding: '4px', fontSize: '10px', background: filterType === 'sweethome3d' ? theme.primary : 'transparent', color: filterType === 'sweethome3d' ? '#fff' : theme.textPrimary, border: `1px solid ${theme.border}`, borderRadius: '4px', cursor: 'pointer' }}>SH3D</button>
        </div>
      </div>

      {/* Asset List */}
      <div style={{ padding: '10px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredAssets.map(asset => {
          const isGlb = asset.format === 'glb' || !!asset.modelUrl || asset.type === 'model';
          const isSweetHome = asset.source === 'Sweet Home 3D';
          const isPlaceholder = asset.isPlaceholder === true;
          return (
          <div
            key={asset.id}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.preventDefault();
              e.stopPropagation();
              if (e.currentTarget.setPointerCapture) {
                e.currentTarget.setPointerCapture(e.pointerId);
              }
              useUIStore.getState().startAssetPlacement(asset.id);
            }}
            
            
            style={{
              border: `1px solid ${theme.border}`, borderRadius: '6px',
              padding: '10px', display: 'flex', alignItems: 'center', gap: '10px',
              cursor: 'grab', background: theme.canvasBg,
              transition: 'all 0.2s',
              userSelect: 'none'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = theme.primary}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = theme.border}
          >
            <div style={{ position: 'relative', width: '50px', height: '50px', background: theme.border, borderRadius: '4px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {asset.thumbnailUrl || asset.thumbnail ? (
                <>
                  <img 
                    src={asset.thumbnailUrl || asset.thumbnail} 
                    alt={asset.name} 
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                    draggable={false} 
                    onError={(e) => { 
                      e.currentTarget.style.display = 'none'; 
                      if (e.currentTarget.nextElementSibling) {
                        (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                      }
                    }} 
                  />
                  <div style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                    <CategoryIcon kind={getAssetFootprintDefinition(asset).kind} color={theme.textSecondary} />
                  </div>
                </>
              ) : (
                <CategoryIcon kind={getAssetFootprintDefinition(asset).kind} color={theme.textSecondary} />
              )}
              {/* Badges */}
              <div style={{ position: 'absolute', top: -5, right: -5, display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
                {isSweetHome && (
                  <span style={{ fontSize: '8px', padding: '1px 3px', background: '#9c27b0', color: '#fff', borderRadius: '2px', fontWeight: 'bold' }}>
                    SH3D
                  </span>
                )}
                {isGlb && (!isSweetHome || asset.runtimeReady === true) && (
                  <span style={{ fontSize: '8px', padding: '1px 3px', background: theme.primary, color: '#fff', borderRadius: '2px', fontWeight: 'bold' }}>
                    GLB
                  </span>
                )}
                {isPlaceholder && (
                  <span style={{ fontSize: '8px', padding: '1px 3px', background: '#f57c00', color: '#fff', borderRadius: '2px', fontWeight: 'bold' }}>
                    TEST
                  </span>
                )}
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: '500', color: theme.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{asset.name}</span>
              </div>
              <span style={{ fontSize: '11px', color: theme.textSecondary }}>{asset.category}</span>
              <span style={{ fontSize: '10px', color: theme.textSecondary, opacity: 0.7, marginTop: '2px' }}>{asset.source}</span>
            </div>
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                useProjectStore.getState().addPlacedAsset(asset.id, { position: getSpawnPosition() });
              }}
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                background: theme.primary, color: '#fff', border: 'none', borderRadius: '4px',
                padding: '4px 8px', fontSize: '12px', cursor: 'pointer', flexShrink: 0
              }}
            >
              Thêm
            </button>
          </div>
          );
        })}
        {filteredAssets.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: theme.textSecondary, fontSize: '13px' }}>
            Không tìm thấy tài sản nào.
          </div>
        )}
      </div>
      <img ref={ghostRef} src={transparentPixel} alt="" style={{ position: 'absolute', top: -1000, left: -1000, pointerEvents: 'none', opacity: 0 }} />
    </div>
  );
};
