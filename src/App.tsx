import React, { useEffect } from 'react';
import { Canvas2D } from './components/editor/Canvas2D';
import { Toolbar } from './components/ui/Toolbar';
import { PropertiesPanel } from './components/ui/PropertiesPanel';
import { ValidationPanel } from './components/ui/ValidationPanel';
import { SavedProjectsPanel } from './components/ui/SavedProjectsPanel';
import { AIAssistantPanel } from './components/ui/AIAssistantPanel';
import { useI18nStore } from './store/useI18nStore';
import { useProjectStore } from './store/useProjectStore';
import { useUIStore } from './store/useUIStore';
import { useSavedProjectsStore } from './store/useSavedProjectsStore';
import { ProjectValidator } from './core/validator/ProjectValidator';
import { Scene3D } from './components/scene3d/Scene3D';
import { AssetCatalogPanel } from './components/ui/AssetCatalogPanel';
import { useTheme } from './theme/tokens';

function App() {
  const { t } = useI18nStore();
  const project = useProjectStore(state => state.data);
  const setValidationIssues = useUIStore(state => state.setValidationIssues);
  const { selectedObjectId, selectedObjectType, setSelectedObject, viewMode, leftSidebarMode } = useUIStore();
  const deleteWall = useProjectStore(state => state.deleteWall);
  const deleteArea = useProjectStore(state => state.deleteArea);
  const deleteOpening = useProjectStore(state => state.deleteOpening);

  const theme = useTheme();

  // Sync with SavedProjectsStore
  useEffect(() => {
    const unsub = useProjectStore.subscribe((state) => {
      useSavedProjectsStore.getState().saveCurrentProject(state.data);
    });
    
    const savedStore = useSavedProjectsStore.getState();
    if (savedStore.projects.length === 0) {
      savedStore.saveCurrentProject(useProjectStore.getState().data);
    } else if (!savedStore.currentProjectId) {
      savedStore.switchProject(savedStore.projects[0].id);
      useProjectStore.getState().setProject(savedStore.projects[0].data);
    }

    // Cleanup any lingering 1-point fences from state
    const invalidFences = useProjectStore.getState().data.structures?.filter(
      s => s.type === 'fence' && s.path && s.path.length < 2
    );
    if (invalidFences && invalidFences.length > 0) {
      invalidFences.forEach(s => useProjectStore.getState().deleteStructure(s.id));
    }

    return unsub;
  }, []);

  // Realtime validation effect
  useEffect(() => {
    const result = ProjectValidator.validate(project);
    setValidationIssues(result.issues);
  }, [project, setValidationIssues]);

  // Expose store to window for easy DevTools testing
  useEffect(() => {
    (window as any).useProjectStore = useProjectStore;
  }, []);

  // Keyboard shortcut for Delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedObjectId && selectedObjectType) {
        if (selectedObjectType === 'wall') {
          deleteWall(selectedObjectId);
        } else if (selectedObjectType === 'area') {
          deleteArea(selectedObjectId);
        } else if (selectedObjectType === 'opening') {
          deleteOpening(selectedObjectId);
        } else if (selectedObjectType === 'structure') {
          useProjectStore.getState().deleteStructure(selectedObjectId);
        } else if (selectedObjectType === 'aiRegion') {
          useProjectStore.getState().deleteAIRequest(selectedObjectId);
        }
        setSelectedObject(null, null);
        useUIStore.getState().setSelectedItems([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedObjectId, selectedObjectType, deleteWall, deleteArea, deleteOpening, setSelectedObject]);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif', background: theme.appBg, color: theme.textPrimary }}>
      <header style={{ padding: '15px', background: theme.headerBg, color: theme.headerText, fontWeight: 'bold' }}>
        {t("app.title")}
      </header>
      <Toolbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <aside style={{ minWidth: '280px', width: '280px', flexShrink: 0, background: theme.panelBg, borderRight: `1px solid ${theme.panelBorder}`, display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
          <div style={{ padding: '10px', background: theme.toolbarBg, borderBottom: `1px solid ${theme.panelBorder}` }}>
            <h3 style={{ margin: 0, color: theme.textPrimary }}>
              {leftSidebarMode === 'assets' ? 'Thư viện nội thất' : t("panel.properties")}
            </h3>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            {leftSidebarMode === 'assets' ? (
              <AssetCatalogPanel onClose={() => useUIStore.getState().setLeftSidebarMode('properties')} />
            ) : (
              <PropertiesPanel />
            )}
          </div>
        </aside>
        
        <main style={{ 
          flex: 1, 
          display: 'grid',
          gridTemplateColumns: viewMode === 'split' ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'minmax(0, 1fr)',
          overflow: 'hidden',
          backgroundColor: theme.canvasBg
        }}>
          <div style={{ 
            display: viewMode === '3d' ? 'none' : 'block',
            position: 'relative', 
            borderRight: viewMode === 'split' ? `2px solid ${theme.panelBorder}` : 'none',
            minWidth: 0,
            height: '100%'
          }}>
            <Canvas2D />
          </div>
          <div style={{ 
            display: viewMode === '2d' ? 'none' : 'block',
            position: 'relative',
            minWidth: 0,
            height: '100%'
          }}>
            <Scene3D />
          </div>
        </main>
        
        <AIAssistantPanel />
        
        <aside style={{ width: '300px', background: theme.panelBg, borderLeft: `1px solid ${theme.panelBorder}`, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px', background: theme.toolbarBg, borderBottom: `1px solid ${theme.panelBorder}` }}>
            <h3 style={{ margin: 0, color: theme.textPrimary }}>{t("panel.validation")}</h3>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <ValidationPanel />
          </div>
          
          <div style={{ padding: '10px', background: theme.toolbarBg, borderTop: `1px solid ${theme.panelBorder}`, borderBottom: `1px solid ${theme.panelBorder}` }}>
            <h3 style={{ margin: 0, color: theme.textPrimary }}>Dự án đã lưu</h3>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <SavedProjectsPanel />
          </div>
        </aside>
      </div>
    </div>
  );
}

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return <div style={{padding: 50, background: 'red', color: 'white', fontSize: 20}}>
        <h1>Runtime Error</h1>
        <pre>{this.state.error?.message}</pre>
        <pre>{this.state.error?.stack}</pre>
      </div>;
    }
    return this.props.children;
  }
}

function AppWrapper() {
  return <ErrorBoundary><App /></ErrorBoundary>;
}

export default AppWrapper;
