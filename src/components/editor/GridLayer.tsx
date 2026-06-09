import React from 'react';
import { Group, Line, Rect, Text } from 'react-konva';
import { useTheme } from '../../theme/tokens';
import { WORKSPACE_MIN_X, WORKSPACE_MIN_Z, WORKSPACE_MAX_X, WORKSPACE_MAX_Z, WORKSPACE_WIDTH, WORKSPACE_DEPTH } from '../../core/config/workspace';

interface Props {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  scale: number;
  zoom: number;
}

export const GridLayer: React.FC<Props> = ({ scale, zoom }) => {
  const theme = useTheme();
  const lines = [];
  
  const pxPerMeter = scale * zoom;
  const showFine = pxPerMeter >= 45;
  const showMinor = pxPerMeter >= 16;
  
  // Grid definitions
  const majorStep = 1.0;
  const minorStep = 0.5;
  const fineStep = 0.25;

  // Use the smallest step that is visible to align start/end
  const snapStep = showFine ? fineStep : (showMinor ? minorStep : majorStep);
  
  // We will build the grid by iterating over the static workspace bounds
  for (let x = WORKSPACE_MIN_X; x <= WORKSPACE_MAX_X + 0.001; x += snapStep) {
    const isMajor = Math.abs(x % majorStep) < 0.001 || Math.abs((x % majorStep) - majorStep) < 0.001;
    const isMinor = !isMajor && (Math.abs(x % minorStep) < 0.001 || Math.abs((x % minorStep) - minorStep) < 0.001);
    const isFine = !isMajor && !isMinor;

    if (isMajor) {
      lines.push(<Line key={`major_v_${x.toFixed(2)}`} points={[x * scale, WORKSPACE_MIN_Z * scale, x * scale, WORKSPACE_MAX_Z * scale]} stroke={theme.gridMajor} strokeWidth={1 / zoom} listening={false} />);
    } else if (isMinor && showMinor) {
      lines.push(<Line key={`minor_v_${x.toFixed(2)}`} points={[x * scale, WORKSPACE_MIN_Z * scale, x * scale, WORKSPACE_MAX_Z * scale]} stroke={theme.gridMinor} strokeWidth={1 / zoom} listening={false} />);
    } else if (isFine && showFine) {
      lines.push(<Line key={`fine_v_${x.toFixed(2)}`} points={[x * scale, WORKSPACE_MIN_Z * scale, x * scale, WORKSPACE_MAX_Z * scale]} stroke={theme.gridFine} strokeWidth={1 / zoom} listening={false} />);
    }
  }

  for (let z = WORKSPACE_MIN_Z; z <= WORKSPACE_MAX_Z + 0.001; z += snapStep) {
    const isMajor = Math.abs(z % majorStep) < 0.001 || Math.abs((z % majorStep) - majorStep) < 0.001;
    const isMinor = !isMajor && (Math.abs(z % minorStep) < 0.001 || Math.abs((z % minorStep) - minorStep) < 0.001);
    const isFine = !isMajor && !isMinor;

    if (isMajor) {
      lines.push(<Line key={`major_h_${z.toFixed(2)}`} points={[WORKSPACE_MIN_X * scale, z * scale, WORKSPACE_MAX_X * scale, z * scale]} stroke={theme.gridMajor} strokeWidth={1 / zoom} listening={false} />);
    } else if (isMinor && showMinor) {
      lines.push(<Line key={`minor_h_${z.toFixed(2)}`} points={[WORKSPACE_MIN_X * scale, z * scale, WORKSPACE_MAX_X * scale, z * scale]} stroke={theme.gridMinor} strokeWidth={1 / zoom} listening={false} />);
    } else if (isFine && showFine) {
      lines.push(<Line key={`fine_h_${z.toFixed(2)}`} points={[WORKSPACE_MIN_X * scale, z * scale, WORKSPACE_MAX_X * scale, z * scale]} stroke={theme.gridFine} strokeWidth={1 / zoom} listening={false} />);
    }
  }

  return (
    <Group listening={false}>
      {lines}
      {/* Workspace Border */}
      <Rect
        x={WORKSPACE_MIN_X * scale}
        y={WORKSPACE_MIN_Z * scale}
        width={WORKSPACE_WIDTH * scale}
        height={WORKSPACE_DEPTH * scale}
        stroke="#00bcd4"
        strokeWidth={1.5 / zoom}
        listening={false}
      />
      <Text
        x={(WORKSPACE_MIN_X * scale) + 10 / zoom}
        y={(WORKSPACE_MIN_Z * scale) - 15 / zoom}
        text={`Khung làm việc ${WORKSPACE_WIDTH}m x ${WORKSPACE_DEPTH}m`}
        fontSize={12 / zoom}
        fill="#00bcd4"
        listening={false}
      />
    </Group>
  );
};
