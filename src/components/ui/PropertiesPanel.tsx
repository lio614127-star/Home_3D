import React from 'react';
import { useUIStore } from '../../store/useUIStore';
import { useProjectStore } from '../../store/useProjectStore';
import { getWallLength, getWallEndFromLength, getPolygonArea, getAreaNetSize, normalizeCoord } from '../../core/geometry/math';
import { useI18nStore } from '../../store/useI18nStore';
import { useTheme } from '../../theme/tokens';

export const PropertiesPanel: React.FC = () => {
  const { selectedObjectId, selectedObjectType, selectedItems, showAreaName, showAreaArea } = useUIStore();
  const project = useProjectStore(state => state.data);
  const updateSite = useProjectStore(state => state.updateSite);
  const updateBuilding = useProjectStore(state => state.updateBuilding);
  const updateWall = useProjectStore(state => state.updateWall);
  const updateArea = useProjectStore(state => state.updateArea);
  const { t } = useI18nStore();
  const theme = useTheme();

  if (selectedItems && selectedItems.length > 1) {
    return (
      <div style={{ padding: '15px', fontSize: '13px', boxSizing: 'border-box', width: '100%', color: theme.textPrimary }}>
        <h3 style={{ marginTop: 0 }}>Đã chọn {selectedItems.length} đối tượng</h3>
        <p style={{ color: theme.textSecondary }}>Sử dụng chuột để kéo thả toàn bộ nhóm trên bản vẽ.</p>
      </div>
    );
  }

  if (!selectedObjectId || !selectedObjectType) {
    const { showManualDimensions, showOpeningLabels, toggle2DDisplay, mode, toolDefaults, setToolDefaults } = useUIStore.getState();

    if (mode === 'addWall') {
      return (
        <div style={{ padding: '15px', fontSize: '13px', boxSizing: 'border-box', width: '100%', color: theme.textPrimary }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px' }}>{t("toolbar.addWall")} - Mặc định</h3>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between' }}>
              Độ dày (m): 
              <input type="number" step="0.05" value={toolDefaults.wall.thickness} onChange={e => setToolDefaults('wall', { thickness: normalizeCoord(parseFloat(e.target.value) || 0.1) })} style={{ width: '60px' }} />
            </label>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between' }}>
              Chiều cao (m): 
              <input type="number" step="0.1" value={toolDefaults.wall.height} onChange={e => setToolDefaults('wall', { height: normalizeCoord(parseFloat(e.target.value) || 2.0) })} style={{ width: '60px' }} />
            </label>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              Căn lề tường (Tham chiếu):
              <select value={toolDefaults.wall.justification || 'center'} onChange={e => setToolDefaults('wall', { justification: e.target.value })} style={{ width: '100%', padding: '4px' }}>
                <option value="center">Giữa (Tim tường)</option>
                <option value="left">Mép trong (Lọt lòng)</option>
                <option value="right">Mép ngoài (Phủ bì)</option>
              </select>
            </label>
          </div>
        </div>
      );
    }
    
    if (mode === 'addArea') {
      return (
        <div style={{ padding: '15px', fontSize: '13px', boxSizing: 'border-box', width: '100%', color: theme.textPrimary }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px' }}>{t("tool.addArea")} - Mặc định</h3>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between' }}>
              Tên: 
              <input type="text" value={toolDefaults.area.name} onChange={e => setToolDefaults('area', { name: e.target.value })} style={{ width: '100px' }} />
            </label>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between' }}>
              Loại: 
              <select value={toolDefaults.area.type} onChange={e => setToolDefaults('area', { type: e.target.value })} style={{ width: '100px' }}>
                <option value="custom_area">Tùy chỉnh</option>
                <option value="living_room">Phòng khách</option>
                <option value="bedroom">Phòng ngủ</option>
              </select>
            </label>
          </div>
        </div>
      );
    }

    if (mode === 'addDoor') {
      return (
        <div style={{ padding: '15px', fontSize: '13px', boxSizing: 'border-box', width: '100%', color: theme.textPrimary }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px' }}>{t("tool.addDoor")} - Mặc định</h3>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between' }}>Rộng (m): <input type="number" step="0.1" value={toolDefaults.door.width} onChange={e => setToolDefaults('door', { width: normalizeCoord(parseFloat(e.target.value) || 0.6) })} style={{ width: '60px' }} /></label>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between' }}>Cao (m): <input type="number" step="0.1" value={toolDefaults.door.height} onChange={e => setToolDefaults('door', { height: normalizeCoord(parseFloat(e.target.value) || 2.0) })} style={{ width: '60px' }} /></label>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between' }}>Cao độ bậu: <input type="number" step="0.1" value={toolDefaults.door.sillHeight} onChange={e => setToolDefaults('door', { sillHeight: normalizeCoord(parseFloat(e.target.value) || 0) })} style={{ width: '60px' }} /></label>
          </div>
        </div>
      );
    }

    if (mode === 'addWindow') {
      return (
        <div style={{ padding: '15px', fontSize: '13px', boxSizing: 'border-box', width: '100%', color: theme.textPrimary }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px' }}>{t("tool.addWindow")} - Mặc định</h3>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between' }}>Rộng (m): <input type="number" step="0.1" value={toolDefaults.window.width} onChange={e => setToolDefaults('window', { width: normalizeCoord(parseFloat(e.target.value) || 0.6) })} style={{ width: '60px' }} /></label>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between' }}>Cao (m): <input type="number" step="0.1" value={toolDefaults.window.height} onChange={e => setToolDefaults('window', { height: normalizeCoord(parseFloat(e.target.value) || 1.0) })} style={{ width: '60px' }} /></label>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between' }}>Cao độ bậu: <input type="number" step="0.1" value={toolDefaults.window.sillHeight} onChange={e => setToolDefaults('window', { sillHeight: normalizeCoord(parseFloat(e.target.value) || 0) })} style={{ width: '60px' }} /></label>
          </div>
        </div>
      );
    }



    return (
      <div style={{ padding: '15px', fontSize: '13px', boxSizing: 'border-box', width: '100%', color: theme.textPrimary }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px', color: theme.textPrimary }}>2D Display Settings</h3>
        
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="checkbox" checked={showAreaName} onChange={() => toggle2DDisplay('areaName')} />
            {t("toggle.showAreaName")}
          </label>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="checkbox" checked={showAreaArea} onChange={() => toggle2DDisplay('areaArea')} />
            {t("toggle.showAreaArea")}
          </label>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="checkbox" checked={showOpeningLabels} onChange={() => toggle2DDisplay('openingLabel')} />
            Hiện tên cửa/cửa sổ
          </label>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="checkbox" checked={showManualDimensions} onChange={() => toggle2DDisplay('manualDim')} />
            Hiện kích thước đo (Thủ công)
          </label>
        </div>
        
        <p style={{ marginTop: '20px', color: theme.textSecondary, fontStyle: 'italic' }}>{t("panel.selectObjectHint")}</p>
      </div>
    );
  }

  if (selectedObjectType === 'site' && project.site.id === selectedObjectId) {
    const site = project.site;
    return (
      <div style={{ padding: '10px', fontSize: '13px', color: theme.textPrimary }}>
        <h3 style={{ marginTop: 0 }}>{t("object.site")}</h3>
        <p><strong>{t("field.id")}:</strong> {site.id}</p>
        <div style={{ marginBottom: '5px' }}>
          <label>{t("field.width")}: <input type="number" value={site.width} onChange={e => updateSite({ width: parseFloat(e.target.value) || 0 })} style={{ width: '80px' }} /></label>
        </div>
        <div style={{ marginBottom: '5px' }}>
          <label>{t("field.depth")}: <input type="number" value={site.depth} onChange={e => updateSite({ depth: parseFloat(e.target.value) || 0 })} style={{ width: '80px' }} /></label>
        </div>
        <div style={{ marginBottom: '5px' }}>
          <label>{t("field.frontDir")}: <input type="text" value={site.frontDirection} onChange={e => updateSite({ frontDirection: e.target.value })} style={{ width: '80px' }} /></label>
        </div>
      </div>
    );
  }

  if (selectedObjectType === 'building' && project.building.id === selectedObjectId) {
    const b = project.building;
    return (
      <div style={{ padding: '10px', fontSize: '13px', color: theme.textPrimary }}>
        <h3 style={{ marginTop: 0 }}>{t("object.building")}</h3>
        <p><strong>{t("field.id")}:</strong> {b.id}</p>
        <div style={{ marginBottom: '5px' }}>
          <label>{t("field.originX")}: <input type="number" value={b.origin.x} onChange={e => updateBuilding({ origin: { ...b.origin, x: parseFloat(e.target.value) || 0 } })} style={{ width: '60px' }} /></label>
        </div>
        <div style={{ marginBottom: '5px' }}>
          <label>{t("field.originZ")}: <input type="number" value={b.origin.z} onChange={e => updateBuilding({ origin: { ...b.origin, z: parseFloat(e.target.value) || 0 } })} style={{ width: '60px' }} /></label>
        </div>
        <div style={{ marginBottom: '5px' }}>
          <label>{t("field.width")}: <input type="number" value={b.width} onChange={e => updateBuilding({ width: parseFloat(e.target.value) || 0 })} style={{ width: '60px' }} /></label>
        </div>
        <div style={{ marginBottom: '5px' }}>
          <label>{t("field.depth")}: <input type="number" value={b.depth} onChange={e => updateBuilding({ depth: parseFloat(e.target.value) || 0 })} style={{ width: '60px' }} /></label>
        </div>
        <div style={{ marginBottom: '5px' }}>
          <label>{t("field.floorHeight")}: <input type="number" value={b.floorHeight} onChange={e => updateBuilding({ floorHeight: parseFloat(e.target.value) || 0 })} style={{ width: '60px' }} /></label>
        </div>
        <div style={{ marginBottom: '5px' }}>
          <label>{t("field.wallHeight")}: <input type="number" value={b.wallHeight} onChange={e => updateBuilding({ wallHeight: parseFloat(e.target.value) || 0 })} style={{ width: '60px' }} /></label>
        </div>
        <div style={{ marginBottom: '5px' }}>
          <label>{t("field.wallThickness")}: <input type="number" value={b.wallThickness} onChange={e => updateBuilding({ wallThickness: parseFloat(e.target.value) || 0 })} style={{ width: '60px' }} /></label>
        </div>
      </div>
    );
  }

  if (selectedObjectType === 'wall') {
    const wall = project.walls.find(w => w.id === selectedObjectId);
    if (!wall) return null;
    
    const length = getWallLength(wall);
    const handleLengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newLen = parseFloat(e.target.value) || 0;
      const newEnd = getWallEndFromLength(wall.start, wall.end, newLen);
      updateWall(wall.id, { end: newEnd });
    };

    return (
      <div style={{ padding: '15px', fontSize: '13px', boxSizing: 'border-box', width: '100%', color: theme.textPrimary }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px' }}>{t("object.wall")}</h3>
        <p style={{ marginBottom: '10px' }}><strong>{t("field.id")}:</strong> {wall.id}</p>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>{t("field.startX")}</label>
          <input type="number" value={wall.start.x} onChange={e => updateWall(wall.id, { start: { ...wall.start, x: parseFloat(e.target.value) || 0 } })} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>{t("field.startZ")}</label>
          <input type="number" value={wall.start.z} onChange={e => updateWall(wall.id, { start: { ...wall.start, z: parseFloat(e.target.value) || 0 } })} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>{t("field.endX")}</label>
          <input type="number" value={wall.end.x} onChange={e => updateWall(wall.id, { end: { ...wall.end, x: parseFloat(e.target.value) || 0 } })} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>{t("field.endZ")}</label>
          <input type="number" value={wall.end.z} onChange={e => updateWall(wall.id, { end: { ...wall.end, z: parseFloat(e.target.value) || 0 } })} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>{t("field.thickness")}</label>
          <input type="number" value={wall.thickness} onChange={e => updateWall(wall.id, { thickness: parseFloat(e.target.value) || 0 })} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>{t("field.height")}</label>
          <input type="number" value={wall.height} onChange={e => updateWall(wall.id, { height: parseFloat(e.target.value) || 0 })} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>Căn lề</label>
          <select value={wall.justification || 'center'} onChange={e => updateWall(wall.id, { justification: e.target.value as any })} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }}>
            <option value="center">Giữa (Tim tường)</option>
            <option value="left">Mép trong (Lọt lòng)</option>
            <option value="right">Mép ngoài (Phủ bì)</option>
          </select>
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>{t("field.length")}</label>
          <input type="number" value={length.toFixed(2)} onChange={handleLengthChange} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px', fontWeight: 'bold' }} />
        </div>
      </div>
    );
  }

  if (selectedObjectType === 'area') {
    const area = project.areas.find(r => r.id === selectedObjectId);
    if (!area) return null;
    
    const areaValue = getAreaNetSize(area, project.walls);
    
    // Calculate bounding box for width/depth editing
    const minX = Math.min(...area.points.map(p => p.x));
    const maxX = Math.max(...area.points.map(p => p.x));
    const minZ = Math.min(...area.points.map(p => p.z));
    const maxZ = Math.max(...area.points.map(p => p.z));
    const width = maxX - minX;
    const depth = maxZ - minZ;
    const dynamicTextSize = Math.max(0.2, Math.min(width, depth) * 0.15);

    const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newWidth = parseFloat(e.target.value) || 0;
      if (newWidth <= 0 || width <= 0) return;
      const scaleX = newWidth / width;
      const newPoints = area.points.map(p => ({
        x: normalizeCoord(minX + (p.x - minX) * scaleX),
        z: p.z
      }));
      updateArea(area.id, { points: newPoints });
    };

    const handleDepthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newDepth = parseFloat(e.target.value) || 0;
      if (newDepth <= 0 || depth <= 0) return;
      const scaleZ = newDepth / depth;
      const newPoints = area.points.map(p => ({
        x: p.x,
        z: normalizeCoord(minZ + (p.z - minZ) * scaleZ)
      }));
      updateArea(area.id, { points: newPoints });
    };

    const usedColors = Array.from(new Set(project.areas.map(a => a.color).filter(c => c && c !== theme.roomStroke)));

    return (
      <div style={{ padding: '15px', fontSize: '13px', boxSizing: 'border-box', width: '100%', color: theme.textPrimary }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px' }}>{t("object.area")}</h3>
        <p style={{ marginBottom: '10px' }}><strong>{t("field.id")}:</strong> {area.id}</p>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>{t("field.areaName")}</label>
          <input type="text" value={area.name || ''} placeholder={t("placeholder.areaName")} onChange={e => updateArea(area.id, { name: e.target.value })} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>{t("field.areaType")}</label>
          <input type="text" value={area.type || ''} onChange={e => updateArea(area.id, { type: e.target.value })} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>Màu sắc khu vực</label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input type="color" value={area.color || theme.roomStroke} onChange={e => updateArea(area.id, { color: e.target.value })} style={{ cursor: 'pointer', padding: '0', border: 'none', width: '40px', height: '30px', borderRadius: '4px' }} />
            <button onClick={() => updateArea(area.id, { color: undefined })} style={{ padding: '5px 10px', fontSize: '12px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px', background: theme.toolbarBg, color: theme.textPrimary }}>Mặc định</button>
          </div>
          {usedColors.length > 0 && (
            <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {usedColors.map((c: string) => (
                <div 
                  key={c}
                  onClick={() => updateArea(area.id, { color: c })}
                  style={{ 
                    width: '24px', height: '24px', 
                    backgroundColor: c, 
                    border: '1px solid #999', 
                    borderRadius: '4px', 
                    cursor: 'pointer',
                    boxShadow: area.color === c ? `0 0 0 2px ${theme.accent}` : 'none'
                  }}
                  title={`Tái sử dụng màu này (${c})`}
                />
              ))}
            </div>
          )}
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>Độ cao nền (m)</label>
          <input type="number" step="0.01" value={area.elevation || 0} onChange={e => updateArea(area.id, { elevation: Math.max(0, parseFloat(e.target.value) || 0) })} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>Chiều ngang (m)</label>
          <input type="number" step="0.01" value={Number(width.toFixed(3))} onChange={handleWidthChange} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px', fontWeight: 'bold', color: theme.primary }} />
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>Chiều dọc (m)</label>
          <input type="number" step="0.01" value={Number(depth.toFixed(3))} onChange={handleDepthChange} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px', fontWeight: 'bold', color: theme.primary }} />
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>Cỡ chữ hiển thị (m)</label>
          <input 
            type="number" 
            step="0.1" 
            value={area.textSize || ''} 
            placeholder={`Tự động (${dynamicTextSize.toFixed(2)})`}
            onChange={e => {
              const val = parseFloat(e.target.value);
              updateArea(area.id, { textSize: isNaN(val) ? undefined : Math.max(0.1, val) });
            }} 
            style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} 
          />
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '500' }}>
            <input 
              type="checkbox" 
              checked={area.showName ?? showAreaName} 
              onChange={e => updateArea(area.id, { showName: e.target.checked })} 
            />
            Hiển thị Tên phòng
          </label>
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '500' }}>
            <input 
              type="checkbox" 
              checked={area.showArea ?? showAreaArea} 
              onChange={e => updateArea(area.id, { showArea: e.target.checked })} 
            />
            Hiển thị Diện tích
          </label>
        </div>
        <div style={{ marginTop: '15px' }}>
          <p><strong>{t("field.area")}:</strong> {areaValue.toFixed(2)} m²</p>
        </div>
      </div>
    );
  }

  if (selectedObjectType === 'opening') {
    const opening = project.openings.find(o => o.id === selectedObjectId);
    const updateOpening = useProjectStore.getState().updateOpening;
    if (!opening) return null;

    return (
      <div style={{ padding: '15px', fontSize: '13px', boxSizing: 'border-box', width: '100%', color: theme.textPrimary }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px' }}>{opening.type === 'door' ? t("object.door") : t("object.window")}</h3>
        <p style={{ marginBottom: '10px' }}><strong>{t("field.id")}:</strong> {opening.id}</p>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>{t("field.wallId")}</label>
          <input type="text" value={opening.wallId} disabled style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#f0f0f0' }} />
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>{t("field.offsetFromStart")}</label>
          <input type="number" step="0.1" value={opening.offsetFromStart} onChange={e => updateOpening(opening.id, { offsetFromStart: parseFloat(e.target.value) || 0 })} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>{t("field.width")}</label>
          <input type="number" step="0.1" value={opening.width} onChange={e => updateOpening(opening.id, { width: parseFloat(e.target.value) || 0 })} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>{t("field.height")}</label>
          <input type="number" step="0.1" value={opening.height} onChange={e => updateOpening(opening.id, { height: parseFloat(e.target.value) || 0 })} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>{t("field.sillHeight")}</label>
          <input type="number" step="0.1" value={opening.sillHeight} onChange={e => updateOpening(opening.id, { sillHeight: parseFloat(e.target.value) || 0 })} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        {opening.type === 'door' && (
          <>
            <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
              <label style={{ marginBottom: '4px', fontWeight: '500' }}>{t("field.hingeSide")}</label>
              <select value={opening.hingeSide} onChange={e => updateOpening(opening.id, { hingeSide: e.target.value as 'left' | 'right' })} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }}>
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </div>
            <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
              <label style={{ marginBottom: '4px', fontWeight: '500' }}>{t("field.openDirection")}</label>
              <select value={opening.openDirection} onChange={e => updateOpening(opening.id, { openDirection: e.target.value as 'inward' | 'outward' })} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }}>
                <option value="inward">Inward</option>
                <option value="outward">Outward</option>
              </select>
            </div>
            <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
              <label style={{ marginBottom: '4px', fontWeight: '500' }}>{t("field.swingAngle")}</label>
              <input type="number" value={opening.swingAngle} onChange={e => updateOpening(opening.id, { swingAngle: parseFloat(e.target.value) || 0 })} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
            </div>
          </>
        )}
      </div>
    );
  }

  if (selectedObjectType === 'dimension') {
    const dim = (project.annotations || []).find(a => a.id === selectedObjectId && a.type === 'dimension');
    const updateAnnotation = useProjectStore.getState().updateAnnotation;
    const deleteAnnotation = useProjectStore.getState().deleteAnnotation;
    if (!dim) return null;

    const dx = dim.end.x - dim.start.x;
    const dz = dim.end.z - dim.start.z;
    const measuredLength = Math.sqrt(dx*dx + dz*dz);

    return (
      <div style={{ padding: '15px', fontSize: '13px', boxSizing: 'border-box', width: '100%', color: theme.textPrimary }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px' }}>{t("object.dimension") || "Đường đo"}</h3>
        <p style={{ marginBottom: '10px' }}><strong>{t("field.id") || "Mã"}:</strong> {dim.id}</p>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>{t("field.startX") || "Điểm đầu X"}</label>
          <input type="number" step="0.1" value={dim.start.x} onChange={e => updateAnnotation(dim.id, { start: { ...dim.start, x: parseFloat(e.target.value) || 0 } })} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>{t("field.startZ") || "Điểm đầu Z"}</label>
          <input type="number" step="0.1" value={dim.start.z} onChange={e => updateAnnotation(dim.id, { start: { ...dim.start, z: parseFloat(e.target.value) || 0 } })} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>{t("field.endX") || "Điểm cuối X"}</label>
          <input type="number" step="0.1" value={dim.end.x} onChange={e => updateAnnotation(dim.id, { end: { ...dim.end, x: parseFloat(e.target.value) || 0 } })} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>{t("field.endZ") || "Điểm cuối Z"}</label>
          <input type="number" step="0.1" value={dim.end.z} onChange={e => updateAnnotation(dim.id, { end: { ...dim.end, z: parseFloat(e.target.value) || 0 } })} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>{t("field.offsetDistance") || "Khoảng cách line đo"}</label>
          <input type="number" step="0.1" value={dim.offsetDistance} onChange={e => updateAnnotation(dim.id, { offsetDistance: parseFloat(e.target.value) || 0 })} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <div style={{ marginTop: '15px', marginBottom: '15px' }}>
          <p><strong>{t("field.measuredLength") || "Chiều dài đo"}:</strong> {measuredLength.toFixed(2)} m</p>
        </div>
        <button onClick={() => {
          deleteAnnotation(dim.id);
          useUIStore.getState().setSelectedObject(null, null);
        }} style={{ width: '100%', padding: '8px', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          {t("action.deleteDimension") || "Xóa đường đo"}
        </button>
      </div>
    );
  }

  const { showManualDimensions, showOpeningLabels, toggle2DDisplay } = useUIStore.getState();

  return (
    <div style={{ padding: '15px', fontSize: '13px', boxSizing: 'border-box', width: '100%', color: theme.textPrimary }}>
      <h3 style={{ marginTop: 0, marginBottom: '15px', color: theme.textPrimary }}>2D Display Settings</h3>
      
      <div style={{ marginBottom: '10px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input type="checkbox" checked={showAreaName} onChange={() => toggle2DDisplay('areaName')} />
          {t("toggle.showAreaName")}
        </label>
      </div>
      <div style={{ marginBottom: '10px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input type="checkbox" checked={showAreaArea} onChange={() => toggle2DDisplay('areaArea')} />
          {t("toggle.showAreaArea")}
        </label>
      </div>
      <div style={{ marginBottom: '10px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input type="checkbox" checked={showOpeningLabels} onChange={() => toggle2DDisplay('openingLabel')} />
          Hiện tên cửa/cửa sổ
        </label>
      </div>
      <div style={{ marginBottom: '10px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input type="checkbox" checked={showManualDimensions} onChange={() => toggle2DDisplay('manualDim')} />
          Hiện kích thước đo (Thủ công)
        </label>
      </div>
      
      <p style={{ marginTop: '20px', color: theme.textSecondary, fontStyle: 'italic' }}>{t("panel.selectObjectHint")}</p>
    </div>
  );
};
