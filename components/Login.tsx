
import React, { useState } from 'react';
// Added Loader2 to the imports to fix "Cannot find name 'Loader2'" error
import { Box, Lock, User, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

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
      let validUser = 'admin'; 
      let validPass = 'admin'; 

      if (username === validUser && password === validPass) {
        onLoginSuccess();
        localStorage.setItem('logicount_auth', 'true');
      } else {
        setError('Acceso denegado. Verifique credenciales.');
        setIsLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="mb-12 text-center animate-in fade-in slide-in-from-top-6 duration-700">
        <div className="bg-blue-600 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-200">
            <Box className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">LogiCount <span className="text-blue-600">Pro</span></h1>
        <p className="text-slate-400 mt-3 font-bold text-sm uppercase tracking-widest">Portal de Acceso Corporativo</p>
      </div>

      <div className="w-full max-w-md bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in-95 duration-500">
        <form onSubmit={handleLogin} className="space-y-6">
            <div>
                <label htmlFor="username" className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1">Identificador de Usuario</label>
                <div className="relative">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    <input 
                        id="username" name="username" type="text" autoComplete="username" value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 pl-14 pr-6 py-5 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-200 font-bold outline-none shadow-inner"
                        placeholder="admin" autoFocus
                    />
                </div>
            </div>

            <div>
                <label htmlFor="password" className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1">Clave de Seguridad</label>
                <div className="relative">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    <input 
                        id="password" name="password" type="password" autoComplete="current-password" value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 pl-14 pr-6 py-5 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-200 font-bold outline-none shadow-inner"
                        placeholder="••••••••"
                    />
                </div>
            </div>

            {error && (
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center gap-3 text-rose-600 text-xs font-black animate-in shake">
                    <AlertCircle className="w-5 h-5 shrink-0" /> {error}
                </div>
            )}

            <button 
                type="submit" disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-100 flex items-center justify-center gap-3 transition-all active:scale-[0.97] disabled:opacity-50 uppercase tracking-widest text-xs mt-4"
            >
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Entrar al Sistema <ArrowRight className="w-5 h-5" /></>}
            </button>
        </form>
      </div>

      <div className="mt-12 text-center text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">
        <p>&copy; {new Date().getFullYear()} LogiCount Systems Group</p>
      </div>
    </div>
  );
};
