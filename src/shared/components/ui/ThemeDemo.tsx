/**
 * ThemeDemo - Demostración del tema AppSheet Dark
 * 
 * Muestra todos los componentes del tema
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Check, 
  X, 
  AlertCircle, 
  Info, 
  AlertTriangle,
  Download,
  Settings,
  Plus,
  Search,
  ChevronRight
} from 'lucide-react';
import { AppSheetColors, AppSheetClasses } from '@/hooks/useAppSheetTheme';

export const ThemeDemo: React.FC = () => {
  const [inputValue, setInputValue] = useState('');

  return (
    <div className="min-h-screen bg-[var(--appsheet-bg-base)] p-6 space-y-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-[var(--appsheet-text-primary)] mb-2">
          AppSheet Dark Theme
        </h1>
        <p className="text-[var(--appsheet-text-secondary)]">
          Estilo sobrio y fácil de leer
        </p>
      </div>

      {/* === COLORS === */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--appsheet-text-primary)] mb-4">Colores</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Backgrounds */}
          <ColorSwatch name="Base" color="var(--appsheet-bg-base)" />
          <ColorSwatch name="Elevated" color="var(--appsheet-bg-elevated)" />
          <ColorSwatch name="Surface" color="var(--appsheet-bg-surface)" />
          <ColorSwatch name="Card" color="var(--appsheet-bg-card)" />
          
          {/* Accents */}
          <ColorSwatch name="Primary" color="var(--appsheet-accent-primary)" />
          <ColorSwatch name="Success" color="var(--appsheet-success)" />
          <ColorSwatch name="Warning" color="var(--appsheet-warning)" />
          <ColorSwatch name="Error" color="var(--appsheet-error)" />
        </div>
      </section>

      {/* === TYPOGRAPHY === */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--appsheet-text-primary)] mb-4">Tipografía</h2>
        
        <div className="space-y-3">
          <p className="text-display text-[var(--appsheet-text-primary)]">Display - Títulos principales</p>
          <p className="text-title text-[var(--appsheet-text-primary)]">Title - Subtítulos</p>
          <p className="text-body text-[var(--appsheet-text-primary)]">Body - Texto de párrafos</p>
          <p className="text-caption text-[var(--appsheet-text-secondary)]">Caption - Texto pequeño</p>
          <p className="text-label text-[var(--appsheet-text-tertiary)]">Label - Etiquetas</p>
        </div>
      </section>

      {/* === BUTTONS === */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--appsheet-text-primary)] mb-4">Botones</h2>
        
        <div className="flex flex-wrap gap-3">
          <button className={`appsheet-btn appsheet-btn--primary`}>
            <Plus className="w-4 h-4" /> Primary
          </button>
          <button className={`appsheet-btn appsheet-btn--secondary`}>
            <Settings className="w-4 h-4" /> Secondary
          </button>
          <button className={`appsheet-btn appsheet-btn--ghost`}>
            <Search className="w-4 h-4" /> Ghost
          </button>
          <button className={`appsheet-btn appsheet-btn--danger`}>
            <X className="w-4 h-4" /> Danger
          </button>
          <button className={`appsheet-btn appsheet-btn--primary appsheet-btn--sm`}>
            Small
          </button>
          <button className={`appsheet-btn appsheet-btn--primary appsheet-btn--lg`}>
            Large
          </button>
          <button className={`appsheet-btn appsheet-btn--primary`} disabled>
            Disabled
          </button>
        </div>
      </section>

      {/* === INPUTS === */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--appsheet-text-primary)] mb-4">Inputs</h2>
        
        <div className="max-w-md space-y-4">
          <input 
            type="text"
            className="appsheet-input"
            placeholder="Input normal"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <input 
            type="text"
            className="appsheet-input appsheet-input--error"
            placeholder="Input con error"
            defaultValue="Valor inválido"
          />
          <input 
            type="text"
            className="appsheet-input appsheet-input--success"
            placeholder="Input válido"
            defaultValue="Valor correcto"
          />
          <input 
            type="text"
            className="appsheet-input"
            placeholder="Input deshabilitado"
            disabled
          />
        </div>
      </section>

      {/* === BADGES === */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--appsheet-text-primary)] mb-4">Badges</h2>
        
        <div className="flex flex-wrap gap-2">
          <span className="appsheet-badge appsheet-badge--default">Default</span>
          <span className="appsheet-badge appsheet-badge--primary">Primary</span>
          <span className="appsheet-badge appsheet-badge--success">
            <Check className="w-3 h-3" /> Success
          </span>
          <span className="appsheet-badge appsheet-badge--warning">
            <AlertTriangle className="w-3 h-3" /> Warning
          </span>
          <span className="appsheet-badge appsheet-badge--error">
            <X className="w-3 h-3" /> Error
          </span>
          <span className="appsheet-badge appsheet-badge--info">
            <Info className="w-3 h-3" /> Info
          </span>
        </div>
      </section>

      {/* === CARDS === */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--appsheet-text-primary)] mb-4">Cards</h2>
        
        <div className="grid md:grid-cols-3 gap-4">
          <div className="appsheet-card">
            <h3 className="text-[var(--appsheet-text-primary)] font-semibold mb-2">Card Normal</h3>
            <p className="text-[var(--appsheet-text-secondary)] text-sm">
              Tarjeta con borde sutil y hover
            </p>
          </div>
          
          <div className="appsheet-card appsheet-card--elevated">
            <h3 className="text-[var(--appsheet-text-primary)] font-semibold mb-2">Card Elevated</h3>
            <p className="text-[var(--appsheet-text-secondary)] text-sm">
              Tarjeta con sombra
            </p>
          </div>
          
          <div className="appsheet-card appsheet-card--interactive">
            <h3 className="text-[var(--appsheet-text-primary)] font-semibold mb-2">Card Interactive</h3>
            <p className="text-[var(--appsheet-text-secondary)] text-sm">
              Haz clic para ver el efecto
            </p>
          </div>
        </div>
      </section>

      {/* === LISTS === */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--appsheet-text-primary)] mb-4">Listas</h2>
        
        <div className="appsheet-card p-0 overflow-hidden">
          <div className="appsheet-list">
            <div className="appsheet-list-item appsheet-list-item--interactive">
              <div className="w-10 h-10 rounded-full bg-[var(--appsheet-accent-subtle)] flex items-center justify-center">
                <span className="text-[var(--appsheet-accent-primary)] font-bold">JD</span>
              </div>
              <div className="flex-1">
                <p className="text-[var(--appsheet-text-primary)] font-medium">Juan Díaz</p>
                <p className="text-[var(--appsheet-text-tertiary)] text-sm">juan@ejemplo.com</p>
              </div>
              <ChevronRight className="w-5 h-5 text-[var(--appsheet-text-tertiary)]" />
            </div>
            <div className="appsheet-list-item appsheet-list-item--interactive">
              <div className="w-10 h-10 rounded-full bg-[var(--appsheet-success-subtle)] flex items-center justify-center">
                <span className="text-[var(--appsheet-success)] font-bold">ML</span>
              </div>
              <div className="flex-1">
                <p className="text-[var(--appsheet-text-primary)] font-medium">María López</p>
                <p className="text-[var(--appsheet-text-tertiary)] text-sm">maria@ejemplo.com</p>
              </div>
              <ChevronRight className="w-5 h-5 text-[var(--appsheet-text-tertiary)]" />
            </div>
          </div>
        </div>
      </section>

      {/* === ALERTS === */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--appsheet-text-primary)] mb-4">Alertas</h2>
        
        <div className="space-y-3">
          <Alert variant="success" title="Éxito" message="La operación se completó correctamente." />
          <Alert variant="warning" title="Advertencia" message="Hay elementos que requieren atención." />
          <Alert variant="error" title="Error" message="Ocurrió un problema al procesar la solicitud." />
          <Alert variant="info" title="Información" message="Nuevas funciones están disponibles." />
        </div>
      </section>

      {/* === TABS === */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--appsheet-text-primary)] mb-4">Tabs</h2>
        
        <TabsDemo />
      </section>

      {/* === SKELETON === */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--appsheet-text-primary)] mb-4">Skeleton Loading</h2>
        
        <div className="flex gap-4">
          <div className="w-12 h-12 appsheet-skeleton rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 appsheet-skeleton w-3/4" />
            <div className="h-3 appsheet-skeleton w-1/2" />
          </div>
        </div>
      </section>
    </div>
  );
};

