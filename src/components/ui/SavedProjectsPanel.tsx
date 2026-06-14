import React, { useState } from 'react';
import { useSavedProjectsStore } from '../../store/useSavedProjectsStore';
import { useProjectStore } from '../../store/useProjectStore';
import { createDefaultProject } from '../../core/project/createDefaultProject';
import { useTheme } from '../../theme/tokens';

export const SavedProjectsPanel: React.FC = () => {
  const { projects, currentProjectId, createProject, switchProject, renameProject, deleteProject } = useSavedProjectsStore();
  const setProject = useProjectStore(state => state.setProject);
  const theme = useTheme();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleNew = () => {
    const data = createDefaultProject();
    createProject('Sơ đồ mới ' + (projects.length + 1), data);
    setProject(data);
  };

  const handleSwitch = (id: string) => {
    if (id === currentProjectId) return;
    const p = switchProject(id);
    if (p) setProject(p.data);
  };

  const startEdit = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    setEditingId(id);
    setEditName(name);
  };

  const saveEdit = (id: string) => {
    if (editName.trim()) {
      renameProject(id, editName.trim());
    }
    setEditingId(null);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Bạn có chắc muốn xóa sơ đồ này?')) {
      deleteProject(id);
      if (id === currentProjectId) {
         const remaining = useSavedProjectsStore.getState().projects;
         if (remaining.length > 0) {
            handleSwitch(remaining[0].id);
         } else {
            handleNew();
         }
      }
    }
  };

  return (
    <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <button 
        onClick={handleNew}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          padding: '8px', background: theme.accent, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
        }}
      >
        + Thêm sơ đồ mới
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '10px' }}>
        {projects.length === 0 && (
          <div style={{ fontSize: '12px', color: theme.textSecondary, textAlign: 'center', fontStyle: 'italic' }}>
            Chưa có sơ đồ nào được lưu.
          </div>
        )}
        
        {projects.map(p => {
          const isActive = p.id === currentProjectId;
          return (
            <div 
              key={p.id}
              onClick={() => handleSwitch(p.id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 10px', background: isActive ? theme.selectionFill : theme.appBg,
                border: `1px solid ${isActive ? theme.accent : theme.panelBorder}`,
                borderRadius: '4px', cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, overflow: 'hidden' }}>
                <span style={{ fontSize: '14px', color: isActive ? theme.accent : theme.textSecondary }}>📄</span>
                {editingId === p.id ? (
                  <input 
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onBlur={() => saveEdit(p.id)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(p.id); if (e.key === 'Escape') setEditingId(null); }}
                    onClick={e => e.stopPropagation()}
                    style={{ flex: 1, minWidth: 0, padding: '2px 4px', fontSize: '12px' }}
                  />
                ) : (
                  <span style={{ color: isActive ? theme.textPrimary : theme.textSecondary, fontWeight: isActive ? 'bold' : 'normal', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '13px' }}>
                    {p.name}
                  </span>
                )}
              </div>
              {!editingId && (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={(e) => startEdit(e, p.id, p.name)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: theme.textSecondary, fontSize: '12px' }} title="Đổi tên">
                    ✏️
                  </button>
                  <button onClick={(e) => handleDelete(e, p.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: '#f44336', fontSize: '12px' }} title="Xóa">
                    🗑️
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
