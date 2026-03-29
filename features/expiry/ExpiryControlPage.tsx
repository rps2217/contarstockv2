import React, { useMemo, useState } from 'react';
import { Calendar, Cloud, Printer, Sun, Settings, FileText, Search, Camera, Plus, Filter, X, AlertTriangle, ShieldAlert, Download, Clock, CheckCircle2, Save, CheckSquare, Square, Trash2 } from 'lucide-react';
import { useExpiryStore, ExpiryItem, ExpiryStatus } from '../../store/useExpiryStore';
import { ExpiryCard } from './components/ExpiryCard';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, CloudExpiration } from '../../db';
import { importExpirationsFromCloud } from '../../services/syncManager';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';

const StatusPill = ({ status, count, label, icon: Icon, colorClass, bgClass, borderClass, isActive, onClick }: any) => (
  <button 
    onClick={() => onClick(status)}
    className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all whitespace-nowrap ${isActive ? `${bgClass} ${borderClass} ring-1 ring-offset-1 ring-offset-slate-950 ring-${colorClass.split('-')[1]}-500` : 'bg-[#0f1219] border-white/5 hover:bg-slate-800'}`}
  >
    <Icon className={`w-4 h-4 ${colorClass}`} />
    <span className={`font-black uppercase tracking-widest text-xs ${colorClass}`}>{count} {label}</span>
  </button>
);

const NewExpiryModal = ({ onClose, onSave }: { onClose: () => void, onSave: (data: Partial<CloudExpiration>) => void }) => {
  const [formData, setFormData] = useState({
    barcode: '',
    productName: '',
    mm: '',
    yyyy: '',
    quantity: '1',
    location: 'BOD. CENTRAL'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      mm: parseInt(formData.mm, 10),
      yyyy: parseInt(formData.yyyy, 10),
      quantity: parseInt(formData.quantity, 10),
      timestamp: Date.now(),
      syncStatus: 'pending'
    });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="bg-amber-500/10 border-b border-amber-500/20 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Plus className="w-6 h-6 text-amber-500" />
            <h3 className="text-amber-500 font-bold uppercase tracking-wider text-sm">Nuevo Vencimiento</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Código de Barras</label>
            <input required type="text" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-all" placeholder="Ej: 780123456789" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Nombre del Producto</label>
            <input required type="text" value={formData.productName} onChange={e => setFormData({...formData, productName: e.target.value.toUpperCase()})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-all uppercase" placeholder="Ej: PARACETAMOL 500MG" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Mes (MM)</label>
              <input required type="number" min="1" max="12" value={formData.mm} onChange={e => setFormData({...formData, mm: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-all" placeholder="12" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Año (AAAA)</label>
              <input required type="number" min="2024" max="2100" value={formData.yyyy} onChange={e => setFormData({...formData, yyyy: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-all" placeholder="2025" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Cantidad</label>
              <input required type="number" min="1" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Ubicación</label>
              <input required type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value.toUpperCase()})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-all uppercase" />
            </div>
          </div>
          
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-xl font-bold uppercase tracking-wider text-sm bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all">
              Cancelar
            </button>
            <button type="submit" className="flex-1 px-4 py-3 rounded-xl font-bold uppercase tracking-wider text-sm bg-amber-500 text-black hover:bg-amber-400 transition-all flex items-center justify-center gap-2">
              <Save className="w-4 h-4" />
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const ExpiryControlPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    searchQuery, setSearchQuery, 
    selectedStatuses, toggleStatus,
    verifiedIds, toggleVerified, setVerifiedIds,
    selectedIds, toggleSelection, clearSelection, setSelectedIds
  } = useExpiryStore();

  const [isSyncing, setIsSyncing] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const rawItems = useLiveQuery(() => db.cloudExpirations.toArray(), []) || [];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const items: ExpiryItem[] = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return rawItems.map(item => {
      let expiryDateObj = null;
      let withdrawalDate = null;
      let daysLeft = 0;
      let status: ExpiryStatus = 'safe';
      const withdrawalDays = 30; // Default
      
      if (item.mm && item.yyyy) {
        expiryDateObj = new Date(Number(item.yyyy), Number(item.mm), 0);
        withdrawalDate = new Date(expiryDateObj);
        withdrawalDate.setDate(withdrawalDate.getDate() - withdrawalDays);
        
        const diffTime = expiryDateObj.getTime() - now.getTime();
        daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (daysLeft < 0) {
          status = 'expired';
        } else if (daysLeft <= withdrawalDays) {
          status = 'withdrawal';
        } else if (daysLeft <= withdrawalDays + 30) {
          status = 'critical';
        } else if (daysLeft <= withdrawalDays + 90) {
          status = 'next_expiry';
        } else {
          status = 'safe';
        }
      }

      return {
        id: item.id,
        barcode: item.barcode,
        productName: item.productName || 'PRODUCTO DESCONOCIDO',
        providerName: 'PROVEEDOR', // Placeholder, ideally joined from providers table
        category: 'GENERAL',
        mm: Number(item.mm),
        yyyy: Number(item.yyyy),
        expiryDate: expiryDateObj ? `${String(item.mm).padStart(2, '0')}/${item.yyyy}` : 'N/A',
        expiryDateObj,
        withdrawalDate,
        status,
        daysLeft,
        quantity: item.quantity || 0,
        type: 'Nube',
        location: item.location || 'BOD. CENTRAL',
        estado: item.event || 'VIGENTE',
        hasCanje: true,
        withdrawalDays,
        claveUnica: item.claveUnica,
        timestamp: item.timestamp,
        frc: item.frc,
        syncStatus: item.syncStatus
      };
    });
  }, [rawItems]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(item.status)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return item.productName.toLowerCase().includes(q) || item.barcode.includes(q);
      }
      return true;
    });
  }, [items, selectedStatuses, searchQuery]);

  const counts = useMemo(() => {
    const c = { expired: 0, critical: 0, withdrawal: 0, next_expiry: 0, safe: 0 };
    items.forEach(item => {
      if (c[item.status] !== undefined) c[item.status]++;
    });
    return c;
  }, [items]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const count = await importExpirationsFromCloud();
      showToast(`Sincronización completada. ${count} registros actualizados.`);
    } catch (error) {
      console.error('Error syncing expirations:', error);
      showToast('Error al sincronizar con la nube.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await db.cloudExpirations.delete(id);
      showToast('Registro eliminado correctamente.');
    } catch (error) {
      console.error('Error deleting item:', error);
      showToast('Error al eliminar el registro.');
    }
  };

  const handleSaveNew = async (data: Partial<CloudExpiration>) => {
    try {
      const newId = crypto.randomUUID();
      await db.cloudExpirations.add({
        ...data,
        id: newId,
        event: 'VIGENTE',
        claveUnica: `${data.barcode}-${data.mm}-${data.yyyy}`
      } as CloudExpiration);
      setShowNewModal(false);
      showToast('Registro añadido correctamente.');
    } catch (error) {
      console.error('Error adding item:', error);
      showToast('Error al añadir el registro.');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Código de Barras', 'Producto', 'Mes', 'Año', 'Cantidad', 'Ubicación', 'Estado', 'Días Restantes'];
    const rows = filteredItems.map(item => [
      item.barcode,
      `"${item.productName}"`,
      item.mm,
      item.yyyy,
      item.quantity,
      `"${item.location}"`,
      item.status,
      item.daysLeft
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `vencimientos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
      clearSelection();
    } else {
      setSelectedIds(new Set(filteredItems.map(i => i.id)));
    }
  };

  const handleMassVerify = () => {
    const newVerified = new Set(verifiedIds);
    selectedIds.forEach(id => newVerified.add(id));
    setVerifiedIds(newVerified);
    clearSelection();
    showToast(`${selectedIds.size} registros verificados.`);
  };

  const handleMassDelete = async () => {
    if (!window.confirm(`¿Estás seguro de eliminar ${selectedIds.size} registros?`)) return;
    
    try {
      await Promise.all(Array.from(selectedIds).map(id => db.cloudExpirations.delete(id)));
      showToast(`${selectedIds.size} registros eliminados.`);
      clearSelection();
    } catch (error) {
      console.error('Error deleting multiple items:', error);
      showToast('Error al eliminar los registros.');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0B0E14] font-mono overflow-hidden relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[300] bg-emerald-500 text-black px-6 py-3 rounded-xl font-bold text-sm shadow-2xl flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          {toastMessage}
        </div>
      )}

      {/* Modals */}
      {showNewModal && <NewExpiryModal onClose={() => setShowNewModal(false)} onSave={handleSaveNew} />}

      {/* Mass Actions Panel */}
      {selectedIds.size > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-800 border border-slate-700 p-3 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.5)] flex items-center gap-4 animate-in slide-in-from-bottom-10">
          <div className="flex items-center gap-2 px-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-black font-black text-xs">
              {selectedIds.size}
            </span>
            <span className="text-white font-bold text-sm uppercase tracking-wider">Seleccionados</span>
          </div>
          
          <div className="h-8 w-px bg-slate-700"></div>
          
          <button onClick={handleMassVerify} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors font-bold text-sm uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4" /> Verificar
          </button>
          
          <button onClick={handleMassDelete} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors font-bold text-sm uppercase tracking-wider">
            <Trash2 className="w-4 h-4" /> Eliminar
          </button>
          
          <div className="h-8 w-px bg-slate-700"></div>
          
          <button onClick={clearSelection} className="p-2 text-slate-400 hover:text-white transition-colors rounded-xl hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between p-6 shrink-0 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Calendar className="w-7 h-7 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tighter leading-none">
              Control de Vencimientos
            </h1>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
              <span className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest">
                Monitoreo de vida útil y retiros
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <button onClick={() => navigate('/events')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500/20 transition-colors">
            <AlertTriangle className="w-4 h-4" /> Eventos
          </button>
          <button onClick={handleSync} disabled={isSyncing} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[10px] font-black uppercase tracking-widest hover:bg-amber-500/20 transition-colors disabled:opacity-50">
            <Cloud className={`w-4 h-4 ${isSyncing ? 'animate-pulse' : ''}`} /> {isSyncing ? 'Sincronizando...' : 'Sincronizar Nube'}
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors">
            <Printer className="w-4 h-4" /> Imprimir
          </button>
          <button onClick={() => useAppStore.getState().updateSetting('theme', useAppStore.getState().settings.theme === 'dark' ? 'light' : 'dark')} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:bg-white/10 transition-colors">
            <Sun className="w-4 h-4" />
          </button>
          <button onClick={() => navigate('/settings')} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:bg-white/10 transition-colors">
            <Settings className="w-4 h-4" />
          </button>
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors">
            <FileText className="w-4 h-4" /> Exportar CSV
          </button>
        </div>
      </header>

      {/* Status Pills */}
      <div className="flex items-center gap-3 px-6 mb-6 shrink-0 overflow-x-auto no-scrollbar pb-2">
        <StatusPill status="expired" count={counts.expired} label="Vencidos" icon={AlertTriangle} colorClass="text-rose-500" bgClass="bg-rose-500/10" borderClass="border-rose-500/30" isActive={selectedStatuses.includes('expired')} onClick={toggleStatus} />
        <StatusPill status="critical" count={counts.critical} label="Críticos" icon={ShieldAlert} colorClass="text-amber-500" bgClass="bg-amber-500/10" borderClass="border-amber-500/30" isActive={selectedStatuses.includes('critical')} onClick={toggleStatus} />
        <StatusPill status="withdrawal" count={counts.withdrawal} label="Retiros" icon={Download} colorClass="text-indigo-400" bgClass="bg-indigo-500/10" borderClass="border-indigo-500/30" isActive={selectedStatuses.includes('withdrawal')} onClick={toggleStatus} />
        <StatusPill status="next_expiry" count={counts.next_expiry} label="Próx" icon={Clock} colorClass="text-blue-400" bgClass="bg-blue-500/10" borderClass="border-blue-500/30" isActive={selectedStatuses.includes('next_expiry')} onClick={toggleStatus} />
        <StatusPill status="safe" count={counts.safe} label="Vigentes" icon={CheckCircle2} colorClass="text-emerald-500" bgClass="bg-emerald-500/10" borderClass="border-emerald-500/30" isActive={selectedStatuses.includes('safe')} onClick={toggleStatus} />
      </div>

      {/* Search & Action Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 px-6 mb-6 shrink-0">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input 
            type="text" 
            placeholder="BUSCAR POR NOMBRE, SKU O LOTE..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0f1219] border border-amber-500/30 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:bg-slate-900 transition-colors"
          />
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSelectAll}
            className={`flex items-center justify-center gap-2 px-4 py-4 rounded-2xl border transition-colors shrink-0 ${selectedIds.size === filteredItems.length && filteredItems.length > 0 ? 'bg-amber-500/20 border-amber-500/50 text-amber-500' : 'bg-[#0f1219] border-amber-500/30 text-slate-400 hover:text-white'}`}
            title="Seleccionar Todos"
          >
            {selectedIds.size === filteredItems.length && filteredItems.length > 0 ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
          </button>
          <button onClick={() => showToast('Escáner de cámara próximamente')} className="w-14 h-14 rounded-2xl bg-[#0f1219] border border-amber-500/30 flex items-center justify-center text-amber-500 hover:bg-amber-500/20 transition-colors shrink-0">
            <Camera className="w-6 h-6" />
          </button>
          <button onClick={() => setShowNewModal(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-amber-500 text-black font-black uppercase tracking-widest text-sm hover:bg-amber-400 transition-colors shrink-0">
            <Plus className="w-5 h-5" /> Nuevo
          </button>
          <button onClick={() => showToast('Filtros avanzados próximamente')} className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-[#2a2f3d] border border-slate-700 text-white font-black uppercase tracking-widest text-sm hover:bg-slate-700 transition-colors shrink-0">
            <Filter className="w-5 h-5" /> Filtros
          </button>
          <button onClick={() => { setSearchQuery(''); useExpiryStore.getState().setSelectedStatuses([]); clearSelection(); }} className="w-14 h-14 rounded-2xl bg-[#2a2f3d] border border-slate-700 flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-white transition-colors shrink-0">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto px-6 pb-24 space-y-3 custom-scrollbar">
        {filteredItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <Calendar className="w-16 h-16 mb-4 opacity-20" />
            <p className="font-bold uppercase tracking-widest">No hay registros que coincidan</p>
          </div>
        ) : (
          filteredItems.map(item => (
            <ExpiryCard 
              key={item.id} 
              item={item} 
              onVerify={toggleVerified} 
              onDelete={handleDelete} 
              isVerified={verifiedIds.has(item.id)} 
              isSelected={selectedIds.has(item.id)}
              onSelect={toggleSelection}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <footer className="bg-[#0B0E14] border-t border-white/5 px-6 py-4 flex justify-between items-center shrink-0">
        <div className="flex flex-col">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Total Monitoreado</span>
          <span className="text-slate-300 font-bold text-sm">{items.length} SKUs</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Última Sincronización</span>
          <span className="text-slate-300 font-bold text-sm">{new Date().toLocaleTimeString()}</span>
        </div>
      </footer>
    </div>
  );
};

export default ExpiryControlPage;
