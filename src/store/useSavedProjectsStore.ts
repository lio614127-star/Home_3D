import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { IProject } from '../types';

export interface SavedProject {
  id: string;
  name: string;
  data: IProject;
  updatedAt: number;
}

interface SavedProjectsState {
  projects: SavedProject[];
  currentProjectId: string | null;
  saveCurrentProject: (data: IProject) => void;
  createProject: (name: string, data: IProject) => string;
  switchProject: (id: string) => SavedProject | undefined;
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;
}

export const useSavedProjectsStore = create<SavedProjectsState>()(
  persist(
    (set, get) => ({
      projects: [],
      currentProjectId: null,
      saveCurrentProject: (data: IProject) => set((state) => {
        if (!state.currentProjectId) {
          const newId = Date.now().toString();
          return {
            currentProjectId: newId,
            projects: [...state.projects, { id: newId, name: 'Sơ đồ ' + (state.projects.length + 1), data, updatedAt: Date.now() }]
          };
        }
        return {
          projects: state.projects.map(p => p.id === state.currentProjectId ? { ...p, data, updatedAt: Date.now() } : p)
        };
      }),
      createProject: (name: string, data: IProject) => {
        const newId = Date.now().toString();
        set((state) => ({
          currentProjectId: newId,
          projects: [...state.projects, { id: newId, name, data, updatedAt: Date.now() }]
        }));
        return newId;
      },
      switchProject: (id: string) => {
        set({ currentProjectId: id });
        return get().projects.find(p => p.id === id);
      },
      renameProject: (id: string, name: string) => set((state) => ({
        projects: state.projects.map(p => p.id === id ? { ...p, name, updatedAt: Date.now() } : p)
      })),
      deleteProject: (id: string) => set((state) => ({
        projects: state.projects.filter(p => p.id !== id),
        currentProjectId: state.currentProjectId === id ? null : state.currentProjectId
      }))
    }),
    { 
      name: 'garden-house-saved-projects',
      partialize: (state) => ({
        ...state,
        projects: state.projects.map(p => ({
          ...p,
          data: {
            ...p.data,
            aiRequests: p.data.aiRequests?.map(req => ({ ...req, imageDataUrl: undefined })) || []
          }
        }))
      })
    }
  )
);
