import { useUIStore } from '../store/useUIStore';

export type ThemeMode = 'light' | 'dark';

export interface ThemeTokens {
  appBg: string;
  panelBg: string;
  panelBorder: string;
  headerBg: string;
  headerText: string;
  toolbarBg: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  danger: string;
  canvasBg: string;
  gridFine: string;
  gridMinor: string;
  gridMajor: string;
  guideLine: string;
  selectionStroke: string;
  selectionFill: string;
  selectedStroke: string;
  siteFill: string;
  siteStroke: string;
  buildingFootprintStroke: string;
  roomFill: string;
  roomStroke: string;
  roomText: string;
  wallFill: string;
  wallStroke: string;
  dimensionStroke: string;
  dimensionText: string;
  // 3D Scene tokens
  scene3dBg: string;
  scene3dGridMajor: string;
  scene3dGridMinor: string;
  site3DFill: string;
  floor3DFill: string;
  wall3DFill: string;
  room3DFill: string;
  door3DColor: string;
  window3DColor: string;
  selected3DColor: string;
}

export const lightTheme: ThemeTokens = {
  appBg: '#ffffff',
  panelBg: '#fafafa',
  panelBorder: '#ccc',
  headerBg: '#004d40',
  headerText: '#ffffff',
  toolbarBg: '#e0e0e0',
  textPrimary: '#000000',
  textSecondary: '#666666',
  accent: '#00695c',
  danger: '#d32f2f',
  canvasBg: '#fdfdfd',
  gridFine: 'rgba(80, 80, 80, 0.06)',
  gridMinor: 'rgba(80, 80, 80, 0.12)',
  gridMajor: 'rgba(80, 80, 80, 0.28)',
  guideLine: '#1976d2',
  selectionStroke: '#1976d2',
  selectionFill: 'rgba(25, 118, 210, 0.25)',
  selectedStroke: '#1976d2',
  siteFill: 'rgba(224, 242, 241, 0.25)',
  siteStroke: '#00695c',
  buildingFootprintStroke: '#f57c00',
  roomFill: 'rgba(255, 152, 0, 0.4)',
  roomStroke: '#ff9800',
  roomText: '#333333',
  wallFill: '#666666',
  wallStroke: '#333333',
  dimensionStroke: '#1976d2',
  dimensionText: '#1976d2',
  scene3dBg: '#eceff1',
  scene3dGridMajor: '#cfd8dc',
  scene3dGridMinor: '#e2e6e9',
  site3DFill: '#c8e6c9',
  floor3DFill: '#eeeeee',
  wall3DFill: '#e0e0e0',
  room3DFill: '#f5f5f5',
  door3DColor: '#8d6e63',
  window3DColor: '#90caf9',
  selected3DColor: '#ffb74d',
};

export const darkTheme: ThemeTokens = {
  appBg: '#111315',
  panelBg: '#181b1f',
  panelBorder: 'rgba(255,255,255,0.10)',
  headerBg: '#111315',
  headerText: '#e0e0e0',
  toolbarBg: '#202327',
  textPrimary: '#f3f4f6',
  textSecondary: '#aeb6c2',
  accent: '#2dd4bf',
  danger: '#ef5350',
  canvasBg: '#171a1f',
  gridFine: 'rgba(255, 255, 255, 0.045)',
  gridMinor: 'rgba(255, 255, 255, 0.10)',
  gridMajor: 'rgba(255, 255, 255, 0.22)',
  guideLine: 'rgba(56, 189, 248, 0.50)',
  selectionStroke: '#38bdf8',
  selectionFill: 'rgba(56, 189, 248, 0.45)',
  selectedStroke: '#38bdf8',
  siteFill: 'rgba(15, 118, 110, 0.25)',
  siteStroke: '#0f766e',
  buildingFootprintStroke: '#fb923c',
  roomFill: 'rgba(167, 139, 250, 0.35)',
  roomStroke: '#a78bfa',
  roomText: '#f3f4f6',
  wallFill: '#888888',
  wallStroke: '#e5e7eb',
  dimensionStroke: '#60a5fa',
  dimensionText: '#dbeafe',
  scene3dBg: '#121826',
  scene3dGridMajor: '#2a3441',
  scene3dGridMinor: '#1c2431',
  site3DFill: '#3f5144',
  floor3DFill: '#aaa79e',
  wall3DFill: '#cfc8bb',
  room3DFill: 'rgba(125, 211, 252, 0.25)',
  door3DColor: '#7c4a32',
  window3DColor: '#7dd3fc',
  selected3DColor: '#facc15',
};

export const themes: Record<ThemeMode, ThemeTokens> = {
  light: lightTheme,
  dark: darkTheme,
};

export const useTheme = (): ThemeTokens => {
  const themeMode = useUIStore(state => state.themeMode) || 'light';
  return themes[themeMode];
};
