# 🚀 Propuesta de Características Estilo AppSheet

## Análisis de Características AppSheet y Aplicabilidad

---

## ✅ Ya Implementadas (Bien)

| Característica | Estado | Detalles |
|---------------|--------|----------|
| **Offline-First** | ✅ | IndexedDB con Dexie, cola de sincronización |
| **Slices/Vistas** | ✅ | Módulo de slices ya existe |
| **Auditoría** | ✅ | AuditPanel implementado |
| **Barcode/QR Scan** | ✅ | CameraScanner + HID scanner |
| **Sync Bidireccional** | ✅ | Supabase + sync registry |
| **PWA** | ✅ | Manifest + Service Worker |
| **Dashboard con Métricas** | ✅ | Dashboard con cards |

---

## 🔴 Alta Prioridad (Alto Impacto)

### 1. **Quick Capture desde Notificaciones** 📱
**Descripción:** Captura rápida de códigos de barras desde notificaciones push.

```tsx
// Ejemplo de flujo
1. Usuario recibe notificación de "Nueva orden #123"
2. Toca notificación → abre app en modo captura rápida
3. Escanea productos → se asocian automáticamente a la orden
4. Confirma → se sincroniza
```

**Implementación:**
- Push notification con `action_handlers`
- Deep link a `/capture?order=123&mode=quick`
- Auto-association con la orden

### 2. **Resolución de Conflictos Visual** ⚠️
**Descripción:** UI para resolver conflictos de sincronización cuando hay ediciones concurrentes.

```
┌─────────────────────────────────────┐
│ ⚠️ CONFLICTO DETECTADO             │
├─────────────────────────────────────┤
│ Producto: "Leche Entera 1L"         │
│                                     │
│ ┌─────────────┐  ┌─────────────┐    │
│ │ TU VERSIÓN  │  │ VERSIÓN    │    │
│ │ (Local)     │  │ REMOTA     │    │
│ ├─────────────┤  ├─────────────┤    │
│ │ Stock: 45   │  │ Stock: 42  │    │
│ │ Updated:    │  │ Updated:   │    │
│ │ 10:30 AM   │  │ 10:25 AM   │    │
│ └─────────────┘  └─────────────┘    │
│                                     │
│ [Usar Local] [Usar Remota] [Fusionar]│
└─────────────────────────────────────┘
```

### 3. **Indicador Visual de Modo Offline** 📶
**Descripción:** Banner/indicador claro cuando la app está trabajando offline.

**Mejora propuesta:**
```tsx
// OfflineBanner mejorado
<OfflineBanner>
  <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 border border-amber-500/30">
    <WifiOff className="w-4 h-4 text-amber-500" />
    <span className="text-xs font-medium text-amber-400">
      Modo Offline - 3 cambios pendientes
    </span>
    <span className="text-[10px] text-amber-500/70">
      Se sincronizarán al reconectar
    </span>
  </div>
</OfflineBanner>
```

### 4. **Deep Links para Registros** 🔗
**Descripción:** URLs para abrir la app directamente en un registro específico.

```tsx
// Rutas con deep linking
/capture              → Página de captura general
/capture?session=123  → Captura con sesión específica
/data/products/456    → Ver producto específico
/reports/session/789 → Ver reporte de sesión

// En App.tsx
<Route path="/data/:table/:id" element={<DetailView />} />
```

---

## 🟡 Media Prioridad (Buen Impacto)

### 5. **Acciones Personalizadas por Item** ⚡
**Descripción:** Botones de acción contextuales en cada item de lista.

```tsx
// Ejemplo en ReceptionItemCard
const itemActions = [
  { 
    key: 'edit', 
    label: 'Editar', 
    icon: Edit,
    onClick: () => openEditModal(item)
  },
  { 
    key: 'duplicate', 
    label: 'Duplicar', 
    icon: Copy,
    onClick: () => duplicateItem(item)
  },
  { 
    key: 'delete', 
    label: 'Eliminar', 
    icon: Trash,
    variant: 'danger',
    onClick: () => confirmDelete(item)
  },
  { 
    key: 'share', 
    label: 'Compartir', 
    icon: Share,
    onClick: () => shareItem(item)
  },
];
```

### 6. **Scheduled Sync Automático** ⏰
**Descripción:** Sincronización periódica configurable.

```tsx
// En settings
interface SyncSchedule {
  enabled: boolean;
  intervalMinutes: number; // 5, 15, 30, 60
  wifiOnly: boolean;
  onBackground: boolean;
}

// Implementación
useEffect(() => {
  if (!settings.syncSchedule?.enabled) return;
  
  const interval = setInterval(() => {
    if (navigator.onLine && !isSyncing) {
      handleFullSync();
    }
  }, settings.syncSchedule.intervalMinutes * 60 * 1000);
  
  return () => clearInterval(interval);
}, [settings.syncSchedule]);
```

### 7. **Validaciones en Tiempo Real** ✅
**Descripción:** Validación de campos mientras el usuario escribe.

```tsx
// Ejemplo en NumericKeypad
const validateInput = (value: string) => {
  const num = parseInt(value);
  
  if (isNaN(num)) return { valid: false, error: 'Ingresa un número' };
  if (num < 0) return { valid: false, error: 'No puede ser negativo' };
  if (num > maxStock) return { valid: false, error: `Máximo ${maxStock}` };
  
  return { valid: true, error: null };
};

// Feedback visual inmediato
<input 
  className={valid ? 'border-blue-500' : 'border-rose-500'}
/>
{error && <span className="text-rose-500 text-xs">{error}</span>}
```

