
import React, { useState, useEffect } from 'react';
import { Database, ScanLine, Settings, Box, Layers, Fingerprint, Container, Cloud } from 'lucide-react';
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
      const interval = setInterval(loadTrends, 300000); // Actualizar cada 5 min
      return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto pb-32 px-4 md:px-8 animate-in fade-in duration-500">
      <div className="pt-6 md:pt-8 mb-6 md:mb-8 flex items-center justify-between">
        <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2 md:gap-3">
            <div className="bg-slate-900 text-white p-1.5 md:p-2 rounded-lg md:rounded-xl">
                <Box className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            Centro de Control
            </h1>
            <p className="text-sm md:text-lg text-slate-500 mt-1">Resumen operativo del día.</p>
        </div>
        <button onClick={() => navigate('/settings')} className="md:hidden p-2 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200">
            <Settings className="w-5 h-5" />
        </button>
      </div>

      {settings.controlTowerEnabled && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2">
                  <StatsSection stats={dailyStats} />
              </div>
              <div className="lg:col-span-1">
                  <TrendsChart data={trendData} />
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6 mb-8">
        <div className="md:col-span-2 md:row-span-2">
             <ActionCard title="Sesión de Conteo" sub="Iniciar inventario físico" icon={ScanLine} colorClass="md:from-blue-600 md:to-blue-700" to="/reports" span={2} />
        </div>
        <ActionCard title="Recepción Ciega" sub="Check-in rápido" icon={Container} colorClass="md:from-slate-800 md:to-slate-900" to="/reception" />
        <ActionCard title="Gestor Nube" sub="Sincronización" icon={Cloud} colorClass="md:from-indigo-500 md:to-violet-600" to="/sync" />
        <ActionCard title="Consolidados" sub="Reportes por ERP" icon={Layers} colorClass="md:from-purple-600 md:to-fuchsia-700" to="/consolidated" />
        <ActionCard title="Detective" sub="Conciliación Excel" icon={Fingerprint} colorClass="md:from-emerald-600 md:to-teal-700" to="/conciliator" />
        <ActionCard title="Base de Datos" sub="Maestro de Productos" icon={Database} colorClass="md:from-cyan-500 md:to-blue-600" to="/database" />
      </div>

      <div className="text-center text-[10px] md:text-xs text-slate-400 mt-8 font-mono">LogiCount Pro Modular Architecture</div>
    </div>
  );
};
