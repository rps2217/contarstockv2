/**
 * UI Store - Domain store para estado de interfaz
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ViewState } from '../../../types';

interface UIState {
  // Navigation
  isSidebarOpen: boolean;
  activeView: ViewState;
  
  // Search
  globalSearchQuery: string;
  
  // Modals
  isStartSessionModalOpen: boolean;
  isSystemHubOpen: boolean;
  
  // Theme
  theme: 'light' | 'dark' | 'system';
  
  // Actions
  setSidebarOpen: (open: boolean) => void;
  setActiveView: (view: ViewState) => void;
  setGlobalSearch: (q: string) => void;
  setStartSessionModalOpen: (open: boolean) => void;
  setSystemHubOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  
  // Toggle helpers
  toggleSidebar: () => void;
  toggleStartSessionModal: () => void;
  toggleSystemHub: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Estado inicial
      isSidebarOpen: false,
      activeView: 'dashboard',
      globalSearchQuery: '',
      isStartSessionModalOpen: false,
      isSystemHubOpen: false,
      theme: 'system',
      
      // Setters
      setSidebarOpen: (open) => set({ isSidebarOpen: open }),
      setActiveView: (view) => set({ activeView: view }),
      setGlobalSearch: (q) => set({ globalSearchQuery: q }),
      setStartSessionModalOpen: (open) => set({ isStartSessionModalOpen: open }),
      setSystemHubOpen: (open) => set({ isSystemHubOpen: open }),
      setTheme: (theme) => set({ theme }),
      
      // Toggle helpers
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      toggleStartSessionModal: () => set((state) => ({ 
        isStartSessionModalOpen: !state.isStartSessionModalOpen 
      })),
      toggleSystemHub: () => set((state) => ({ 
        isSystemHubOpen: !state.isSystemHubOpen 
      })),
    }),
    {
      name: 'ui_store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isSidebarOpen: state.isSidebarOpen,
        activeView: state.activeView,
        theme: state.theme,
      }),
    }
  )
);

// Selectors para evitar re-renders
export const selectActiveView = (state: UIState) => state.activeView;
export const selectIsSidebarOpen = (state: UIState) => state.isSidebarOpen;
export const selectGlobalSearch = (state: UIState) => state.globalSearchQuery;
