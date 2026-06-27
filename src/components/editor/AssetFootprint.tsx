import React from 'react';
import { Group, Rect, Circle, Line } from 'react-konva';
import { AssetFootprintKind } from '../../core/assets/catalog';

interface AssetFootprintProps {
  kind: AssetFootprintKind;
  width: number;
  depth: number;
  color: string;
  opacity?: number;
  strokeColor?: string;
  strokeWidth?: number;
  dashed?: boolean;
  pxPerMeter: number; rotation?: number;
}

export const AssetFootprint: React.FC<AssetFootprintProps> = ({
  kind,
  width,
  depth,
  color,
  opacity = 1,
  strokeColor,
  strokeWidth,
  dashed = false,
  pxPerMeter, rotation = 0,
}) => {
  const wPx = width * pxPerMeter;
  const dPx = depth * pxPerMeter;
  const halfW = wPx / 2;
  const halfD = dPx / 2;
  
  const dashConfig = dashed ? [5, 5] : undefined;
  

  if (kind === 'plant' || kind === 'tree') {
    return (
      <Group rotation={rotation}>
        {/* Outer canopy */}
        <Circle x={0} y={0} radius={halfW} fill={color} opacity={0.6} stroke={strokeColor || '#228B22'} strokeWidth={strokeWidth || (2*pxPerMeter/20)} />
        {/* Inner canopy details */}
        <Circle x={0} y={0} radius={halfW * 0.7} stroke={strokeColor || '#228B22'} strokeWidth={1} opacity={0.5} />
        <Circle x={0} y={0} radius={halfW * 0.3} fill={strokeColor || '#228B22'} opacity={0.8} />
      </Group>
    );
  }

  if (kind === 'rug' || kind === 'carpet') {
    return (
      <Group rotation={rotation}>
        <Rect x={-halfW} y={-halfD} width={wPx} height={dPx} fill={color} opacity={0.3} stroke={strokeColor || '#aaaaaa'} strokeWidth={strokeWidth || (1*pxPerMeter/20)} dash={[5, 5]} cornerRadius={0.05 * pxPerMeter} />
        <Rect x={-halfW + 0.1*pxPerMeter} y={-halfD + 0.1*pxPerMeter} width={wPx - 0.2*pxPerMeter} height={dPx - 0.2*pxPerMeter} stroke={strokeColor || '#cccccc'} strokeWidth={1} opacity={0.5} />
      </Group>
    );
  }

  if (kind === 'lamp') {
    return (
      <Group rotation={rotation}>
        <Circle x={0} y={0} radius={Math.min(halfW, halfD)} fill={color} opacity={0.7} stroke={strokeColor || '#FDB813'} strokeWidth={strokeWidth || 1} />
        <Circle x={0} y={0} radius={Math.min(halfW, halfD) * 0.3} fill="#000" opacity={0.5} />
      </Group>
    );
  }

  if (kind === 'cabinet' || kind === 'wardrobe' || kind === 'shelf') {
    return (
      <Group rotation={rotation}>
        <Rect x={-halfW} y={-halfD} width={wPx} height={dPx} fill={color} opacity={opacity} stroke={strokeColor || '#ffffff'} strokeWidth={strokeWidth || 1} cornerRadius={0.02 * pxPerMeter} />
        <Line points={[-halfW, 0, halfW, 0]} stroke={strokeColor || '#ffffff'} strokeWidth={1} opacity={0.4} />
        <Line points={[0, -halfD, 0, halfD]} stroke={strokeColor || '#ffffff'} strokeWidth={1} opacity={0.4} />
      </Group>
    );
  }

  return (
    <Group rotation={rotation}>
      <Rect x={-halfW} y={-halfD} width={wPx} height={dPx} fill={color} opacity={opacity} stroke={strokeColor || '#ffffff'} strokeWidth={strokeWidth || (1 * pxPerMeter / 20)} cornerRadius={0.05 * pxPerMeter} dash={dashConfig} />
      
      {/* Bed */}
      {kind === 'bed' && (
        <Group>
          {/* Headboard */}
          <Rect x={-halfW} y={-halfD} width={wPx} height={(depth * 0.1) * pxPerMeter} fill="#000" opacity={0.2} cornerRadius={0.02 * pxPerMeter} />
          {/* Pillows */}
          <Rect x={-halfW + (width * 0.1) * pxPerMeter} y={-halfD + (depth * 0.15) * pxPerMeter} width={(width * 0.35) * pxPerMeter} height={(depth * 0.2) * pxPerMeter} fill="#fff" opacity={0.4} cornerRadius={0.05 * pxPerMeter} />
          <Rect x={halfW - (width * 0.45) * pxPerMeter} y={-halfD + (depth * 0.15) * pxPerMeter} width={(width * 0.35) * pxPerMeter} height={(depth * 0.2) * pxPerMeter} fill="#fff" opacity={0.4} cornerRadius={0.05 * pxPerMeter} />
          {/* Blanket */}
          <Rect x={-halfW} y={-halfD + (depth * 0.4) * pxPerMeter} width={wPx} height={(depth * 0.6) * pxPerMeter} fill="#fff" opacity={0.15} cornerRadius={0.02 * pxPerMeter} />
          <Line points={[-halfW, -halfD + (depth * 0.4) * pxPerMeter, halfW, -halfD + (depth * 0.4) * pxPerMeter]} stroke="#fff" strokeWidth={1} opacity={0.4} />
        </Group>
      )}

      {/* Sofa */}
      {kind === 'sofa' && (
        <Group>
          {/* Backrest */}
          <Rect x={-halfW} y={-halfD} width={wPx} height={(depth * 0.25) * pxPerMeter} fill="#000" opacity={0.25} cornerRadius={0.05 * pxPerMeter} />
          {/* Left Armrest */}
          <Rect x={-halfW} y={-halfD + (depth * 0.25) * pxPerMeter} width={(width * 0.15) * pxPerMeter} height={(depth * 0.75) * pxPerMeter} fill="#000" opacity={0.25} cornerRadius={0.05 * pxPerMeter} />
          {/* Right Armrest */}
          <Rect x={halfW - (width * 0.15) * pxPerMeter} y={-halfD + (depth * 0.25) * pxPerMeter} width={(width * 0.15) * pxPerMeter} height={(depth * 0.75) * pxPerMeter} fill="#000" opacity={0.25} cornerRadius={0.05 * pxPerMeter} />
          {/* Cushion Split */}
          <Line points={[0, -halfD + (depth * 0.25) * pxPerMeter, 0, halfD]} stroke="#fff" strokeWidth={1} opacity={0.3} />
        </Group>
      )}

      {/* Toilet */}
      {kind === 'toilet' && (
        <Group>
          <Rect x={-halfW + (width * 0.1) * pxPerMeter} y={-halfD + (depth * 0.05) * pxPerMeter} width={(width * 0.8) * pxPerMeter} height={(depth * 0.25) * pxPerMeter} stroke="#fff" strokeWidth={1} opacity={0.5} cornerRadius={0.02 * pxPerMeter} />
          <Circle x={0} y={-halfD + (depth * 0.6) * pxPerMeter} radius={(width * 0.3) * pxPerMeter} scaleY={(depth * 0.4) / (width * 0.3)} stroke="#fff" strokeWidth={1} opacity={0.5} />
        </Group>
      )}

      {/* Sink */}
      {kind === 'sink' && (
        <Group>
          <Rect x={-halfW + (width * 0.05) * pxPerMeter} y={-halfD + (depth * 0.05) * pxPerMeter} width={(width * 0.9) * pxPerMeter} height={(depth * 0.9) * pxPerMeter} stroke="#fff" strokeWidth={1} opacity={0.3} cornerRadius={0.05 * pxPerMeter} />
          <Circle x={0} y={0} radius={(width * 0.35) * pxPerMeter} scaleY={(depth * 0.35) / (width * 0.35)} stroke="#fff" strokeWidth={1} opacity={0.5} />
        </Group>
      )}

      {/* Bathtub */}
      {kind === 'bathtub' && (
        <Group>
          <Rect x={-halfW + (width * 0.05) * pxPerMeter} y={-halfD + (depth * 0.05) * pxPerMeter} width={(width * 0.9) * pxPerMeter} height={(depth * 0.9) * pxPerMeter} stroke="#fff" strokeWidth={1} opacity={0.4} cornerRadius={0.1 * pxPerMeter} />
          <Circle x={halfW - (width * 0.15) * pxPerMeter} y={0} radius={0.05 * pxPerMeter} stroke="#fff" strokeWidth={1} opacity={0.6} /> {/* Drain */}
        </Group>
      )}

      {/* Door/Window */}
      {(kind === 'door' || kind === 'window') && (
        <Group>
          <Rect x={-halfW} y={-halfD} width={wPx} height={dPx} fill={color} opacity={0.9} />
          {kind === 'door' && <Line points={[-halfW, halfD, halfW, halfD]} stroke="#fff" strokeWidth={2} />}
          {kind === 'window' && <Line points={[-halfW, 0, halfW, 0]} stroke="#fff" strokeWidth={2} />}
        </Group>
      )}
      
      {/* Table */}
      {kind === 'table' && (
        <Group>
          <Rect x={-halfW + (width * 0.05) * pxPerMeter} y={-halfD + (depth * 0.05) * pxPerMeter} width={(width * 0.9) * pxPerMeter} height={(depth * 0.9) * pxPerMeter} stroke="#fff" strokeWidth={1} opacity={0.3} cornerRadius={0.02 * pxPerMeter} />
          {width > 1.2 && depth > 0.6 && (
            <>
              <Rect x={-halfW + (width * 0.2) * pxPerMeter} y={-halfD - (0.1 * pxPerMeter)} width={(0.4) * pxPerMeter} height={(0.15) * pxPerMeter} fill="#000" opacity={0.15} />
              <Rect x={halfW - (width * 0.2) * pxPerMeter - (0.4 * pxPerMeter)} y={-halfD - (0.1 * pxPerMeter)} width={(0.4) * pxPerMeter} height={(0.15) * pxPerMeter} fill="#000" opacity={0.15} />
              <Rect x={-halfW + (width * 0.2) * pxPerMeter} y={halfD - (0.05 * pxPerMeter)} width={(0.4) * pxPerMeter} height={(0.15) * pxPerMeter} fill="#000" opacity={0.15} />
              <Rect x={halfW - (width * 0.2) * pxPerMeter - (0.4 * pxPerMeter)} y={halfD - (0.05 * pxPerMeter)} width={(0.4) * pxPerMeter} height={(0.15) * pxPerMeter} fill="#000" opacity={0.15} />
            </>
          )}
        </Group>
      )}

      {/* Chair */}
      {kind === 'chair' && (
        <Group>
          <Rect x={-halfW + (width * 0.1) * pxPerMeter} y={-halfD + (depth * 0.1) * pxPerMeter} width={(width * 0.8) * pxPerMeter} height={(depth * 0.2) * pxPerMeter} fill="#000" opacity={0.3} cornerRadius={0.05 * pxPerMeter} />
          <Rect x={-halfW + (width * 0.15) * pxPerMeter} y={-halfD + (depth * 0.35) * pxPerMeter} width={(width * 0.7) * pxPerMeter} height={(depth * 0.55) * pxPerMeter} stroke="#fff" strokeWidth={1} opacity={0.4} cornerRadius={0.05 * pxPerMeter} />
        </Group>
      )}

    </Group>
  );
};