// Componentes auxiliares

const ColorSwatch: React.FC<{ name: string; color: string }> = ({ name, color }) => (
  <div className="text-center">
    <div 
      className="w-full aspect-square rounded-xl border border-[var(--appsheet-border-subtle)] mb-2"
      style={{ backgroundColor: color }}
    />
    <span className="text-xs text-[var(--appsheet-text-secondary)]">{name}</span>
  </div>
);

const Alert: React.FC<{
  variant: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
}> = ({ variant, title, message }) => {
  const config = {
    success: { bg: 'var(--appsheet-success-subtle)', border: 'var(--appsheet-success)', icon: Check },
    warning: { bg: 'var(--appsheet-warning-subtle)', border: 'var(--appsheet-warning)', icon: AlertTriangle },
    error: { bg: 'var(--appsheet-error-subtle)', border: 'var(--appsheet-error)', icon: X },
    info: { bg: 'var(--appsheet-info-subtle)', border: 'var(--appsheet-info)', icon: Info },
  };

  const { bg, border, icon: Icon } = config[variant];

  return (
    <div 
      className="flex gap-3 p-4 rounded-xl border"
      style={{ backgroundColor: bg, borderColor: border }}
    >
      <Icon className="w-5 h-5 shrink-0" style={{ color: border }} />
      <div>
        <p className="font-semibold text-[var(--appsheet-text-primary)]">{title}</p>
        <p className="text-sm text-[var(--appsheet-text-secondary)]">{message}</p>
      </div>
    </div>
  );
};

const TabsDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  
  return (
    <div>
      <div className="appsheet-tabs-pill">
        <button 
          className={`appsheet-tab ${activeTab === 0 ? 'appsheet-tab--active' : ''}`}
          onClick={() => setActiveTab(0)}
        >
          Tab 1
        </button>
        <button 
          className={`appsheet-tab ${activeTab === 1 ? 'appsheet-tab--active' : ''}`}
          onClick={() => setActiveTab(1)}
        >
          Tab 2
        </button>
        <button 
          className={`appsheet-tab ${activeTab === 2 ? 'appsheet-tab--active' : ''}`}
          onClick={() => setActiveTab(2)}
        >
          Tab 3
        </button>
      </div>
      
      <div className="mt-4 p-4 bg-[var(--appsheet-bg-surface)] rounded-xl border border-[var(--appsheet-border-subtle)]">
        <p className="text-[var(--appsheet-text-primary)]">
          Contenido del Tab {activeTab + 1}
        </p>
      </div>
    </div>
  );
};

export default ThemeDemo;
