/**
 * IndustrialScanFeedback - Feedback visual profesional para escaneos
 * 
 * Características:
 * - Animación sutil de confirmación
 * - Sin bloqueo de UI
 * - Feedback auditivo opcional
 */

import React, { useEffect, useState, memo } from 'react';
import { Check, AlertCircle, Undo2, Plus, Minus } from 'lucide-react';

type FeedbackType = 'success' | 'error' | 'undo' | 'added' | 'removed' | null;

interface IndustrialScanFeedbackProps {
  feedback: FeedbackType;
  lastBarcode?: string;
  lastQuantity?: number;
  productName?: string;
}

// Configuración de colores por tipo
const FEEDBACK_CONFIG = {
  success: {
    icon: Check,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500',
    text: 'Confirmado'
  },
  error: {
    icon: AlertCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500',
    text: 'Error'
  },
  undo: {
    icon: Undo2,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500',
    text: 'Deshecho'
  },
  added: {
    icon: Plus,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500',
    text: 'Agregado'
  },
  removed: {
    icon: Minus,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500',
    text: 'Removido'
  }
};

export const IndustrialScanFeedback: React.FC<IndustrialScanFeedbackProps> = memo(({
  feedback,
  lastBarcode,
  lastQuantity,
  productName
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [animationClass, setAnimationClass] = useState('');

  useEffect(() => {
    if (!feedback) return;
    
    setIsVisible(true);
    setAnimationClass('animate-in fade-in zoom-in duration-200');

    // Auto-hide after delay
    const timer = setTimeout(() => {
      setAnimationClass('animate-out fade-out zoom-out duration-150');
      setTimeout(() => setIsVisible(false), 150);
    }, 600);

    return () => clearTimeout(timer);
  }, [feedback, lastBarcode]);
  
  if (!isVisible || !feedback) return null;

  const config = FEEDBACK_CONFIG[feedback];
  const Icon = config.icon;

  return (
    <>
      {/* Flash overlay - subtle background flash */}
      <div 
        className={`
          absolute inset-0 pointer-events-none transition-opacity duration-200
          ${config.bgColor.replace('bg-', 'bg-')}/10
          ${isVisible ? 'opacity-100' : 'opacity-0'}
        `} 
      />
      
      {/* Toast notification */}
      <div className={`
        absolute top-20 left-1/2 -translate-x-1/2 z-50
        ${animationClass}
      `}>
        <div className={`
          flex items-center gap-3 px-4 py-2.5 rounded-2xl
          bg-surface/95 backdrop-blur-sm border border-subtle
          shadow-2xl shadow-black/50
        `}>
          {/* Icon */}
          <div className={`
            w-8 h-8 rounded-xl ${config.bgColor}/20 flex items-center justify-center
          `}>
            <Icon className={`w-4 h-4 ${config.color}`} />
          </div>
          
          {/* Content */}
          <div className="flex flex-col">
            <span className={`text-xs font-bold ${config.color} uppercase tracking-wider`}>
              {config.text}
            </span>
            {lastBarcode && (
              <span className="text-[10px] text-muted font-mono">
                {lastBarcode.slice(0, 12)}{lastBarcode.length > 12 ? '...' : ''}
              </span>
            )}
          </div>
          
          {/* Quantity badge */}
          {lastQuantity !== undefined && (
            <div className={`
              px-2 py-1 rounded-lg ${config.bgColor}/20
            `}>
              <span className={`text-sm font-black ${config.color}`}>
                +{lastQuantity}
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
});

IndustrialScanFeedback.displayName = 'IndustrialScanFeedback';
