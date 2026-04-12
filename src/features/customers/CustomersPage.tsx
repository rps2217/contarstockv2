import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Users, MessageCircle, Edit2, Trash2, UserPlus, FileText, Cloud, CloudOff } from 'lucide-react';
import { toast } from 'sonner';
import { Customer } from '../../types';
import { CustomerRepository } from '../../repositories/CustomerRepository';
import { useAppStore } from '../../store/mainAppStore';
import { ManagementSearchBar } from '../../shared/components/core/ManagementSearchBar';
import { CustomerFormModal } from './components/CustomerFormModal';
import { SendMessageModal } from './components/SendMessageModal';
import { TemplateManagerModal } from './components/TemplateManagerModal';
import { customerSyncService } from '../../services/customerSyncService';
import { templateSyncService } from '../../services/templateSyncService';
import { useLiveQuery } from 'dexie-react-hooks';
import { useVirtualizer } from '@tanstack/react-virtual';

export const CustomersPage: React.FC = () => {
  const navigate = useNavigate();
  const { settings } = useAppStore();
  const theme = settings.theme || 'dark';

  const customers = useLiveQuery(() => CustomerRepository.getAll(), []) || [];
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>(undefined);
  
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [selectedCustomerForMessage, setSelectedCustomerForMessage] = useState<Customer | null>(null);
  
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);

  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    customerSyncService.startSync();
    templateSyncService.startSync();
    return () => {
      customerSyncService.stopSync();
      templateSyncService.stopSync();
    };
  }, []);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return customers;
    const lowerQuery = searchQuery.toLowerCase();
    return customers.filter(c => 
      c.firstName.toLowerCase().includes(lowerQuery) ||
      c.lastName.toLowerCase().includes(lowerQuery) ||
      c.phone.includes(lowerQuery)
    );
  }, [customers, searchQuery]);

  // Virtualizer setup
  const rowVirtualizer = useVirtualizer({
    count: filteredCustomers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 180, // Estimated height of a card
    overscan: 5,
  });

  const handleSave = async (customer: Customer) => {
    try {
      await CustomerRepository.save(customer);
      toast.success(editingCustomer ? 'Cliente actualizado' : 'Cliente guardado');
      setIsFormOpen(false);
    } catch (error) {
      toast.error('Error al guardar el cliente');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este cliente?')) {
      try {
        await CustomerRepository.delete(id);
        toast.success('Cliente eliminado');
      } catch (error) {
        toast.error('Error al eliminar el cliente');
      }
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsFormOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingCustomer(undefined);
    setIsFormOpen(true);
  };

  const handleOpenSendMessage = (customer: Customer) => {
    setSelectedCustomerForMessage(customer);
    setIsSendModalOpen(true);
  };

  return (
    <div className={`h-full flex flex-col overflow-hidden font-sans transition-colors duration-500 ${
      theme === 'dark' ? 'bg-brand-dark text-white' : 'bg-stone-200/50 text-slate-900'
    }`}>
      {/* HEADER */}
      <div className={`p-4 md:p-6 pb-4 backdrop-blur-xl border-b shrink-0 transition-colors ${
        theme === 'dark' ? 'bg-slate-950/40 border-white/5' : 'bg-stone-50/80 border-stone-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/dashboard')}
              className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${
                theme === 'dark' ? 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic leading-none flex items-center gap-2">
                <Users className="w-6 h-6 md:w-8 md:h-8 text-blue-500" />
                Directorio de Clientes
              </h1>
              <p className={`text-[10px] font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2 ${
                theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
              }`}>
                Gestión de contactos y notificaciones
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setIsTemplateManagerOpen(true)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-colors border ${
              theme === 'dark' 
                ? 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300' 
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600 shadow-sm'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="hidden md:inline">Plantillas de Mensajes</span>
          </button>
        </div>

        <ManagementSearchBar 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onOpenFilters={() => {}}
          onOpenAdd={handleOpenAdd}
          onClearFilters={() => setSearchQuery('')}
          activeFiltersCount={0}
          placeholder="BUSCAR POR NOMBRE, APELLIDO O TELÉFONO..."
          accentColor="blue"
          theme={theme}
        />
      </div>

      {/* LIST WITH VIRTUALIZATION */}
      <div 
        ref={parentRef}
        className="flex-1 overflow-y-auto p-4 md:p-6"
      >
        <div 
          className="max-w-4xl mx-auto relative"
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualItem) => {
            const customer = filteredCustomers[virtualItem.index];
            return (
              <div
                key={customer.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                className="pb-4"
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-5 rounded-2xl border transition-all relative overflow-hidden h-full ${
                    theme === 'dark' 
                      ? 'bg-slate-900/50 border-white/10 hover:border-blue-500/50' 
                      : 'bg-white border-slate-200 hover:border-blue-500/50 shadow-sm'
                  }`}
                >
                  {/* Sync Indicator */}
                  <div className="absolute top-3 right-3">
                    {customer.syncStatus === 'synced' ? (
                      <Cloud className="w-3 h-3 text-emerald-500 opacity-50" />
                    ) : (
                      <CloudOff className="w-3 h-3 text-amber-500 animate-pulse" />
                    )}
                  </div>

                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${
                        theme === 'dark' ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {customer.firstName.charAt(0)}{customer.lastName.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg leading-tight">
                          {customer.firstName} {customer.lastName}
                        </h3>
                        <p className={`text-xs font-mono mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                          {customer.phone}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
                    <button
                      onClick={() => handleOpenSendMessage(customer)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Enviar Mensaje
                    </button>
                    <button
                      onClick={() => handleEdit(customer)}
                      className={`p-2 rounded-xl transition-colors ${
                        theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(customer.id)}
                      className={`p-2 rounded-xl transition-colors ${
                        theme === 'dark' ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-500' : 'bg-rose-50 hover:bg-rose-100 text-rose-600'
                      }`}
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              </div>
            );
          })}

          {filteredCustomers.length === 0 && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                theme === 'dark' ? 'bg-white/5' : 'bg-slate-100'
              }`}>
                <Users className={`w-8 h-8 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
              </div>
              <h3 className="text-lg font-bold mb-1">No hay clientes</h3>
              <p className={`text-sm max-w-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                {searchQuery ? 'No se encontraron clientes que coincidan con tu búsqueda.' : 'Agrega tu primer cliente para comenzar a enviar notificaciones de retiro.'}
              </p>
              {!searchQuery && (
                <button
                  onClick={handleOpenAdd}
                  className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-widest flex items-center gap-2 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Agregar Cliente
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <CustomerFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
        editingCustomer={editingCustomer}
        theme={theme}
      />

      <SendMessageModal
        isOpen={isSendModalOpen}
        onClose={() => {
          setIsSendModalOpen(false);
          setSelectedCustomerForMessage(null);
        }}
        customer={selectedCustomerForMessage}
        theme={theme}
      />

      <TemplateManagerModal
        isOpen={isTemplateManagerOpen}
        onClose={() => setIsTemplateManagerOpen(false)}
        theme={theme}
      />
    </div>
  );
};
