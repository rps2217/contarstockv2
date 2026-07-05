"use client";
/**
 * SkipLinks - Navegación por teclado para accesibilidad
 * 
 * Permite a usuarios de teclado saltar directamente al contenido principal.
 */

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { SkipBack } from 'lucide-react';

interface SkipLink {
  id: string;
  label: string;
  href: string;
}

const defaultLinks: SkipLink[] = [
  { id: 'main-content', label: 'Ir al contenido principal', href: '#main-content' },
  { id: 'main-nav', label: 'Ir a navegación', href: '#main-nav' },
  { id: 'search', label: 'Ir a búsqueda', href: '[role="searchbox"]' },
];

export const SkipLinks: React.FC<{ links?: SkipLink[] }> = ({ links = defaultLinks }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Mostrar skip links cuando se enfoca con Tab
    const handleFocus = () => setIsVisible(true);
    const handleBlur = () => setIsVisible(false);

    window.addEventListener('focusin', handleFocus);
    window.addEventListener('focusout', handleBlur);

    return () => {
      window.removeEventListener('focusin', handleFocus);
      window.removeEventListener('focusout', handleBlur);
    };
  }, []);

  const handleClick = (href: string) => {
    // Buscar el elemento destino
    let target: HTMLElement | null = null;
    
    if (href.startsWith('#')) {
      target = document.getElementById(href.substring(1));
    } else if (href.startsWith('[')) {
      target = document.querySelector(href);
    } else {
      target = document.querySelector(href);
    }

    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div
      className={cn(
        'fixed top-0 left-0 z-[9999] transition-all duration-200',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'
      )}
      role="navigation"
      aria-label="Navegación rápida"
    >
      <div className="flex flex-col gap-1 p-2 bg-surface border-b border-r border-subtle rounded-br-xl shadow-lg">
        {links.map((link) => (
          <button
            key={link.id}
            onClick={() => handleClick(link.href)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-elevated hover:bg-base rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-surface"
          >
            <SkipBack className="w-4 h-4" />
            {link.label}
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * Hook para detectar si el usuario está navegando por teclado
 */
export function useKeyboardNavigation() {
  const [isKeyboardUser, setIsKeyboardUser] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setIsKeyboardUser(true);
      }
    };

    const handleMouseDown = () => {
      setIsKeyboardUser(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  return isKeyboardUser;
}

/**
 * Provider que inyecta skip links en la app
 */
export const SkipLinksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      <SkipLinks />
      {children}
    </>
  );
};

export default SkipLinks;
