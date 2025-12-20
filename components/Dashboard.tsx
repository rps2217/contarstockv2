import React, { useState, useEffect } from 'react';
import { Database, ScanLine, Settings, Box, Layers, Fingerprint, Container, Cloud, Sparkles, Leaf } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useAppStore } from '../store/useAppStore';
import { useNavigate } from 'react-router-dom';
import { StatsSection } from './dashboard/StatsSection';
import { ActionCard } from './dashboard/ActionCard';
import { TrendsChart } from './dashboard/TrendsChart';
import { getHourlyProductivity, ProductivityPoint } from '../services/statsService';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { settings } = useAppStore();
  const [trendData, setTrendData] = useState<ProductivityPoint[]>([]);

  const dailyStats = useLiveQuery(async () => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      const todayStart = date.getTime();
      const todaySessions = await db.sessions.where('createdAt').aboveOrEqual(todayStart).toArray();
      const bultos = todaySessions.length;
      const units = todaySessions.reduce((acc, s) => acc + (s.totalUnits || 0), 0);
      const pendingSync = await db.scans.where('synced').equals(0).count();
      return { bultos, units, pendingSync };
  }, [], { bultos: 0, units: 0, pendingSync: 0 });

  useEffect(() => {
      const loadTrends = async () => {
          const data = await getHourlyProductivity(1);
          setTrendData(data);
      };
      loadTrends();
      const interval = setInterval(loadTrends, 300000); 
      return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto pb-32 px-6 md:px-12 animate-in fade-in duration-1000">
      <div className="pt-10 md:pt-16 mb-12 flex items-center justify-between">
        <div>
            <div className="flex items-center gap-2 text-slate-500 font-medium text-xs uppercase tracking-[0.2em] mb-3">
                <Leaf className="w-4 h-4 text-emerald-500/60" /> LogiCount Pro Zen Edition
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-100 flex items-center gap-4">
              <div className="bg-slate-800 text-slate-300 p-2.5 rounded-2xl border border-white/5 shadow-inner">
                  <Box className="w-7 h-7 md:w-9 md:h-9" />
              </div>
              Consola Operativa
            </h1>
            <p className="text-slate-400 mt-3 font-medium text-lg max-w-md">Flujo de trabajo armonizado para almacenes de alto rendimiento.</p>
        </div>
        <button onClick={() => navigate('/settings')} className="hidden md:flex p-4 bg-slate-800/40 border border-white/5 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all active:scale-95 shadow-lg">
            <Settings className="w-6 h-6" />
        </button>
      </div>

      {settings.controlTowerEnabled && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
              <div className="lg:col-span-2">
                  <StatsSection stats={dailyStats} />
              </div>
              <div className="lg:col-span-1">
                  <TrendsChart data={trendData} />
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 mb-16">
        <div className="md:col-span-2 md:row-span-2">
             <ActionCard title="Nueva Sesión" sub="Iniciar inventario con enfoque" icon={ScanLine} colorClass="bg-slate-800/40 border-white/5 md:bg-gradient-to-br md:from-slate-800 md:to-slate-900" to="/reports" span={2} />
        </div>
        <ActionCard title="Recepción" sub="Entrada rápida de bultos" icon={Container} colorClass="bg-slate-800/30 border-white/5" to="/reception" />
        <ActionCard title="Sincronizar" sub="Respaldo en nube seguro" icon={Cloud} colorClass="bg-slate-800/30 border-white/5" to="/sync" />
        <ActionCard title="Consolidados" sub="Reportes por Orden ERP" icon={Layers} colorClass="bg-slate-800/30 border-white/5" to="/consolidated" />
        <ActionCard title="Detective" sub="Conciliación inteligente" icon={Fingerprint} colorClass="bg-slate-800/30 border-white/5" to="/conciliator" />
        <ActionCard title="Catálogo" sub="Gestión de SKUs maestro" icon={Database} colorClass="bg-slate-800/30 border-white/5" to="/database" />
      </div>

      <div className="flex flex-col items-center justify-center py-12 opacity-30">
        <Sparkles className="w-6 h-6 text-slate-500 mb-4" />
        <div className="text-[10px] md:text-xs text-slate-500 font-medium tracking-[0.4em] uppercase text-center">
          Desarrollado para el descanso visual • Local-First Engine • Gemini Powered
        </div>
      </div>
    </div>
  );
};