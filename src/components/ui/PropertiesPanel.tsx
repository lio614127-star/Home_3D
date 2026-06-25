import React from 'react';
import { useUIStore } from '../../store/useUIStore';
import { useProjectStore } from '../../store/useProjectStore';
import { getWallLength, getWallEndFromLength, getPolygonArea, getAreaNetSize, normalizeCoord } from '../../core/geometry/math';
import { useI18nStore } from '../../store/useI18nStore';
import { useTheme } from '../../theme/tokens';
import { TransformPanel } from './TransformPanel';
import { NumericInput } from './NumericInput';
import { getAssetDefinition } from '../../core/assets/catalog';

export const PropertiesPanel: React.FC = () => {
  const { selectedObjectId, selectedObjectType, selectedItems, showAreaName, showAreaArea } = useUIStore();
  const project = useProjectStore(state => state.data);
  const updateSite = useProjectStore(state => state.updateSite);
  const updateBuilding = useProjectStore(state => state.updateBuilding);
  const updateWall = useProjectStore(state => state.updateWall);
  const updateArea = useProjectStore(state => state.updateArea);
  const addRoof = useProjectStore(state => state.addRoof);
  const updateRoof = useProjectStore(state => state.updateRoof);
  const deleteRoof = useProjectStore(state => state.deleteRoof);
  const updateStructure = useProjectStore(state => state.updateStructure);
  const deleteStructure = useProjectStore(state => state.deleteStructure);
  const { t } = useI18nStore();
  const theme = useTheme();

  if (selectedItems && selectedItems.length > 1) {
    return (
      <div style={{ padding: '15px', fontSize: '13px', boxSizing: 'border-box', width: '100%', color: theme.textPrimary }}>
        <h3 style={{ marginTop: 0 }}>Đã chọn {selectedItems.length} đối tượng</h3>
        <p style={{ color: theme.textSecondary }}>Sử dụng chuột để kéo thả toàn bộ nhóm trên bản vẽ.</p>
        <TransformPanel items={selectedItems} />
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
          <label>{t("field.width")}: <NumericInput value={site.width} onChange={v => updateSite({ width: v })} allowNegative={false} style={{ width: '80px' }} /></label>
        </div>
        <div style={{ marginBottom: '5px' }}>
          <label>{t("field.depth")}: <NumericInput value={site.depth} onChange={v => updateSite({ depth: v })} allowNegative={false} style={{ width: '80px' }} /></label>
        </div>
        <div style={{ marginBottom: '5px' }}>
          <label>{t("field.frontDir")}: <input type="text" value={site.frontDirection} onChange={e => updateSite({ frontDirection: e.target.value })} style={{ width: '80px' }} /></label>
        </div>
      </div>
    );
  }

  if (selectedObjectType === 'building') {
    const b = project.buildings?.find(x => x.id === selectedObjectId);
    if (b) {
      return (
        <div style={{ padding: '10px', fontSize: '13px', color: theme.textPrimary }}>
          <h3 style={{ marginTop: 0 }}>{t("object.building")}</h3>
          <p><strong>{t("field.id")}:</strong> {b.id}</p>
          <div style={{ marginBottom: '5px' }}>
            <label>Tên: <input type="text" value={b.name} onChange={e => updateBuilding({ id: b.id, name: e.target.value })} style={{ width: '100%', padding: '4px', boxSizing: 'border-box' }} /></label>
          </div>
          <div style={{ marginBottom: '5px' }}>
            <label>Góc xoay: <NumericInput value={b.rotation} onChange={v => {
              const delta = v - (b.rotation || 0);
              if (delta !== 0) {
                useProjectStore.getState().commitHistory();
                useProjectStore.getState().rotateSelection([{ type: 'building', id: b.id }], delta);
                updateBuilding({ id: b.id, rotation: v });
              }
            }} style={{ width: '100%', padding: '4px', boxSizing: 'border-box' }} /></label>
          </div>
          <div style={{ marginBottom: '5px' }}>
            <label>Mặt tiền (Building Front): 
              <select 
                value={b.frontSource === 'auto' || !b.frontSide ? 'auto' : b.frontSide} 
                onChange={e => {
                  useProjectStore.getState().commitHistory();
                  if (e.target.value === 'auto') {
                    updateBuilding({ id: b.id, frontSide: undefined, frontSource: 'auto' });
                  } else {
                    updateBuilding({ id: b.id, frontSide: e.target.value as any, frontSource: 'manual' });
                  }
                }} 
                style={{ width: '100%', padding: '4px', boxSizing: 'border-box' }}
              >
                <option value="auto">Tự động (Auto)</option>
                <option value="minZ">Mặt trước: phía dưới (minZ)</option>
                <option value="maxZ">Mặt trước: phía trên (maxZ)</option>
                <option value="minX">Mặt trước: bên trái (minX)</option>
                <option value="maxX">Mặt trước: bên phải (maxX)</option>
              </select>
            </label>
          </div>
          <button 
            onClick={() => {
              useProjectStore.getState().ungroupBuilding(b.id);
            }} 
            style={{ marginTop: '10px', width: '100%', padding: '6px', background: '#e53935', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Rã Tòa nhà (Ungroup)
          </button>
          
          <hr style={{ margin: '15px 0', borderColor: '#eee' }} />
          <h4 style={{ margin: '0 0 10px 0' }}>Hệ thống Mái</h4>
          {(() => {
            const roof = project.roofs?.find(r => r.buildingId === b.id);
            if (!roof) {
              return (
                <button 
                  onClick={() => {
                    useProjectStore.getState().commitHistory();
                    addRoof({
                      id: `roof_${Date.now()}`,
                      buildingId: b.id,
                      type: 'flat',
                      overhang: 0.6,
                      elevation: 3.0,
                      height: 0.2,
                      angle: 30,
                      visible: true,
                      material: { type: 'concrete' }
                    });
                  }}
                  style={{ width: '100%', padding: '6px', background: theme.accent, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Tạo Mái
                </button>
              );
            }
            return (
              <div style={{ padding: '10px', background: 'rgba(0,0,0,0.02)', borderRadius: '4px', border: '1px solid #eee' }}>
                <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
                  <input 
                    type="checkbox" 
                    checked={roof.visible !== false} 
                    onChange={e => updateRoof(roof.id, { visible: e.target.checked })} 
                    id={`roof-visible-${roof.id}`}
                  />
                  <label htmlFor={`roof-visible-${roof.id}`} style={{ marginLeft: '5px', cursor: 'pointer', fontWeight: 'bold', color: theme.accent }}>
                    Hiển thị mái nhà trên 3D
                  </label>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <label>Loại mái: 
                    <select value={roof.type} onChange={e => updateRoof(roof.id, { type: e.target.value as any })} style={{ width: '100%', padding: '4px', marginTop: '4px' }}>
                      <option value="flat">Mái bằng</option>
                      <option value="japanese">Mái Nhật</option>
                      <option value="thai">Mái Thái</option>
                    </select>
                  </label>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <label>Overhang (m): <NumericInput value={roof.overhang} onChange={v => updateRoof(roof.id, { overhang: v })} allowNegative={false} style={{ width: '100%', padding: '4px', marginTop: '4px' }} /></label>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <label>Độ cao đặt mái (m): <NumericInput value={roof.elevation} onChange={v => updateRoof(roof.id, { elevation: v })} style={{ width: '100%', padding: '4px', marginTop: '4px' }} /></label>
                </div>
                {roof.type === 'flat' ? (
                  <div style={{ marginBottom: '8px' }}>
                    <label>Độ dày/cao mái (m): <NumericInput value={roof.height ?? 0.2} onChange={v => updateRoof(roof.id, { height: v })} allowNegative={false} style={{ width: '100%', padding: '4px', marginTop: '4px' }} /></label>
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: '8px' }}>
                      <label>Độ dốc (Độ - °): <NumericInput value={roof.angle ?? 30} onChange={v => updateRoof(roof.id, { angle: v })} allowNegative={false} style={{ width: '100%', padding: '4px', marginTop: '4px' }} /></label>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <label>Hướng chóp mái:
                        <select value={roof.ridgeDirection || 'auto'} onChange={e => updateRoof(roof.id, { ridgeDirection: e.target.value as any })} style={{ width: '100%', padding: '4px', marginTop: '4px' }}>
                          <option value="auto">Tự động (Auto)</option>
                          <option value="horizontal">Nằm ngang (Horizontal)</option>
                          <option value="vertical">Nằm dọc (Vertical)</option>
                        </select>
                      </label>
                    </div>
                  </>
                )}
                <div style={{ marginBottom: '8px' }}>
                  <label>Màu sắc:
                    <select value={roof.color || '#8b4513'} onChange={e => updateRoof(roof.id, { color: e.target.value })} style={{ width: '100%', padding: '4px', marginTop: '4px' }}>
                      <option value="#8b4513">Đỏ ngói</option>
                      <option value="#78909c">Xám</option>
                      <option value="#1565c0">Xanh dương</option>
                      <option value="#5d4037">Nâu</option>
                      <option value="#bdbdbd">Bê tông</option>
                    </select>
                  </label>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <label>Vật liệu (Texture):
                    <select value={roof.material?.type || 'concrete'} onChange={e => updateRoof(roof.id, { material: { type: e.target.value as any } })} style={{ width: '100%', padding: '4px', marginTop: '4px' }}>
                      <option value="concrete">Bê tông</option>
                      <option value="tile">Ngói</option>
                      <option value="metal">Tôn</option>
                    </select>
                  </label>
                </div>
                <button 
                  onClick={() => deleteRoof(roof.id)}
                  style={{ width: '100%', padding: '6px', background: '#fff', color: '#e53935', border: '1px solid #e53935', borderRadius: '4px', cursor: 'pointer', marginTop: '5px' }}
                >
                  Xóa Mái
                </button>
              </div>
            );
          })()}
        </div>
      );
    }
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
          <NumericInput value={wall.start.x} onChange={v => updateWall(wall.id, { start: { ...wall.start, x: v } })} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>{t("field.startZ")}</label>
          <NumericInput value={wall.start.z} onChange={v => updateWall(wall.id, { start: { ...wall.start, z: v } })} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>{t("field.endX")}</label>
          <NumericInput value={wall.end.x} onChange={v => updateWall(wall.id, { end: { ...wall.end, x: v } })} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>{t("field.endZ")}</label>
          <NumericInput value={wall.end.z} onChange={v => updateWall(wall.id, { end: { ...wall.end, z: v } })} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>{t("field.thickness")}</label>
          <NumericInput value={wall.thickness} onChange={v => updateWall(wall.id, { thickness: v })} allowNegative={false} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>{t("field.height")}</label>
          <NumericInput value={wall.height} onChange={v => updateWall(wall.id, { height: v })} allowNegative={false} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
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
        <TransformPanel items={selectedItems} />
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
        <TransformPanel items={selectedItems} />
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
          <NumericInput value={opening.offsetFromStart} onChange={v => updateOpening(opening.id, { offsetFromStart: v })} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>{t("field.width")}</label>
          <NumericInput value={opening.width} onChange={v => updateOpening(opening.id, { width: v })} allowNegative={false} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>{t("field.height")}</label>
          <NumericInput value={opening.height} onChange={v => updateOpening(opening.id, { height: v })} allowNegative={false} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>{t("field.sillHeight")}</label>
          <NumericInput value={opening.sillHeight} onChange={v => updateOpening(opening.id, { sillHeight: v })} allowNegative={false} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
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
              <NumericInput value={opening.swingAngle || 90} onChange={v => updateOpening(opening.id, { swingAngle: v })} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
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

  if (selectedObjectType === 'structure') {
    const structure = project.structures?.find(s => s.id === selectedObjectId);
    if (!structure) return null;

    if (structure.type === 'fence') {
      return (
        <div style={{ padding: '15px', fontSize: '13px', boxSizing: 'border-box', width: '100%', color: theme.textPrimary }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Hàng rào</h3>
          <p style={{ marginBottom: '10px' }}><strong>ID:</strong> {structure.id}</p>
          <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
            <label style={{ marginBottom: '4px', fontWeight: '500' }}>Chiều cao (m)</label>
            <NumericInput value={structure.height} onChange={v => updateStructure(structure.id, { height: v })} allowNegative={false} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
          </div>
          <button onClick={() => {
            deleteStructure(structure.id);
            useUIStore.getState().setSelectedObject(null, null);
          }} style={{ width: '100%', padding: '8px', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            Xóa Hàng rào
          </button>
        </div>
      );
    }

    return (
      <div style={{ padding: '15px', fontSize: '13px', boxSizing: 'border-box', width: '100%', color: theme.textPrimary }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px' }}>
          {structure.type === 'stairs' ? 'Bậc tam cấp' : structure.type === 'patio' ? 'Sân bê tông' : structure.type === 'sideKitchen' ? 'Bếp hông' : 'Gara'}
        </h3>
        <p style={{ marginBottom: '10px' }}><strong>ID:</strong> {structure.id}</p>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>Tọa độ X (m)</label>
          <NumericInput value={structure.position.x} onChange={v => updateStructure(structure.id, { position: { ...structure.position, x: v } })} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>Tọa độ Z (m)</label>
          <NumericInput value={structure.position.z} onChange={v => updateStructure(structure.id, { position: { ...structure.position, z: v } })} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>Chiều rộng (m)</label>
          <NumericInput value={structure.dimensions.width} onChange={v => updateStructure(structure.id, { dimensions: { ...structure.dimensions, width: v } })} allowNegative={false} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>Chiều sâu (m)</label>
          <NumericInput value={structure.dimensions.depth} onChange={v => updateStructure(structure.id, { dimensions: { ...structure.dimensions, depth: v } })} allowNegative={false} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>Chiều cao (m)</label>
          <NumericInput value={structure.dimensions.height} onChange={v => updateStructure(structure.id, { dimensions: { ...structure.dimensions, height: v } })} allowNegative={false} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        {structure.type === 'stairs' && (
          <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
            <label style={{ marginBottom: '4px', fontWeight: '500' }}>Số bậc</label>
            <NumericInput value={structure.stepCount || 3} onChange={v => updateStructure(structure.id, { stepCount: Math.round(v) })} allowNegative={false} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
          </div>
        )}
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>Góc xoay (Độ)</label>
          <NumericInput value={structure.rotation || 0} onChange={v => updateStructure(structure.id, { rotation: v })} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <TransformPanel items={selectedItems} />
        <button onClick={() => {
          deleteStructure(structure.id);
          useUIStore.getState().setSelectedObject(null, null);
          useUIStore.getState().setSelectedItems([]);
        }} style={{ width: '100%', padding: '8px', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          Xóa
        </button>
      </div>
    );
  }

  if (selectedObjectType === 'asset') {
    const asset = project.placedAssets?.find(a => a.id === selectedObjectId);
    const updatePlacedAsset = useProjectStore.getState().updatePlacedAsset;
    const deletePlacedAsset = useProjectStore.getState().deletePlacedAsset;

    if (!asset) return null;
    const assetDef = getAssetDefinition(asset.assetId);
    const baseW = assetDef?.defaultSize.width || 1;
    const baseH = assetDef?.defaultSize.height || 1;
    const baseD = assetDef?.defaultSize.depth || 1;
    
    const w = (asset.scale?.x || 1) * baseW;
    const h = (asset.scale?.y || 1) * baseH;
    const d = (asset.scale?.z || 1) * baseD;

    return (
      <div style={{ padding: '15px', fontSize: '13px', boxSizing: 'border-box', width: '100%', color: theme.textPrimary }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Nội thất / Asset</h3>
        <p style={{ marginBottom: '10px' }}><strong>Tên:</strong> {assetDef?.name}</p>
        <p style={{ marginBottom: '10px' }}><strong>ID:</strong> {asset.id}</p>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>Tọa độ X (m)</label>
          <NumericInput value={asset.position.x} onChange={v => updatePlacedAsset(asset.id, { position: { ...asset.position, x: v } })} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>Tọa độ Z (m)</label>
          <NumericInput value={asset.position.z} onChange={v => updatePlacedAsset(asset.id, { position: { ...asset.position, z: v } })} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>Chiều rộng (m)</label>
          <NumericInput value={w} onChange={v => updatePlacedAsset(asset.id, { scale: { ...asset.scale, x: v / baseW, y: asset.scale?.y || 1, z: asset.scale?.z || 1 } })} allowNegative={false} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>Chiều sâu (m)</label>
          <NumericInput value={d} onChange={v => updatePlacedAsset(asset.id, { scale: { ...asset.scale, x: asset.scale?.x || 1, y: asset.scale?.y || 1, z: v / baseD } })} allowNegative={false} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>Chiều cao (m)</label>
          <NumericInput value={h} onChange={v => updatePlacedAsset(asset.id, { scale: { ...asset.scale, x: asset.scale?.x || 1, y: v / baseH, z: asset.scale?.z || 1 } })} allowNegative={false} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>Góc xoay (Độ)</label>
          <NumericInput value={asset.rotation || 0} onChange={v => updatePlacedAsset(asset.id, { rotation: v })} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px' }} />
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>Màu sắc (Color)</label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input type="color" value={asset.materialOverride?.color || '#cccccc'} onChange={e => updatePlacedAsset(asset.id, { materialOverride: { ...asset.materialOverride, color: e.target.value } })} style={{ cursor: 'pointer', padding: '0', border: 'none', width: '40px', height: '30px', borderRadius: '4px' }} />
            <button onClick={() => updatePlacedAsset(asset.id, { materialOverride: { ...asset.materialOverride, color: undefined } })} style={{ padding: '5px 10px', fontSize: '12px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px', background: theme.toolbarBg, color: theme.textPrimary }}>Bỏ màu</button>
          </div>
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>Ảnh bề mặt (Texture URL)</label>
          <input type="text" placeholder="https://..." value={asset.materialOverride?.textureUrl || ''} onChange={e => updatePlacedAsset(asset.id, { materialOverride: { ...asset.materialOverride, textureUrl: e.target.value } })} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px', background: theme.toolbarBg, color: theme.textPrimary }} />
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>Độ nhám (Roughness): {asset.materialOverride?.roughness !== undefined ? asset.materialOverride.roughness : 0.8}</label>
          <input type="range" min="0" max="1" step="0.05" value={asset.materialOverride?.roughness !== undefined ? asset.materialOverride.roughness : 0.8} onChange={e => updatePlacedAsset(asset.id, { materialOverride: { ...asset.materialOverride, roughness: parseFloat(e.target.value) } })} />
        </div>
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>Độ bóng kim loại (Metalness): {asset.materialOverride?.metalness !== undefined ? asset.materialOverride.metalness : 0.1}</label>
          <input type="range" min="0" max="1" step="0.05" value={asset.materialOverride?.metalness !== undefined ? asset.materialOverride.metalness : 0.1} onChange={e => updatePlacedAsset(asset.id, { materialOverride: { ...asset.materialOverride, metalness: parseFloat(e.target.value) } })} />
        </div>
        <TransformPanel items={selectedItems} />
        <button onClick={() => {
          deletePlacedAsset(asset.id);
          useUIStore.getState().setSelectedObject(null, null);
          useUIStore.getState().setSelectedItems([]);
        }} style={{ width: '100%', padding: '8px', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
          Xóa
        </button>
      </div>
    );
  }

  if (selectedObjectType === 'aiRegion') {
    const region = project.aiRequests?.find(r => r.id === selectedObjectId);
    if (!region) return null;

    const updateReq = (updates: Partial<typeof region>) => {
      // Find index and update
      const newReqs = [...(project.aiRequests || [])];
      const idx = newReqs.findIndex(r => r.id === region.id);
      if (idx !== -1) {
        newReqs[idx] = { ...newReqs[idx], ...updates };
        useProjectStore.setState({ data: { ...project, aiRequests: newReqs } });
      }
    };

    const deleteReq = () => {
      const newReqs = project.aiRequests?.filter(r => r.id !== region.id) || [];
      useProjectStore.setState({ data: { ...project, aiRequests: newReqs } });
      useUIStore.getState().setSelectedObject(null, null);
    };

    return (
      <div style={{ padding: '15px', fontSize: '13px', boxSizing: 'border-box', width: '100%', color: theme.textPrimary }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px' }}>AI Region</h3>
        <p style={{ marginBottom: '10px' }}><strong>ID:</strong> {region.id}</p>
        
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>Hạng mục (Category)</label>
          <input type="text" value={region.category} onChange={e => updateReq({ category: e.target.value })} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px', background: theme.toolbarBg, color: theme.textPrimary }} />
        </div>

        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>Hình ảnh (Data URL)</label>
          {region.imageDataUrl ? (
            <img src={region.imageDataUrl} alt="AI Reference" style={{ width: '100%', height: 'auto', borderRadius: '4px', marginBottom: '5px' }} />
          ) : (
            <p style={{ margin: 0, color: theme.textSecondary, fontStyle: 'italic' }}>Chưa có hình ảnh</p>
          )}
          <input type="text" placeholder="Dán link ảnh / base64..." value={region.imageDataUrl || ''} onChange={e => updateReq({ imageDataUrl: e.target.value })} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px', background: theme.toolbarBg, color: theme.textPrimary }} />
        </div>

        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column' }}>
          <label style={{ marginBottom: '4px', fontWeight: '500' }}>Yêu cầu thêm (Prompt)</label>
          <textarea value={region.prompt || ''} onChange={e => updateReq({ prompt: e.target.value })} style={{ padding: '5px', boxSizing: 'border-box', width: '100%', border: '1px solid #ccc', borderRadius: '4px', background: theme.toolbarBg, color: theme.textPrimary, resize: 'vertical', minHeight: '60px', fontFamily: theme.fontFamily }} />
        </div>

        <button onClick={deleteReq} style={{ width: '100%', padding: '8px', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' }}>
          Xóa AI Region
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
