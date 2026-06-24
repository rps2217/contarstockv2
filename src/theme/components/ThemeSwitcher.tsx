/**
 * ThemeSwitcher - Componente para cambiar entre temas
 */

import React, { useState } from 'react';
import { Sun, Moon, Zap, Check, Palette } from 'lucide-react';
import { useThemeManager } from '../useThemeManager';
import { ThemeMode, ThemeScheme } from '../ThemeManager';

const THEME_OPTIONS = [
  { mode: 'dark' as ThemeMode, label: 'Oscuro', icon: <Moon className="w-4 h-4" />, desc: 'Uso nocturno' },
  { mode: 'light' as ThemeMode, label: 'Claro', icon: <Sun className="w-4 h-4" />, desc: 'Mucha luz' },
  { mode: 'high-contrast' as ThemeMode, label: 'Alto Contraste', icon: <Zap className="w-4 h-4" />, desc: 'Accesibilidad' }
];

const SCHEME_OPTIONS = [
  { scheme: 'appsheet' as ThemeScheme, label: 'AppSheet', primary: '#8AB4F8', bg: '#121212' },
  { scheme: 'noche-gray' as ThemeScheme, label: 'Noche Gray', primary: '#6B7280', bg: '#141414' },
  { scheme: 'industrial' as ThemeScheme, label: 'Industrial', primary: '#3B82F6', bg: '#0F172A' }
];

export const ThemeSwitcher: React.FC = () => {
  const { mode, scheme, setMode, setScheme, isDark, isLight, isHighContrast } = useThemeManager();
  const [isOpen, setIsOpen] = useState(false);

  const bgClass = isDark ? 'bg-[#1a1a1a] border-[rgba(255,255,255,0.08)]' 
    : isLight ? 'bg-white border-zinc-200' 
    : 'bg-black border-white';
  
  const textClass = isDark ? 'text-white' : isLight ? 'text-zinc-900' : 'text-white';
  const mutedClass = isDark ? 'text-[#71717a]' : isLight ? 'text-zinc-500' : 'text-zinc-400';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${bgClass} border`}
      >
        <Palette className="w-4 h-4" />
        <span className={`text-sm font-medium ${textClass}`}>
          {THEME_OPTIONS.find(t => t.mode === mode)?.label}
        </span>
        <div 
          className="w-4 h-4 rounded-full border border-black/20"
          style={{ backgroundColor: SCHEME_OPTIONS.find(s => s.scheme === scheme)?.primary }}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className={`absolute right-0 top-full mt-2 z-50 w-72 rounded-xl overflow-hidden shadow-2xl ${bgClass}`}>
            <div className={`px-4 py-3 border-b ${isDark ? 'border-[rgba(255,255,255,0.08)]' : isLight ? 'border-zinc-100' : 'border-white/20'}`}>
              <h3 className={`text-sm font-semibold ${textClass}`}>Personalizar tema</h3>
              <p className={`text-xs mt-0.5 ${mutedClass}`}>Cambia la apariencia de la app</p>
            </div>

            <div className="p-3 space-y-2">
              <p className={`text-xs font-medium uppercase tracking-wider ${mutedClass}`}>Apariencia</p>
              {THEME_OPTIONS.map((opt) => (
                <button
                  key={opt.mode}
                  onClick={() => setMode(opt.mode)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all border
                    ${mode === opt.mode 
                      ? isDark ? 'bg-[#8AB4F8]/10 border-[#8AB4F8]/30' 
                        : isLight ? 'bg-blue-50 border-blue-200' 
                        : 'bg-yellow-400/10 border-yellow-400/30'
                      : isDark ? 'hover:bg-[#2d2d2d] border-transparent' 
                        : isLight ? 'hover:bg-zinc-50 border-transparent' 
                        : 'hover:bg-white/5 border-transparent'
                    }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center
                    ${mode === opt.mode 
                      ? isDark ? 'bg-[#8AB4F8]/20' : isLight ? 'bg-blue-100' : 'bg-yellow-400/20'
                      : isDark ? 'bg-[#2d2d2d]' : isLight ? 'bg-zinc-100' : 'bg-white/10'
                    }`}>
                    {mode === opt.mode ? (
                      <Check className={`w-4 h-4 ${isDark ? 'text-[#8AB4F8]' : isLight ? 'text-blue-600' : 'text-yellow-400'}`} />
                    ) : (
                      <span className={mutedClass}>{opt.icon}</span>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`text-sm font-medium ${textClass}`}>{opt.label}</p>
                    <p className={`text-xs ${mutedClass}`}>{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className={`p-3 border-t ${isDark ? 'border-[rgba(255,255,255,0.08)]' : isLight ? 'border-zinc-100' : 'border-white/20'}`}>
              <p className={`text-xs font-medium uppercase tracking-wider ${mutedClass}`}>Esquema de color</p>
              <div className="flex gap-2 mt-2">
                {SCHEME_OPTIONS.map((opt) => (
                  <button
                    key={opt.scheme}
                    onClick={() => setScheme(opt.scheme)}
                    className={`flex-1 py-2 px-3 rounded-lg transition-all border
                      ${scheme === opt.scheme
                        ? isDark ? 'border-[#8AB4F8]/50 bg-[#8AB4F8]/10' 
                          : isLight ? 'border-blue-300 bg-blue-50' 
                          : 'border-yellow-400/50 bg-yellow-400/10'
                        : isDark ? 'border-[rgba(255,255,255,0.08)] bg-[#2d2d2d] hover:bg-[#353535]'
                          : isLight ? 'border-zinc-200 bg-white hover:bg-zinc-50'
                          : 'border-white/20 bg-black hover:bg-white/5'
                      }`}
                  >
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: opt.primary }} />
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: opt.bg }} />
                    </div>
                    <p className={`text-[10px] font-medium ${textClass}`}>{opt.label}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className={`px-4 py-2 border-t text-center ${isDark ? 'border-[rgba(255,255,255,0.08)]' : isLight ? 'border-zinc-100' : 'border-white/20'}`}>
              <p className={`text-[10px] ${isDark ? 'text-[#52525b]' : isLight ? 'text-zinc-400' : 'text-zinc-600'}`}>
                Los cambios se guardan automáticamente
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
