
import React, { useState } from 'react';
import { Box, Lock, User, ArrowRight, AlertCircle } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      // Defensive Logic: Safe check for Environment Variables
      let validUser = 'rps241061';
      let validPass = '241061';

      try {
          // Check if import.meta and import.meta.env exist before accessing
          // This prevents the "Cannot read properties of undefined" error
          if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
              validUser = (import.meta as any).env.VITE_APP_USER || 'rps241061';
              validPass = (import.meta as any).env.VITE_APP_PASS || '241061';
          }
      } catch (err) {
          // If env access fails, we implicitly use the default values set above
          console.warn("Environment variables access failed, using default credentials.");
      }

      if (username === validUser && password === validPass) {
        onLoginSuccess();
      } else {
        setError('Credenciales incorrectas. Verifique usuario y contraseña.');
        setIsLoading(false);
      }
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-900/50">
            <Box className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">LogiCount <span className="text-blue-500">Pro</span></h1>
        <p className="text-slate-400 mt-2 text-sm">Portal de Acceso Seguro</p>
      </div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-300">
        <form onSubmit={handleLogin} className="space-y-5">
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block ml-1">Usuario</label>
                <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input 
                        type="text" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-white pl-12 pr-4 py-4 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
                        placeholder="Ingrese su usuario"
                        autoFocus
                    />
                </div>
            </div>

            <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block ml-1">Contraseña</label>
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-white pl-12 pr-4 py-4 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
                        placeholder="••••••••"
                    />
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3 text-red-400 text-sm animate-in shake">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    {error}
                </div>
            )}

            <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-4"
            >
                {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    <>
                        Ingresar al Sistema <ArrowRight className="w-5 h-5" />
                    </>
                )}
            </button>
        </form>
      </div>

      <div className="mt-8 text-center text-slate-600 text-xs">
        <p>&copy; {new Date().getFullYear()} LogiCount Systems.</p>
        <p>Acceso restringido a personal autorizado.</p>
      </div>
    </div>
  );
};
