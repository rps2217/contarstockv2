/**
 * SkipLinks Component Tests
 * 
 * Nota: SkipLinks retorna null cuando no es usuario de teclado,
 * por lo que solo se renderiza cuando isKeyboardUser es true.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SkipLinks, SkipLinksProvider } from './SkipLinks';
import React from 'react';

// Mock lucide-react
vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return {
    ...actual,
    SkipBack: (props: any) => <svg data-testid="skip-back-icon" {...props} />,
  };
});

// Helper para simular que el usuario está navegando por teclado
const simulateKeyboardUser = () => {
  fireEvent.keyDown(window, { key: 'Tab' });
};

describe('SkipLinks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null by default (not a keyboard user)', () => {
    const { container } = render(<SkipLinks />);
    expect(container.firstChild).toBeNull();
  });

  it('renders skip links navigation when Tab is pressed', () => {
    render(<SkipLinks />);
    simulateKeyboardUser();
    expect(screen.getByRole('navigation', { name: /navegación rápida/i })).toBeInTheDocument();
  });

  it('renders default skip links when keyboard user', () => {
    render(<SkipLinks />);
    simulateKeyboardUser();
    expect(screen.getByText('Ir al contenido principal')).toBeInTheDocument();
    expect(screen.getByText('Ir a navegación')).toBeInTheDocument();
  });

  it('renders custom links when provided', () => {
    const customLinks = [
      { id: 'custom', label: 'Ir a custom', href: '#custom' }
    ];
    render(<SkipLinks links={customLinks} />);
    simulateKeyboardUser();
    expect(screen.getByText('Ir a custom')).toBeInTheDocument();
  });

  it('hides when mouse is moved (loses keyboard user status)', async () => {
    render(<SkipLinks />);
    simulateKeyboardUser();
    
    // Verificar que se muestra
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    
    // Simular movimiento de mouse
    fireEvent.mouseMove(window, { clientX: 100, clientY: 100 });
    
    // El componente debería ocultarse (retornar null)
    await waitFor(() => {
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    });
  });
});

describe('SkipLinksProvider', () => {
  it('renders children', () => {
    render(
      <SkipLinksProvider>
        <div data-testid="child">Child Content</div>
      </SkipLinksProvider>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders navigation when keyboard user', () => {
    render(
      <SkipLinksProvider>
        <div>Content</div>
      </SkipLinksProvider>
    );
    simulateKeyboardUser();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });
});
