/**
 * ThemeCustomizer - Componente para personalizar esquemas de color
 * 
 * Características:
 * - Ajustar tonos de colores (sliders)
 * - Preview en tiempo real
 * - Guardar localmente
 * - Exportar/Importar esquemas
 * - Guardar en la nube (opcional)
 */

import React, { useState, useCallback, useEffect } from 'react';
import { 
  Save, 
  Download, 
  Upload, 
  RotateCcw,
  Sun,
  Moon,
  Palette,
  Check,
  X,
  Cloud,
  CloudOff,
  Sliders,
  Eye,
  EyeOff
} from 'lucide-react';
import { useThemeManager } from '../useThemeManager';
import { ThemeScheme, ThemeColors } from '../ThemeManager';

// ============================================================================
// TIPOS
// ============================================================================

// Colores ajustables en el customizer
export type AdjustableColorKey = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'expired' | 'critical';

interface ColorAdjustment {
  hue: number;      // -180 a +180
  saturation: number; // -100 a +100
  lightness: number; // -100 a +100
}

interface CustomScheme {
  id: string;
  name: string;
  isBuiltIn: boolean;
  colors: Partial<ThemeColors>;
  adjustments?: Record<AdjustableColorKey, ColorAdjustment>;
  createdAt?: number;
  updatedAt?: number;
}

interface ThemeCustomizerProps {
  onSaveToCloud?: (scheme: CustomScheme) => Promise<boolean>;
  cloudEnabled?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex: string): ColorAdjustment {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { hue: 0, saturation: 0, lightness: 50 };

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return {
    hue: Math.round(h * 360),
    saturation: Math.round(s * 100),
    lightness: Math.round(l * 100)
  };
}

function adjustColor(baseColor: string, adjustment: ColorAdjustment): string {
  const hsl = hexToHsl(baseColor);
  return hslToHex(
    (hsl.hue + adjustment.hue) % 360,
    Math.max(0, Math.min(100, hsl.saturation + adjustment.saturation)),
    Math.max(0, Math.min(100, hsl.lightness + adjustment.lightness))
  );
}

// ============================================================================
// CONSTANTES
// ============================================================================

// Colores ajustables disponibles en el customizer
export const ADJUSTABLE_COLORS: AdjustableColorKey[] = [
  'primary', 'success', 'warning', 'error', 'info', 'expired', 'critical'
];

// Nombres amigables para los colores
export const COLOR_LABELS: Record<AdjustableColorKey, string> = {
  primary: 'Acento Principal',
  success: 'Éxito',
  warning: 'Advertencia',
  error: 'Error',
  info: 'Información',
  expired: 'Vencido',
  critical: 'Crítico'
};

