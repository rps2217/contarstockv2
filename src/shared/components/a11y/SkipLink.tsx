/**
 * AccessibilityProvider - Proveedor de accesibilidad
 *
 * Mejora la accesibilidad de la aplicación:
 * - Focus management
 * - Skip links
 * - Announcements para lectores de pantalla
 * - Reducción de movimiento
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// ============================================================================
// TIPOS
// ============================================================================

interface A11yContextType {
  // Focus
  focusOn: (id: string) => void;
  trapFocus: (containerId: string) => void;
  releaseFocus: () => void;

  // Announcements
  announce: (message: string, priority?: 'polite' | 'assertive') => void;

  // Settings
  reducedMotion: boolean;
  highContrast: boolean;
  fontSize: 'normal' | 'large' | 'xlarge';
  setFontSize: (size: 'normal' | 'large' | 'xlarge') => void;

  // Loading
  setLoading: (loading: boolean) => void;
  loading: boolean;
}

const A11yContext = createContext<A11yContextType | null>(null);

// ============================================================================
// HOOK
// ============================================================================

export function useA11y() {
  const context = useContext(A11yContext);
  if (!context) {
    throw new Error('useA11y must be used within AccessibilityProvider');
  }
  return context;
}

// ============================================================================
// PROVIDER
// ============================================================================

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [loading, setLoading] = useState(false);

  // Announcements area
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');

  // Detectar preferencias del sistema
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Focus en elemento
  const focusOn = useCallback(
    (id: string) => {
      const element = document.getElementById(id);
      if (element) {
        element.focus();
        element.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
      }
    },
    [reducedMotion]
  );

  // Trap focus en container
  const trapFocus = useCallback((containerId: string) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    // Focus en primer elemento
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Liberar focus
  const releaseFocus = useCallback(() => {
    // Por defecto no hace nada
  }, []);

  // Anunciar para lectores de pantalla
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (priority === 'assertive') {
      setAssertiveMessage('');
      setTimeout(() => setAssertiveMessage(message), 50);
    } else {
      setPoliteMessage('');
      setTimeout(() => setPoliteMessage(message), 50);
    }
  }, []);

  const value: A11yContextType = {
    focusOn,
    trapFocus,
    releaseFocus,
    announce,
    reducedMotion,
    highContrast,
    fontSize,
    setFontSize,
    loading,
    setLoading,
  };

  return (
    <A11yContext.Provider value={value}>
      {/* Skip Links */}
      <SkipLinks />

      {/* Live Regions */}
      <A11yLiveRegions politeMessage={politeMessage} assertiveMessage={assertiveMessage} />

      {/* Apply settings */}
      <A11ySettings reducedMotion={reducedMotion} highContrast={highContrast} fontSize={fontSize} />

      {children}
    </A11yContext.Provider>
  );
}

// ============================================================================
// SKIP LINKS
// ============================================================================

function SkipLinks() {
  return (
    <nav className="sr-only" aria-label="Saltar enlaces">
      <ul className="fixed top-0 left-0 z-[9999] flex gap-2 p-2 bg-base">
        <li>
          <a
            href="#main-content"
            className="px-4 py-2 bg-primary text-white rounded-lg focus:not-sr-only"
          >
            Ir al contenido principal
          </a>
        </li>
        <li>
          <a
            href="#main-navigation"
            className="px-4 py-2 bg-primary text-white rounded-lg focus:not-sr-only"
          >
            Ir a navegación
          </a>
        </li>
        <li>
          <a
            href="#main-footer"
            className="px-4 py-2 bg-primary text-white rounded-lg focus:not-sr-only"
          >
            Ir al pie de página
          </a>
        </li>
      </ul>
    </nav>
  );
}

// ============================================================================
// LIVE REGIONS
// ============================================================================

function A11yLiveRegions({
  politeMessage,
  assertiveMessage,
}: {
  politeMessage: string;
  assertiveMessage: string;
}) {
  return (
    <>
      {/* Polite - para anuncios no urgentes */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {politeMessage}
      </div>

      {/* Assertive - para anuncios urgentes */}
      <div role="alert" aria-live="assertive" aria-atomic="true" className="sr-only">
        {assertiveMessage}
      </div>
    </>
  );
}

// ============================================================================
// SETTINGS CSS
// ============================================================================

function A11ySettings({
  reducedMotion,
  highContrast,
  fontSize,
}: {
  reducedMotion: boolean;
  highContrast: boolean;
  fontSize: string;
}) {
  useEffect(() => {
    const root = document.documentElement;

    // Reduced motion
    if (reducedMotion) {
      root.classList.add('motion-reduce');
      root.style.setProperty('--animation-duration', '0.01ms');
    } else {
      root.classList.remove('motion-reduce');
      root.style.removeProperty('--animation-duration');
    }

    // High contrast
    if (highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Font size
    root.setAttribute('data-font-size', fontSize);
  }, [reducedMotion, highContrast, fontSize]);

  return null;
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook para announce con delay automático
 */
export function useAnnounce() {
  const { announce } = useA11y();

  return useCallback(
    (message: string, delay = 100) => {
      setTimeout(() => announce(message), delay);
    },
    [announce]
  );
}

/**
 * Hook para focus management
 */
export function useFocusManagement() {
  const { focusOn, trapFocus } = useA11y();

  return { focusOn, trapFocus };
}

/**
 * Hook para loading state accesible
 */
export function useLoadingA11y() {
  const { loading, setLoading, announce } = useA11y();

  const setLoadingWithAnnounce = useCallback(
    (isLoading: boolean) => {
      setLoading(isLoading);
      if (isLoading) {
        announce('Cargando contenido');
      } else {
        announce('Contenido cargado');
      }
    },
    [setLoading, announce]
  );

  return { loading, setLoading: setLoadingWithAnnounce };
}
