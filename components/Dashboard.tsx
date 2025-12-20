import React, { useState, useEffect } from 'react';
import { Database, ScanLine, Settings, Box, Layers, Fingerprint, Container, Cloud, Zap } from 'lucide-react';
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
    <div className="w-full max-w-7xl mx-auto pb-32 px-4 md:px-8 animate-in fade-in duration-700">
      <div className="pt-6 md:pt-12 mb-8 md:mb-12 flex items-center justify-between">
        <div>
            <div className="flex items-center gap-2 text-blue-500 font-bold text-[10px] uppercase tracking-[0.3em] mb-2">
                <Zap className="w-3 h-3 fill-current" /> Warehouse Console v2.5
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-white flex items-center gap-3">
              <div className="bg-blue-600 text-white p-2 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                  <Box className="w-6 h-6 md:w-8 md:h-8" />
              </div>
              LogiCount Pro
            </h1>
            <p className="text-slate-400 mt-2 font-medium">Terminal operativo de flujo logístico.</p>
        </div>
        <button onClick={() => navigate('/settings')} className="md:hidden p-3 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 hover:text-white transition-all active:scale-95">
            <Settings className="w-6 h-6" />
        </button>
      </div>

      {settings.controlTowerEnabled && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
              <div className="lg:col-span-2">
                  <StatsSection stats={dailyStats} />
              </div>
              <div className="lg:col-span-1">
                  <TrendsChart data={trendData} />
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 mb-12">
        <div className="md:col-span-2 md:row-span-2">
             <ActionCard title="Sesión de Conteo" sub="Iniciar inventario físico" icon={ScanLine} colorClass="bg-blue-600/10 border-blue-500/20 md:from-blue-600 md:to-blue-700 md:border-0" to="/reports" span={2} />
        </div>
        <ActionCard title="Recepción Ciega" sub="Check-in rápido" icon={Container} colorClass="bg-slate-900/40 border-slate-800 md:from-slate-800 md:to-slate-900 md:border-0" to="/reception" />
        <ActionCard title="Gestor Nube" sub="Sincronización" icon={Cloud} colorClass="bg-indigo-900/40 border-indigo-800 md:from-indigo-600 md:to-violet-700 md:border-0" to="/sync" />
        <ActionCard title="Consolidados" sub="Reportes por ERP" icon={Layers} colorClass="bg-purple-900/40 border-purple-800 md:from-purple-600 md:to-fuchsia-700 md:border-0" to="/consolidated" />
        <ActionCard title="Detective" sub="Conciliación Excel" icon={Fingerprint} colorClass="bg-emerald-900/40 border-emerald-800 md:from-emerald-600 md:to-teal-700 md:border-0" to="/conciliator" />
        <ActionCard title="Base de Datos" sub="Maestro de Productos" icon={Database} colorClass="bg-slate-900/40 border-slate-800 md:from-cyan-600 md:to-blue-600 md:border-0" to="/database" />
      </div>

      <div className="text-center py-8">
        <div className="text-[10px] md:text-xs text-slate-600 font-mono tracking-widest uppercase">
          Cyber-Warehouse Edition &bull; Local-First Engine &bull; Gemini-Powered
        </div>
      </div>
    </div>
  );
};