const PRESET_SCHEMES: Record<ThemeScheme, CustomScheme> = {
  appsheet: {
    id: 'appsheet',
    name: 'AppSheet',
    isBuiltIn: true,
    colors: {
      primary: '#8AB4F8',
      primaryHover: '#AECBFA',
      primaryPressed: '#669DF6',
      primarySubtle: 'rgba(138, 180, 248, 0.12)',
      success: '#4ADE80',
      successSubtle: 'rgba(74, 222, 128, 0.12)',
      warning: '#FBBF24',
      warningSubtle: 'rgba(251, 191, 36, 0.12)',
      error: '#F87171',
      errorSubtle: 'rgba(248, 113, 113, 0.12)',
      info: '#60A5FA',
      infoSubtle: 'rgba(96, 165, 250, 0.12)',
      expired: '#ef4444',
      critical: '#f97316',
      bgBase: '#121212',
    }
  },
  'noche-gray': {
    id: 'noche-gray',
    name: 'Noche Gray',
    isBuiltIn: true,
    colors: {
      primary: '#6B7280',
      primaryHover: '#9CA3AF',
      primaryPressed: '#4B5563',
      primarySubtle: 'rgba(107, 114, 128, 0.12)',
      success: '#6B7280',
      successSubtle: 'rgba(107, 114, 128, 0.12)',
      warning: '#9CA3AF',
      warningSubtle: 'rgba(156, 163, 175, 0.12)',
      error: '#A1A1AA',
      errorSubtle: 'rgba(161, 161, 170, 0.12)',
      info: '#71717a',
      infoSubtle: 'rgba(113, 113, 122, 0.12)',
      expired: '#a1a1aa',
      critical: '#9ca3af',
      bgBase: '#141414',
    }
  },
  industrial: {
    id: 'industrial',
    name: 'Industrial',
    isBuiltIn: true,
    colors: {
      primary: '#3B82F6',
      primaryHover: '#60A5FA',
      primaryPressed: '#2563EB',
      primarySubtle: 'rgba(59, 130, 246, 0.12)',
      success: '#22C55E',
      successSubtle: 'rgba(34, 197, 94, 0.12)',
      warning: '#F59E0B',
      warningSubtle: 'rgba(245, 158, 11, 0.12)',
      error: '#EF4444',
      errorSubtle: 'rgba(239, 68, 68, 0.12)',
      info: '#3B82F6',
      infoSubtle: 'rgba(59, 130, 246, 0.12)',
      expired: '#ef4444',
      critical: '#f97316',
      bgBase: '#0F172A',
    }
  }
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({
  onSaveToCloud,
  cloudEnabled = false
}) => {
  const { mode, scheme, colors, setScheme } = useThemeManager();
  
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'colors' | 'presets' | 'save'>('colors');
  
  // Estado de personalización
  const [customColors, setCustomColors] = useState<Partial<ThemeColors>>({});
  const [adjustments, setAdjustments] = useState<Record<AdjustableColorKey, ColorAdjustment>>({});
  
  // Estado de esquemas guardados
  const [savedSchemes, setSavedSchemes] = useState<CustomScheme[]>([]);
  const [newSchemeName, setNewSchemeName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Preview
  const [showPreview, setShowPreview] = useState(true);
  
  // Cargar esquemas guardados
  useEffect(() => {
    try {
      const saved = localStorage.getItem('custom_themes');
      if (saved) {
        setSavedSchemes(JSON.parse(saved));
      }
    } catch {}
  }, []);

  // ============================================================================
  // HELPERS DE COLOR
  // ============================================================================

  // Obtener color efectivo (con soporte para todos los colores ajustables)
  const getEffectiveColor = (key: AdjustableColorKey): string => {
    // Primero verificar si hay color personalizado directo
    if (customColors[key]) return customColors[key] as string;
    
    // Luego verificar si hay ajustes HSL
    if (adjustments[key]) {
      const base = colors[key];
      if (typeof base === 'string' && base.startsWith('#')) {
        return adjustColor(base, adjustments[key]);
      }
    }
    
    // Finalmente usar el color base del tema
    return (colors[key] as string) || '#8AB4F8';
  };

  // ============================================================================
  // INYECCIÓN DE CSS VARIABLES
  // ============================================================================
  
  const applyCSSVariables = useCallback((colorKey: AdjustableColorKey, color: string) => {
    const root = document.documentElement;
    
    // Mapear colores a variables CSS
    const cssVarMap: Record<AdjustableColorKey, string[]> = {
      primary: ['--color-primary', '--color-primary-hover', '--color-primary-pressed', '--color-primary-subtle'],
      success: ['--color-success', '--color-success-subtle'],
      warning: ['--color-warning', '--color-warning-subtle'],
      error: ['--color-error', '--color-error-subtle'],
      info: ['--color-info', '--color-info-subtle'],
      expired: ['--color-expired'],
      critical: ['--color-critical'],
    };
    
    const vars = cssVarMap[colorKey];
    if (vars && vars.length > 0) {
      root.style.setProperty(vars[0], color);
      
      // Generar variaciones para hover/pressed/subtle si es primary
      if (colorKey === 'primary') {
        const hsl = hexToHsl(color);
        // Hover: más brillante
        root.style.setProperty(vars[1], hslToHex(hsl.hue, hsl.saturation, Math.min(60, hsl.lightness + 15)));
        // Pressed: más oscuro
        root.style.setProperty(vars[2], hslToHex(hsl.hue, hsl.saturation, Math.max(30, hsl.lightness - 15)));
        // Subtle: versión translúcida
        root.style.setProperty(vars[3], adjustColor(color, { hue: 0, saturation: 0, lightness: 0 }) + '1a');
      }
    }
  }, []);

  // Aplicar todos los colores ajustados a CSS
  useEffect(() => {
    ADJUSTABLE_COLORS.forEach(key => {
      const effectiveColor = getEffectiveColor(key);
      if (effectiveColor) {
        applyCSSVariables(key, effectiveColor);
      }
    });
  }, [customColors, adjustments, applyCSSVariables]);

  // Ajustar un color
  const handleAdjust = (key: string, adjustment: Partial<ColorAdjustment>) => {
    setAdjustments(prev => {
      const current = prev[key] || { hue: 0, saturation: 0, lightness: 50 };
      return {
        ...prev,
        [key]: {
          ...current,
          ...adjustment
        }
      };
    });
  };

  // Resetear ajustes
  const handleReset = () => {
    setCustomColors({});
    setAdjustments({});
  };

  // Guardar esquema
  const handleSave = async () => {
    if (!newSchemeName.trim()) return;
    
    setIsSaving(true);
    const newScheme: CustomScheme = {
      id: `custom_${Date.now()}`,
      name: newSchemeName.trim(),
      isBuiltIn: false,
      colors: { ...customColors },
      adjustments: { ...adjustments },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    const updated = [...savedSchemes.filter(s => s.id !== newScheme.id), newScheme];
    setSavedSchemes(updated);
    
    try {
      localStorage.setItem('custom_themes', JSON.stringify(updated));
      
      if (cloudEnabled && onSaveToCloud) {
        await onSaveToCloud(newScheme);
      }
    } catch {}
    
    setNewSchemeName('');
    setIsSaving(false);
    setActiveTab('presets');
  };

  // Aplicar esquema
  const handleApply = (schemeToApply: CustomScheme) => {
    if (schemeToApply.colors) {
      setCustomColors(schemeToApply.colors);
    }
    if (schemeToApply.adjustments) {
      setAdjustments(schemeToApply.adjustments);
    }
    if (!schemeToApply.isBuiltIn) {
      setScheme(schemeToApply.id as ThemeScheme);
    }
  };

  // Eliminar esquema
  const handleDelete = (id: string) => {
    const updated = savedSchemes.filter(s => s.id !== id);
    setSavedSchemes(updated);
    localStorage.setItem('custom_themes', JSON.stringify(updated));
  };

  // Exportar esquema
  const handleExport = () => {
    const exportData = {
      customColors,
      adjustments,
      scheme: {
        id: `export_${Date.now()}`,
        name: 'Custom Export',
        isBuiltIn: false,
        colors: customColors,
        adjustments,
        createdAt: Date.now()
      }
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `theme_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Importar esquema
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (data.customColors) setCustomColors(data.customColors);
          if (data.adjustments) setAdjustments(data.adjustments);
          if (data.scheme?.name) setNewSchemeName(data.scheme.name);
        } catch {
          alert('Archivo inválido');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Clases CSS
  const isDark = mode === 'dark';
  const panelClass = isDark 
    ? 'bg-[#1a1a1a] border-[rgba(255,255,255,0.08)]' 
    : 'bg-white border-zinc-200';
  const textClass = isDark ? 'text-white' : 'text-zinc-900';
  const mutedClass = isDark ? 'text-[#71717a]' : 'text-zinc-500';

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${panelClass} border`}
      >
        <Sliders className="w-4 h-4" />
        <span className={`text-sm font-medium ${textClass}`}>Personalizar</span>
      </button>

      {/* Panel */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className={`absolute right-0 top-full mt-2 z-50 w-[480px] max-h-[80vh] rounded-xl overflow-hidden shadow-2xl ${panelClass}`}>
            
            {/* Header */}
            <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? 'border-[rgba(255,255,255,0.08)]' : 'border-zinc-200'}`}>
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-[#8AB4F8]" />
                <h2 className={`text-base font-bold ${textClass}`}>Personalizador de Temas</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-[#2d2d2d]' : 'hover:bg-zinc-100'}`}
                >
                  {showPreview ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-[#2d2d2d]' : 'hover:bg-zinc-100'}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className={`flex border-b ${isDark ? 'border-[rgba(255,255,255,0.08)]' : 'border-zinc-200'}`}>
              {(['colors', 'presets', 'save'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors
                    ${activeTab === tab 
                      ? isDark 
                        ? 'text-[#8AB4F8] border-b-2 border-[#8AB4F8]' 
                        : 'text-blue-600 border-b-2 border-blue-600'
                      : mutedClass
                    }`}
                >
                  {tab === 'colors' ? 'Colores' : tab === 'presets' ? 'Plantillas' : 'Guardar'}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="p-4 max-h-[400px] overflow-y-auto">
              
              {/* TAB: Colores */}
              {activeTab === 'colors' && (
                <div className="space-y-4">
                  {ADJUSTABLE_COLORS.map(colorKey => (
                    <div key={colorKey} className={`p-3 rounded-lg ${isDark ? 'bg-[#2d2d2d]' : 'bg-zinc-50'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-sm font-medium capitalize ${textClass}`}>
                          {COLOR_LABELS[colorKey]}
                        </span>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-6 h-6 rounded-full border border-black/20"
                            style={{ backgroundColor: getEffectiveColor(colorKey) }}
                          />
                          <span className={`text-xs font-mono ${mutedClass}`}>
                            {getEffectiveColor(colorKey)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {/* Matiz */}
                        <div className="flex items-center gap-2">
                          <span className={`text-xs w-8 ${mutedClass}`}>Ton</span>
                          <input
                            type="range"
                            min="-180"
                            max="180"
                            value={adjustments[colorKey]?.hue || 0}
                            onChange={(e) => handleAdjust(colorKey, { hue: parseInt(e.target.value) })}
                            className="flex-1"
                          />
                        </div>
                        
                        {/* Saturación */}
                        <div className="flex items-center gap-2">
                          <span className={`text-xs w-8 ${mutedClass}`}>Sat</span>
                          <input
                            type="range"
                            min="-100"
                            max="100"
                            value={adjustments[colorKey]?.saturation || 0}
                            onChange={(e) => handleAdjust(colorKey, { saturation: parseInt(e.target.value) })}
                            className="flex-1"
                          />
                        </div>
                        
                        {/* Brillo */}
                        <div className="flex items-center gap-2">
                          <span className={`text-xs w-8 ${mutedClass}`}>Luz</span>
                          <input
                            type="range"
                            min="-100"
                            max="100"
                            value={adjustments[colorKey]?.lightness || 0}
                            onChange={(e) => handleAdjust(colorKey, { lightness: parseInt(e.target.value) })}
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <button
                    onClick={handleReset}
                    className={`w-full py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2
                      ${isDark ? 'bg-[#2d2d2d] hover:bg-[#353535]' : 'bg-zinc-100 hover:bg-zinc-200'} ${textClass}`}
                  >
                    <RotateCcw className="w-4 h-4" />
                    Restablecer valores
                  </button>
                </div>
              )}

              {/* TAB: Presets */}
              {activeTab === 'presets' && (
                <div className="space-y-3">
                  {/* Presets integrados */}
                  <p className={`text-xs font-medium uppercase tracking-wider ${mutedClass}`}>Esquemas integrados</p>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(PRESET_SCHEMES).map(([id, preset]) => (
                      <button
                        key={id}
                        onClick={() => handleApply(preset)}
                        className={`p-3 rounded-lg border text-left transition-all
                          ${scheme === id 
                            ? 'border-[#8AB4F8] bg-[#8AB4F8]/10' 
                            : isDark ? 'border-[rgba(255,255,255,0.08)] hover:bg-[#2d2d2d]' 
                            : 'border-zinc-200 hover:bg-zinc-50'
                          }`}
                      >
                        <div className="flex gap-1 mb-2">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.colors.primary }} />
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.colors.bgBase }} />
                        </div>
                        <p className={`text-xs font-medium ${textClass}`}>{preset.name}</p>
                      </button>
                    ))}
                  </div>

                  {/* Esquemas guardados */}
                  {savedSchemes.length > 0 && (
                    <>
                      <p className={`text-xs font-medium uppercase tracking-wider ${mutedClass} mt-4`}>Guardados</p>
                      <div className="space-y-2">
                        {savedSchemes.map(saved => (
                          <div 
                            key={saved.id}
                            className={`p-3 rounded-lg flex items-center justify-between ${isDark ? 'bg-[#2d2d2d]' : 'bg-zinc-50'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex gap-1">
                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: saved.colors.primary }} />
                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: saved.colors.bgBase }} />
                              </div>
                              <span className={`text-sm font-medium ${textClass}`}>{saved.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleApply(saved)}
                                className={`p-1.5 rounded ${isDark ? 'hover:bg-[#353535]' : 'hover:bg-zinc-200'}`}
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(saved.id)}
                                className={`p-1.5 rounded ${isDark ? 'hover:bg-[#353535]' : 'hover:bg-zinc-200'}`}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB: Guardar */}
              {activeTab === 'save' && (
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${textClass}`}>Nombre del esquema</label>
                    <input
                      type="text"
                      value={newSchemeName}
                      onChange={(e) => setNewSchemeName(e.target.value)}
                      placeholder="Mi esquema personalizado"
                      className={`w-full px-4 py-2.5 rounded-lg border text-sm
                        ${isDark 
                          ? 'bg-[#2d2d2d] border-[rgba(255,255,255,0.12)] text-white' 
                          : 'bg-white border-zinc-300 text-zinc-900'
                        } outline-none focus:border-[#8AB4F8]`}
                    />
                  </div>
                  
                  <button
                    onClick={handleSave}
                    disabled={!newSchemeName.trim() || isSaving}
                    className={`w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all
                      ${newSchemeName.trim() && !isSaving
                        ? 'bg-[#8AB4F8] hover:bg-[#AECBFA] text-black'
                        : isDark ? 'bg-[#2d2d2d] text-[#52525b]' : 'bg-zinc-100 text-zinc-400'
                      }`}
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Guardando...' : 'Guardar esquema'}
                  </button>

                  <div className={`pt-4 border-t ${isDark ? 'border-[rgba(255,255,255,0.08)]' : 'border-zinc-200'}`}>
                    <p className={`text-xs font-medium uppercase tracking-wider ${mutedClass} mb-3`}>Exportar / Importar</p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleExport}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2
                          ${isDark ? 'bg-[#2d2d2d] hover:bg-[#353535]' : 'bg-zinc-100 hover:bg-zinc-200'} ${textClass}`}
                      >
                        <Download className="w-4 h-4" />
                        Exportar
                      </button>
                      <button
                        onClick={handleImport}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2
                          ${isDark ? 'bg-[#2d2d2d] hover:bg-[#353535]' : 'bg-zinc-100 hover:bg-zinc-200'} ${textClass}`}
                      >
                        <Upload className="w-4 h-4" />
                        Importar
                      </button>
                    </div>
                  </div>

                  {cloudEnabled && (
                    <div className={`p-3 rounded-lg flex items-center gap-3 ${isDark ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                      <Cloud className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className={`text-sm font-medium ${textClass}`}>Sincronización en la nube</p>
                        <p className={`text-xs ${mutedClass}`}>Guarda tus esquemas en la nube para acceder desde cualquier dispositivo</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Preview */}
            {showPreview && (
              <div className={`p-4 border-t ${isDark ? 'border-[rgba(255,255,255,0.08)] bg-[#0f0f0f]' : 'border-zinc-200 bg-zinc-100'}`}>
                <p className={`text-xs font-medium uppercase tracking-wider ${mutedClass} mb-3`}>Vista previa</p>
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-lg"
                    style={{ backgroundColor: getEffectiveColor('primary') }}
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex gap-2">
                      <div className="h-3 rounded" style={{ width: 60, backgroundColor: getEffectiveColor('success') }} />
                      <div className="h-3 rounded" style={{ width: 40, backgroundColor: getEffectiveColor('warning') }} />
                      <div className="h-3 rounded" style={{ width: 40, backgroundColor: getEffectiveColor('error') }} />
                    </div>
                    <div className="h-6 rounded" style={{ backgroundColor: getEffectiveColor('bgBase') }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
