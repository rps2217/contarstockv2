
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ArrowLeft, Search, AlertCircle, CheckCircle2, Loader2, Clock, Package } from 'lucide-react';
import { ExpirationModal } from './components/ExpirationModal';

const ExpiryControlPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    
    setIsLoading(true);
    // Simular búsqueda de producto
    setTimeout(() => {
      setSelectedProduct({
        id: '123',
        name: 'PRODUCTO DE PRUEBA ' + searchQuery,
        sku: searchQuery
      });
      setIsLoading(false);
      setIsModalOpen(true);
    }, 800);
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-white font-mono">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-slate-400" />
          </button>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter italic flex items-center gap-2">
              CONTROL <span className="text-amber-500">CADUCIDAD</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Módulo de Gestión de Vencimientos</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-500 uppercase">Estado_Kernel</span>
            <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              ONLINE
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 max-w-4xl mx-auto w-full">
        {/* Search Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Clock className="w-32 h-32" />
          </div>
          
          <div className="relative z-10">
            <h2 className="text-xl font-black uppercase tracking-tight mb-2">Escanear Producto</h2>
            <p className="text-slate-400 text-sm mb-6 max-w-md">Ingrese el código de barras o SKU para registrar la fecha de vencimiento y lote del producto.</p>
            
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ESCANEAR O ESCRIBIR CÓDIGO..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-white font-bold placeholder:text-slate-700 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                  autoFocus
                />
              </div>
              <button 
                type="submit"
                disabled={isLoading}
                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black px-8 rounded-2xl transition-all active:scale-95 flex items-center gap-2"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Package className="w-5 h-5" />}
                BUSCAR
              </button>
            </form>
          </div>
        </div>

        {/* Stats/Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-500" />
              </div>
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Próximos a Vencer</span>
            </div>
            <div className="text-3xl font-black italic">12</div>
            <div className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-widest">En los próximos 30 días</div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Registrados Hoy</span>
            </div>
            <div className="text-3xl font-black italic">45</div>
            <div className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-widest">Sesión actual</div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Total Controlados</span>
            </div>
            <div className="text-3xl font-black italic">1,284</div>
            <div className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-widest">Histórico mensual</div>
          </div>
        </div>
      </div>

      {isModalOpen && selectedProduct && (
        <ExpirationModal
          productName={selectedProduct.name}
          onComplete={(month, year, batch) => {
            console.log('Expiry registered:', { month, year, batch, product: selectedProduct });
            setIsModalOpen(false);
            setSearchQuery('');
            // Aquí se llamaría al servicio para guardar
          }}
          onCancel={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};

export default ExpiryControlPage;
