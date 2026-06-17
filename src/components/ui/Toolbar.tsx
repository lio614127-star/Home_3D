import React from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { projectSerializer } from '../../core/project/projectSerializer';
import { createDefaultProject } from '../../core/project/createDefaultProject';
import { useUIStore } from '../../store/useUIStore';
import { useI18nStore } from '../../store/useI18nStore';
import { Language } from '../../i18n/types';
import { useTheme } from '../../theme/tokens';
import { useSavedProjectsStore } from '../../store/useSavedProjectsStore';

export const Toolbar: React.FC = () => {
  const project = useProjectStore(state => state.data);
  const setProject = useProjectStore(state => state.setProject);
  const deleteWall = useProjectStore(state => state.deleteWall);
  const deleteArea = useProjectStore(state => state.deleteArea);
  const deleteOpening = useProjectStore(state => state.deleteOpening);
  
  const { 
    mode, setMode, selectedObjectId, selectedObjectType, setSelectedObject, setValidationIssues,
    viewMode, setViewMode, show3DSite, show3DRooms, show3DWalls, show3DGrid, show3DOpenings, toggle3DLayer, cameraMode, setCameraMode,
    themeMode, toggleThemeMode
  } = useUIStore();
  
  const { t, language, setLanguage } = useI18nStore();
  const theme = useTheme();

  const handleExport = () => {
    const jsonStr = projectSerializer.serialize(project);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `garden_house_3d_${project.project.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const result = projectSerializer.deserialize(content);
      
      if (result.success && result.data) {
        // Import file as a new project
        const fileName = file.name.replace(/\.[^/.]+$/, "");
        useSavedProjectsStore.getState().createProject(fileName, result.data);
        
        setProject(result.data);
        setValidationIssues(result.issues || []);
        alert(t("validation.importSuccess"));
      } else {
        setValidationIssues(result.issues || []);
        alert(t("validation.importBlocked"));
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset
  };

  const handleNewProject = () => {
    if (window.confirm("Are you sure?")) {
      setProject(createDefaultProject());
      setSelectedObject(null, null);
    }
  };

  const handleDelete = () => {
    if (selectedObjectId && selectedObjectType) {
      if (selectedObjectType === 'wall') {
        deleteWall(selectedObjectId);
        setSelectedObject(null, null);
      } else if (selectedObjectType === 'area') {
        deleteArea(selectedObjectId);
        setSelectedObject(null, null);
      } else if (selectedObjectType === 'opening') {
        deleteOpening(selectedObjectId);
        setSelectedObject(null, null);
      } else if (selectedObjectType === 'dimension') {
        useProjectStore.getState().deleteAnnotation(selectedObjectId);
        setSelectedObject(null, null);
      }
    }
  };

  const btnStyle = (active: boolean) => ({
    padding: '3px 10px',
    background: active ? theme.accent : theme.panelBg,
    color: active ? '#fff' : theme.textPrimary,
    border: `1px solid ${theme.panelBorder}`,
    cursor: 'pointer',
    fontSize: '12px'
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', padding: '10px', background: theme.toolbarBg, borderBottom: `1px solid ${theme.panelBorder}`, color: theme.textPrimary }}>
      <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={handleNewProject} style={btnStyle(false)}>{t("toolbar.newProject")}</button>
        <div style={{ width: '1px', height: '15px', background: theme.panelBorder, margin: '0 5px' }}></div>
        <button onClick={() => setMode('select')} style={btnStyle(mode === 'select')}>{t("toolbar.select")}</button>
        <button onClick={() => setMode('addSite')} style={btnStyle(mode === 'addSite')}>Thêm khu đất</button>
        <button onClick={() => setMode('addWall')} style={btnStyle(mode === 'addWall')}>{t("toolbar.addWall")}</button>
        <button onClick={() => setMode('addArea')} style={btnStyle(mode === 'addArea')}>{t("tool.addArea")}</button>
        <button onClick={() => setMode('addDoor')} style={btnStyle(mode === 'addDoor')}>{t("tool.addDoor")}</button>
        <button onClick={() => setMode('addWindow')} style={btnStyle(mode === 'addWindow')}>{t("tool.addWindow")}</button>
        <button onClick={() => setMode('measure')} style={btnStyle(mode === 'measure')}>Đo</button>
        <div style={{ width: '1px', height: '15px', background: theme.panelBorder, margin: '0 5px' }}></div>
        
        {/* Drafting Toggles */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer', fontSize: '12px' }}>
          <input type="checkbox" checked={useUIStore.getState().showGrid2D} onChange={(e) => useUIStore.getState().setDraftingToggle('showGrid2D', e.target.checked)} />
          {t("toolbar.showGrid") || "Lưới"}
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer', fontSize: '12px' }}>
          <input type="checkbox" checked={useUIStore.getState().snapToGrid} onChange={(e) => useUIStore.getState().setDraftingToggle('snapToGrid', e.target.checked)} />
          {t("toolbar.snapGrid") || "Snap Lưới"}
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer', fontSize: '12px' }}>
          <input type="checkbox" checked={useUIStore.getState().snapToPoints} onChange={(e) => useUIStore.getState().setDraftingToggle('snapToPoints', e.target.checked)} />
          {t("toolbar.snapPoints") || "Snap Điểm"}
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer', fontSize: '12px' }}>
          <input type="checkbox" checked={useUIStore.getState().orthoMode} onChange={(e) => useUIStore.getState().setDraftingToggle('orthoMode', e.target.checked)} />
          {t("toolbar.ortho") || "Ortho"}
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer', fontSize: '12px' }}>
          <input type="checkbox" checked={useUIStore.getState().showAlignmentGuides} onChange={(e) => useUIStore.getState().setDraftingToggle('showAlignmentGuides', e.target.checked)} />
          {t("toolbar.showAlignmentGuides") || "Guides"}
        </label>
        <div style={{ marginLeft: '10px', fontSize: '11px', color: theme.textSecondary, fontStyle: 'italic' }}>
          {t("status.gridScale") || "Grid 1m / 0.2m"}
        </div>
        
        <div style={{ width: '1px', height: '15px', background: theme.panelBorder, margin: '0 5px' }}></div>
        <button onClick={handleDelete} disabled={!selectedObjectId || (selectedObjectType !== 'wall' && selectedObjectType !== 'area' && selectedObjectType !== 'opening' && selectedObjectType !== 'dimension')} style={{ padding: '3px 10px', background: selectedObjectId && (selectedObjectType === 'wall' || selectedObjectType === 'area' || selectedObjectType === 'opening' || selectedObjectType === 'dimension') ? theme.danger : theme.panelBg, color: selectedObjectId ? '#fff' : theme.textSecondary, border: `1px solid ${theme.panelBorder}`, cursor: 'pointer', fontSize: '12px' }}>
          {t("toolbar.delete")}
        </button>
        <div style={{ width: '1px', height: '15px', background: theme.panelBorder, margin: '0 5px', marginLeft: 'auto' }}></div>
        <button onClick={handleExport} style={btnStyle(false)}>{t("toolbar.exportJson")}</button>
        <label style={btnStyle(false)}>
          {t("toolbar.importJson")}
          <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginLeft: '5px', fontSize: '12px' }}>
          <span>{t("toolbar.language")}: </span>
          <select value={language} onChange={(e) => setLanguage(e.target.value as Language)} style={{ padding: '2px', background: theme.panelBg, color: theme.textPrimary, border: `1px solid ${theme.panelBorder}` }}>
            <option value="vi">{t("toolbar.vietnamese")}</option>
            <option value="en">{t("toolbar.english")}</option>
          </select>
        </div>
        <div style={{ width: '1px', height: '15px', background: theme.panelBorder, margin: '0 5px' }}></div>
        <button onClick={toggleThemeMode} style={btnStyle(false)}>
          {t("toolbar.theme")}: {themeMode === 'light' ? t("toolbar.themeLight") : t("toolbar.themeDark")}
        </button>
      </div>
      
      <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => setViewMode('2d')} style={btnStyle(viewMode === '2d')}>{t("view.2d")}</button>
        <button onClick={() => setViewMode('3d')} style={btnStyle(viewMode === '3d')}>{t("view.3d")}</button>
        <button onClick={() => setViewMode('split')} style={btnStyle(viewMode === 'split')}>{t("view.split")}</button>
        
        {(viewMode === '3d' || viewMode === 'split') && (
          <>
            <div style={{ width: '1px', height: '15px', background: '#aaa', margin: '0 5px' }}></div>
            <button onClick={() => setCameraMode('perspective')} style={btnStyle(cameraMode === 'perspective')}>{t("view.perspective")}</button>
            <button onClick={() => setCameraMode('top')} style={btnStyle(cameraMode === 'top')}>{t("view.top")}</button>
            <div style={{ width: '1px', height: '15px', background: '#aaa', margin: '0 5px' }}></div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer', fontSize: '12px' }}>
              <input type="checkbox" checked={show3DSite} onChange={() => toggle3DLayer('site')} /> {t("layer.site")}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer', fontSize: '12px' }}>
              <input type="checkbox" checked={show3DWalls} onChange={() => toggle3DLayer('walls')} /> {t("layer.walls")}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer', fontSize: '12px' }}>
              <input type="checkbox" checked={show3DRooms} onChange={() => toggle3DLayer('areas')} /> {t("layer.areas")}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer', fontSize: '12px' }}>
              <input type="checkbox" checked={show3DGrid} onChange={() => toggle3DLayer('grid')} /> {t("layer.grid")}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer', fontSize: '12px' }}>
              <input type="checkbox" checked={show3DOpenings} onChange={() => toggle3DLayer('openings')} /> {t("layer.openings")}
            </label>
          </>
        )}
      </div>
    </div>
  );
};
