# Bitácora de Modularización y Arquitectura "Lego"
## Principios de Diseño
El objetivo de esta refactorización progresiva es transformar la aplicación en una arquitectura modular de tipo "Lego", donde los componentes están altamente desacoplados, son reutilizables y la lógica de negocio está completamente separada de la vista.

### 1. Separación de Responsabilidades (Layering)
- **Capa de Vista (UI)**: Componentes presentacionales puros (Dumb components). Reciben datos y callbacks vía props. Ejemplos: `IndustrialScannerLayout`, `VirtualList`, `CaptureLayout`.
- **Capa de Transición/Motor (Hooks Globales)**: Lógica compartida entre varios módulos para manejar flujos estandarizados. Ejemplo: `useScannerEngine`, `useScanPipeline`.
- **Capa de Dominio (Domain Hooks)**: Lógica de negocio específica de cada módulo. Mantiene el estado local complejo y delega al motor de escaneo. Ejemplos: `useHammerLogic`, `useExpiryDatabase`.
- **Capa de Persistencia/Datos (Repositories)**: Clases o módulos responsables de interactuar con la base de datos local (Dexie) de manera consolidada. Ejemplo: `MassiveDbRepository`.

### 2. Estructura de un Módulo Moderno ("Lego")
Cuando abordamos la refactorización de un módulo antiguo (como el modo Martillo Antiguo o el Capturador de Fechas), seguimos estos pasos de forma estandarizada:

#### PASO A: Desacoplar Interfaz Gráfica (UI)
1. **Identificar Patrones Comunes**: Identificar contenedores, headers, listas y modales.
2. **Usar Layouts Compartidos**: Se encapsula la estructura visual (Header superior escalable, lista virtualizada en el medio, dock o acciones abajo) en `shared/components/layout/` o directamente invocar como un componente maestro (ej. `IndustrialScannerLayout`).
3. **Listas Virtualizadas**: Para pintar cientos o miles de ítems, se extrae el uso de `@tanstack/react-virtual` hacia un contenedor base `<VirtualList />`. Esto reduce líneas de código repetidas en cada pantalla.

#### PASO B: Estandarización de Interacciones Básicas del Scanner (Motor)
1. Cualquier módulo que escanee usa `useScannerEngine` y `useScanPipeline`.
2. Estas piezas emiten estados consistentes: `isSearchActive`, `scannedBarcode`, `product`, variables de configuración locales y lanzan sonidos automatizados. 

#### PASO C: Desacoplar la Lógica Local a un Hook de Dominio
1. Todo el `useEffect`, las actualizaciones optimistas de base de datos local y los agrupadores (accumulators) son lanzados en una carpeta `features/my_feature/hooks/`.
2. El hook provee objetos bien formateados (`{ state, actions }`) para el archivo TSX base.

#### PASO D: Motor Gráfico (CSS + Motion)
1. Estandarizar la carga asíncrona de datos con pulsos (`animate-pulse`) o transiciones con motion (`<AnimatePresence>`).
2. Minimizar reflows de la página al delegar renders frecuentes (como las filas de la lista de elementos escaneados) a memoización profunda usando `React.memo` implementando verificaciones manuales sobre el cambio del estado de `activeBarcode`.

### 3. Procedimientos Replicables para Módulos Futuros
Si se requiere migrar otro módulo a la arquitectura "Lego", siga estos pasos:

1. Evalúe el archivo contenedor `PAGENAME.tsx`. Mueva toda declaración que maneje bases de datos o validaciones de dominio a un hook personalizado `usePAGELogic.ts`.
2. Reemplace iteradores de lista convencionales `<div key={}>{items.map(...)}</div>` por el componente UI genérico `<VirtualList />`.
3. Verifique que se está inyectando configuración desde arriba mediante contexto u objetos simples en lugar de declarar un estado masivo en el mismo componente de lista.
4. Cualquier modal engorroso (mayor a 40 líneas de código estructural), extráigalo al mismo directorio base en una subcarpeta de componentes `/components/MyFeatureModalForm.tsx`.
5. Valide que las transacciones SQL-Lite o IndexDB estén encapsulados en un repositorio en base a la regla: "La vista no sabe dónde y cómo se guarda un dato".

---
**Siguiente Paso Recomendado**: Migrar completamente el flujo de **Inventariado (Conteo)** y **Vencimientos (Expiry)** al 100% Lego. Actualmente partes del módulo de vencimientos o conteo aplican logica propia que puede reutilizar a `VirtualList` y encapsular modales densos para adelgazar el contenedor al mínimo.