### 8. **Filtros de Seguridad por Operador** 🔒
**Descripción:** Filtrado automático según operador logueado.

```tsx
// En hooks de datos
const useOperatorFilteredData = (table: string) => {
  const { operatorId } = useDashboard();
  
  return useLiveQuery(async () => {
    const data = await db[table]
      .where('operatorId')
      .equals(operatorId)
      .toArray();
    return data;
  }, [table, operatorId]);
};

// En settings, rol de supervisor ve todo
const canSeeAllData = user.role === 'supervisor' || user.role === 'admin';
```

---

## 🟢 Baja Prioridad (Nice to Have)

### 9. **Compartir Registros** 📤
**Descripción:** Exportar/compartir un registro como PDF, CSV, o link.

```tsx
const shareSession = async (sessionId: string) => {
  const session = await db.sessions.get(sessionId);
  const items = await db.scans.where('sessionId').equals(sessionId).toArray();
  
  // Generar CSV
  const csv = generateCSV(session, items);
  
  // Compartir via Web Share API
  if (navigator.share) {
    await navigator.share({
      title: `Sesión ${sessionId}`,
      text: `Resumen de conteo: ${items.length} items`,
      files: [new File([csv], 'session.csv', { type: 'text/csv' })]
    });
  } else {
    // Fallback: download
    downloadFile(csv, `session-${sessionId}.csv`);
  }
};
```

### 10. **GPS/Location para Recepciones** 📍
**Descripción:** Registrar ubicación GPS al hacer recepciones.

```tsx
const useLocation = () => {
  const [location, setLocation] = useState<GeolocationPosition | null>(null);
  
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => setLocation(position),
      (error) => console.error('GPS error:', error)
    );
  }, []);
  
  return location;
};

// Al crear recepción
const reception = {
  ...data,
  location: location ? {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
    accuracy: location.coords.accuracy
  } : null
};
```

### 11. **Record Timestamps Automáticos** ⏱️
**Descripción:** Timestamps automáticos de creación/modificación.

```tsx
// Hook automático
const useAutoTimestamps = () => {
  return {
    createdAt: Date.now(),
    createdBy: operatorId,
    updatedAt: Date.now(),
    updatedBy: operatorId
  };
};

// En cada modelo
interface Reception {
  // ... otros campos
  _createdAt?: number;
  _createdBy?: string;
  _updatedAt?: number;
  _updatedBy?: string;
}
```

---

## 📊 Priorización Sugerida

| # | Característica | Impacto | Esfuerzo | Estado |
|---|---------------|--------|---------|--------|
| 1 | Indicador Offline Mejorado | Alto | Bajo | ✅ Implementado |
| 2 | Conflict Resolution UI | Alto | Medio | ✅ Implementado |
| 3 | Deep Links | Medio | Bajo | ✅ Implementado |
| 4 | Validaciones en Tiempo Real | Medio | Bajo | ✅ Implementado |
| 5 | Scheduled Sync | Medio | Medio | ✅ Implementado |
| 6 | Share Records | Bajo | Bajo | ✅ Implementado |
| 7 | Quick Capture | Alto | Alto | ⏳ Pendiente |
| 8 | GPS Location | Medio | Medio | ⏳ Pendiente |

---

## 🎯 Implementaciones Completadas

### 1. OfflineBanner Mejorado ✅
- 5 estados visuales: offline, syncing, synced, pending, error
- Contador de cambios pendientes en tiempo real
- Iconos animados según el estado
- Compatible con iPhone (safe-area)

### 2. Deep Links ✅
- Rutas: `/session/:id`, `/reception/:id`, `/product/:barcode`
- Hook `useDeepLink` para parsear parámetros
- Soporte para query strings: `?quickCapture=true&sessionId=123`

### 3. Conflict Resolution UI ✅
- `ConflictResolutionModal` con comparación lado a lado
- 3 opciones: usar local, usar remota, o fusionar
- Campos expandibles para seleccionar valores
- Hook `useConflictResolution` para integración

### 4. Validaciones en Tiempo Real ✅
- `ValidatedInput` con feedback visual inmediato
- `useFormValidation` hook para formularios completos
- `ValidationRules` con reglas predefinidas (required, email, numeric, range, etc.)
- Soporte para validación asíncrona (verificar en BD)
- Debounce configurable

### 5. Scheduled Sync ✅
- `useScheduledSync` hook con configuración flexible
- Intervalos: 5, 15, 30, 60 minutos
- Opción WiFi-only para ahorro de datos
- Sync en background cuando la app vuelve a primer plano
- `useSyncScheduleSettings` para persistir configuración

### 6. Share Records ✅
- `ShareService` con múltiples formatos: CSV, JSON
- Exportar sesiones completas con scans enriquecidos
- Web Share API para compartir en móvil
- Copiar al portapapeles resúmenes formateados
- Fallback para navegadores sin Web Share

---

*Documento generado: Feature Recommendations estilo AppSheet*
*Actualizado: 6 características implementadas*
