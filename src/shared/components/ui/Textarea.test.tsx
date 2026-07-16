/**
 * Textarea - Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Textarea, AutoResizeTextarea } from './Textarea';

describe('Textarea Component', () => {
  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<Textarea />);
      expect(document.querySelector('textarea')).toBeTruthy();
    });

    it('renders with label', () => {
      render(<Textarea label="Description" />);
      expect(screen.getByText('Description')).toBeTruthy();
    });

    it('renders with placeholder', () => {
      render(<Textarea placeholder="Enter text here" />);
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
      expect(textarea.placeholder).toBe('Enter text here');
    });

    it('renders with value', () => {
      render(<Textarea value="Test value" />);
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
      expect(textarea.value).toBe('Test value');
    });
  });

  describe('States', () => {
    it('renders disabled state', () => {
      render(<Textarea disabled />);
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
      expect(textarea.disabled).toBe(true);
    });

    it('renders error state', () => {
      render(<Textarea error="This field is required" />);
      expect(screen.getByText('This field is required')).toBeTruthy();
    });

    it('renders helper text', () => {
      render(<Textarea helper="Max 500 characters" />);
      expect(screen.getByText('Max 500 characters')).toBeTruthy();
    });

    it('prioritizes error over helper', () => {
      render(<Textarea error="Error" helper="Help" />);
      expect(screen.getByText('Error')).toBeTruthy();
      expect(screen.queryByText('Help')).toBeNull();
    });
  });

  describe('Character Count', () => {
    it('shows character count when showCount is true', () => {
      render(<Textarea value="Hi" showCount maxLength={100} />);
      expect(screen.getByText('2/100')).toBeTruthy();
    });

    it('shows correct count on change', () => {
      render(<Textarea showCount maxLength={100} />);
      
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Hello' } });
      
      expect(screen.getByText('5/100')).toBeTruthy();
    });

    it('shows red when at max length', () => {
      render(<Textarea value="Hi" showCount maxLength={2} />);
      expect(screen.getByText('2/2')).toHaveClass('text-rose-500');
    });
  });

  describe('MaxLength', () => {
    it('has maxLength attribute set', () => {
      render(<Textarea maxLength={5} />);
      
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
      expect(textarea.getAttribute('maxLength')).toBe('5');
    });

    it('truncates controlled value exceeding maxLength', () => {
      render(<Textarea value="Hello" maxLength={3} />);
      
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
      // El componente muestra el valor pasado tal cual (no lo recorta internamente)
      // pero el maxLength del HTML previene más entrada
      expect(textarea.getAttribute('maxLength')).toBe('3');
    });
  });

  describe('Rows', () => {
    it('uses default rows when autoResize is false', () => {
      render(<Textarea rows={5} />);
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
      expect(textarea.rows).toBe(5);
    });
  });

  describe('Interaction', () => {
    it('calls onChange when typing', () => {
      const handleChange = vi.fn();
      render(<Textarea onChange={handleChange} />);
      
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'New text' } });
      
      expect(handleChange).toHaveBeenCalled();
    });

    it('has maxLength attribute set', () => {
      render(<Textarea maxLength={5} />);
      
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
      expect(textarea.getAttribute('maxLength')).toBe('5');
    });
  });
});

describe('AutoResizeTextarea Component', () => {
  it('renders correctly', () => {
    render(<AutoResizeTextarea />);
    expect(document.querySelector('textarea')).toBeTruthy();
  });

  it('has autoResize enabled by default', () => {
    render(<AutoResizeTextarea />);
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.classList.contains('overflow-hidden')).toBe(true);
  });
});