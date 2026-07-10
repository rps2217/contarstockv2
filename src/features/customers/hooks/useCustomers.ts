/**
 * useCustomers.ts - Hook centralizado para el módulo de Clientes
 */

import { useState, useCallback, useMemo } from 'react';
import { useAppStore } from '@/stores';
import { Customer } from '@/types';
import { CustomerRepository } from '@/repositories/CustomerRepository';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  calculateCustomerStats, 
  customerMatchesSearch,
  sortCustomers,
  CustomerSortField,
  CustomerSortOrder,
  CustomerStats
} from '../domain/customersDomain';

// ============================================================================
// TIPOS
// ============================================================================

export interface CustomerFilters {
  searchQuery: string;
  sortField: CustomerSortField;
  sortOrder: CustomerSortOrder;
}

export interface UseCustomersReturn {
  // Estado
  filteredCustomers: Customer[];
  allCustomers: Customer[];
  stats: CustomerStats;
  filters: CustomerFilters;
  isLoading: boolean;
  
  // UI State
  ui: {
    isFormOpen: boolean;
    isSendModalOpen: boolean;
    isTemplateManagerOpen: boolean;
    editingCustomer: Customer | null;
    selectedCustomerForMessage: Customer | null;
  };
  
  // Acciones
  actions: {
    setSearchQuery: (query: string) => void;
    setSortField: (field: CustomerSortField) => void;
    setSortOrder: (order: CustomerSortOrder) => void;
    openCreate: () => void;
    openEdit: (customer: Customer) => void;
    closeForm: () => void;
    saveCustomer: (customer: Customer) => Promise<void>;
    deleteCustomer: (id: string) => Promise<void>;
    openSendMessage: (customer: Customer) => void;
    closeSendMessage: () => void;
    openTemplateManager: () => void;
    closeTemplateManager: () => void;
  };
}

// ============================================================================
// HOOK PRINCIPAL
// ============================================================================

export const useCustomers = (): UseCustomersReturn => {
  const settings = useAppStore(state => state.settings);
  const theme = (settings?.theme as 'dark' | 'light' | 'high-contrast') || 'dark';

  // Estado local de filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<CustomerSortField>('firstName');
  const [sortOrder, setSortOrder] = useState<CustomerSortOrder>('asc');
  
  // UI State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [selectedCustomerForMessage, setSelectedCustomerForMessage] = useState<Customer | null>(null);
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);

  // Query de clientes
  const customers = useLiveQuery(() => CustomerRepository.getAll(), []) || [];

  // Estadísticas
  const stats = useMemo(() => {
    return calculateCustomerStats(customers);
  }, [customers]);

  // Clientes filtrados y ordenados
  const filteredCustomers = useMemo(() => {
    let result = customers;

    // Filtrar por búsqueda
    if (searchQuery.trim()) {
      result = result.filter(c => customerMatchesSearch(c, searchQuery));
    }

    // Ordenar
    result = sortCustomers(result, sortField, sortOrder);

    return result;
  }, [customers, searchQuery, sortField, sortOrder]);

  // Acciones
  const openCreate = useCallback(() => {
    setEditingCustomer(null);
    setIsFormOpen(true);
  }, []);

  const openEdit = useCallback((customer: Customer) => {
    setEditingCustomer(customer);
    setIsFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setIsFormOpen(false);
    setEditingCustomer(null);
  }, []);

  const saveCustomer = useCallback(async (customer: Customer) => {
    await CustomerRepository.save(customer);
    closeForm();
  }, [closeForm]);

  const deleteCustomer = useCallback(async (id: string) => {
    await CustomerRepository.delete(id);
  }, []);

  const openSendMessage = useCallback((customer: Customer) => {
    setSelectedCustomerForMessage(customer);
    setIsSendModalOpen(true);
  }, []);

  const closeSendMessage = useCallback(() => {
    setIsSendModalOpen(false);
    setSelectedCustomerForMessage(null);
  }, []);

  const openTemplateManager = useCallback(() => {
    setIsTemplateManagerOpen(true);
  }, []);

  const closeTemplateManager = useCallback(() => {
    setIsTemplateManagerOpen(false);
  }, []);

  return {
    filteredCustomers,
    allCustomers: customers,
    stats,
    filters: {
      searchQuery,
      sortField,
      sortOrder
    },
    isLoading: false,
    ui: {
      isFormOpen,
      isSendModalOpen,
      isTemplateManagerOpen,
      editingCustomer,
      selectedCustomerForMessage
    },
    actions: {
      setSearchQuery,
      setSortField,
      setSortOrder,
      openCreate,
      openEdit,
      closeForm,
      saveCustomer,
      deleteCustomer,
      openSendMessage,
      closeSendMessage,
      openTemplateManager,
      closeTemplateManager
    }
  };
};

// Re-exportar tipos útiles
export type { CustomerStats };
