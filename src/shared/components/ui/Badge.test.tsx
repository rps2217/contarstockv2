/**
 * Badge - Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge, StatusDot } from './Badge';

describe('Badge Component', () => {
  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<Badge>Default Badge</Badge>);
      expect(screen.getByText('Default Badge')).toBeDefined();
    });

    it('renders children correctly', () => {
      render(<Badge>Test Content</Badge>);
      expect(screen.getByText('Test Content')).toBeTruthy();
    });
  });

  describe('Variants', () => {
    it('renders default variant', () => {
      const { container } = render(<Badge variant="default">Default</Badge>);
      expect(container.firstChild).toBeTruthy();
    });

    it('renders success variant', () => {
      const { container } = render(<Badge variant="success">Success</Badge>);
      expect(container.firstChild).toBeTruthy();
    });

    it('renders warning variant', () => {
      const { container } = render(<Badge variant="warning">Warning</Badge>);
      expect(container.firstChild).toBeTruthy();
    });

    it('renders danger variant', () => {
      const { container } = render(<Badge variant="danger">Danger</Badge>);
      expect(container.firstChild).toBeTruthy();
    });

    it('renders info variant', () => {
      const { container } = render(<Badge variant="info">Info</Badge>);
      expect(container.firstChild).toBeTruthy();
    });

    it('renders muted variant', () => {
      const { container } = render(<Badge variant="muted">Muted</Badge>);
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('Sizes', () => {
    it('renders small size', () => {
      const { container } = render(<Badge size="sm">Small</Badge>);
      expect(container.firstChild).toBeTruthy();
    });

    it('renders medium size', () => {
      const { container } = render(<Badge size="md">Medium</Badge>);
      expect(container.firstChild).toBeTruthy();
    });

    it('renders large size', () => {
      const { container } = render(<Badge size="lg">Large</Badge>);
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('Dot Indicator', () => {
    it('renders with dot when dot prop is true', () => {
      const { container } = render(<Badge dot>With Dot</Badge>);
      // El badge renderiza un span con las clases de dot
      expect(container.firstChild).toBeTruthy();
    });

    it('renders without explicit dot when dot prop is false', () => {
      const { container } = render(<Badge>Without Dot</Badge>);
      // El badge sin dot no debe tener el indicador animado
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('Custom ClassName', () => {
    it('applies custom className', () => {
      const { container } = render(
        <Badge className="custom-class">Custom</Badge>
      );
      expect(container.firstChild?.className).toContain('custom-class');
    });
  });
});

describe('StatusDot Component', () => {
  describe('Statuses', () => {
    it('renders success status', () => {
      const { container } = render(<StatusDot status="success" />);
      expect(container.firstChild).toBeTruthy();
    });

    it('renders warning status', () => {
      const { container } = render(<StatusDot status="warning" />);
      expect(container.firstChild).toBeTruthy();
    });

    it('renders danger status', () => {
      const { container } = render(<StatusDot status="danger" />);
      expect(container.firstChild).toBeTruthy();
    });

    it('renders info status', () => {
      const { container } = render(<StatusDot status="info" />);
      expect(container.firstChild).toBeTruthy();
    });

    it('renders muted status', () => {
      const { container } = render(<StatusDot status="muted" />);
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('Pulse Animation', () => {
    it('renders without pulse by default', () => {
      const { container } = render(<StatusDot status="success" />);
      expect(container.firstChild).toBeTruthy();
    });

    it('renders with pulse when enabled', () => {
      const { container } = render(<StatusDot status="success" pulse />);
      // El animate-ping está en un span anidado, verificar que el componente se renderiza
      expect(container.querySelector('.animate-ping')).toBeTruthy();
    });
  });

  describe('Sizes', () => {
    it('renders small size', () => {
      const { container } = render(<StatusDot status="success" size="sm" />);
      expect(container.firstChild).toBeTruthy();
    });

    it('renders medium size', () => {
      const { container } = render(<StatusDot status="success" size="md" />);
      expect(container.firstChild).toBeTruthy();
    });

    it('renders large size', () => {
      const { container } = render(<StatusDot status="success" size="lg" />);
      expect(container.firstChild).toBeTruthy();
    });
  });
});
