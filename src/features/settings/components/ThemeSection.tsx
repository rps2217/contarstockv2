import React, { useState } from 'react';
import { Palette, Check, Sun, Moon, Contrast, Sparkles, Sliders, Download, Upload } from 'lucide-react';
import { AppSettings, Theme } from '../../../types';

interface Props {
  settings: AppSettings;
  updateSetting: (key: keyof AppSettings, value: any) => void;
  theme?: 'dark' | 'light' | 'high-contrast' | 'appsheet-dark';
}

// ============================================================================
// HELPERS HSL
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

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 50 };
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
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
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// ============================================================================
// COLOR SLIDER COMPONENT
// ============================================================================

const ColorSlider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  color: string;
  onChange: (v: number) => void;
  isDark?: boolean;
}> = ({ label, value, min, max, color, onChange, isDark }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <span className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{label}</span>
      <span className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{value > 0 ? '+' : ''}{value}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      className="w-full h-2 rounded-full appearance-none cursor-pointer"
      style={{
        background: `linear-gradient(to right, ${color}88, ${color})`
      }}
    />
  </div>
);

export const ThemeSection: React.FC<Props> = ({ settings, updateSetting, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const isLight = theme === 'light';
  const isHighContrast = theme === 'high-contrast';
  const isAppSheetDark = theme === 'appsheet-dark';

  // Estado del personalizador
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [customPrimary, setCustomPrimary] = useState({ h: 0, s: 0, l: 0 });
  const [savedSchemes, setSavedSchemes] = useState<{id: string; name: string; color: string}[]>(() => {
    try {
      const saved = localStorage.getItem('custom_color_schemes');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Obtener color actual del tema
  const currentColor = '#8AB4F8'; // Color primario actual
  const previewHsl = hexToHsl(currentColor);
  const adjustedHsl = {
    h: (previewHsl.h + customPrimary.h + 360) % 360,
    s: Math.max(0, Math.min(100, previewHsl.s + customPrimary.s)),
    l: Math.max(0, Math.min(100, previewHsl.l + customPrimary.l))
  };
  const previewColor = hslToHex(adjustedHsl.h, adjustedHsl.s, adjustedHsl.l);

  // Aplicar color personalizado
  const applyCustomColor = () => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', previewColor);
    if (navigator.vibrate) navigator.vibrate(10);
  };

  // Resetear
  const resetCustom = () => {
    setCustomPrimary({ h: 0, s: 0, l: 0 });
    document.documentElement.style.removeProperty('--color-primary');
  };

  // Guardar esquema
  const saveScheme = () => {
    const name = prompt('Nombre del esquema:');
    if (!name) return;
    const newScheme = { id: `scheme_${Date.now()}`, name, color: previewColor };
    const updated = [...savedSchemes, newScheme];
    setSavedSchemes(updated);
    localStorage.setItem('custom_color_schemes', JSON.stringify(updated));
    setShowCustomizer(false);
  };

  // Eliminar esquema
  const deleteScheme = (id: string) => {
    const updated = savedSchemes.filter(s => s.id !== id);
    setSavedSchemes(updated);
    localStorage.setItem('custom_color_schemes', JSON.stringify(updated));
  };

  // Exportar
  const exportScheme = () => {
    const data = { primary: previewColor, adjustments: customPrimary };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `color_scheme_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Importar
  const importScheme = () => {
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
          if (data.primary) {
            const hsl = hexToHsl(data.primary);
            setCustomPrimary({ h: hsl.h - previewHsl.h, s: hsl.s - previewHsl.s, l: hsl.l - previewHsl.l });
          }
        } catch { alert('Archivo invalido'); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const themes: {id: Theme, label: string, bg: string, accent: string, text: string, icon: any}[] = [
    { 
      id: 'light', 
      label: 'Día', 
      bg: 'bg-white', 
      accent: 'bg-blue-600', 
      text: 'text-slate-900', 
      icon: Sun 
    },
    { 
      id: 'dark', 
      label: 'Noche', 
      bg: 'bg-[#0f1423]', 
      accent: 'bg-blue-500', 
      text: 'text-white', 
      icon: Moon 
    },
    { 
      id: 'high-contrast', 
      label: 'Contraste', 
      bg: 'bg-black', 
      accent: 'bg-yellow-500', 
      text: 'text-yellow-400', 
      icon: Contrast 
    },
    { 
      id: 'appsheet-dark', 
      label: 'Noche Gray', 
      bg: 'bg-[#0d0d0d]', 
      accent: 'bg-[#8AB4F8]', 
      text: 'text-[#e6e6e6]', 
      icon: Sparkles 
    },
  ];

  const infoBg = isHighContrast ? 'bg-yellow-900/20 border-yellow-400' : isLight ? 'bg-indigo-50 border-indigo-100' : 'bg-indigo-950/20 border-indigo-900/30';
  const infoIcon = isHighContrast ? 'text-yellow-400' : isLight ? 'text-indigo-500' : 'text-indigo-400';
  const infoText = isHighContrast ? 'text-yellow-400' : isLight ? 'text-indigo-900' : 'text-indigo-400';

  const handleThemeChange = (themeId: Theme) => {
    if (navigator.vibrate) navigator.vibrate(15);
    updateSetting('theme', themeId);
    
    // Aplicar clases de tema al body
    document.body.classList.remove('appsheet-dark', 'noche-gray-theme', 'noche-theme');
    if (themeId === 'appsheet-dark') {
      document.body.classList.add('noche-gray-theme');
    }
  };

  return (
    <section className="space-y-6 animate-in slide-in-from-bottom-2">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {themes.map(t => {
          const isSelected = (settings.theme || 'dark') === t.id;
          const Icon = t.icon;
          return (
            <button 
              key={t.id}
              onClick={() => handleThemeChange(t.id)}
              className={`
                relative p-3 md:p-5 rounded-2xl border-4 flex flex-col items-center gap-2 md:gap-3 transition-all active:scale-95 overflow-hidden
                ${isSelected 
                  ? `border-blue-600 shadow-2xl shadow-blue-500/20 z-10 ${t.bg}` 
                  : isHighContrast 
                    ? `border-yellow-400/30 ${t.bg} opacity-80 hover:opacity-100 hover:border-yellow-400/50`
                    : `border-slate-100 dark:border-white/5 ${t.bg} opacity-80 hover:opacity-100 hover:border-slate-200`
                }
              `}
            >
              <div className={`w-9 h-9 md:w-11 md:h-11 rounded-xl flex items-center justify-center shadow-lg ${t.accent} ${isSelected ? 'animate-bounce' : ''}`}>
                <Icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>

              <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-wide ${t.text}`}>
                {t.label}
              </span>
            
              {isSelected && (
                <div className={`absolute top-2 right-2 rounded-full p-0.5 md:p-1 shadow-md border-2 ${
                  isHighContrast ? 'bg-yellow-400 border-black' : 'bg-blue-600 border-white'
                }`}>
                  <Check className="w-2 md:w-2.5 h-2 md:h-2.5 text-white stroke-[4px]" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Botón de personalización */}
      <button
        onClick={() => setShowCustomizer(!showCustomizer)}
        className={`w-full py-3 px-4 rounded-xl border-2 flex items-center justify-center gap-2 font-medium transition-all
          ${showCustomizer 
            ? isDark ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'
            : isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-600'
          }`}
      >
        <Sliders className="w-4 h-4" />
        {showCustomizer ? 'Ocultar personalización' : 'Personalizar colores'}
      </button>

      {/* Panel de personalización */}
      {showCustomizer && (
        <div className={`p-4 rounded-xl border-2 space-y-4 ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <h4 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Acento Principal
            </h4>
            <div className="flex items-center gap-2">
              <div 
                className="w-6 h-6 rounded-full border-2 border-white/20 shadow-inner"
                style={{ backgroundColor: previewColor }}
              />
              <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {previewColor}
              </span>
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-3">
            <ColorSlider
              label="Tono"
              value={customPrimary.h}
              min={-180}
              max={180}
              color={currentColor}
              onChange={(v) => setCustomPrimary(prev => ({ ...prev, h: v }))}
              isDark={isDark}
            />
            <ColorSlider
              label="Saturación"
              value={customPrimary.s}
              min={-100}
              max={100}
              color={currentColor}
              onChange={(v) => setCustomPrimary(prev => ({ ...prev, s: v }))}
              isDark={isDark}
            />
            <ColorSlider
              label="Brillo"
              value={customPrimary.l}
              min={-100}
              max={100}
              color={currentColor}
              onChange={(v) => setCustomPrimary(prev => ({ ...prev, l: v }))}
              isDark={isDark}
            />
          </div>

          {/* Preview */}
          <div className={`p-3 rounded-lg flex items-center gap-3 ${isDark ? 'bg-slate-900/50' : 'bg-white'}`}>
            <div 
              className="w-10 h-10 rounded-lg shadow-inner"
              style={{ backgroundColor: previewColor }}
            />
            <div className="flex-1">
              <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>Vista previa</p>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Ajusta los valores para personalizar el color
              </p>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-2">
            <button
              onClick={resetCustom}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors
                ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-600'}`}
            >
              Restablecer
            </button>
            <button
              onClick={applyCustomColor}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors
                ${isDark ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
            >
              Aplicar
            </button>
            <button
              onClick={saveScheme}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors
                ${isDark ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
            >
              Guardar
            </button>
          </div>

          {/* Export/Import */}
          <div className="flex gap-2 pt-2 border-t border-slate-700/50">
            <button
              onClick={exportScheme}
              className={`flex-1 py-2 text-xs font-medium rounded-lg flex items-center justify-center gap-1 transition-colors
                ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-600'}`}
            >
              <Download className="w-3 h-3" /> Exportar
            </button>
            <button
              onClick={importScheme}
              className={`flex-1 py-2 text-xs font-medium rounded-lg flex items-center justify-center gap-1 transition-colors
                ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-600'}`}
            >
              <Upload className="w-3 h-3" /> Importar
            </button>
          </div>

          {/* Esquemas guardados */}
          {savedSchemes.length > 0 && (
            <div className="pt-2 border-t border-slate-700/50">
              <p className={`text-[10px] font-medium uppercase tracking-wider mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Esquemas guardados
              </p>
              <div className="flex flex-wrap gap-2">
                {savedSchemes.map(scheme => (
                  <div
                    key={scheme.id}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs
                      ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}
                  >
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: scheme.color }}
                    />
                    <span>{scheme.name}</span>
                    <button
                      onClick={() => deleteScheme(scheme.id)}
                      className="ml-1 text-slate-500 hover:text-red-400"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className={`border-4 rounded-[2rem] p-4 md:p-6 flex gap-3 md:gap-4 ${infoBg}`}>
        <Palette className={`w-5 h-5 md:w-7 md:h-7 shrink-0 ${infoIcon}`} />
        <p className={`text-[9px] md:text-[10px] font-bold uppercase leading-relaxed ${infoText}`}>
          Cambiar el tema afecta a toda la aplicación de inmediato. <strong>Noche</strong> usa azul marino profundo. <strong>Noche Gray</strong> usa escala de grises premium con alta legibilidad para sesiones prolongadas.
        </p>
      </div>
    </section>
  );
};
