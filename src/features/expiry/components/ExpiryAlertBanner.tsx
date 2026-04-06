
import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { useExpiryStore } from '../../../store/useExpiryStore';
import { useNavigate } from 'react-router-dom';

export const ExpiryAlertBanner: React.FC<{ theme: 'dark' | 'light' }> = ({ theme }) => {
  const navigate = useNavigate();
  const { 
    alertCount, 
    alertItems,
    setSearchQuery,
    setSelectedCategories,
    setSelectedCanje,
    setActionPeriod,
    setSelectedStatuses
  } = useExpiryStore();

  if (alertCount === 0) return null;

  const isCritical = alertItems.some(item => item.status === 'expired' || item.status === 'critical');

  const handleGoToManage = () => {
    // Reset other filters to ensure we see the alerts
    setSearchQuery('');
    setSelectedCategories([]);
    setSelectedCanje('all');
    setActionPeriod('all');
    
    // Set statuses that match the alerts
    setSelectedStatuses(['expired', 'critical', 'withdrawal']);
    
    // Navigate
    navigate('/expiry');
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className={`w-full overflow-hidden z-[100] border-b ${
        isCritical 
          ? 'bg-rose-600 border-rose-500 text-white' 
          : 'bg-amber-500 border-amber-400 text-slate-900'
      }`}
    >
      <div 
        className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between cursor-pointer group"
        onClick={handleGoToManage}
      >
        <div className="flex items-center gap-3">
          <div className={`p-1 rounded-lg ${isCritical ? 'bg-rose-700' : 'bg-amber-600'}`}>
            <AlertTriangle className="w-4 h-4 animate-pulse" />
          </div>
          <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
            <span className="text-xs font-black uppercase tracking-tighter">
              Alerta de Vencimientos
            </span>
            <span className="text-[10px] font-bold opacity-90">
              Hay {alertCount} productos que requieren atención inmediata
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden md:block text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
            Ir a Gestionar
          </span>
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </motion.div>
  );
};
