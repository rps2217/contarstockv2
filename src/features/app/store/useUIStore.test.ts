import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore, selectActiveView, selectIsSidebarOpen } from './useUIStore';

describe('useUIStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      isSidebarOpen: false,
      activeView: 'dashboard',
      globalSearchQuery: '',
      isStartSessionModalOpen: false,
      isSystemHubOpen: false,
      theme: 'system',
    });
  });

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const state = useUIStore.getState();
      
      expect(state.isSidebarOpen).toBe(false);
      expect(state.activeView).toBe('dashboard');
      expect(state.globalSearchQuery).toBe('');
      expect(state.isStartSessionModalOpen).toBe(false);
      expect(state.isSystemHubOpen).toBe(false);
      expect(state.theme).toBe('system');
    });
  });

  describe('sidebar controls', () => {
    it('should toggle sidebar open state', () => {
      const { toggleSidebar, setSidebarOpen } = useUIStore.getState();
      
      expect(useUIStore.getState().isSidebarOpen).toBe(false);
      
      toggleSidebar();
      expect(useUIStore.getState().isSidebarOpen).toBe(true);
      
      toggleSidebar();
      expect(useUIStore.getState().isSidebarOpen).toBe(false);
    });

    it('should set sidebar open state directly', () => {
      const { setSidebarOpen } = useUIStore.getState();
      
      setSidebarOpen(true);
      expect(useUIStore.getState().isSidebarOpen).toBe(true);
      
      setSidebarOpen(false);
      expect(useUIStore.getState().isSidebarOpen).toBe(false);
    });
  });

  describe('navigation', () => {
    it('should set active view', () => {
      const { setActiveView } = useUIStore.getState();
      
      setActiveView('database');
      expect(useUIStore.getState().activeView).toBe('database');
      
      setActiveView('reports');
      expect(useUIStore.getState().activeView).toBe('reports');
    });
  });

  describe('search', () => {
    it('should set global search query', () => {
      const { setGlobalSearch } = useUIStore.getState();
      
      setGlobalSearch('test query');
      expect(useUIStore.getState().globalSearchQuery).toBe('test query');
      
      setGlobalSearch('');
      expect(useUIStore.getState().globalSearchQuery).toBe('');
    });
  });

  describe('modals', () => {
    it('should toggle start session modal', () => {
      const { toggleStartSessionModal } = useUIStore.getState();
      
      expect(useUIStore.getState().isStartSessionModalOpen).toBe(false);
      
      toggleStartSessionModal();
      expect(useUIStore.getState().isStartSessionModalOpen).toBe(true);
      
      toggleStartSessionModal();
      expect(useUIStore.getState().isStartSessionModalOpen).toBe(false);
    });

    it('should toggle system hub', () => {
      const { toggleSystemHub } = useUIStore.getState();
      
      expect(useUIStore.getState().isSystemHubOpen).toBe(false);
      
      toggleSystemHub();
      expect(useUIStore.getState().isSystemHubOpen).toBe(true);
      
      toggleSystemHub();
      expect(useUIStore.getState().isSystemHubOpen).toBe(false);
    });
  });

  describe('theme', () => {
    it('should set theme', () => {
      const { setTheme } = useUIStore.getState();
      
      setTheme('light');
      expect(useUIStore.getState().theme).toBe('light');
      
      setTheme('dark');
      expect(useUIStore.getState().theme).toBe('dark');
      
      setTheme('system');
      expect(useUIStore.getState().theme).toBe('system');
    });
  });

  describe('selectors', () => {
    it('should export selectActiveView selector', () => {
      expect(typeof selectActiveView).toBe('function');
      
      const state = useUIStore.getState();
      expect(selectActiveView(state)).toBe(state.activeView);
    });

    it('should export selectIsSidebarOpen selector', () => {
      expect(typeof selectIsSidebarOpen).toBe('function');
      
      const state = useUIStore.getState();
      expect(selectIsSidebarOpen(state)).toBe(state.isSidebarOpen);
    });
  });
});
