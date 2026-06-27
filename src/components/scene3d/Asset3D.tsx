import React from 'react';
import { useUIStore } from '../../store/useUIStore';
import { IPlacedAsset } from '../../types';
import { getAssetDefinition } from '../../core/assets/catalog';
import { AssetPrimitiveRenderer } from './AssetPrimitiveRenderer';
import { GLBAssetRenderer } from './GLBAssetRenderer';
import { useTheme } from '../../theme/tokens';
import { Edges, Text } from '@react-three/drei';
import { useProjectStore } from '../../store/useProjectStore';

interface Asset3DProps {
  asset: IPlacedAsset;
  baseHeight?: number;
}

class ErrorBoundary extends React.Component<{ fallback: React.ReactNode, children: React.ReactNode, onError: (e: any) => void }, { hasError: boolean }> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any) { this.props.onError(error); }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}

export const Asset3D: React.FC<Asset3DProps> = ({ asset, baseHeight = 0 }) => {
  const draggedPos = useUIStore(state => state.draggedAssetPositions[asset.id]);
  const effectiveX = draggedPos?.x ?? asset.position.x;
  const effectiveZ = draggedPos?.z ?? asset.position.z;

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

  // Strict check for GLB Asset
  const isGlbAsset = 
    definition?.runtimeReady !== false && 
    !!definition?.modelUrl && 
    (
      definition.modelUrl.toLowerCase().endsWith('.glb') ||
      definition.modelUrl.toLowerCase().endsWith('.gltf') ||
      definition.format === 'glb' ||
      definition.type === 'model'
    );

  const isInvalidSH3D = definition?.source === 'Sweet Home 3D' && definition?.runtimeReady !== true;

  if ((import.meta as any).env?.DEV) {
    console.log('[ASSET3D DEBUG]', {
      placedAssetId: asset.id,
      assetId: asset.assetId,
      definitionFound: !!definition,
      name: definition?.name,
      source: definition?.source,
      format: definition?.format,
      type: definition?.type,
      runtimeReady: definition?.runtimeReady,
      modelUrl: definition?.modelUrl,
      willUseGLB: isGlbAsset,
      isInvalidSH3D
    });

    if (isInvalidSH3D) {
      console.warn('[ASSET3D INVALID SH3D ASSET]', {
        assetId: asset.assetId,
        name: definition?.name,
        modelUrl: definition?.modelUrl
      });
    } else if (!isGlbAsset) {
      console.warn('[ASSET3D FALLBACK USED]', { 
        assetId: asset.assetId, 
        name: definition?.name,
        modelUrl: definition?.modelUrl,
        reason: 'Not a GLB asset or missing modelUrl' 
      });
    }
  }

  const renderErrorPlaceholder = (_reason: string) => (
    <mesh position={[0, (definition.defaultSize?.height || 1) / 2, 0]}>
      <boxGeometry args={[definition.defaultSize?.width || 1, definition.defaultSize?.height || 1, definition.defaultSize?.depth || 1]} />
      <meshStandardMaterial color="red" wireframe opacity={0.5} transparent />
      <Text position={[0, (definition.defaultSize?.height || 1) / 2 + 0.5, 0]} fontSize={0.2} color="red" anchorX="center" anchorY="middle">
        GLB ERROR
      </Text>
    </mesh>
  );

  return (
    <group
      position={[effectiveX, (asset.position.y || 0) + baseHeight, effectiveZ]}
      rotation={[0, (asset.rotation || 0) * Math.PI / 180, 0]}
      scale={[asset.scale?.x || 1, asset.scale?.y || 1, asset.scale?.z || 1]}
    >
      {isInvalidSH3D ? <group scale={[asset.scale?.x || 1, asset.scale?.y || 1, asset.scale?.z || 1]}>{renderErrorPlaceholder('Invalid SH3D Asset')}</group> : isGlbAsset ? (
        <ErrorBoundary 
          fallback={renderErrorPlaceholder('GLB Load Failed')}
          onError={(err) => {
            if ((import.meta as any).env?.DEV) {
              console.warn('[ASSET3D FALLBACK USED]', { 
                assetId: asset.assetId, 
                name: definition?.name,
                modelUrl: definition?.modelUrl,
                reason: err?.message || 'GLB Load failed' 
              });
            }
          }}
        >
          <React.Suspense fallback={renderErrorPlaceholder('Loading...')}>
            <GLBAssetRenderer asset={asset} definition={definition} color={renderColor} />
          </React.Suspense>
        </ErrorBoundary>
      ) : (
        <group scale={[asset.scale?.x || 1, asset.scale?.y || 1, asset.scale?.z || 1]}><AssetPrimitiveRenderer asset={asset} definition={definition} color={renderColor} /></group>
      )}

      {isSelected && (
        <mesh position={[0, (definition.defaultSize?.height || 1) / 2, 0]}>
          <boxGeometry args={[(definition.defaultSize?.width || 1) + 0.05, (definition.defaultSize?.height || 1) + 0.05, (definition.defaultSize?.depth || 1) + 0.05]} />
          <meshBasicMaterial visible={false} />
          <Edges scale={1} threshold={15} color={theme.primary} />
        </mesh>
      )}
    </group>
  );
};
