/**
 * useToastStore Tests
 *
 * Tests para el store de notificaciones toast.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useToastStore } from './useToastStore';

describe('useToastStore', () => {
  beforeEach(() => {
    useToastStore.setState({
      toasts: [],
    });
  });

  describe('initial state', () => {
    it('should have empty toasts array', () => {
      const state = useToastStore.getState();
      expect(state.toasts).toEqual([]);
    });
  });

  describe('addToast', () => {
    it('should add a toast message', () => {
      const { addToast } = useToastStore.getState();

      addToast('Test message', 'info');
      
      const state = useToastStore.getState();
      expect(state.toasts.length).toBe(1);
      expect(state.toasts[0].message).toBe('Test message');
    });

    it('should add toast with success type', () => {
      const { addToast } = useToastStore.getState();

      addToast('Success message', 'success');
      
      const state = useToastStore.getState();
      expect(state.toasts[0].type).toBe('success');
    });

    it('should add toast with error type', () => {
      const { addToast } = useToastStore.getState();

      addToast('Error message', 'error');
      
      const state = useToastStore.getState();
      expect(state.toasts[0].type).toBe('error');
    });

    it('should add toast with warning type', () => {
      const { addToast } = useToastStore.getState();

      addToast('Warning message', 'warning');
      
      const state = useToastStore.getState();
      expect(state.toasts[0].type).toBe('warning');
    });

    it('should add toast with info type', () => {
      const { addToast } = useToastStore.getState();

      addToast('Info message', 'info');
      
      const state = useToastStore.getState();
      expect(state.toasts[0].type).toBe('info');
    });

    it('should add multiple toasts', () => {
      const { addToast } = useToastStore.getState();

      addToast('Message 1', 'info');
      addToast('Message 2', 'info');
      addToast('Message 3', 'info');
      
      const state = useToastStore.getState();
      expect(state.toasts.length).toBe(3);
    });

    it('should generate unique ids for each toast', () => {
      const { addToast } = useToastStore.getState();

      addToast('Message 1', 'info');
      addToast('Message 2', 'info');
      
      const state = useToastStore.getState();
      expect(state.toasts[0].id).not.toBe(state.toasts[1].id);
    });
  });

  describe('removeToast', () => {
    it('should remove a toast by id', () => {
      const { addToast, removeToast } = useToastStore.getState();

      addToast('Message 1', 'info');
      addToast('Message 2', 'info');
      
      const state1 = useToastStore.getState();
      const toastId = state1.toasts[0].id;
      
      removeToast(toastId);
      
      const state2 = useToastStore.getState();
      expect(state2.toasts.length).toBe(1);
      expect(state2.toasts[0].message).toBe('Message 2');
    });

    it('should do nothing when removing non-existent toast', () => {
      const { addToast, removeToast } = useToastStore.getState();

      addToast('Message 1', 'info');
      removeToast('non-existent-id');
      
      const state = useToastStore.getState();
      expect(state.toasts.length).toBe(1);
    });
  });

  describe('toast properties', () => {
    it('should have default duration of 3000ms', () => {
      const { addToast } = useToastStore.getState();

      addToast('Test message', 'info');
      
      const state = useToastStore.getState();
      expect(state.toasts[0].duration).toBe(3000);
    });
  });
});
