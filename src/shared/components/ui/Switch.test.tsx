/**
 * Switch - Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Switch, CheckboxSwitch } from './Switch';

describe('Switch Component', () => {
  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<Switch />);
      expect(screen.getByRole('switch')).toBeTruthy();
    });

    it('renders with label', () => {
      render(<Switch label="Enable feature" />);
      expect(screen.getByText('Enable feature')).toBeTruthy();
    });

    it('renders with description', () => {
      render(<Switch label="Feature" description="Toggle description" />);
      expect(screen.getByText('Toggle description')).toBeTruthy();
    });
  });

  describe('States', () => {
    it('renders unchecked by default', () => {
      render(<Switch />);
      const switchEl = screen.getByRole('switch');
      expect(switchEl.getAttribute('aria-checked')).toBe('false');
    });

    it('renders checked when checked prop is true', () => {
      render(<Switch checked />);
      const switchEl = screen.getByRole('switch');
      expect(switchEl.getAttribute('aria-checked')).toBe('true');
    });

    it('renders disabled state', () => {
      render(<Switch disabled />);
      const switchEl = screen.getByRole('switch');
      expect(switchEl).toBeDisabled();
    });
  });

  describe('Interaction', () => {
    it('calls onChange when clicked', () => {
      const handleChange = vi.fn();
      render(<Switch onChange={handleChange} />);
      
      fireEvent.click(screen.getByRole('switch'));
      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it('calls onChange when toggled off', () => {
      const handleChange = vi.fn();
      render(<Switch checked onChange={handleChange} />);
      
      fireEvent.click(screen.getByRole('switch'));
      expect(handleChange).toHaveBeenCalledWith(false);
    });

    it('does not call onChange when disabled', () => {
      const handleChange = vi.fn();
      render(<Switch disabled onChange={handleChange} />);
      
      fireEvent.click(screen.getByRole('switch'));
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('responds to keyboard Enter', () => {
      const handleChange = vi.fn();
      render(<Switch onChange={handleChange} />);
      
      const switchEl = screen.getByRole('switch');
      fireEvent.keyDown(switchEl, { key: 'Enter' });
      expect(handleChange).toHaveBeenCalled();
    });

    it('responds to keyboard Space', () => {
      const handleChange = vi.fn();
      render(<Switch onChange={handleChange} />);
      
      const switchEl = screen.getByRole('switch');
      fireEvent.keyDown(switchEl, { key: ' ' });
      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('Sizes', () => {
    it('renders with small size', () => {
      render(<Switch size="sm" />);
      expect(screen.getByRole('switch')).toBeTruthy();
    });

    it('renders with medium size', () => {
      render(<Switch size="md" />);
      expect(screen.getByRole('switch')).toBeTruthy();
    });

    it('renders with large size', () => {
      render(<Switch size="lg" />);
      expect(screen.getByRole('switch')).toBeTruthy();
    });
  });
});

describe('CheckboxSwitch Component', () => {
  describe('Rendering', () => {
    it('renders with label', () => {
      render(<CheckboxSwitch label="Checkbox style" />);
      expect(screen.getByText('Checkbox style')).toBeTruthy();
    });
  });

  describe('States', () => {
    it('renders unchecked by default', () => {
      render(<CheckboxSwitch />);
      const checkbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    it('renders checked when checked prop is true', () => {
      render(<CheckboxSwitch checked />);
      const checkbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('renders disabled state', () => {
      render(<CheckboxSwitch disabled />);
      const checkbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
      expect(checkbox.disabled).toBe(true);
    });
  });

  describe('Interaction', () => {
    it('calls onChange when clicked', () => {
      const handleChange = vi.fn();
      render(<CheckboxSwitch onChange={handleChange} />);
      
      const label = screen.getByText('Checkbox style').parentElement!;
      fireEvent.click(label);
      expect(handleChange).toHaveBeenCalledWith(true);
    });
  });
});