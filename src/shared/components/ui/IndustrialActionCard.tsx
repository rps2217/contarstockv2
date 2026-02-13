
import React from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';

interface IndustrialActionCardProps {
    onClick: () => void;
    icon: React.ElementType;
    label: string;
    sublabel?: string;
    color?: string;
    disabled?: boolean;
    isLoading?: boolean;
    variant?: 'default' | 'danger' | 'success' | 'warning';
}

export const IndustrialActionCard: React.FC<IndustrialActionCardProps> = ({
    onClick,
    icon: Icon,
    label,
    sublabel,
    color = "text-white",
    disabled = false,
    isLoading = false,
    variant = 'default'
}) => {
    
    const variantClasses = {
        default: "bg-slate-900 border-white/5 text-white hover:bg-slate-800",
        danger: "bg-rose-950/20 border-rose-500/40 text-rose-500 hover:bg-rose-950/40",
        success: "bg-emerald-950/20 border-emerald-500/40 text-emerald-500 hover:bg-emerald-950/40",
        warning: "bg-amber-950/20 border-amber-500/40 text-amber-500 hover:bg-amber-950/40"
    };

    const handlePress = (e: React.MouseEvent) => {
        if (!disabled && !isLoading) {
            if (navigator.vibrate) navigator.vibrate(10);
            onClick();
        }
    };

    return (
        <button
            disabled={disabled || isLoading}
            onClick={handlePress}
            className={`
                w-full flex items-center gap-5 p-6 rounded-[2rem] border-2 transition-all active:scale-[0.97] 
                disabled:opacity-20 select-none
                ${variantClasses[variant]}
            `}
        >
            <div className={`p-4 rounded-2xl bg-black/40 ${color} shadow-inner shrink-0`}>
                {isLoading ? <Loader2 className="w-7 h-7 animate-spin" /> : <Icon className="w-7 h-7" />}
            </div>
            
            <div className="flex-1 text-left min-w-0">
                <div className="text-xs font-black uppercase tracking-widest leading-none mb-1.5 truncate">{label}</div>
                {sublabel && (
                    <div className="text-[9px] font-bold opacity-40 uppercase tracking-tight italic truncate">
                        {sublabel}
                    </div>
                )}
            </div>
            
            {!isLoading && <ChevronRight className="w-5 h-5 opacity-20 shrink-0" />}
        </button>
    );
};
