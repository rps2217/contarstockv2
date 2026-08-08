import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Upload,
  Clock,
  Trash2,
  Pencil,
  Eye,
  CheckCircle2,
  PackageCheck,
  Package,
  MapPin,
  Truck,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/services/logger';
import { toast } from 'sonner';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { SessionRepository } from '@/repositories/SessionRepository';
import { HorizontalStatCard } from '@/shared/components/ui/HorizontalStatCard';
import { SearchInput } from '@/shared/components/ui/SearchInput';
import { FAB } from '@/shared/components/ui/FAB';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { ReceptionCard } from './ReceptionPage/ReceptionCard';
import { ReceptionFormModal } from './ReceptionPage/ReceptionFormModal';
import { ReceptionDetailModal } from './ReceptionPage/ReceptionDetailModal';

// ============================================================================
// Tipos
// ============================================================================
export interface Reception {
  id: string;
  supplierName?: string;
  supplierRut?: string;
  documentNumber?: string;
  documentType?: string;
  receivedBy?: string;
  location?: string;
  receivedAt: number;
  items: { barcode: string; name?: string; quantity: number; expiry?: string }[];
  observations?: string;
  status: 'pending' | 'in-progress' | 'completed';
  syncStatus: 'pending' | 'synced' | 'error';
}

/** CountingSession extendido para recepciones */
interface ReceptionSession {
  id?: string;
  createdAt?: number;
  syncStatus?: 'synced' | 'pending' | 'error' | 'pending_delete';
  sessionType: string;
  supplierName?: string;
  productName?: string;
  supplierRut?: string;
  documentNumber?: string;
  documentType?: string;
  userName?: string;
  receivedBy?: string;
  location?: string;
  timestamp?: number;
  items?: { barcode: string; name?: string; quantity: number; expiry?: string }[];
  observations?: string;
  status?: string;
}

