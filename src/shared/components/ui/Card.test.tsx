/**
 * Card - Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardContent } from './Card';

describe('Card Component', () => {
  describe('Rendering', () => {
    it('renders with children', () => {
      render(<Card>Card Content</Card>);
      expect(screen.getByText('Card Content')).toBeTruthy();
    });

    it('renders multiple children', () => {
      render(
        <Card>
          <span>Child 1</span>
          <span>Child 2</span>
        </Card>
      );
      expect(screen.getByText('Child 1')).toBeTruthy();
      expect(screen.getByText('Child 2')).toBeTruthy();
    });
  });

  describe('Variants', () => {
    it('renders default variant', () => {
      const { container } = render(<Card variant="default">Default</Card>);
      expect(container.firstChild).toBeTruthy();
    });

    it('renders elevated variant', () => {
      const { container } = render(<Card variant="elevated">Elevated</Card>);
      expect(container.firstChild).toBeTruthy();
    });

    it('renders outlined variant', () => {
      const { container } = render(<Card variant="outlined">Outlined</Card>);
      expect(container.firstChild).toBeTruthy();
    });

    it('renders glass variant', () => {
      const { container } = render(<Card variant="glass">Glass</Card>);
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('Padding', () => {
    it('renders with no padding', () => {
      const { container } = render(<Card padding="none">No Padding</Card>);
      expect(container.firstChild).toBeTruthy();
    });

    it('renders with small padding', () => {
      const { container } = render(<Card padding="sm">Small Padding</Card>);
      expect(container.firstChild).toBeTruthy();
    });

    it('renders with medium padding', () => {
      const { container } = render(<Card padding="md">Medium Padding</Card>);
      expect(container.firstChild).toBeTruthy();
    });

    it('renders with large padding', () => {
      const { container } = render(<Card padding="lg">Large Padding</Card>);
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('Interactive', () => {
    it('renders non-interactive by default', () => {
      const { container } = render(<Card>Non Interactive</Card>);
      expect(container.firstChild).toBeTruthy();
    });

    it('renders interactive when specified', () => {
      const { container } = render(<Card interactive>Interactive</Card>);
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('Custom ClassName', () => {
    it('applies custom className', () => {
      const { container } = render(
        <Card className="custom-card-class">Custom</Card>
      );
      expect(container.firstChild?.className).toContain('custom-card-class');
    });
  });
});

describe('CardHeader Component', () => {
  it('renders children', () => {
    render(<CardHeader>Header Content</CardHeader>);
    expect(screen.getByText('Header Content')).toBeTruthy();
  });

  it('applies custom className', () => {
    const { container } = render(
      <CardHeader className="custom-header-class">Header</CardHeader>
    );
    expect(container.firstChild?.className).toContain('custom-header-class');
  });
});

describe('CardTitle Component', () => {
  it('renders children as title', () => {
    render(<CardTitle>Card Title</CardTitle>);
    expect(screen.getByText('Card Title')).toBeTruthy();
  });

  it('renders as h3 element', () => {
    const { container } = render(<CardTitle>Title</CardTitle>);
    expect(container.querySelector('h3')).toBeTruthy();
  });

  it('applies custom className', () => {
    const { container } = render(
      <CardTitle className="custom-title-class">Title</CardTitle>
    );
    expect(container.firstChild?.className).toContain('custom-title-class');
  });
});

describe('CardContent Component', () => {
  it('renders children', () => {
    render(<CardContent>Content</CardContent>);
    expect(screen.getByText('Content')).toBeTruthy();
  });

  it('applies custom className', () => {
    const { container } = render(
      <CardContent className="custom-content-class">Content</CardContent>
    );
    expect(container.firstChild?.className).toContain('custom-content-class');
  });
});
