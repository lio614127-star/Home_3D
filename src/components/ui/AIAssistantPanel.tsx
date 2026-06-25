import React, { useState, useEffect } from 'react';
import { useAIStore } from '../../store/useAIStore';
import { useProjectStore } from '../../store/useProjectStore';
import { useTheme } from '../../theme/tokens';
import { AI_CATEGORIES } from '../../core/ai/categories';
import { MockAIAnalyzer } from '../../core/ai/MockAIAnalyzer';
import { GeminiVisionAnalyzer } from '../../core/ai/GeminiVisionAnalyzer';
import { DesignAdapter } from '../../core/ai/DesignAdapter';
import { IAIDesignIntent } from '../../core/ai/types';
import { useAIDebugStore } from '../../store/useAIDebugStore';

// Initialize analyzer
const analyzer = import.meta.env.VITE_GEMINI_API_KEY 
  ? new GeminiVisionAnalyzer() 
  : new MockAIAnalyzer();

const XIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const CheckIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const UploadIcon = ({ size, style }: { size: number; style?: React.CSSProperties }) => (
  <svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="17 8 12 3 7 8"></polyline>
    <line x1="12" y1="3" x2="12" y2="15"></line>
  </svg>
);

export const AIAssistantPanel: React.FC = () => {
  const { isPanelOpen, setPanelOpen, selectedCategory, setSelectedCategory, currentImageBlob, setCurrentImageBlob, currentPrompt, setCurrentPrompt, resetRequestData } = useAIStore();
  const addAIRequest = useProjectStore(state => state.addAIRequest);
  const project = useProjectStore(state => state.data);
  const theme = useTheme();

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Architecture: true,
    Exterior: false,
    Interior: false,
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentIntent, setCurrentIntent] = useState<IAIDesignIntent | null>(null);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);

  // Global paste handler
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // If we are typing in an input, don't hijack unless it's not text
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        // Only hijack if there is an image in clipboard
        const hasImage = Array.from(e.clipboardData?.items || []).some(item => item.type.startsWith('image/'));
        if (!hasImage) return;
      }

      if (e.clipboardData && e.clipboardData.items) {
        for (let i = 0; i < e.clipboardData.items.length; i++) {
          const item = e.clipboardData.items[i];
          if (item.type.indexOf('image') !== -1) {
            const file = item.getAsFile();
            if (file) {
              const reader = new FileReader();
              reader.onload = (event) => {
                if (event.target?.result) {
                  setCurrentImageBlob(event.target.result as string);
                  if (!isPanelOpen) setPanelOpen(true);
                }
              };
              reader.readAsDataURL(file);
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [setCurrentImageBlob, setPanelOpen, isPanelOpen]);

  if (!isPanelOpen) return null;

  const handleAnalyzeImage = async () => {
    if (!selectedCategory || !currentImageBlob) {
      alert("Vui lòng chọn Hạng mục và cung cấp hình ảnh (paste) trước khi phân tích.");
      return;
    }

    setIsAnalyzing(true);
    setCurrentIntent(null);

    try {
      // 1. Save Request
      const reqId = crypto.randomUUID();
      setCurrentRequestId(reqId);
      
      useProjectStore.getState().addAIRequest({
        id: reqId,
        type: 'asset',
        category: selectedCategory,
        imageDataUrl: currentImageBlob,
        prompt: currentPrompt,
        status: 'pending'
      });

      const req = useProjectStore.getState().data.aiRequests.find(r => r.id === reqId);
      
      // 2. AI Analysis
      if (req) {
        const intent = await analyzer.analyze(req);
        setCurrentIntent(intent);
        
        // Save to Debug Store
        if (intent.target === 'roof' && intent.parameters?.geometryParameters?.segments) {
          useAIDebugStore.getState().setDebugData(intent, intent.parameters.geometryParameters.segments);
        } else {
          useAIDebugStore.getState().setDebugData(intent, []);
        }

        // Update request with intent
        useProjectStore.getState().updateAIRequest(reqId, {
          intent: intent
        });
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi: " + (err as Error).message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApply = () => {
    if (currentIntent && currentRequestId) {
      DesignAdapter.applyIntent(currentIntent, project);
      useProjectStore.getState().updateAIRequest(currentRequestId, {
        status: 'applied'
      });
      alert("Đã áp dụng vào bản vẽ thành công!");
      resetRequestData();
      setCurrentIntent(null);
      setCurrentRequestId(null);
      setPanelOpen(false);
    }
  };

  const groups = ['Architecture', 'Exterior', 'Interior'] as const;

  return (
    <div style={{
      width: '320px',
      background: theme.panelBg,
      borderLeft: `1px solid ${theme.panelBorder}`,
      display: 'flex',
      flexDirection: 'column',
      color: theme.textPrimary,
      boxShadow: '-2px 0 10px rgba(0,0,0,0.1)',
      zIndex: 10
    }}>
      <div style={{ padding: '15px', borderBottom: `1px solid ${theme.panelBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>AI Design Assistant</h3>
        <button onClick={() => setPanelOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textPrimary, display: 'flex', alignItems: 'center' }}>
          <XIcon size={20} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
        {/* Category Selection */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: theme.textSecondary }}>Hạng mục thiết kế</h4>
          {groups.map(group => (
            <div key={group} style={{ marginBottom: '10px' }}>
              <div 
                style={{ padding: '8px', background: theme.toolbarBg, borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}
                onClick={() => setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }))}
              >
                {group === 'Architecture' ? 'Kiến trúc' : group === 'Exterior' ? 'Ngoại thất' : 'Nội thất'}
                <span>{expandedGroups[group] ? '▼' : '▶'}</span>
              </div>
              {expandedGroups[group] && (
                <div style={{ padding: '5px 0 5px 10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {AI_CATEGORIES.filter(c => c.group === group).map(cat => (
                    <div 
                      key={cat.id} 
                      onClick={() => setSelectedCategory(cat.id)}
                      style={{ 
                        padding: '6px 10px', 
                        cursor: 'pointer', 
                        borderRadius: '4px',
                        background: selectedCategory === cat.id ? theme.accent + '33' : 'transparent',
                        color: selectedCategory === cat.id ? theme.accent : theme.textPrimary,
                        border: `1px solid ${selectedCategory === cat.id ? theme.accent : 'transparent'}`,
                        display: 'flex',
                        justifyContent: 'space-between'
                      }}
                    >
                      {cat.name}
                      {selectedCategory === cat.id && <CheckIcon size={16} />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: theme.textSecondary }}>Hình ảnh tham khảo</h4>
          <div style={{ 
            width: '100%', 
            minHeight: '150px', 
            border: `2px dashed ${currentImageBlob ? theme.accent : theme.panelBorder}`, 
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: currentImageBlob ? '#000' : theme.canvasBg,
            position: 'relative',
            overflow: 'hidden'
          }}>
            {currentImageBlob ? (
              <img src={currentImageBlob} alt="AI Reference" style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }} />
            ) : (
              <div style={{ textAlign: 'center', color: theme.textSecondary, padding: '20px' }}>
                <UploadIcon size={24} style={{ marginBottom: '10px' }} />
                <p style={{ margin: 0, fontSize: '12px' }}>Chụp ảnh màn hình (Win+Shift+S) và Paste (Ctrl+V) vào đây</p>
              </div>
            )}
            {currentImageBlob && (
              <button 
                onClick={() => setCurrentImageBlob(null)}
                style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <XIcon size={14} />
              </button>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: theme.textSecondary }}>Yêu cầu thêm (Prompt)</h4>
          <textarea 
            value={currentPrompt}
            onChange={(e) => setCurrentPrompt(e.target.value)}
            placeholder="VD: Mái ngói nâu, nhà cấp 4 phong cách Nhật..."
            style={{ 
              width: '100%', 
              height: '80px', 
              padding: '10px', 
              boxSizing: 'border-box', 
              borderRadius: '4px', 
              border: `1px solid ${theme.panelBorder}`,
              background: theme.canvasBg,
              color: theme.textPrimary,
              resize: 'vertical'
            }}
          />
        </div>

      </div>

      <div style={{ padding: '15px', borderTop: `1px solid ${theme.panelBorder}` }}>
        {!currentIntent && !isAnalyzing && (
          <button 
            onClick={handleAnalyzeImage}
            style={{ 
              width: '100%', 
              padding: '12px', 
              background: theme.accent, 
              color: '#fff', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: 'pointer', 
              fontWeight: 'bold',
              fontSize: '14px',
              opacity: (!selectedCategory || !currentImageBlob) ? 0.5 : 1
            }}
            disabled={!selectedCategory || !currentImageBlob}
          >
            Phân tích AI
          </button>
        )}

        {isAnalyzing && (
          <div style={{ textAlign: 'center', padding: '20px', color: theme.accent, fontWeight: 'bold' }}>
            <div style={{ marginBottom: '10px' }}>Đang phân tích kiến trúc...</div>
            <div style={{ fontSize: '12px', color: theme.textSecondary }}>Quá trình này có thể mất vài giây</div>
          </div>
        )}

        {currentIntent && !isAnalyzing && (
          <div style={{ background: theme.canvasBg, padding: '15px', borderRadius: '8px', border: `1px solid ${theme.panelBorder}`, marginBottom: '10px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: theme.textPrimary, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ padding: '2px 6px', background: theme.accent, color: '#fff', borderRadius: '4px', fontSize: '12px', textTransform: 'uppercase' }}>
                {currentIntent.target}
              </span>
              <span>AI Analysis</span>
            </h4>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', fontSize: '12px' }}>
              <span style={{ color: theme.textSecondary }}>Confidence</span>
              <div style={{ flex: 1, height: '6px', background: '#e0e0e0', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${currentIntent.confidence * 100}%`, height: '100%', background: currentIntent.confidence > 0.8 ? '#4caf50' : theme.accent }} />
              </div>
              <span style={{ fontWeight: 'bold' }}>{Math.round(currentIntent.confidence * 100)}%</span>
            </div>

            <div style={{ margin: '15px 0', borderTop: `1px solid ${theme.panelBorder}` }}></div>

            <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse', marginBottom: '15px' }}>
              <tbody>
                {Object.entries(currentIntent.parameters).map(([key, value]) => {
                  const isObject = typeof value === 'object';
                  return (
                    <React.Fragment key={key}>
                      <tr style={{ borderBottom: isObject ? 'none' : `1px solid ${theme.panelBorder}40` }}>
                        <td colSpan={isObject ? 2 : 1} style={{ padding: '6px 0', color: theme.textSecondary, textTransform: 'capitalize', paddingBottom: isObject ? '2px' : '6px' }}>{key}</td>
                        {!isObject && (
                          <td style={{ padding: '6px 0', fontWeight: '500', textAlign: 'right' }}>
                            {String(value)}
                          </td>
                        )}
                      </tr>
                      {isObject && (
                        <tr style={{ borderBottom: `1px solid ${theme.panelBorder}40` }}>
                          <td colSpan={2} style={{ padding: '0 0 10px 0' }}>
                            <div style={{
                              textAlign: 'left',
                              background: 'rgba(0,0,0,0.15)',
                              padding: '8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontFamily: 'monospace',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              maxHeight: '150px',
                              overflowY: 'auto',
                              width: '100%'
                            }}>
                              {JSON.stringify(value, null, 2)}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>

            <div style={{ margin: '15px 0', borderTop: `1px solid ${theme.panelBorder}` }}></div>

            <div style={{ fontSize: '12px', color: theme.textSecondary, marginBottom: '15px', fontStyle: 'italic' }}>
              "{currentIntent.summary}"
            </div>
            
            <button 
              onClick={handleApply}
              style={{ 
                width: '100%', 
                padding: '10px', 
                background: theme.accent, 
                color: '#fff', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: 'pointer', 
                fontWeight: 'bold'
              }}
            >
              Áp dụng
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
