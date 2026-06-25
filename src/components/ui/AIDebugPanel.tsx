import React, { useRef, useEffect, useState } from 'react';
import { useAIDebugStore } from '../../store/useAIDebugStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useTheme } from '../../theme/tokens';
import { DEV_MULTI_PART_ROOF_SAMPLE, DEV_VIETNAMESE_GARDEN_HOUSE_ROOF_SAMPLE } from '../../core/ai/devRoofSamples';
import { getResolvedBuildingFrontSide, resolveBuildingFrontOrientation, getBuildingOrientationFrame } from '../../core/geometry/buildingOrientation';

export const AIDebugPanel: React.FC = () => {
  const { enabled, lastAiIntent, lastRoofSegments, setEnabled } = useAIDebugStore();
  const project = useProjectStore(state => state.data);
  const updateRoof = useProjectStore(state => state.updateRoof);
  const theme = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [activeTab, setActiveTab] = useState<'canvas' | 'json'>('canvas');
  const [activeSample, setActiveSample] = useState<string>('None');

  const loadDevSample = () => {
    if (project.roofs && project.roofs.length > 0) {
      updateRoof(project.roofs[0].id, { 
        segments: DEV_MULTI_PART_ROOF_SAMPLE as any,
        geometryParameters: { presetType: 'dev' } as any
      });
      useAIDebugStore.getState().setDebugData(
        useAIDebugStore.getState().lastAiIntent as any, 
        DEV_MULTI_PART_ROOF_SAMPLE as any
      );
      setActiveSample('Dev Sample');
    } else {
      alert("No roof found to update.");
    }
  };

  const loadVNGardenSample = () => {
    if (project.roofs && project.roofs.length > 0) {
      updateRoof(project.roofs[0].id, { 
        segments: DEV_VIETNAMESE_GARDEN_HOUSE_ROOF_SAMPLE as any,
        geometryParameters: { presetType: 'vnGardenHouse' } as any
      });
      useAIDebugStore.getState().setDebugData(
        useAIDebugStore.getState().lastAiIntent as any, 
        DEV_VIETNAMESE_GARDEN_HOUSE_ROOF_SAMPLE as any
      );
      setActiveSample('VN Garden Roof');
    } else {
      alert("No roof found to update.");
    }
  };

  // Draw 2D Canvas Overlay
  useEffect(() => {
    const building = project.buildings?.find(b => b.footprint && b.footprint.length > 0);
    if (activeTab !== 'canvas' || !canvasRef.current || !building?.footprint || building.footprint.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const footprint = building.footprint;

    // Calculate Bounding Box of Footprint
    const minX = Math.min(...footprint.map(p => p.x));
    const maxX = Math.max(...footprint.map(p => p.x));
    const minZ = Math.min(...footprint.map(p => p.z));
    const maxZ = Math.max(...footprint.map(p => p.z));

    const bboxWidth = maxX - minX;
    const bboxDepth = maxZ - minZ;
    const bboxCenterX = minX + bboxWidth / 2;
    const bboxCenterZ = minZ + bboxDepth / 2;

    // Determine scale to fit footprint in canvas (with padding)
    const padding = 40;
    const scaleX = (width - padding * 2) / bboxWidth;
    const scaleZ = (height - padding * 2) / bboxDepth;
    const scale = Math.min(scaleX, scaleZ);

    // Helper to map world coordinates to canvas coordinates
    const toCanvas = (wx: number, wz: number) => {
      const cx = width / 2 + (wx - bboxCenterX) * scale;
      const cy = height / 2 + (wz - bboxCenterZ) * scale;
      return { x: cx, y: cy };
    };

    // 1. Draw Footprint
    ctx.beginPath();
    const start = toCanvas(footprint[0].x, footprint[0].z);
    ctx.moveTo(start.x, start.y);
    for (let i = 1; i < footprint.length; i++) {
      const pt = toCanvas(footprint[i].x, footprint[i].z);
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.closePath();
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(200, 200, 200, 0.2)';
    ctx.fill();

    // Draw Front Direction Arrow
    const resolvedOrientation = resolveBuildingFrontOrientation(project, building);
    const frontSide = resolvedOrientation.frontSide;
    const orientation = getBuildingOrientationFrame(frontSide);
    
    const arrowStart = toCanvas(
      bboxCenterX + orientation.front.x * (bboxWidth / 2),
      bboxCenterZ + orientation.front.z * (bboxDepth / 2)
    );
    const arrowEnd = toCanvas(
      bboxCenterX + orientation.front.x * (bboxWidth / 2 + 1.5),
      bboxCenterZ + orientation.front.z * (bboxDepth / 2 + 1.5)
    );
    
    ctx.beginPath();
    ctx.moveTo(arrowStart.x, arrowStart.y);
    ctx.lineTo(arrowEnd.x, arrowEnd.y);
    ctx.strokeStyle = '#e91e63';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    const arrowAngle = Math.atan2(arrowEnd.y - arrowStart.y, arrowEnd.x - arrowStart.x);
    ctx.beginPath();
    ctx.moveTo(arrowEnd.x, arrowEnd.y);
    ctx.lineTo(arrowEnd.x - 8 * Math.cos(arrowAngle - Math.PI / 6), arrowEnd.y - 8 * Math.sin(arrowAngle - Math.PI / 6));
    ctx.lineTo(arrowEnd.x - 8 * Math.cos(arrowAngle + Math.PI / 6), arrowEnd.y - 8 * Math.sin(arrowAngle + Math.PI / 6));
    ctx.lineTo(arrowEnd.x, arrowEnd.y);
    ctx.fillStyle = '#e91e63';
    ctx.fill();

    ctx.fillStyle = '#e91e63';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    const sourceLabel = resolvedOrientation.source === 'door' ? 'Cửa' : resolvedOrientation.source;
    ctx.fillText(`Mặt tiền (${frontSide} - ${sourceLabel})`, arrowEnd.x + orientation.front.x * 20, arrowEnd.y + orientation.front.z * 20 + 4);

    // 2. Draw Roof Segments
    if (lastRoofSegments && lastRoofSegments.length > 0) {
      const colors = ['rgba(76, 175, 80, 0.6)', 'rgba(255, 152, 0, 0.6)', 'rgba(156, 39, 176, 0.6)', 'rgba(33, 150, 243, 0.6)'];

      lastRoofSegments.forEach((seg, index) => {
        const cX = seg.centerX ?? seg.relativeFootprint?.centerX ?? 0;
        const cZ = seg.centerZ ?? seg.relativeFootprint?.centerZ ?? 0;
        const wR = seg.widthRatio ?? seg.relativeFootprint?.widthRatio ?? 1;
        const dR = seg.depthRatio ?? seg.relativeFootprint?.depthRatio ?? 1;

        const segWidth = bboxWidth * wR;
        const segDepth = bboxDepth * dR;
        
        const cx = bboxCenterX + (cX * bboxWidth) / 2;
        const cz = bboxCenterZ + (cZ * bboxDepth) / 2;

        const tl = toCanvas(cx - segWidth / 2, cz - segDepth / 2);
        const br = toCanvas(cx + segWidth / 2, cz + segDepth / 2);

        const canvasSegWidth = br.x - tl.x;
        const canvasSegHeight = br.y - tl.y;

        ctx.fillStyle = colors[index % colors.length];
        ctx.fillRect(tl.x, tl.y, canvasSegWidth, canvasSegHeight);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(tl.x, tl.y, canvasSegWidth, canvasSegHeight);

        // Draw marker (+) at center
        const canvasCx = tl.x + canvasSegWidth / 2;
        const canvasCy = tl.y + canvasSegHeight / 2;
        
        ctx.beginPath();
        ctx.moveTo(canvasCx - 5, canvasCy);
        ctx.lineTo(canvasCx + 5, canvasCy);
        ctx.moveTo(canvasCx, canvasCy - 5);
        ctx.lineTo(canvasCx, canvasCy + 5);
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Draw Label
        ctx.fillStyle = '#000';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Background for text to make it readable
        const textBgY = canvasCy - 26;
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillRect(canvasCx - 45, textBgY, 90, 75);
        
        ctx.fillStyle = '#000';
        ctx.fillText(`ID: ${seg.id || index}`, canvasCx, canvasCy - 15);
        ctx.fillText(`cx=${cX}, cz=${cZ}`, canvasCx, canvasCy + 10);
        ctx.fillText(`World X:${cx.toFixed(1)} Z:${cz.toFixed(1)}`, canvasCx, canvasCy + 22);
        
        const semanticSide = seg.side ?? seg.attachToSide ?? seg.semanticPosition;
        if (semanticSide) {
          ctx.fillStyle = '#1976d2';
          ctx.fillText(`Side: ${semanticSide}`, canvasCx, canvasCy + 34);
        }
      });
    }

  }, [activeTab, lastRoofSegments, project.buildings]);

  if (!enabled) return null;

  return (
    <div style={{
      width: '350px',
      background: theme.panelBg,
      borderLeft: `1px solid ${theme.panelBorder}`,
      display: 'flex',
      flexDirection: 'column',
      color: theme.textPrimary,
      boxShadow: '-2px 0 10px rgba(0,0,0,0.1)',
      zIndex: 20
    }}>
      <div style={{ padding: '15px', borderBottom: `1px solid ${theme.panelBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#333', color: 'white' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>AI Debug Panel</h3>
        <button onClick={() => setEnabled(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white' }}>
          ✕
        </button>
      </div>

      <div style={{ display: 'flex', borderBottom: `1px solid ${theme.panelBorder}`, flexDirection: 'column' }}>
        <div style={{ display: 'flex' }}>
          <button 
            onClick={() => setActiveTab('canvas')}
            style={{ flex: 1, padding: '10px', background: activeTab === 'canvas' ? theme.toolbarBg : 'transparent', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'canvas' ? 'bold' : 'normal', color: theme.textPrimary }}
          >
            2D Overlay
          </button>
          <button 
            onClick={() => setActiveTab('json')}
            style={{ flex: 1, padding: '10px', background: activeTab === 'json' ? theme.toolbarBg : 'transparent', border: 'none', cursor: 'pointer', fontWeight: activeTab === 'json' ? 'bold' : 'normal', color: theme.textPrimary }}
          >
            Raw JSON
          </button>
        </div>
        {import.meta.env.DEV && (
          <div style={{ padding: '8px', background: '#222', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '11px', color: '#aaa' }}>Current Sample: {activeSample}</div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button onClick={loadDevSample} style={{ background: '#4caf50', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                Load Dev Roof Sample
              </button>
              <button onClick={loadVNGardenSample} style={{ background: '#2196F3', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                Load VN Garden Roof Sample
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
        {activeTab === 'canvas' && (
          <div>
            <div style={{ marginBottom: '10px', fontSize: '12px', color: theme.textSecondary }}>
              Hiển thị Building Footprint và Roof Segments từ AI.
            </div>
            <div style={{ background: '#eee', borderRadius: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
               <canvas ref={canvasRef} width={300} height={300} style={{ background: 'white' }} />
            </div>
            {lastRoofSegments && (
              <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <strong>Segments ({lastRoofSegments.length}):</strong>
                {lastRoofSegments.map((seg, i) => (
                  <div key={i} style={{ background: '#2a2a2a', padding: '10px', borderRadius: '6px', fontSize: '12px', borderLeft: '3px solid #ff9800' }}>
                    <div style={{ fontWeight: 'bold', color: '#ff9800', marginBottom: '5px' }}>{seg.id?.toUpperCase() || `SEGMENT ${i+1}`}</div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '4px', marginBottom: '8px' }}>
                      <span style={{ color: '#aaa' }}>KIND</span>
                      <span>{seg.kind || 'N/A'}</span>
                      
                      <span style={{ color: '#aaa' }}>ROOF TYPE</span>
                      <span>{seg.roofType || 'N/A'}</span>
                      
                      <span style={{ color: '#aaa' }}>TIER IDX</span>
                      <span>{seg.tierIndex ?? 0}</span>
                      
                      <span style={{ color: '#aaa' }}>RIDGE DIR</span>
                      <span>{seg.ridgeDirection || 'auto'}</span>
                      
                      <span style={{ color: '#aaa' }}>SLOPE DIR</span>
                      <span>{seg.slopeDirection || 'auto'}</span>
                      
                      <span style={{ color: '#aaa' }}>PITCH</span>
                      <span>{seg.pitchDeg ? `${seg.pitchDeg}°` : 'N/A'}</span>
                      
                      <span style={{ color: '#aaa' }}>REL HEIGHT</span>
                      <span>{seg.relativeHeight ?? seg.heightRatio ?? 1}</span>
                    </div>

                    <div style={{ borderTop: '1px solid #444', paddingTop: '8px', color: '#ccc' }}>
                      <span style={{ color: '#ff9800', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>PARAMETRIC FOOTPRINT</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', color: '#fff', fontWeight: 'bold' }}>
                        <span>cx={(seg.centerX ?? seg.relativeFootprint?.centerX)?.toFixed(2)}</span>
                        <span>cz={(seg.centerZ ?? seg.relativeFootprint?.centerZ)?.toFixed(2)}</span>
                        <span>wRatio={(seg.widthRatio ?? seg.relativeFootprint?.widthRatio)?.toFixed(2)}</span>
                        <span>dRatio={(seg.depthRatio ?? seg.relativeFootprint?.depthRatio)?.toFixed(2)}</span>
                        <span>overhang={seg.overhangRatio ?? seg.overhang ?? 'N/A'}</span>
                      </div>

                      {seg.debug?.aiFootprint && (
                        <div style={{ marginTop: '8px', fontSize: '10px', color: '#888' }}>
                          <span style={{ display: 'block', marginBottom: '2px' }}>AI RAW:</span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            <span style={{ textDecoration: seg.debug.aiFootprint.centerX !== seg.relativeFootprint?.centerX ? 'line-through' : 'none' }}>
                              cx={seg.debug.aiFootprint.centerX?.toFixed(2) || seg.debug.aiFootprint.centerX}
                            </span>
                            <span style={{ textDecoration: seg.debug.aiFootprint.centerZ !== seg.relativeFootprint?.centerZ ? 'line-through' : 'none' }}>
                              cz={seg.debug.aiFootprint.centerZ?.toFixed(2) || seg.debug.aiFootprint.centerZ}
                            </span>
                            <span style={{ textDecoration: seg.debug.aiFootprint.widthRatio !== seg.relativeFootprint?.widthRatio ? 'line-through' : 'none' }}>
                              wRatio={seg.debug.aiFootprint.widthRatio?.toFixed(2) || seg.debug.aiFootprint.widthRatio}
                            </span>
                            <span style={{ textDecoration: seg.debug.aiFootprint.depthRatio !== seg.relativeFootprint?.depthRatio ? 'line-through' : 'none' }}>
                              dRatio={seg.debug.aiFootprint.depthRatio?.toFixed(2) || seg.debug.aiFootprint.depthRatio}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'json' && (
          <div style={{ fontSize: '11px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', background: '#222', color: '#0f0', padding: '10px', borderRadius: '4px', overflowX: 'auto' }}>
            {lastAiIntent ? JSON.stringify(lastAiIntent, null, 2) : "Chưa có dữ liệu AI."}
          </div>
        )}
      </div>
    </div>
  );
};
