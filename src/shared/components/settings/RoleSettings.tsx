"use client";
/**
 * RoleSettings - Panel de configuración de roles y permisos
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  ChevronDown,
  ChevronRight,
  Check,
  User,
  Lock,
  Unlock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePermissions, RoleBadge, RoleSelector, PermissionList } from '@/shared/hooks/usePermissions';
import { ROLE_LABELS, UserRole } from '@/stores';
import { toast } from 'sonner';

export const RoleSettings: React.FC<{ className?: string }> = ({ className }) => {
  const { role, setRole, isEnabled, user } = usePermissions();
  const [expandedSection, setExpandedSection] = useState<string | null>('current');
  const [selectedRole, setSelectedRole] = useState<UserRole>(role);

  const handleSaveRole = () => {
    setRole(selectedRole);
    toast.success('Rol actualizado', {
      description: `Ahora tienes el rol: ${ROLE_LABELS[selectedRole].label}`,
    });
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-primary">Permisos y Roles</h2>
          <p className="text-sm text-muted">Gestiona el control de acceso</p>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 bg-surface rounded-xl border border-subtle">
        <div className="flex items-center gap-3">
          {isEnabled ? <Lock className="w-5 h-5 text-emerald-500" /> : <Unlock className="w-5 h-5 text-muted" />}
          <div>
            <p className="text-sm font-medium text-primary">
              Control de acceso {isEnabled ? 'activado' : 'desactivado'}
            </p>
            <p className="text-xs text-muted">
              {isEnabled ? 'Permisos siendo verificados' : 'Acceso completo para todos'}
            </p>
          </div>
        </div>
        <div className={cn('relative w-12 h-6 rounded-full transition-colors', isEnabled ? 'bg-blue-500' : 'bg-elevated')}>
          <div className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
            style={{ left: isEnabled ? 28 : 4 }}
          />
        </div>
      </div>

      <div className="border border-subtle rounded-xl overflow-hidden">
        <button onClick={() => toggleSection('current')} className="w-full flex items-center justify-between p-4 hover:bg-elevated/50">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-muted" />
            <div className="text-left">
              <p className="text-sm font-medium text-primary">Sesión actual</p>
              <p className="text-xs text-muted">{user?.name || 'Usuario anónimo'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <RoleBadge />
            {expandedSection === 'current' ? <ChevronDown className="w-4 h-4 text-muted" /> : <ChevronRight className="w-4 h-4 text-muted" />}
          </div>
        </button>
        <AnimatePresence>
          {expandedSection === 'current' && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-subtle">
              <div className="p-4 bg-base/50">
                <p className="text-sm text-primary">Rol: {ROLE_LABELS[role].label}</p>
                <p className="text-xs text-muted mt-1">{ROLE_LABELS[role].description}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="border border-subtle rounded-xl overflow-hidden">
        <button onClick={() => toggleSection('change-role')} className="w-full flex items-center justify-between p-4 hover:bg-elevated/50">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-muted" />
            <div className="text-left">
              <p className="text-sm font-medium text-primary">Cambiar rol</p>
              <p className="text-xs text-muted">Simular diferentes niveles de acceso</p>
            </div>
          </div>
          {expandedSection === 'change-role' ? <ChevronDown className="w-4 h-4 text-muted" /> : <ChevronRight className="w-4 h-4 text-muted" />}
        </button>
        <AnimatePresence>
          {expandedSection === 'change-role' && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-subtle">
              <div className="p-4 bg-base/50 space-y-4">
                <p className="text-xs text-muted">Selecciona un rol para ver cómo se comporta la aplicación.</p>
                <RoleSelector value={selectedRole} onChange={setSelectedRole} />
                <button
                  onClick={handleSaveRole}
                  disabled={selectedRole === role}
                  className={cn('w-full py-2.5 rounded-xl font-medium', selectedRole === role ? 'bg-elevated text-muted' : 'bg-blue-600 hover:bg-blue-500 text-white')}
                >
                  {selectedRole === role ? 'Rol actual' : `Cambiar a ${ROLE_LABELS[selectedRole].label}`}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="border border-subtle rounded-xl overflow-hidden">
        <button onClick={() => toggleSection('permissions')} className="w-full flex items-center justify-between p-4 hover:bg-elevated/50">
          <div className="flex items-center gap-3">
            <Check className="w-5 h-5 text-muted" />
            <div className="text-left">
              <p className="text-sm font-medium text-primary">Permisos del rol actual</p>
              <p className="text-xs text-muted">Ver qué acciones están permitidas</p>
            </div>
          </div>
          {expandedSection === 'permissions' ? <ChevronDown className="w-4 h-4 text-muted" /> : <ChevronRight className="w-4 h-4 text-muted" />}
        </button>
        <AnimatePresence>
          {expandedSection === 'permissions' && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-subtle">
              <div className="p-4 bg-base/50">
                <PermissionList role={role} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RoleSettings;