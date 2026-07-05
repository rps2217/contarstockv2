"use client";
/**
 * usePermissionStore - Sistema de Control de Acceso Basado en Roles (RBAC)
 * 
 * Roles disponibles:
 * - admin: Acceso total a todas las funcionalidades
 * - supervisor: Puede gestionar inventario y reportes
 * - operador: Puede escanear y registrar conteos
 * - viewer: Solo puede ver información (solo lectura)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// =============================================================================
// TIPOS Y CONSTANTES
// =============================================================================

export type UserRole = 'admin' | 'supervisor' | 'operador' | 'viewer';

export type Permission =
  // Inventario
  | 'inventory:read'
  | 'inventory:create'
  | 'inventory:update'
  | 'inventory:delete'
  | 'inventory:export'
  
  // Conteo
  | 'counting:read'
  | 'counting:create'
  | 'counting:delete'
  | 'counting:undo'
  
  // Proveedores
  | 'suppliers:read'
  | 'suppliers:create'
  | 'suppliers:update'
  | 'suppliers:delete'
  
  // Clientes
  | 'customers:read'
  | 'customers:create'
  | 'customers:update'
  | 'customers:delete'
  
  // Reportes
  | 'reports:read'
  | 'reports:export'
  
  // Configuración
  | 'settings:read'
  | 'settings:write'
  
  // Usuarios
  | 'users:manage'
  
  // Sync
  | 'sync:manual'
  | 'sync:configure'
  
  // Auditoría
  | 'audit:read';

interface PermissionMap {
  [key: string]: Permission[];
}

// Mapa de permisos por rol
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    // Inventario completo
    'inventory:read', 'inventory:create', 'inventory:update', 'inventory:delete', 'inventory:export',
    // Conteo completo
    'counting:read', 'counting:create', 'counting:delete', 'counting:undo',
    // Proveedores completo
    'suppliers:read', 'suppliers:create', 'suppliers:update', 'suppliers:delete',
    // Clientes completo
    'customers:read', 'customers:create', 'customers:update', 'customers:delete',
    // Reportes completo
    'reports:read', 'reports:export',
    // Configuración
    'settings:read', 'settings:write',
    // Usuarios
    'users:manage',
    // Sync
    'sync:manual', 'sync:configure',
    // Auditoría
    'audit:read',
  ],
  
  supervisor: [
    // Inventario completo
    'inventory:read', 'inventory:create', 'inventory:update', 'inventory:delete', 'inventory:export',
    // Conteo completo
    'counting:read', 'counting:create', 'counting:delete', 'counting:undo',
    // Proveedores
    'suppliers:read', 'suppliers:create', 'suppliers:update',
    // Clientes
    'customers:read', 'customers:create', 'customers:update',
    // Reportes completo
    'reports:read', 'reports:export',
    // Configuración
    'settings:read',
    // Sync
    'sync:manual',
  ],
  
  operador: [
    // Inventario lectura y creación
    'inventory:read', 'inventory:create', 'inventory:update',
    // Conteo
    'counting:read', 'counting:create', 'counting:undo',
    // Proveedores solo lectura
    'suppliers:read',
    // Clientes solo lectura
    'customers:read',
    // Reportes solo lectura
    'reports:read',
  ],
  
  viewer: [
    // Solo lectura
    'inventory:read',
    'counting:read',
    'suppliers:read',
    'customers:read',
    'reports:read',
    'settings:read',
  ],
};

// =============================================================================
// STORE
// =============================================================================

interface PermissionState {
  // Rol actual del usuario
  currentRole: UserRole;
  
  // Usuario actual (para auditoría)
  currentUser: {
    id: string;
    name: string;
    email?: string;
  } | null;
  
  // Permisos adicionales concedidos manualmente
  extraPermissions: Permission[];
  
  // Permisos denegados manualmente
  deniedPermissions: Permission[];
  
  // Configuración
  isEnabled: boolean;
  
  // Acciones
  setRole: (role: UserRole) => void;
  setUser: (user: { id: string; name: string; email?: string }) => void;
  logout: () => void;
  
  // Gestión de permisos
  grantPermission: (permission: Permission) => void;
  revokePermission: (permission: Permission) => void;
  grantPermissions: (permissions: Permission[]) => void;
  revokePermissions: (permissions: Permission[]) => void;
  
  // Verificar permisos
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  
  // Habilitar/deshabilitar RBAC
  enable: () => void;
  disable: () => void;
}

export const usePermissionStore = create<PermissionState>()(
  persist(
    (set, get) => ({
      currentRole: 'operador', // Por defecto: operador
      currentUser: null,
      extraPermissions: [],
      deniedPermissions: [],
      isEnabled: true,

      setRole: (role) => {
        set({ currentRole: role });
      },

      setUser: (user) => {
        set({ currentUser: user });
      },

      logout: () => {
        set({ currentUser: null });
      },

      grantPermission: (permission) => {
        set((state) => ({
          extraPermissions: state.extraPermissions.includes(permission)
            ? state.extraPermissions
            : [...state.extraPermissions, permission],
          deniedPermissions: state.deniedPermissions.filter(p => p !== permission),
        }));
      },

      revokePermission: (permission) => {
        set((state) => ({
          deniedPermissions: state.deniedPermissions.includes(permission)
            ? state.deniedPermissions
            : [...state.deniedPermissions, permission],
          extraPermissions: state.extraPermissions.filter(p => p !== permission),
        }));
      },

      grantPermissions: (permissions) => {
        set((state) => ({
          extraPermissions: [...new Set([...state.extraPermissions, ...permissions])],
          deniedPermissions: state.deniedPermissions.filter(p => !permissions.includes(p)),
        }));
      },

      revokePermissions: (permissions) => {
        set((state) => ({
          deniedPermissions: [...new Set([...state.deniedPermissions, ...permissions])],
          extraPermissions: state.extraPermissions.filter(p => !permissions.includes(p)),
        }));
      },

      hasPermission: (permission) => {
        const state = get();
        
        // Si RBAC está deshabilitado, todos tienen acceso
        if (!state.isEnabled) return true;
        
        // Si está denegado, no tiene acceso
        if (state.deniedPermissions.includes(permission)) return false;
        
        // Si tiene permiso extra, tiene acceso
        if (state.extraPermissions.includes(permission)) return true;
        
        // Verificar en los permisos del rol
        return ROLE_PERMISSIONS[state.currentRole]?.includes(permission) ?? false;
      },

      hasAnyPermission: (permissions) => {
        return permissions.some(p => get().hasPermission(p));
      },

      hasAllPermissions: (permissions) => {
        return permissions.every(p => get().hasPermission(p));
      },

      enable: () => {
        set({ isEnabled: true });
      },

      disable: () => {
        set({ isEnabled: false });
      },
    }),
    {
      name: 'permission-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentRole: state.currentRole,
        currentUser: state.currentUser,
        extraPermissions: state.extraPermissions,
        deniedPermissions: state.deniedPermissions,
        isEnabled: state.isEnabled,
      }),
    }
  )
);

// =============================================================================
// HELPERS
// =============================================================================

export const ROLE_LABELS: Record<UserRole, { label: string; description: string; color: string }> = {
  admin: {
    label: 'Administrador',
    description: 'Acceso total a todas las funcionalidades',
    color: 'text-rose-500 bg-rose-500/20',
  },
  supervisor: {
    label: 'Supervisor',
    description: 'Gestión de inventario, reportes y sync',
    color: 'text-amber-500 bg-amber-500/20',
  },
  operador: {
    label: 'Operador',
    description: 'Escaneo y registro de conteos',
    color: 'text-blue-500 bg-blue-500/20',
  },
  viewer: {
    label: 'Visor',
    description: 'Solo visualización (solo lectura)',
    color: 'text-muted bg-elevated',
  },
};

export default usePermissionStore;