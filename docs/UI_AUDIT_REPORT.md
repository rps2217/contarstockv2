# 📋 Auditoría de UI/UX - ContarStock v2

## Fecha: 2026-07-16

---

## 1. 🔴 RUTAS - PROBLEMAS CRÍTICOS

### 1.1 Rutas sin navegación en Sidebar

Las siguientes rutas existen pero **no tienen acceso desde el Sidebar**:

| Ruta         | Página        | Problema                |
| ------------ | ------------- | ----------------------- |
| `/audit`     | AuditPage     | ❌ No visible en menú   |
| `/inventory` | InventoryPage | ❌ No visible en menú   |
| `/providers` | SuppliersPage | ❌ Es alias, redundante |
| `/slices`    | SlicesPage    | ❌ No visible en menú   |
| `/dynamic`   | DynamicPage   | ❌ No visible en menú   |

**Acción requerida:** Agregar al Sidebar o crear redirección

---

### 1.2 Rutas Obsoletas

| Ruta                | Estado                | Acción                  |
| ------------------- | --------------------- | ----------------------- |
| `/database`         | Redirige a `/data`    | ✅ OK                   |
| `/capture`          | Redirige a `/massive` | ✅ OK                   |
| `/theme-demo`       | Demo de temas         | ⚠️ Mantener oculto      |
| `/redesign`         | Preview               | ⚠️ Mantener oculto      |
| `/product/:barcode` | Deep link             | ⚠️ Probar funcionalidad |
| `/session/:id`      | Deep link             | ⚠️ Probar funcionalidad |

---

## 2. 🟡 RESPONSIVE DESIGN

### 2.1 Breakpoints Estándar

El proyecto usa los siguientes breakpoints Tailwind:

```javascript
// tailwind.config.js
sm: '640px'; // Móviles grandes
md: '768px'; // Tablets
lg: '1024px'; // Desktop
xl: '1280px'; // Pantallas grandes
```

### 2.2 Componentes a Verificar

| Componente  | Estado        | Notas                          |
| ----------- | ------------- | ------------------------------ |
| Sidebar     | ✅ Responsive | Se oculta en móvil (md:flex)   |
| BottomDock  | ✅ Móvil      | Solo visible en móvil          |
| Cards       | ⚠️ Revisar    | Posible overflow en móvil      |
| Modales     | ⚠️ Revisar    | Posible scroll horizontal      |
| Tablas      | ⚠️ Revisar    | Requiere horizontal scroll     |
| Formularios | ⚠️ Revisar    | Inputs pueden ser muy pequeños |

---

## 3. 🎨 CONSISTENCIA DE DISEÑO

### 3.1 Tokens de Diseño (Del AGENTS.md)

El proyecto usa un sistema de tokens unificado:

```css
/* Tema Oscuro (Default) */
--bg-base: #09090b /* bg-base - Fondo principal */ --bg-surface: #18181b
  /* bg-surface - Cards, modales */ --bg-elevated: #27272a /* bg-elevated - Elementos elevados */
  --border-subtle: rgba(255, 255, 255, 5%) --text-primary: #f4f4f5 --text-secondary: #a1a1aa
  --text-muted: #71717a --color-primary: #3b82f6;
```

### 3.2 Verificar Clases

| Patrón Antiguo | Patrón Nuevo   | Archivos         |
| -------------- | -------------- | ---------------- |
| bg-slate-950   | bg-base        | ✅ Refactorizado |
| bg-slate-900   | bg-surface     | ✅ Refactorizado |
| text-slate-300 | text-secondary | ✅ Refactorizado |

---

## 4. 🔍 PROBLEMAS CONOCIDOS

### 4.1 Navegación

- [ ] Sidebar no tiene scroll cuando hay muchos items
- [ ] BottomDock puede superponerse con contenido

### 4.2 Mobile

- [ ] Tablas largas no tienen scroll horizontal consistente
- [ ] Teclado virtual puede ocultar campos de formulario
- [ ] Pull-to-refresh no implementado

### 4.3 Accesibilidad

- [ ] Contraste de colores en algunos textos
- [ ] Focus visible en elementos interactivos
- [ ] Alt text en imágenes e iconos decorativos

---

## 5. ✅ ACCIONES COMPLETADAS

- [x] Auditoría de rutas
- [x] Verificación de Sidebar
- [x] Documentación de breakpoints
- [ ] Implementar fixes pendientes

---

## 6. 📝 PRÓXIMOS PASOS

1. **Agregar rutas faltantes al Sidebar**
   - `/audit` → Agregar a menú o eliminar ruta
   - `/inventory` → ¿Es necesaria o es duplicado de `/data`?
   - `/slices` → ¿Es necesaria?
   - `/dynamic` → ¿Es necesaria?

2. **Responsive fixes**
   - Cards con overflow handling
   - Tablas con scroll horizontal
   - Formularios adaptados a móvil

3. **Accesibilidad**
   - Revisar contraste WCAG AA
   - Focus states consistentes
