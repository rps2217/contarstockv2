
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
          ? 'bg-rose-600/90 border-rose-500 text-white' 
          : 'bg-amber-500/90 border-amber-400 text-slate-900'
      } backdrop-blur-sm shadow-lg`}
    >
      <div 
        className="max-w-7xl mx-auto px-4 py-1.5 flex items-center justify-between cursor-pointer group"
        onClick={handleGoToManage}
      >
        <div className="flex items-center gap-3">
          <AlertTriangle className={`w-3.5 h-3.5 ${isCritical ? 'text-white' : 'text-slate-800'} animate-pulse`} />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest leading-none">
              Vencimientos:
            </span>
            <span className="text-[10px] font-bold opacity-90 leading-none">
              {alertCount} productos requieren atención
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[9px] font-black uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">
            Gestionar
          </span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </motion.div>
  );
};
