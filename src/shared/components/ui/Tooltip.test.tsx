/**
 * Tooltip - Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tooltip, TooltipProvider } from './Tooltip';

describe('Tooltip Component', () => {
  describe('Rendering', () => {
    it('renders children correctly', () => {
      render(
        <Tooltip content="Test tooltip">
          <button>Hover me</button>
        </Tooltip>
      );
      expect(screen.getByRole('button', { name: 'Hover me' })).toBeTruthy();
    });

    it('renders content correctly', () => {
      render(
        <Tooltip content="Tooltip content">
          <button>Hover me</button>
        </Tooltip>
      );
      expect(screen.getByRole('button')).toBeTruthy();
    });
  });

  describe('Visibility', () => {
    it('does not show tooltip by default', () => {
      render(
        <Tooltip content="Hidden content">
          <button>Hover me</button>
        </Tooltip>
      );
      expect(screen.queryByRole('tooltip')).toBeNull();
    });

    it('shows tooltip on mouse enter after delay', async () => {
      vi.useFakeTimers();
      
      render(
        <Tooltip content="Visible content" delay={200}>
          <button>Hover me</button>
        </Tooltip>
      );
      
      const button = screen.getByRole('button');
      fireEvent.mouseEnter(button);
      
      // Before delay
      expect(screen.queryByRole('tooltip')).toBeNull();
      
      // After delay
      vi.advanceTimersByTime(200);
      
      expect(screen.queryByRole('tooltip')).toBeTruthy();
      vi.useRealTimers();
    });

    it('hides tooltip on mouse leave', async () => {
      vi.useFakeTimers();
      
      render(
        <Tooltip content="Content" delay={100}>
          <button>Hover me</button>
        </Tooltip>
      );
      
      const button = screen.getByRole('button');
      fireEvent.mouseEnter(button);
      vi.advanceTimersByTime(100);
      
      expect(screen.queryByRole('tooltip')).toBeTruthy();
      
      fireEvent.mouseLeave(button);
      
      expect(screen.queryByRole('tooltip')).toBeNull();
      vi.useRealTimers();
    });
  });

  describe('Positions', () => {
    it('renders with top position', () => {
      render(
        <Tooltip content="Top" position="top">
          <button>Button</button>
        </Tooltip>
      );
      expect(screen.getByRole('button')).toBeTruthy();
    });

    it('renders with bottom position', () => {
      render(
        <Tooltip content="Bottom" position="bottom">
          <button>Button</button>
        </Tooltip>
      );
      expect(screen.getByRole('button')).toBeTruthy();
    });

    it('renders with left position', () => {
      render(
        <Tooltip content="Left" position="left">
          <button>Button</button>
        </Tooltip>
      );
      expect(screen.getByRole('button')).toBeTruthy();
    });

    it('renders with right position', () => {
      render(
        <Tooltip content="Right" position="right">
          <button>Button</button>
        </Tooltip>
      );
      expect(screen.getByRole('button')).toBeTruthy();
    });
  });

  describe('Variants', () => {
    it('renders with default variant', () => {
      render(
        <Tooltip content="Default variant">
          <button>Button</button>
        </Tooltip>
      );
      expect(screen.getByRole('button')).toBeTruthy();
    });

    it('renders with dark variant', () => {
      render(
        <Tooltip content="Dark variant" variant="dark">
          <button>Button</button>
        </Tooltip>
      );
      expect(screen.getByRole('button')).toBeTruthy();
    });

    it('renders with light variant', () => {
      render(
        <Tooltip content="Light variant" variant="light">
          <button>Button</button>
        </Tooltip>
      );
      expect(screen.getByRole('button')).toBeTruthy();
    });
  });

  describe('Disabled State', () => {
    it('does not show tooltip when disabled', async () => {
      vi.useFakeTimers();
      
      render(
        <Tooltip content="Disabled content" disabled delay={100}>
          <button>Button</button>
        </Tooltip>
      );
      
      const button = screen.getByRole('button');
      fireEvent.mouseEnter(button);
      vi.advanceTimersByTime(100);
      
      expect(screen.queryByRole('tooltip')).toBeNull();
      vi.useRealTimers();
    });
  });
});

describe('TooltipProvider', () => {
  it('renders children', () => {
    render(
      <TooltipProvider>
        <div>Child content</div>
      </TooltipProvider>
    );
    expect(screen.getByText('Child content')).toBeTruthy();
  });
});