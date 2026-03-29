import React, { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { VisualGuide, ErpOrderSession } from '../../types';
import { visionService } from '../../services/visionService';
import { CameraCapture } from './CameraCapture';
import { 
  Plus, 
  Camera, 
  FileText, 
  ChevronRight, 
  Search, 
  Package, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ArrowLeft,
  ScanLine,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHIDScanner } from '../../hooks/useHIDScanner';

const VisualPickingPage: React.FC = () => {
  const [currentView, setCurrentView] = useState<'orders' | 'guides' | 'picking'>('orders');
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [selectedGuide, setSelectedGuide] = useState<VisualGuide | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const erpSessions = useLiveQuery(() => db.erpSessions.orderBy('createdAt').reverse().toArray());
  const guides = useLiveQuery(() => 
    selectedOrder ? db.visualGuides.where('erpOrderId').equals(selectedOrder).toArray() : []
  , [selectedOrder]);

  // Manejo de Escaneo HID Industrial
  const handleScan = useCallback(async (barcode: string) => {
    if (currentView !== 'picking' || !selectedGuide) return;

    const items = [...selectedGuide.items];
    const itemIdx = items.findIndex(i => i.barcode === barcode && i.status !== 'completed');
    
    if (itemIdx !== -1) {
      const item = items[itemIdx];
      item.pickedQty += 1;
      if (item.pickedQty >= item.expectedQty) {
        item.status = 'completed';
      } else {
        item.status = 'partial';
      }
      
      const updatedGuide = { ...selectedGuide, items };
      await db.visualGuides.put(updatedGuide);
      setSelectedGuide(updatedGuide);
      
      if (navigator.vibrate) navigator.vibrate(50);
    } else {
      // Alerta visual de error
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }
  }, [currentView, selectedGuide]);

  useHIDScanner({ onScan: handleScan, isEnabled: currentView === 'picking' });

  const handleCreateOrder = async () => {
    const orderId = prompt("Ingrese el número de Orden ERP:");
    if (!orderId) return;
    
    const newSession: ErpOrderSession = {
      id: `erp_${Date.now()}`,
      erpOrderId: orderId,
      guides: [],
      status: 'active',
      createdAt: Date.now()
    };
    
    await db.erpSessions.add(newSession);
    setSelectedOrder(orderId);
    setCurrentView('guides');
  };

  const handleDeleteOrder = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("¿Eliminar esta orden y todas sus guías?")) {
      await db.erpSessions.delete(id);
      // Las guías se quedan en DB pero huérfanas, idealmente limpiar también
    }
  };

  const handleCaptureGuide = async (base64: string) => {
    if (!selectedOrder) return;
    setShowCamera(false);
    setIsProcessing(true);
    
    try {
      const guideData = await visionService.processGuidePhoto(base64);
      const newGuide: VisualGuide = {
        ...guideData as VisualGuide,
        erpOrderId: selectedOrder,
        photoUrl: base64
      };
      
      await db.visualGuides.add(newGuide);
      setSelectedGuide(newGuide);
      setCurrentView('picking');
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al procesar la guía");
    } finally {
      setIsProcessing(false);
    }
  };

  const renderOrders = () => (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic">
            ORDENES <span className="text-blue-500">ERP</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Gestión de Despacho Visual</p>
        </div>
        <button 
          onClick={handleCreateOrder}
          className="p-4 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/20 active:scale-95 transition-transform"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input 
          type="text"
          placeholder="BUSCAR ORDEN..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      <div className="grid gap-4">
        {erpSessions?.filter(s => s.erpOrderId.toLowerCase().includes(searchQuery.toLowerCase())).map(session => (
          <motion.div 
            key={session.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setSelectedOrder(session.erpOrderId);
              setCurrentView('guides');
            }}
            className="bg-white/5 border border-white/10 rounded-3xl p-5 flex items-center justify-between group cursor-pointer hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-500">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-lg tracking-tight">{session.erpOrderId}</h3>
                <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                  <Clock className="w-3 h-3" />
                  {new Date(session.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={(e) => handleDeleteOrder(session.id, e)}
                className="p-2 text-slate-600 hover:text-rose-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-blue-500 transition-colors" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderGuides = () => (
    <div className="p-6 space-y-6 h-full flex flex-col">
      <div className="flex items-center gap-4">
        <button onClick={() => setCurrentView('orders')} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter italic">
            GUIAS <span className="text-blue-500">ERP-{selectedOrder}</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Documentos Escaneados</p>
        </div>
      </div>

      <button 
        onClick={() => setShowCamera(true)}
        className="w-full py-8 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-3 hover:bg-white/5 transition-colors group"
      >
        <div className="p-4 bg-blue-600/10 rounded-2xl text-blue-500 group-hover:scale-110 transition-transform">
          <Camera className="w-8 h-8" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fotografiar Nueva Guía</span>
      </button>

      <div className="flex-1 overflow-y-auto grid gap-4">
        {guides?.map(guide => (
          <motion.div 
            key={guide.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setSelectedGuide(guide);
              setCurrentView('picking');
            }}
            className="bg-white/5 border border-white/10 rounded-3xl p-5 flex items-center justify-between group cursor-pointer hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-600/20 rounded-2xl flex items-center justify-center text-emerald-500">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-lg tracking-tight">GUIA #{guide.guideNumber}</h3>
                <div className="flex items-center gap-3">
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                    guide.status === 'completed' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-blue-500/20 text-blue-500'
                  }`}>
                    {guide.status}
                  </span>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                    {guide.items.length} SKUs
                  </span>
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-blue-500 transition-colors" />
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderPicking = () => {
    if (!selectedGuide) return null;
    
    return (
      <div className="h-full flex flex-col">
        <div className="p-6 bg-slate-900/50 backdrop-blur-md border-b border-white/5">
          <div className="flex items-center gap-4 mb-4">
            <button onClick={() => setCurrentView('guides')} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tighter italic">
                PICKING <span className="text-blue-500">#{selectedGuide.guideNumber}</span>
              </h1>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Gemelo Digital de Guía</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
              <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Total_SKUs</div>
              <div className="text-xl font-black">{selectedGuide.items.length}</div>
            </div>
            <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
              <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Completados</div>
              <div className="text-xl font-black text-emerald-500">
                {selectedGuide.items.filter(i => i.status === 'completed').length}
              </div>
            </div>
            <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
              <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Pendientes</div>
              <div className="text-xl font-black text-amber-500">
                {selectedGuide.items.filter(i => i.status === 'pending').length}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {selectedGuide.items.map((item, idx) => (
            <div 
              key={idx}
              className={`bg-white/5 border rounded-2xl p-4 flex items-center justify-between transition-colors ${
                item.status === 'completed' ? 'border-emerald-500/30 bg-emerald-500/5' : 
                item.status === 'partial' ? 'border-amber-500/30 bg-amber-500/5' :
                'border-white/5'
              }`}
            >
              <div className="flex-1">
                <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">{item.barcode}</div>
                <h4 className="text-xs font-bold leading-tight mb-2">{item.name}</h4>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Teórico</span>
                    <span className="text-sm font-black">{item.expectedQty}</span>
                  </div>
                  <div className="w-px h-6 bg-white/10" />
                  <div className="flex flex-col">
                    <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Real</span>
                    <span className={`text-sm font-black ${item.pickedQty === item.expectedQty ? 'text-emerald-500' : 'text-white'}`}>
                      {item.pickedQty}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {item.status === 'completed' ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                      <ScanLine className="w-5 h-5" />
                    </div>
                    <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Escanee SKU</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-slate-900/80 backdrop-blur-xl border-t border-white/5">
          <button 
            onClick={async () => {
              const updatedGuide = { ...selectedGuide, status: 'completed', completedAt: Date.now() };
              await db.visualGuides.put(updatedGuide as VisualGuide);
              setCurrentView('guides');
            }}
            className="w-full py-4 bg-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform"
          >
            Finalizar Despacho de Guía
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full bg-slate-950 text-white font-mono overflow-hidden flex flex-col">
      <AnimatePresence>
        {showCamera && (
          <CameraCapture 
            onCapture={handleCaptureGuide}
            onClose={() => setShowCamera(false)}
          />
        )}
        
        {isProcessing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="relative mb-8">
              <div className="w-24 h-24 border-4 border-blue-600 rounded-full animate-spin border-t-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Camera className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-2">PROCESANDO <span className="text-blue-500">GUIA</span></h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest max-w-xs">
              Gemini está analizando la imagen para reconstruir el gemelo digital...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-hidden">
        {currentView === 'orders' && renderOrders()}
        {currentView === 'guides' && renderGuides()}
        {currentView === 'picking' && renderPicking()}
      </div>
    </div>
  );
};

export default VisualPickingPage;
