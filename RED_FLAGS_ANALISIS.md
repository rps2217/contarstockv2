# Análisis de Red Flags

## 🚨 CRÍTICO

### 1. node_modules COMMITEADO ❌ REAL
**Impacto:** Catastrófico

```
.git size: 225MB
node_modules en repo: 48,416 archivos (~955MB local)
```

**Solución Urgente:**
```bash
# 1. Agregar node_modules/ a .gitignore
echo "node_modules/" >> .gitignore

# 2. Remover node_modules del historial (requiere rewrite history)
git filter-branch --tree-filter 'rm -rf node_modules' --prune-empty HEAD
# O usar: git rm -r --cached node_modules

# 3. Commit y push forzado
git add .gitignore
git commit -m "chore: Remove node_modules from git tracking"
git push --force
```

⚠️ ADVERTENCIA: Si el repo ya está en producción con collaborators, necesitan hacer `git pull --rebase` después del push forzado.

---

## ⚠️ MEDIO

### 2. xlsx 0.18.5 - Versión Vieja ❌ REAL
**Última versión:** 0.20.x

CVEs conocidos en versiones anteriores incluyen:
- CVE-2021-44906 (prototyp pollution)
- Vulnerabilidades de ReDoS en parsing

**Recomendación:** Actualizar a `xlsx@^0.20.0`

---

### 3. dompurify 2.5.9 - v2 en mantenimiento ❌ REAL
**Última versión:** 3.x

**Recomendación:** 
```bash
npm install dompurify@^3.0.0
# Requiere revisar breaking changes
```

---

### 4. Sentry con versiones mezcladas ❌ REAL
```
@sentry/browser: ^10.63.0   ✓
@sentry/react: ^10.63.0     ✓
@sentry/tracing: ^7.120.4  ⚠️ DESCONTINUADA
```

`@sentry/tracing` fue deprecada en v8. Debes usar `@sentry/browser` + plugin.

**Recomendación:**
```bash
npm uninstall @sentry/tracing
npm install @sentry/browser@latest
```

---

### 5. react-is ^19.2.7 con React 18.3.1 ❌ REAL
**Versión instalada:** 19.2.0 (según package-lock.json)

React 19 APIs no están disponibles en React 18. Puede causar:
- Warnings en consola
- Comportamiento inesperado
- Memory leaks

**Recomendación:**
```bash
npm install react-is@^18.2.0
```

---

## 🔧 BAJO

### 6. ESLint no está instalado ❌ REAL
El archivo `eslint.config.js` existe pero ESLint no está en dependencies.

**Recomendación:**
```bash
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

---

### 7. Sin Prettier/Husky/lint-staged ❌ REAL
No hay formateo automático ni pre-commit hooks.

**Recomendación:**
```bash
npm install -D prettier husky lint-staged
npx husky install
```

---

### 8. vitest ^4.1.10 ❌ REAL
v4.x tiene cambios de API significativos. v1.x o v2.x son más estables.

**Recomendación:**
```bash
# O actualizar a v2 estable:
npm install -D vitest@^2.0.0
# O quedarse en v1:
npm install -D vitest@^1.0.0
```

---

### 9. Sin librería de forms (parcialmente real) ⚠️ PARCIAL
- **No hay:** react-hook-form, formik, etc.
- **Realidad:** 29 archivos usan useState para manejo de forms
- **Impacto:** Más código manual, menos validación automática

**Recomendación:**
```bash
npm install react-hook-form zod
```

---

## 📊 Resumen de Acciones Inmediatas

| Prioridad | Red Flag | Acción |
|-----------|----------|--------|
| 🚨 CRÍTICO | node_modules commiteado | Agregar a .gitignore, remover del repo |
| ⚠️ ALTO | xlsx outdated | Actualizar a 0.20.x |
| ⚠️ ALTO | Sentry versions | Unificar a v8 |
| ⚠️ MEDIO | react-is mismatch | Instalar versión 18.x |
| ⚠️ MEDIO | dompurify v2 | Actualizar a v3 |
| 🔧 BAJO | Sin ESLint | Instalar y configurar |
| 🔧 BAJO | Sin Prettier | Instalar y configurar |
| 🔧 BAJO | vitest v4 | Considerar downgrade a v2 |
| 🔧 BAJO | Sin forms lib | Evaluar react-hook-form |

---

## Comandos para Fix Completo

```bash
#!/bin/bash

# 1. Fix .gitignore
echo "node_modules/" >> .gitignore
git rm -r --cached node_modules
git commit -m "chore: Remove node_modules from git"

# 2. Actualizar paquetes con vulnerabilities
npm install \
  xlsx@^0.20.0 \
  dompurify@^3.0.0 \
  react-is@^18.2.0

# 3. Fix Sentry (desinstalar tracing deprecated)
npm uninstall @sentry/tracing

# 4. Instalar tooling
npm install -D \
  eslint \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin \
  prettier \
  husky \
  lint-staged

# 5. Commit todo
git add -A
git commit -m "chore: Fix security issues and add dev tooling
- Remove node_modules from repo
- Update xlsx, dompurify, react-is
- Remove deprecated @sentry/tracing
- Add ESLint and Prettier"
```
