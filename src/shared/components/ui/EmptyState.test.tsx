/**
 * EmptyState Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState, EmptyList, ListSkeleton, CardSkeleton } from './EmptyState';
import { Package, Search } from 'lucide-react';

// Mock lucide-react icons
vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return {
    ...actual,
    Package: (props: any) => <svg data-testid="package-icon" {...props} />,
    Search: (props: any) => <svg data-testid="search-icon" {...props} />,
  };
});

describe('EmptyState', () => {
  it('renders title correctly', () => {
    render(<EmptyState title="No hay elementos" />);
    expect(screen.getByText('No hay elementos')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<EmptyState title="No hay elementos" description="Agrega nuevos elementos" />);
    expect(screen.getByText('Agrega nuevos elementos')).toBeInTheDocument();
  });

  it('renders custom icon', () => {
    render(<EmptyState title="Test" icon={Package} />);
    expect(screen.getByTestId('package-icon')).toBeInTheDocument();
  });

  it('renders action button when provided', () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        title="Test"
        action={{ label: 'Agregar', onClick }}
      />
    );
    const button = screen.getByText('Agregar');
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders compact version', () => {
    render(<EmptyState title="Test" compact />);
    const container = screen.getByText('Test').parentElement;
    expect(container).toHaveClass('py-8');
  });

  it('uses correct illustration type', () => {
    const { rerender } = render(<EmptyState title="Test" illustration="no-data" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
    
    rerender(<EmptyState title="Test" illustration="no-results" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});

describe('EmptyList', () => {
  it('renders with default title', () => {
    render(<EmptyList />);
    expect(screen.getByText('No hay elementos')).toBeInTheDocument();
  });

  it('renders with custom title and description', () => {
    render(
      <EmptyList
        title="Sin sesiones"
        description="Crea una nueva sesión"
      />
    );
    expect(screen.getByText('Sin sesiones')).toBeInTheDocument();
    expect(screen.getByText('Crea una nueva sesión')).toBeInTheDocument();
  });

  it('renders action when provided', () => {
    const onClick = vi.fn();
    render(
      <EmptyList
        action={{ label: 'Crear', onClick }}
      />
    );
    fireEvent.click(screen.getByText('Crear'));
    expect(onClick).toHaveBeenCalled();
  });
});

describe('ListSkeleton', () => {
  it('renders correct number of skeletons', () => {
    const { container } = render(<ListSkeleton count={5} />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(5);
  });

  it('renders with default count of 5', () => {
    const { container } = render(<ListSkeleton />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(5);
  });
});

describe('CardSkeleton', () => {
  it('renders correct number of cards', () => {
    const { container } = render(<CardSkeleton count={6} />);
    const cards = container.querySelectorAll('.animate-pulse');
    expect(cards.length).toBe(6);
  });

  it('renders with default count of 6', () => {
    const { container } = render(<CardSkeleton />);
    const cards = container.querySelectorAll('.animate-pulse');
    expect(cards.length).toBe(6);
  });
});
