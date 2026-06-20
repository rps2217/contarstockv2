/**
 * Card - Componente atómico para contenedores de contenido
 */

import React, { memo } from 'react';

type CardVariant = 'default' | 'elevated' | 'outlined' | 'glass';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  interactive?: boolean;
}

const variantClasses: Record<CardVariant, string> = {
  default: 'bg-slate-900/80 border border-white/5',
  elevated: 'bg-slate-900/90 shadow-xl shadow-black/20 border border-white/10',
  outlined: 'bg-transparent border-2 border-white/10',
  glass: 'bg-white/5 backdrop-blur-sm border border-white/10',
};

const paddingClasses: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export const Card = memo(({
  children,
  variant = 'default',
  padding = 'md',
  interactive = false,
  className = '',
  ...props
}: CardProps) => {
  return (
    <div
      className={`rounded-2xl ${variantClasses[variant]} ${paddingClasses[padding]} ${
        interactive ? 'cursor-pointer hover:bg-white/5 active:scale-[0.98] transition-all' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

// CardHeader - Encabezado de tarjeta
export const CardHeader = memo(({
  children,
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex items-center justify-between mb-3 ${className}`} {...props}>
    {children}
  </div>
));

CardHeader.displayName = 'CardHeader';

// CardTitle - Título de tarjeta
export const CardTitle = memo(({
  children,
  className = '',
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={`text-sm font-black uppercase tracking-wider text-white ${className}`} {...props}>
    {children}
  </h3>
));

CardTitle.displayName = 'CardTitle';

// CardContent - Contenido de tarjeta
export const CardContent = memo(({
  children,
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={className} {...props}>
    {children}
  </div>
));

CardContent.displayName = 'CardContent';
