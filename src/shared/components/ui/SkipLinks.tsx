"use client";
/**
 * SkipLinks - Navegación por teclado para accesibilidad
 * 
 * Solo se muestra cuando el usuario navega con Tab (accesibilidad).
 * NO aparece con clicks normales del mouse.
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
  const [isKeyboardUser, setIsKeyboardUser] = useState(false);

  // Detectar navegación por teclado (Tab) vs mouse
  useEffect(() => {
    let hideTimer: NodeJS.Timeout | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setIsKeyboardUser(true);
        // Auto-ocultar después de 5 segundos si no se usa
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = setTimeout(() => setIsKeyboardUser(false), 5000);
      }
    };

    const handleMouseMove = () => {
      // Si el usuario mueve el mouse, ya no está navegando por teclado
      if (isKeyboardUser) {
        setIsKeyboardUser(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousemove', handleMouseMove, { once: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousemove', handleMouseMove);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [isKeyboardUser]);

  const handleClick = (href: string) => {
    setIsKeyboardUser(false);
    
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

  // No renderizar si no es usuario de teclado
  if (!isKeyboardUser) {
    return null;
  }

  return (
    <div
      className="fixed top-0 left-0 z-[9999]"
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
 * @deprecated Ya no necesario - SkipLinks detecta automáticamente
 */
export function useKeyboardNavigation() {
  return false;
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
