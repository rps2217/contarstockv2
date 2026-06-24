

---

## ThemeCustomizer - Personalizacion Avanzada (2026-06-24).

### Componente
- ThemeCustomizer - Personalizador completo de temas

### Caracteristicas:
- Sliders: Ajuste de Matiz, Saturacion, Brillo para 7 colores
- Preview: Vista previa en tiempo real
- Guardado Local: Automatico en localStorage
- Guardado en Nube: Callback opcional onSaveToCloud
- Exportar/Importar: Esquemas como archivos JSON
- Esquemas: Predefinidos + personalizados
- Inyeccion CSS: Aplica colores en document.documentElement

### Colores Ajustables:
- primary, success, warning, error, info, expired, critical

### Variables CSS Generadas:
- --color-primary, --color-primary-hover, --color-primary-pressed, --color-primary-subtle
- --color-success, --color-success-subtle
- --color-warning, --color-warning-subtle
- --color-error, --color-error-subtle
- --color-info, --color-info-subtle
- --color-expired, --color-critical

### Commits:
- 56dec72a - feat: ThemeCustomizer
- cdb21295 - feat: Mejoras en ThemeCustomizer - Unificacion de colores y CSS variables
