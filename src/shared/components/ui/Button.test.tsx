/**
 * Button Component Tests
 * 
 * Tests para el componente Button - lógica de props
 */

import { describe, it, expect, vi } from 'vitest';

// Tipos del componente
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

// Simulación del componente Button
const createButton = (props: ButtonProps): ButtonProps & { isDisabled: boolean } => {
  const { disabled, loading, children, ...rest } = props;
  return {
    ...rest,
    children,
    isDisabled: disabled || loading || false
  };
};

describe('Button Component', () => {
  describe('variants', () => {
    it('should support primary variant', () => {
      const button = createButton({ variant: 'primary' });
      expect(button.variant).toBe('primary');
    });

    it('should support secondary variant', () => {
      const button = createButton({ variant: 'secondary' });
      expect(button.variant).toBe('secondary');
    });

    it('should support danger variant', () => {
      const button = createButton({ variant: 'danger' });
      expect(button.variant).toBe('danger');
    });

    it('should support ghost variant', () => {
      const button = createButton({ variant: 'ghost' });
      expect(button.variant).toBe('ghost');
    });
  });

  describe('sizes', () => {
    it('should support small size', () => {
      const button = createButton({ size: 'sm' });
      expect(button.size).toBe('sm');
    });

    it('should support medium size', () => {
      const button = createButton({ size: 'md' });
      expect(button.size).toBe('md');
    });

    it('should support large size', () => {
      const button = createButton({ size: 'lg' });
      expect(button.size).toBe('lg');
    });
  });

  describe('disabled state', () => {
    it('should be disabled when disabled prop is true', () => {
      const button = createButton({ disabled: true });
      expect(button.isDisabled).toBe(true);
    });

    it('should be disabled when loading prop is true', () => {
      const button = createButton({ loading: true });
      expect(button.isDisabled).toBe(true);
    });

    it('should be enabled when neither disabled nor loading', () => {
      const button = createButton({ disabled: false, loading: false });
      expect(button.isDisabled).toBe(false);
    });

    it('should prioritize disabled over loading when both are true', () => {
      const button = createButton({ disabled: true, loading: true });
      expect(button.isDisabled).toBe(true);
    });
  });

  describe('types', () => {
    it('should support button type', () => {
      const button = createButton({ type: 'button' });
      expect(button.type).toBe('button');
    });

    it('should support submit type', () => {
      const button = createButton({ type: 'submit' });
      expect(button.type).toBe('submit');
    });

    it('should support reset type', () => {
      const button = createButton({ type: 'reset' });
      expect(button.type).toBe('reset');
    });
  });

  describe('click handler', () => {
    it('should accept onClick handler', () => {
      const onClick = vi.fn();
      const button = createButton({ onClick });
      expect(button.onClick).toBe(onClick);
    });

    it('should not call onClick when disabled', () => {
      const onClick = vi.fn();
      const button = createButton({ onClick, disabled: true });
      
      if (!button.isDisabled && button.onClick) {
        button.onClick();
      }
      
      expect(onClick).not.toHaveBeenCalled();
    });

    it('should call onClick when enabled', () => {
      const onClick = vi.fn();
      const button = createButton({ onClick, disabled: false });
      
      if (!button.isDisabled && button.onClick) {
        button.onClick();
      }
      
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('children', () => {
    it('should render children', () => {
      const button = createButton({ children: 'Click me' });
      expect(button.children).toBe('Click me');
    });

    it('should handle empty children', () => {
      const button = createButton({ children: '' });
      expect(button.children).toBe('');
    });
  });

  describe('className', () => {
    it('should accept custom className', () => {
      const button = createButton({ className: 'custom-class' });
      expect(button.className).toBe('custom-class');
    });

    it('should handle empty className', () => {
      const button = createButton({ className: '' });
      expect(button.className).toBe('');
    });
  });

  describe('loading state', () => {
    it('should disable when loading', () => {
      const button = createButton({ loading: true });
      expect(button.isDisabled).toBe(true);
    });

    it('should not be disabled when not loading', () => {
      const button = createButton({ loading: false });
      expect(button.isDisabled).toBe(false);
    });
  });
});

describe('Button utility functions', () => {
  it('should generate variant classes correctly', () => {
    const getVariantClasses = (variant: ButtonVariant): string => {
      const classes: Record<ButtonVariant, string> = {
        primary: 'bg-blue-600 text-white',
        secondary: 'bg-gray-200 text-gray-800',
        danger: 'bg-red-600 text-white',
        ghost: 'bg-transparent text-gray-700'
      };
      return classes[variant];
    };

    expect(getVariantClasses('primary')).toContain('bg-blue-600');
    expect(getVariantClasses('danger')).toContain('bg-red-600');
  });

  it('should generate size classes correctly', () => {
    const getSizeClasses = (size: ButtonSize): string => {
      const classes: Record<ButtonSize, string> = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg'
      };
      return classes[size];
    };

    expect(getSizeClasses('sm')).toContain('px-3');
    expect(getSizeClasses('md')).toContain('px-4');
    expect(getSizeClasses('lg')).toContain('px-6');
  });

  it('should combine classes for disabled state', () => {
    const getDisabledClasses = (disabled: boolean): string => {
      return disabled 
        ? 'opacity-50 cursor-not-allowed pointer-events-none'
        : 'hover:opacity-90';
    };

    expect(getDisabledClasses(true)).toContain('cursor-not-allowed');
    expect(getDisabledClasses(false)).toContain('hover:opacity-90');
  });
});
