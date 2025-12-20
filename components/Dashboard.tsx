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
    <div className="w-full max-w-7xl mx-auto pb-20 animate-in fade-in duration-500">
      <div className="mb-10 flex items-center justify-between">
        <div>
            <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-2">
                LogiCount Pro Edition
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
              <Box className="w-8 h-8 text-blue-600" />
              Panel de Control
            </h1>
            <p className="text-slate-500 mt-1 font-medium text-base">Gestión integral de inventario y flujo logístico.</p>
        </div>
        <button onClick={() => navigate('/settings')} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-slate-50 transition-all shadow-sm">
            <Settings className="w-6 h-6" />
        </button>
      </div>

      {settings.controlTowerEnabled && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
              <div className="lg:col-span-2">
                  <StatsSection stats={dailyStats} />
              </div>
              <div className="lg:col-span-1">
                  <TrendsChart data={trendData} />
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-16">
        <div className="md:col-span-2">
             <ActionCard title="Nueva Sesión" sub="Comenzar conteo de mercadería" icon={ScanLine} colorClass="bg-blue-600 text-white" to="/reports" />
        </div>
        <ActionCard title="Recepción" sub="Ingreso de bultos rápido" icon={Container} colorClass="bg-white border-slate-200" to="/reception" />
        <ActionCard title="Sincronizar" sub="Subir datos a la nube" icon={Cloud} colorClass="bg-white border-slate-200" to="/sync" />
        <ActionCard title="Consolidados" sub="Ver reportes por ERP" icon={Layers} colorClass="bg-white border-slate-200" to="/consolidated" />
        <ActionCard title="Detective" sub="Conciliación de pedidos" icon={Fingerprint} colorClass="bg-white border-slate-200" to="/conciliator" />
        <ActionCard title="Catálogo" sub="Gestión de productos" icon={Database} colorClass="bg-white border-slate-200" to="/database" />
      </div>

      <div className="flex flex-col items-center justify-center py-8 opacity-40">
        <div className="text-[10px] text-slate-500 font-bold tracking-widest uppercase text-center">
          LOGICOUNT SYSTEMS • DIGITAL WAREHOUSE MANAGER
        </div>
      </div>
    </div>
  );
};