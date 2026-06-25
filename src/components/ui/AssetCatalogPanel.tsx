import React, { useState } from 'react';
import { ASSET_CATALOG } from '../../core/assets/catalog';
import { useUIStore } from '../../store/useUIStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useTheme } from '../../theme/tokens';

interface AssetCatalogPanelProps {
  onClose: () => void;
}

export const AssetCatalogPanel: React.FC<AssetCatalogPanelProps> = ({ onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const theme = useTheme();
  const { setMode } = useUIStore();

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

  const filteredAssets = selectedCategory === 'all' 
    ? ASSET_CATALOG 
    : ASSET_CATALOG.filter(a => a.category === selectedCategory);

  return (
    <div style={{
      position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
      width: '600px', height: '400px',
      background: theme.panelBg, border: `1px solid ${theme.border}`,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)', borderRadius: '8px',
      display: 'flex', flexDirection: 'column',
      zIndex: 1000
    }}>
      <div style={{ padding: '15px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: theme.textPrimary }}>Thư viện nội thất (V1)</h3>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px', color: theme.textSecondary }}>✕</button>
      </div>

      <div style={{ padding: '10px 15px', borderBottom: `1px solid ${theme.border}`, display: 'flex', gap: '10px' }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: '6px 12px',
              borderRadius: '16px',
              border: `1px solid ${selectedCategory === cat ? theme.primary : theme.border}`,
              background: selectedCategory === cat ? theme.primary : 'transparent',
              color: selectedCategory === cat ? '#fff' : theme.textPrimary,
              cursor: 'pointer'
            }}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ padding: '15px', flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '15px' }}>
        {filteredAssets.map(asset => (
          <div
            key={asset.id}
            onClick={() => {
              const newId = crypto.randomUUID();
              const spawnPos = getSpawnPosition();
              
              useProjectStore.getState().addPlacedAsset({
                id: newId,
                assetId: asset.id,
                position: { x: spawnPos.x, y: 0, z: spawnPos.z },
                rotation: 0,
                scale: { x: 1, y: 1, z: 1 },
                layer: 'default',
                visible: true,
                locked: false
              });
              
              setMode('select');
              useUIStore.getState().setSelectedObject(newId, 'asset');
              useUIStore.getState().setSelectedItems([{ type: 'asset', id: newId }]);
            }}
            style={{
              border: `1px solid ${theme.border}`, borderRadius: '6px',
              padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center',
              cursor: 'pointer', background: theme.canvasBg
            }}
          >
            <div style={{ width: '60px', height: '60px', background: theme.canvasBg, marginBottom: '10px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: `1px solid ${theme.border}` }}>
              {asset.thumbnail ? (
                <img src={asset.thumbnail} alt={asset.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ color: '#666' }}>{asset.model.type}</span>
              )}
            </div>
            <span style={{ fontSize: '12px', textAlign: 'center', color: theme.textPrimary }}>{asset.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
