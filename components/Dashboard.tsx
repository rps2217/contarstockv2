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
      const interval = setInterval(loadTrends, 300000); 
      return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto pb-20 animate-in fade-in duration-700">
      <div className="mb-10 flex items-center justify-between">
        <div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 flex items-center gap-4">
              <div className="bg-blue-600 p-2 rounded-2xl shadow-lg shadow-blue-200">
                <Box className="w-8 h-8 md:w-10 md:h-10 text-white" />
              </div>
              Panel de Control
            </h1>
            <p className="text-slate-500 mt-2 font-semibold text-lg">Sistema de Gestión Logística LogiCount Pro</p>
        </div>
        <button onClick={() => navigate('/settings')} className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-300 transition-all shadow-sm active:scale-95">
            <Settings className="w-6 h-6" />
        </button>
      </div>

      {settings.controlTowerEnabled && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
              <div className="lg:col-span-2">
                  <StatsSection stats={dailyStats} />
              </div>
              <div className="lg:col-span-1">
                  <TrendsChart data={trendData} />
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
        <div className="md:col-span-2">
             <ActionCard title="Nueva Sesión" sub="Iniciar proceso de conteo de mercadería" icon={ScanLine} colorClass="bg-blue-600 text-white shadow-blue-200" to="/reports" />
        </div>
        <ActionCard title="Recepción" sub="Ingreso masivo de bultos" icon={Container} colorClass="bg-white text-slate-900 border-slate-200" to="/reception" />
        <ActionCard title="Sincronizar" sub="Subir datos locales a la nube" icon={Cloud} colorClass="bg-white text-slate-900 border-slate-200" to="/sync" />
        <ActionCard title="Consolidados" sub="Ver reportes agrupados por ERP" icon={Layers} colorClass="bg-white text-slate-900 border-slate-200" to="/consolidated" />
        <ActionCard title="Detective" sub="Conciliación avanzada de pedidos" icon={Fingerprint} colorClass="bg-white text-slate-900 border-slate-200" to="/conciliator" />
        <ActionCard title="Catálogo" sub="Administrar base de productos" icon={Database} colorClass="bg-white text-slate-900 border-slate-200" to="/database" />
      </div>

      <div className="flex flex-col items-center justify-center py-12 opacity-20 border-t border-slate-200 mt-10">
        <div className="text-xs text-slate-500 font-black tracking-[0.4em] uppercase text-center">
          LOGICOUNT SYSTEMS • ENTERPRISE EDITION v2.5
        </div>
      </div>
    </div>
  );
};