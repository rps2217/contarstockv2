
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  Edit2, 
  Calendar,
  Package,
  ArrowLeft,
  Loader2,
  AlertCircle,
  FileText
} from 'lucide-react';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { CreateEventModal } from './components/CreateEventModal';
import { useAppStore } from '../../store/useAppStore';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export const EventsPage: React.FC = () => {
  const navigate = useNavigate();
  const { settings } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Obtener eventos de la base de datos
  const events = useLiveQuery(
    () => db.dynamic_data.where('tableName').equals('EVENTOS').reverse().sortBy('timestamp')
  );

  const filteredEvents = events?.filter(event => {
    const matchesSearch = 
      event.data.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.data.barcode.includes(searchQuery) ||
      event.data.frc?.includes(searchQuery);
    
    const matchesType = filterType === 'all' || event.data.event === filterType;
    
    return matchesSearch && matchesType;
  });

  const handleCreateEvent = async (items: any[]) => {
    try {
      for (const item of items) {
        if (editingItem) {
          await db.dynamic_data.update(editingItem.id, {
            data: { ...item },
            timestamp: Date.now(),
            syncStatus: 'pending'
          });
        } else {
          await db.dynamic_data.add({
            id: crypto.randomUUID(),
            tableName: 'EVENTOS',
            data: { ...item },
            timestamp: Date.now(),
            syncStatus: 'pending'
          });
        }
      }
      toast.success(editingItem ? 'Evento actualizado' : 'Evento(s) registrado(s)');
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error guardando evento:', error);
      toast.error('Error al guardar el evento');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este registro?')) return;
    try {
      await db.dynamic_data.delete(id);
      toast.success('Registro eliminado');
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 font-mono">
      {/* Header */}
      <div className="bg-slate-900/50 border-b border-white/10 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2 hover:bg-white/5 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-slate-400" />
          </button>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter italic">
              Gestión de <span className="text-blue-500">Eventos</span>
            </h1>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Control de Diferencias y Devoluciones</p>
          </div>
        </div>
        
        <button
          onClick={() => {
            setEditingItem(null);
            setIsModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-900/20"
        >
          <Plus className="w-4 h-4" />
          Nuevo Evento
        </button>
      </div>

      {/* Toolbar */}
      <div className="p-4 bg-slate-900/30 border-b border-white/5 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="BUSCAR POR PRODUCTO, CÓDIGO O FRC..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition-all"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold uppercase text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="all">TODOS LOS TIPOS</option>
            <option value="DIF. PED.">DIF. PEDIDO</option>
            <option value="DEVOLUCION">DEVOLUCIÓN</option>
            <option value="MERMA">MERMA</option>
            <option value="OTROS">OTROS</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        <AnimatePresence initial={false}>
          {filteredEvents?.map((event) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="group bg-slate-900/40 border border-white/5 hover:border-white/10 rounded-2xl p-4 flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  event.data.event === 'DIF. PED.' ? 'bg-amber-500/10 text-amber-500' :
                  event.data.event === 'DEVOLUCION' ? 'bg-blue-500/10 text-blue-500' :
                  'bg-slate-500/10 text-slate-500'
                }`}>
                  <FileText className="w-6 h-6" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${
                      event.data.event === 'DIF. PED.' ? 'bg-amber-500/20 text-amber-500' :
                      event.data.event === 'DEVOLUCION' ? 'bg-blue-500/20 text-blue-500' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {event.data.event}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                      FRC: {event.data.frc || 'N/A'}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white uppercase truncate">
                    {event.data.productName}
                  </h3>
                  <div className="flex items-center gap-4 mt-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Package className="w-3 h-3" /> {event.data.quantity} UNID.
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {new Date(event.timestamp).toLocaleDateString()}
                    </span>
                    {event.data.nguia && (
                      <span className="text-blue-400">GUÍA: {event.data.nguia}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button
                  onClick={() => {
                    setEditingItem(event);
                    setIsModalOpen(true);
                  }}
                  className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(event.id)}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {(!filteredEvents || filteredEvents.length === 0) && (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 py-20">
            <div className="p-8 border-2 border-dashed border-slate-800 rounded-[3rem] mb-4">
              <FileText className="w-16 h-16 opacity-10" />
            </div>
            <p className="text-sm font-bold uppercase tracking-widest">No se encontraron eventos</p>
            <p className="text-[10px] text-slate-700 mt-1 uppercase">Use el botón "Nuevo Evento" para comenzar</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <CreateEventModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        onSubmit={handleCreateEvent}
        theme={settings.theme}
        editingItem={editingItem?.data}
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default EventsPage;
