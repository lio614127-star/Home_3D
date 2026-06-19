import React, { useState } from 'react';
import { useUIStore } from '../../store/useUIStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useTheme } from '../../theme/tokens';
import { SelectedItem } from '../../types';
import { NumericInput } from './NumericInput';

export const TransformPanel: React.FC<{ items: SelectedItem[] }> = ({ items }) => {
  const theme = useTheme();
  const [dx, setDx] = useState<number>(0);
  const [dz, setDz] = useState<number>(0);
  const [angle, setAngle] = useState<number>(90);

  const handleMove = () => {
    if (dx === 0 && dz === 0) return;
    useProjectStore.getState().translateSelection(items, dx, dz);
    setDx(0);
    setDz(0);
  };

  const handleRotate = () => {
    if (angle === 0) return;
    useProjectStore.getState().rotateSelection(items, angle);
  };

  const handleDuplicate = () => {
    useProjectStore.getState().commitHistory();
    const newSelection = useProjectStore.getState().duplicateSelection(items);
    if (newSelection.length > 0) {
      useUIStore.getState().setSelectedItems(newSelection);
    }
  };

  const handleAlign = (type: 'left'|'right'|'top'|'bottom'|'centerX'|'centerZ') => {
    useProjectStore.getState().commitHistory();
    useProjectStore.getState().alignSelection(items, type);
  };

  const handleDistribute = (type: 'horizontal'|'vertical') => {
    useProjectStore.getState().commitHistory();
    useProjectStore.getState().distributeSelection(items, type);
  };

  const handleMirror = (axis: 'horizontal'|'vertical') => {
    useProjectStore.getState().commitHistory();
    useProjectStore.getState().mirrorSelection(items, axis);
  };

  const handleGroupBuilding = () => {
    useProjectStore.getState().commitHistory();
    useProjectStore.getState().createBuildingFromSelection(items);
    useUIStore.getState().setSelectedItems([]);
  };

  if (items.length === 0) return null;

  return (
    <div style={{ marginTop: '20px', borderTop: `1px solid ${theme.panelBorder}`, paddingTop: '15px' }}>
      <h3 style={{ marginTop: 0, marginBottom: '15px', color: theme.textPrimary }}>Biến đổi (Transform)</h3>
      
      <div style={{ marginBottom: '15px', padding: '10px', background: theme.toolbarBg, borderRadius: '4px' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', color: theme.textSecondary }}>Di chuyển (Move)</h4>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <span style={{ fontSize: '11px', marginBottom: '4px' }}>Delta X (m)</span>
            <NumericInput value={dx} onChange={setDx} style={{ padding: '4px', width: '100%', boxSizing: 'border-box', color: '#000' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <span style={{ fontSize: '11px', marginBottom: '4px' }}>Delta Z (m)</span>
            <NumericInput value={dz} onChange={setDz} style={{ padding: '4px', width: '100%', boxSizing: 'border-box', color: '#000' }} />
          </label>
        </div>
        <button onClick={handleMove} style={{ width: '100%', padding: '6px', background: theme.accent, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Áp dụng Di chuyển
        </button>
      </div>

      <div style={{ padding: '10px', background: theme.toolbarBg, borderRadius: '4px' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', color: theme.textSecondary }}>Xoay (Rotate)</h4>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <span style={{ fontSize: '11px', marginBottom: '4px' }}>Góc xoay (Độ)</span>
            <NumericInput value={angle} onChange={setAngle} style={{ padding: '4px', width: '100%', boxSizing: 'border-box', color: '#000' }} />
          </label>
        </div>
        <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
          <button onClick={() => { setAngle(90); useProjectStore.getState().rotateSelection(items, 90); }} style={{ flex: 1, padding: '4px', fontSize: '11px', cursor: 'pointer' }}>+90°</button>
          <button onClick={() => { setAngle(-90); useProjectStore.getState().rotateSelection(items, -90); }} style={{ flex: 1, padding: '4px', fontSize: '11px', cursor: 'pointer' }}>-90°</button>
          <button onClick={() => { setAngle(45); useProjectStore.getState().rotateSelection(items, 45); }} style={{ flex: 1, padding: '4px', fontSize: '11px', cursor: 'pointer' }}>+45°</button>
        </div>
        <button onClick={handleRotate} style={{ width: '100%', padding: '6px', background: theme.accent, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Áp dụng Xoay
        </button>
      </div>

      <div style={{ padding: '10px', background: theme.toolbarBg, borderRadius: '4px', marginTop: '15px' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', color: theme.textSecondary }}>Hành động</h4>
        <button onClick={handleDuplicate} style={{ width: '100%', padding: '6px', background: '#e0e0e0', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '10px' }}>
          Nhân bản (Ctrl+D)
        </button>
        <div style={{ display: 'flex', gap: '5px' }}>
          <button onClick={() => handleMirror('horizontal')} style={{ flex: 1, padding: '4px', fontSize: '11px', cursor: 'pointer' }}>Mirror Ngang</button>
          <button onClick={() => handleMirror('vertical')} style={{ flex: 1, padding: '4px', fontSize: '11px', cursor: 'pointer' }}>Mirror Dọc</button>
        </div>
        {items.length > 1 && !items.some(i => i.type === 'building') && (
          <button onClick={handleGroupBuilding} style={{ width: '100%', marginTop: '10px', padding: '6px', background: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Gộp thành Tòa nhà (Building)
          </button>
        )}
      </div>

      {items.length >= 2 && (
        <div style={{ padding: '10px', background: theme.toolbarBg, borderRadius: '4px', marginTop: '15px' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', color: theme.textSecondary }}>Căn lề (Align)</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px' }}>
            <button onClick={() => handleAlign('left')} style={{ padding: '4px', fontSize: '11px', cursor: 'pointer' }}>Trái</button>
            <button onClick={() => handleAlign('centerX')} style={{ padding: '4px', fontSize: '11px', cursor: 'pointer' }}>Giữa X</button>
            <button onClick={() => handleAlign('right')} style={{ padding: '4px', fontSize: '11px', cursor: 'pointer' }}>Phải</button>
            <button onClick={() => handleAlign('top')} style={{ padding: '4px', fontSize: '11px', cursor: 'pointer' }}>Trên</button>
            <button onClick={() => handleAlign('centerZ')} style={{ padding: '4px', fontSize: '11px', cursor: 'pointer' }}>Giữa Z</button>
            <button onClick={() => handleAlign('bottom')} style={{ padding: '4px', fontSize: '11px', cursor: 'pointer' }}>Dưới</button>
          </div>
        </div>
      )}

      {items.length >= 3 && (
        <div style={{ padding: '10px', background: theme.toolbarBg, borderRadius: '4px', marginTop: '15px' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', color: theme.textSecondary }}>Phân bổ (Distribute)</h4>
          <div style={{ display: 'flex', gap: '5px' }}>
            <button onClick={() => handleDistribute('horizontal')} style={{ flex: 1, padding: '4px', fontSize: '11px', cursor: 'pointer' }}>Ngang</button>
            <button onClick={() => handleDistribute('vertical')} style={{ flex: 1, padding: '4px', fontSize: '11px', cursor: 'pointer' }}>Dọc</button>
          </div>
        </div>
      )}
    </div>
  );
};
