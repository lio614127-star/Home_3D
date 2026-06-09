import React from 'react';
import { ISite } from '../../types';
import { useTheme } from '../../theme/tokens';

export const SitePlane3D: React.FC<{ site: ISite }> = ({ site }) => {
  const theme = useTheme();
  if (!site.visible) return null;
  const cx = (site.origin?.x || 0) + site.width / 2;
  const cz = (site.origin?.z || 0) + site.depth / 2;

  return (
    <mesh position={[cx, 0, cz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[site.width, site.depth]} />
      <meshStandardMaterial color={theme.site3DFill} roughness={0.9} />
    </mesh>
  );
};
