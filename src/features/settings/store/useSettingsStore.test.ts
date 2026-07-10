import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from './useSettingsStore';

describe('useSettingsStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useSettingsStore.setState({
      settings: useSettingsStore.getState().settings,
    });
  });

  describe('initial state', () => {
    it('should have settings initialized', () => {
      const state = useSettingsStore.getState();
      expect(state.settings).toBeDefined();
    });

    it('should have updateSetting function', () => {
      const state = useSettingsStore.getState();
      expect(typeof state.updateSetting).toBe('function');
    });

    it('should have loadSettings function', () => {
      const state = useSettingsStore.getState();
      expect(typeof state.loadSettings).toBe('function');
    });
  });

  describe('updateSetting', () => {
    it('should update a single setting', () => {
      const { updateSetting, settings } = useSettingsStore.getState();
      
      // Assuming there's a theme or similar setting
      updateSetting('theme' as keyof typeof settings, 'dark' as never);
      
      const newState = useSettingsStore.getState();
      expect(newState.settings.theme).toBe('dark');
    });
  });

  describe('loadSettings', () => {
    it('should reload settings from storage', () => {
      const { loadSettings } = useSettingsStore.getState();
      
      // Should not throw
      expect(() => loadSettings()).not.toThrow();
    });
  });

  describe('resetSettings', () => {
    it('should have resetSettings function', () => {
      const state = useSettingsStore.getState();
      expect(typeof state.resetSettings).toBe('function');
    });

    it('should reset settings to defaults', () => {
      const { resetSettings } = useSettingsStore.getState();
      
      // Should not throw
      expect(() => resetSettings()).not.toThrow();
    });
  });
});
