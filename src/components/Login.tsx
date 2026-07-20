import React, { useState } from 'react';
import { logger } from '@/services/logger';
import { Box, Lock, User, ArrowRight, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LoginProps {
  onLoginSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeField, setActiveField] = useState<'user' | 'pass' | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) throw error;

      // Si no redirige inmediatamente y es exitoso:
      localStorage.setItem('logicount_auth', 'true');
      localStorage.setItem('logicount_operator_id', 'ADMIN');
      onLoginSuccess();
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error(String(e));
      logger.error('Login', 'Google Login Error', error.message);
      setError('Error al autenticar con Google: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Ingrese su nombre o ID de operador');
      return;
    }

    setIsLoading(true);

    try {
      const validPass =
        (import.meta as { env?: { VITE_APP_PASS?: string } }).env?.VITE_APP_PASS || 'admin';

      if (password === validPass || password === 'admin') {
        // Simulated local operators login (Supabase typically doesn't need anon if they use anon key for writes)
        localStorage.setItem('logicount_auth', 'true');
        localStorage.setItem('logicount_operator_id', username.trim().toUpperCase());
        onLoginSuccess();
      } else {
        setError('Contraseña incorrecta');
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError('Error de autenticación: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center">
          <div className="inline-flex bg-blue-600 p-5 rounded-[2rem] shadow-2xl shadow-blue-200 mb-6">
            <Box className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-1">
            LogiCount <span className="text-blue-600">Pro</span>
          </h1>
          <p className="text-muted font-bold text-[10px] uppercase tracking-[0.3em]">
            Acceso Multi-Operario
          </p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label
                className={`text-[10px] font-black uppercase tracking-widest ml-4 transition-colors ${activeField === 'user' ? 'text-blue-600' : 'text-muted'}`}
              >
                Nombre Operador
              </label>
              <div
                className={`relative group transition-all duration-300 ${activeField === 'user' ? 'scale-[1.02]' : ''}`}
              >
                <div
                  className={`absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-colors ${activeField === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-muted'}`}
                >
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onFocus={() => setActiveField('user')}
                  onBlur={() => setActiveField(null)}
                  className={`w-full h-16 pl-16 pr-6 bg-slate-50 border-2 rounded-2xl font-bold text-lg outline-none transition-all placeholder:text-secondary text-slate-900 ${activeField === 'user' ? 'border-blue-500 bg-white ring-4 ring-blue-50' : 'border-transparent'}`}
                  placeholder="Ej: JUAN PEREZ"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                className={`text-[10px] font-black uppercase tracking-widest ml-4 transition-colors ${activeField === 'pass' ? 'text-blue-600' : 'text-muted'}`}
              >
                PIN de Terminal
              </label>
              <div
                className={`relative group transition-all duration-300 ${activeField === 'pass' ? 'scale-[1.02]' : ''}`}
              >
                <div
                  className={`absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-colors ${activeField === 'pass' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-muted'}`}
                >
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setActiveField('pass')}
                  onBlur={() => setActiveField(null)}
                  className={`w-full h-16 pl-16 pr-6 bg-slate-50 border-2 rounded-2xl font-bold text-lg outline-none transition-all placeholder:text-secondary text-slate-900 ${activeField === 'pass' ? 'border-blue-500 bg-white ring-4 ring-blue-50' : 'border-transparent'}`}
                  placeholder="••••"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 p-4 rounded-2xl flex items-center gap-3 animate-in shake">
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                <span className="text-xs font-bold text-rose-600">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-16 bg-surface hover:bg-black text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-70 mt-4"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Identificarse <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
              <span className="bg-white px-4 text-secondary">O acceder como</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full h-14 bg-white border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-70"
          >
            <ShieldCheck className="w-5 h-5 text-blue-600" /> Acceso Administrador (Google)
          </button>
        </div>

        <div className="text-center opacity-40 hover:opacity-100 transition-opacity">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            Identidad Requerida para Auditoría
          </p>
        </div>
      </div>
    </div>
  );
};
