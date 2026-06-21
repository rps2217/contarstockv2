/**
 * LazyImage - Componente para carga perezosa de imágenes
 * 
 * Características:
 * - Blur placeholder
 * - Intersection Observer para cargar solo cuando es visible
 * - Fallback para errores
 * - Fade in animation
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { ImageOff } from 'lucide-react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  blurAmount?: number;
  fallback?: React.ReactNode;
  onLoad?: () => void;
  onError?: () => void;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  placeholderClassName = '',
  blurAmount = 20,
  fallback,
  onLoad,
  onError,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer para lazy loading
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px', threshold: 0.1 }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  if (hasError) {
    return (
      <div className={`flex items-center justify-center bg-slate-800 ${placeholderClassName} ${className}`}>
        {fallback || (
          <div className="flex flex-col items-center text-slate-500">
            <ImageOff className="w-8 h-8" />
            <span className="text-xs mt-1">Error al cargar</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      {/* Placeholder con blur */}
      <div
        className={`absolute inset-0 bg-slate-800 transition-opacity duration-300 ${
          isLoaded ? 'opacity-0' : 'opacity-100'
        } ${placeholderClassName}`}
        style={{
          filter: isLoaded ? 'none' : `blur(${blurAmount}px)`,
        }}
      />

      {/* Imagen real */}
      {isInView && (
        <motion.img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          className={`w-full h-full object-cover ${isLoaded ? '' : 'invisible'}`}
        />
      )}
    </div>
  );
};

// ============================================================
// Avatar con imagen lazy
// ============================================================

interface LazyAvatarProps {
  src?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

export const LazyAvatar: React.FC<LazyAvatarProps> = ({
  src,
  name = '',
  size = 'md',
  className = '',
}) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (src) {
    return (
      <div className={`rounded-full overflow-hidden ${sizeClasses[size]} ${className}`}>
        <LazyImage src={src} alt={name} className="w-full h-full" />
      </div>
    );
  }

  // Fallback con iniciales
  const colors = [
    'bg-blue-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-purple-500',
    'bg-cyan-500',
  ];
  const colorIndex = name.length % colors.length;

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold text-white ${sizeClasses[size]} ${colors[colorIndex]} ${className}`}
    >
      {initials || '?'}
    </div>
  );
};
