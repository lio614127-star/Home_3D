import React from 'react';
import { useUIStore } from '../../store/useUIStore';
import { IPlacedAsset } from '../../types';
import { getAssetDefinition } from '../../core/assets/catalog';
import { AssetPrimitiveRenderer } from './AssetPrimitiveRenderer';
import { GLBAssetRenderer } from './GLBAssetRenderer';
import { useTheme } from '../../theme/tokens';
import { Edges } from '@react-three/drei';

interface Asset3DProps {
  asset: IPlacedAsset;
  baseHeight?: number;
}

export const Asset3D: React.FC<Asset3DProps> = ({ asset, baseHeight = 0 }) => {
  const { selectedObjectId } = useUIStore();
  const theme = useTheme();

  const isSelected = selectedObjectId === asset.id;
  const definition = getAssetDefinition(asset.assetId);

  if (!definition || !asset.visible) return null;

  // Xử lý Override Color. Nếu không có, dùng màu mặc định tương đối dựa trên category.
  const defaultColors: Record<string, string> = {
    furniture: '#8B5A2B', // Nâu gỗ
    plant: '#228B22',     // Xanh lá
    vehicle: '#4682B4',   // Xanh thép
    decoration: '#D2B48C',// Màu tan
    architecture: '#A9A9A9' // Xám xi măng
  };

  const materialColor = asset.materialOverride?.color || definition.metadata?.color || defaultColors[definition.category] || '#cccccc';
  const renderColor = isSelected ? theme.primary : materialColor;

  return (
    <group
      position={[asset.position.x, (asset.position.y || 0) + baseHeight, asset.position.z]}
      rotation={[0, (asset.rotation || 0) * Math.PI / 180, 0]}
      scale={[asset.scale?.x || 1, asset.scale?.y || 1, asset.scale?.z || 1]}
    >
      {definition.renderer === 'glb' || definition.source === 'glb' ? (
        <React.Suspense fallback={<AssetPrimitiveRenderer asset={asset} definition={definition} color={renderColor} />}>
          <GLBAssetRenderer asset={asset} definition={definition} color={renderColor} />
        </React.Suspense>
      ) : (
        <AssetPrimitiveRenderer asset={asset} definition={definition} color={renderColor} />
      )}

      {isSelected && (
        <mesh position={[0, definition.defaultSize.height / 2, 0]}>
          <boxGeometry args={[definition.defaultSize.width + 0.05, definition.defaultSize.height + 0.05, definition.defaultSize.depth + 0.05]} />
          <meshBasicMaterial visible={false} />
          <Edges scale={1} threshold={15} color={theme.primary} />
        </mesh>
      )}
    </group>
  );
};