/** Tipo combinado para guardar sesiones de recepción */
type ReceptionSessionForSave = {
  id?: string;
  erpOrder?: string;
  logisticsLabel?: string;
  createdAt: number;
  status: 'active' | 'completed' | 'draft';
  sessionType: 'reception';
  operatorId?: string;
  totalUnits?: number;
  totalSKUs?: number;
  lastSyncTimestamp?: number;
  isVerifiedMode?: boolean;
  expectedItems?: { barcode: string; name?: string; quantity: number; expiry?: string }[];
  auditStatus?: 'verified' | 'warning' | 'failed' | 'pending';
  auditScore?: number;
  auditTimestamp?: number;
  mm?: number;
  yyyy?: number;
  batch?: string;
  labelPhoto?: string;
  photoUrl?: string;
  isAutoLockEnabled?: boolean;
  syncStatus: 'synced' | 'pending' | 'error' | 'pending_delete';
  // Campos específicos de recepción
  supplierName?: string;
  supplierRut?: string;
  documentNumber?: string;
  documentType?: string;
  receivedBy?: string;
  location?: string;
  observations?: string;
  userName?: string;
};
// ============================================================================
// Componente principal
// ============================================================================
export const RedesignReceptionPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingReception, setEditingReception] = useState<Reception | null>(null);
  const [selectedReception, setSelectedReception] = useState<Reception | null>(null);

  // Datos de recepciones (usando sessions como proxy)
  const receptions = useLiveQuery(async (): Promise<Reception[]> => {
    const sessions = await db.sessions.toArray();
    return sessions
      .filter(s => s.sessionType === 'reception')
      .map((s): Reception => {
        const session = s as unknown as ReceptionSession;
        return {
          id: session.id?.toString() || Math.random().toString(),
          supplierName: session.supplierName || session.productName || 'Recepción',
          supplierRut: session.supplierRut,
          documentNumber: session.documentNumber,
          documentType: session.documentType,
          receivedBy: session.userName || session.receivedBy,
          location: session.location,
          receivedAt: session.createdAt || session.timestamp || Date.now(),
          items: session.items || [],
          observations: session.observations,
          status:
            session.status === 'completed'
              ? 'completed'
              : session.syncStatus === 'synced'
                ? 'completed'
                : 'in-progress',
          syncStatus: (session.syncStatus || 'pending') as Reception['syncStatus'],
        };
      })
      .sort((a, b) => b.receivedAt - a.receivedAt);
  }, []);

  const filtered = useMemo(() => {
    if (!receptions || !searchQuery) return receptions || [];
    const q = searchQuery.toLowerCase();
    return receptions.filter(
      r =>
        r.supplierName?.toLowerCase().includes(q) ||
        r.documentNumber?.includes(q) ||
        r.location?.toLowerCase().includes(q)
    );
  }, [receptions, searchQuery]);

  const stats = useMemo(() => {
    const all = receptions || [];
    return {
      total: all.length,
      pending: all.filter(r => r.status === 'pending').length,
      inProgress: all.filter(r => r.status === 'in-progress').length,
      completed: all.filter(r => r.status === 'completed').length,
    };
  }, [receptions]);

  const handleCreate = () => {
    setEditingReception(null);
    setShowFormModal(true);
  };

  const handleEdit = (reception: Reception) => {
    setEditingReception(reception);
    setSelectedReception(reception);
    setShowDetailModal(false);
    setShowFormModal(true);
  };

  const handleView = (reception: Reception) => {
    setSelectedReception(reception);
    setShowDetailModal(true);
  };

  const handleDelete = async (reception: Reception) => {
    if (!confirm('¿Eliminar esta recepción? Esta acción no se puede deshacer.')) return;
    try {
      await SessionRepository.delete(reception.id);
      toast.success('Recepción eliminada correctamente');
    } catch (error) {
      toast.error('Error al eliminar la recepción');
    }
  };

  const handleSave = async (data: Partial<Reception>) => {
    try {
      if (editingReception) {
        // Update existing
        const updatedSession: ReceptionSessionForSave = {
          id: editingReception.id,
          sessionType: 'reception',
          status: 'draft',
          createdAt: editingReception.receivedAt,
          syncStatus: 'pending',
          supplierName: data.supplierName ?? editingReception.supplierName,
          supplierRut: data.supplierRut ?? editingReception.supplierRut,
          documentNumber: data.documentNumber ?? editingReception.documentNumber,
          documentType: data.documentType ?? editingReception.documentType,
          location: data.location ?? editingReception.location,
          receivedBy: data.receivedBy ?? editingReception.receivedBy,
          observations: data.observations ?? editingReception.observations,
          expectedItems: editingReception.items,
        };
        await SessionRepository.save(
          updatedSession as unknown as Parameters<typeof SessionRepository.save>[0]
        );
        toast.success('Recepción actualizada correctamente');
      } else {
        // Create new
        const newReception: ReceptionSessionForSave = {
          sessionType: 'reception',
          supplierName: data.supplierName,
          supplierRut: data.supplierRut,
          documentNumber: data.documentNumber,
          documentType: data.documentType,
          location: data.location,
          receivedBy: data.receivedBy,
          observations: data.observations,
          status: 'draft',
          createdAt: Date.now(),
          syncStatus: 'pending',
        };
        await SessionRepository.save(
          newReception as unknown as Parameters<typeof SessionRepository.save>[0]
        );
        toast.success('Recepción creada correctamente');
      }
    } catch (error) {
      logger.error('ReceptionPage', 'Error al guardar recepción', { error });
      toast.error('Error al guardar la recepción');
    }
  };

  if (!receptions) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-base">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-muted mt-4">Cargando recepciones...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-base">
      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-8 shrink-0">
        {/* Title row */}
        <div className="flex items-start justify-between pt-8 pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight flex items-center gap-3">
              <PackageCheck className="w-8 h-8 text-emerald-500" />
              Recepciones
            </h1>
            <p className="text-secondary text-sm mt-1">
              {stats.total} recepciones • {stats.completed} completadas
            </p>
          </div>
          <div className="flex gap-2">
            <button className="hidden sm:flex items-center gap-2 bg-surface hover:bg-elevated border border-subtle text-primary px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
              <Upload className="w-4 h-4" />
              Importar
            </button>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-900/20"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nueva</span>
            </button>
          </div>
        </div>

        {/* Stats - usando componente compartido */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pb-4">
          <HorizontalStatCard icon={PackageCheck} label="Total" value={stats.total} />
          <HorizontalStatCard
            icon={Clock}
            label="Pendientes"
            value={stats.pending}
            color="text-amber-500"
          />
          <HorizontalStatCard
            icon={Package}
            label="En Progreso"
            value={stats.inProgress}
            color="text-blue-500"
          />
          <HorizontalStatCard
            icon={CheckCircle2}
            label="Completadas"
            value={stats.completed}
            color="text-emerald-500"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          {/* Search - usando componente compartido */}
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Buscar por proveedor, documento o ubicación..."
          />

          {/* List */}
          <div className="flex flex-col gap-3">
            {filtered.length === 0 ? (
              <EmptyState
                icon={PackageCheck}
                title={
                  searchQuery ? 'No se encontraron recepciones' : 'No hay recepciones registradas'
                }
                description={
                  !searchQuery
                    ? 'Comienza registrando tu primera recepción de mercancía'
                    : undefined
                }
                action={
                  !searchQuery
                    ? { label: 'Crear primera recepción', onClick: handleCreate }
                    : undefined
                }
              />
            ) : (
              filtered.map(reception => (
                <ReceptionCard
                  key={reception.id}
                  reception={reception}
                  onView={() => handleView(reception)}
                  onEdit={() => handleEdit(reception)}
                  onDelete={() => handleDelete(reception)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* FAB para móvil */}
      <FAB onClick={handleCreate} visible={true} />

      {/* Modals */}
      <ReceptionFormModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSave={handleSave}
        reception={editingReception}
      />

      <ReceptionDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onEdit={() => handleEdit(selectedReception!)}
        reception={selectedReception}
      />
    </div>
  );
};
