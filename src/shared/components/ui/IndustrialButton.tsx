import React, { memo } from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'black';

interface IndustrialButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
 variant?: ButtonVariant;
 isLoading?: boolean;
 icon?: React.ElementType;
 fullWidth?: boolean;
 haptic?: boolean;
}

/**
 * COMPONENTE DE UI PRIMITIVO: BOTÓN INDUSTRIAL
 * Encapsula estilos repetitivos, estados de carga y feedback háptico.
 * Memoizado para máximo rendimiento en listas y dashboards.
 */
export const IndustrialButton: React.FC<IndustrialButtonProps> = memo(({
 children,
 variant = 'primary',
 isLoading = false,
 icon: Icon,
 fullWidth = false,
 haptic = true,
 className = '',
 onClick,
 disabled,
 ...props
}) => {
 
 const baseStyles = "relative font-black uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-3 rounded-2xl disabled:opacity-50 disabled:pointer-events-none select-none";
 
 const sizeStyles = "h-16 text-xs md:text-sm px-6 py-4";

 const variants: Record<ButtonVariant, string> = {
 primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-900/20 border-2 border-transparent",
 secondary: "bg-slate-100 hover:bg-slate-200 text-slate-600 border-2 border-slate-200",
 danger: "bg-rose-50 hover:bg-rose-100 text-rose-600 border-2 border-rose-100",
 ghost: "bg-transparent hover:bg-slate-50 text-slate-500",
 outline: "bg-transparent border-2 border-slate-300 text-slate-600 hover:border-slate-900 hover:text-slate-900",
 black: "bg-slate-900 hover:bg-black text-white shadow-xl border-2 border-transparent"
 };

 const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
 if (!isLoading && !disabled) {
 if (haptic && navigator.vibrate) navigator.vibrate(10);
 onClick?.(e);
 }
 };

 return (
 <button
 onClick={handleClick}
 disabled={disabled || isLoading}
 className={`
 ${baseStyles} 
 ${sizeStyles} 
 ${variants[variant]} 
 ${fullWidth ? 'w-full' : ''} 
 ${className}
 `}
 {...props}
 >
 {isLoading ? (
 <Loader2 className="w-5 h-5 animate-spin" />
 ) : (
 <>
 {Icon && <Icon className="w-5 h-5" />}
 {children}
 </>
 )}
 </button>
 );
});
// Forced GitHub sync
