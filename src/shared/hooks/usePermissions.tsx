"use client";
/**
 * usePermissions - Hook para verificar permisos
 * 
 * Uso:
 * const { can } = usePermissions();
 * if (can('inventory:delete')) { ... }
 */


import React from 'react';
import { usePermissionStore } from '@/stores';

export const usePermissions = () => {
  const {
    currentRole,
    currentUser,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isEnabled,
    setRole,
  } = usePermissionStore();

  return {
    // Verificaciones
    can: hasPermission,
    canAny: hasAnyPermission,
    canAll: hasAllPermissions,
    
    // Info del usuario
    role: currentRole,
    user: currentUser,
    isEnabled,
    
    // Helpers
    isAdmin: currentRole === 'admin',
    isSupervisor: currentRole === 'supervisor' || currentRole === 'admin',
    isOperador: currentRole === 'operador' || currentRole === 'supervisor' || currentRole === 'admin',
    isViewer: currentRole === 'viewer',
    
    // Cambiar rol (útil para desarrollo/demo)
    setRole,
  };
};

// =============================================================================
// HOC PARA PROteger COMPONENTES
// =============================================================================

import { cn } from '@/lib/utils';

interface RequirePermissionProps {
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
  /** Mostrar fallback en lugar del contenido si no tiene permiso */
  showFallback?: boolean;
}

/**
 * RequirePermission - HOC/Componente para proteger contenido según permisos
 * 
 * Uso:
 * <RequirePermission permission="inventory:delete">
 *   <DeleteButton />
 * </RequirePermission>
 * 
 * <RequirePermission permissions={['inventory:delete', 'inventory:update']} requireAll>
 *   <EditDeleteButtons />
 * </RequirePermission>
 */
export const RequirePermission: React.FC<RequirePermissionProps> = ({
  permission,
  permissions = [],
  requireAll = false,
  fallback = null,
  children,
  showFallback = false,
}) => {
  const { can, canAny, canAll } = usePermissions();
  
  const allPermissions = permission ? [permission, ...permissions] : permissions;
  
  const hasAccess = allPermissions.length === 0
    ? true
    : requireAll
      ? canAll(allPermissions)
      : canAny(allPermissions);
  
  if (!hasAccess && showFallback) {
    return <>{fallback}</>;
  }
  
  if (!hasAccess) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};

// =============================================================================
// COMPONENTE: Botón con permiso
// =============================================================================

interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  permission: Permission;
  children: React.ReactNode;
  /** Mensaje shown cuando no tiene permiso */
  disabledMessage?: string;
}

/**
 * PermissionButton - Botón que solo es clickeable si tiene el permiso
 * Si no tiene permiso, se muestra deshabilitado con tooltip
 */
export const PermissionButton: React.FC<PermissionButtonProps> = ({
  permission,
  children,
  disabledMessage = 'No tienes permiso para esta acción',
  className,
  onClick,
  ...props
}) => {
  const { can } = usePermissions();
  const hasAccess = can(permission);
  
  return (
    <button
      className={cn(
        'transition-colors',
        !hasAccess && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={!hasAccess}
      title={!hasAccess ? disabledMessage : undefined}
      onClick={hasAccess ? onClick : undefined}
      {...props}
    >
      {children}
    </button>
  );
};

// =============================================================================
// COMPONENTE: Badge de rol
// =============================================================================


interface RoleBadgeProps {
  role?: UserRole;
  size?: 'sm' | 'md';
  className?: string;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({
  role,
  size = 'sm',
  className,
}) => {
  const { role: currentRole } = usePermissions();
  const displayRole = role || currentRole;
  const roleInfo = ROLE_LABELS[displayRole];
  
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        roleInfo.color,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        className
      )}
    >
      {roleInfo.label}
    </span>
  );
};

// =============================================================================
// COMPONENTE: Selector de rol (para settings/admin)
// =============================================================================

interface RoleSelectorProps {
  value: UserRole;
  onChange: (role: UserRole) => void;
  className?: string;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  value,
  onChange,
  className,
}) => {
  const roles: UserRole[] = ['admin', 'supervisor', 'operador', 'viewer'];
  
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {roles.map((role) => {
        const info = ROLE_LABELS[role];
        const isSelected = value === role;
        
        return (
          <button
            key={role}
            onClick={() => onChange(role)}
            className={cn(
              'flex flex-col items-start p-3 rounded-xl border transition-all text-left min-w-[140px]',
              isSelected
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-subtle bg-elevated hover:border-primary/50'
            )}
          >
            <span className={cn(
              'px-2 py-0.5 rounded-full text-xs font-medium mb-1',
              info.color
            )}>
              {info.label}
            </span>
            <span className="text-xs text-muted leading-tight">
              {info.description}
            </span>
          </button>
        );
      })}
    </div>
  );
};

// =============================================================================
// COMPONENTE: Lista de permisos
// =============================================================================

interface PermissionListProps {
  role: UserRole;
  className?: string;
}

export const PermissionList: React.FC<PermissionListProps> = ({
  role,
  className,
}) => {
  const { can } = usePermissions();
  
  // Agrupar permisos por categoría
  const categories = [
    {
      name: 'Inventario',
      permissions: [
        { key: 'inventory:read', label: 'Ver inventario' },
        { key: 'inventory:create', label: 'Crear productos' },
        { key: 'inventory:update', label: 'Editar productos' },
        { key: 'inventory:delete', label: 'Eliminar productos' },
        { key: 'inventory:export', label: 'Exportar' },
      ] as { key: Permission; label: string }[],
    },
    {
      name: 'Conteo',
      permissions: [
        { key: 'counting:read', label: 'Ver conteos' },
        { key: 'counting:create', label: 'Crear conteos' },
        { key: 'counting:delete', label: 'Eliminar conteos' },
        { key: 'counting:undo', label: 'Deshacer' },
      ] as { key: Permission; label: string }[],
    },
    {
      name: 'Proveedores',
      permissions: [
        { key: 'suppliers:read', label: 'Ver' },
        { key: 'suppliers:create', label: 'Crear' },
        { key: 'suppliers:update', label: 'Editar' },
        { key: 'suppliers:delete', label: 'Eliminar' },
      ] as { key: Permission; label: string }[],
    },
    {
      name: 'Reportes',
      permissions: [
        { key: 'reports:read', label: 'Ver reportes' },
        { key: 'reports:export', label: 'Exportar' },
      ] as { key: Permission; label: string }[],
    },
    {
      name: 'Administración',
      permissions: [
        { key: 'users:manage', label: 'Gestionar usuarios' },
        { key: 'settings:write', label: 'Editar configuración' },
        { key: 'sync:configure', label: 'Configurar sync' },
        { key: 'audit:read', label: 'Ver auditoría' },
      ] as { key: Permission; label: string }[],
    },
  ];
  
  return (
    <div className={cn('space-y-4', className)}>
      {categories.map((category) => (
        <div key={category.name}>
          <h4 className="text-sm font-medium text-muted mb-2">{category.name}</h4>
          <div className="space-y-1">
            {category.permissions.map((perm) => {
              const hasPermission = can(perm.key);
              return (
                <div
                  key={perm.key}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-lg text-sm',
                    hasPermission ? 'text-primary' : 'text-muted opacity-50'
                  )}
                >
                  <span className={cn(
                    'w-5 h-5 rounded flex items-center justify-center text-xs',
                    hasPermission ? 'bg-emerald-500/20 text-emerald-500' : 'bg-elevated text-muted'
                  )}>
                    {hasPermission ? '✓' : '✗'}
                  </span>
                  {perm.label}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default usePermissions;