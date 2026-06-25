import { create } from 'zustand';

interface AIState {
  isPanelOpen: boolean;
  selectedCategory: string | null;
  currentImageBlob: string | null;
  currentPrompt: string;
  
  setPanelOpen: (isOpen: boolean) => void;
  setSelectedCategory: (categoryId: string | null) => void;
  setCurrentImageBlob: (blob: string | null) => void;
  setCurrentPrompt: (prompt: string) => void;
  resetRequestData: () => void;
}

export const useAIStore = create<AIState>((set) => ({
  isPanelOpen: false,
  selectedCategory: null,
  currentImageBlob: null,
  currentPrompt: '',

  setPanelOpen: (isOpen) => set({ isPanelOpen: isOpen }),
  setSelectedCategory: (categoryId) => set({ selectedCategory: categoryId }),
  setCurrentImageBlob: (blob) => set({ currentImageBlob: blob }),
  setCurrentPrompt: (prompt) => set({ currentPrompt: prompt }),
  resetRequestData: () => set({ currentImageBlob: null, currentPrompt: '', selectedCategory: null }),
}));
