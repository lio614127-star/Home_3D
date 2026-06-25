import { create } from 'zustand';
import { IAIDesignIntent, RoofSegmentParams } from '../core/ai/types';

interface AIDebugState {
  enabled: boolean;
  lastAiIntent: IAIDesignIntent | null;
  lastRoofSegments: RoofSegmentParams[] | null;
  
  setEnabled: (enabled: boolean) => void;
  setDebugData: (intent: IAIDesignIntent, segments: RoofSegmentParams[]) => void;
}

export const useAIDebugStore = create<AIDebugState>((set) => ({
  enabled: true, // Auto enable for now based on user priority
  lastAiIntent: null,
  lastRoofSegments: null,

  setEnabled: (enabled) => set({ enabled }),
  setDebugData: (lastAiIntent, lastRoofSegments) => set({ lastAiIntent, lastRoofSegments })
}));
