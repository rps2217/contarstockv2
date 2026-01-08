
import React, { useState } from 'react';
import { Box, Lock, User, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeField, setActiveField] = useState<'user' | 'pass' | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulación de delay de red para UX
    setTimeout(() => {
      // SECURITY: Credentials moved to Environment Variables
      // In production, this should validate against a real backend API.
      // For local-first PWA, we use ENV variables injected at build time.
      const validUser = (import.meta as any).env.VITE_APP_USER || 'admin'; 
      const validPass = (import.meta as any).env.VITE_APP_PASS || 'admin'; 

      if (username === validUser && password === validPass) {
        localStorage.setItem('logicount_auth', 'true');
        onLoginSuccess();
      } else {
        setError('Credenciales incorrectas');
        setIsLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-sm flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {/* Header Branding */}
        <div className="text-center">
            <div className="inline-flex bg-blue-600 p-5 rounded-[2rem] shadow-2xl shadow-blue-200 mb-6">
                <Box className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-1">
                LogiCount <span className="text-blue-600">Pro</span>
            </h1>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em]">Enterprise Edition</p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100">
            <form onSubmit={handleLogin} className="space-y-5">
                
                {/* User Field */}
                <div className="space-y-2">
                    <label className={`text-[10px] font-black uppercase tracking-widest ml-4 transition-colors ${activeField === 'user' ? 'text-blue-600' : 'text-slate-400'}`}>Usuario</label>
                    <div className={`relative group transition-all duration-300 ${activeField === 'user' ? 'scale-[1.02]' : ''}`}>
                        <div className={`absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-colors ${activeField === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                            <User className="w-5 h-5" />
                        </div>
                        <input 
                            type="text" 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            onFocus={() => setActiveField('user')}
                            onBlur={() => setActiveField(null)}
                            className={`w-full h-16 pl-16 pr-6 bg-slate-50 border-2 rounded-2xl font-bold text-lg outline-none transition-all placeholder:text-slate-300 text-slate-900 ${activeField === 'user' ? 'border-blue-500 bg-white ring-4 ring-blue-50' : 'border-transparent'}`}
                            placeholder="ID Operador"
                            autoComplete="username"
                        />
                    </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                    <label className={`text-[10px] font-black uppercase tracking-widest ml-4 transition-colors ${activeField === 'pass' ? 'text-blue-600' : 'text-slate-400'}`}>Contraseña</label>
                    <div className={`relative group transition-all duration-300 ${activeField === 'pass' ? 'scale-[1.02]' : ''}`}>
                        <div className={`absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-colors ${activeField === 'pass' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                            <Lock className="w-5 h-5" />
                        </div>
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onFocus={() => setActiveField('pass')}
                            onBlur={() => setActiveField(null)}
                            className={`w-full h-16 pl-16 pr-6 bg-slate-50 border-2 rounded-2xl font-bold text-lg outline-none transition-all placeholder:text-slate-300 text-slate-900 ${activeField === 'pass' ? 'border-blue-500 bg-white ring-4 ring-blue-50' : 'border-transparent'}`}
                            placeholder="••••••••"
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
                    className="w-full h-16 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-70 mt-4"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Ingresar <ArrowRight className="w-5 h-5" /></>}
                </button>
            </form>
        </div>

        <div className="text-center opacity-40 hover:opacity-100 transition-opacity">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">v2.6.0 Enterprise</p>
        </div>
      </div>
    </div>
  );
};
