#!/usr/bin/env node
/**
 * Script de migración: console.* → logger.*
 * 
 * Uso: node scripts/migrate-console-to-logger.js [--dry-run] [--verbose]
 * 
 * Este script:
 * 1. Detecta console.log/warn/error/info en archivos .ts/.tsx
 * 2. Reemplaza con logger.* con firma flexible
 * 3. Agrega import de logger si falta
 * 4. No toca archivos de test (*.test.ts, *.spec.ts, setup.ts)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuración
const SRC_DIR = path.join(__dirname, '..', 'src');
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

// Patrones de console.*
const CONSOLE_PATTERNS = {
  console_log: /console\.log\(/g,
  console_warn: /console\.warn\(/g,
  console_error: /console\.error\(/g,
  console_info: /console\.info\(/g,
  console_debug: /console\.debug\(/g,
};

// Patrones de logger (para verificar si ya existe)
const LOGGER_IMPORT = /import\s*{[^}]*logger[^}]*}\s*from\s*['"]@\/services\/logger['"]/;
const LOGGER_IMPORT_RELATIVE = /import\s*{[^}]*logger[^}]*}\s*from\s*['"]\.\.\/services\/logger['"]/;

// Rutas relativas a logger según profundidad
const LOGGER_IMPORTS = {
  0: "from '@/services/logger'",
  1: "from '@/services/logger'",
  2: "from '@/services/logger'",
  default: "from '@/services/logger'",
};

// Agregar import de logger si falta
function addLoggerImport(content, filePath) {
  if (LOGGER_IMPORT.test(content) || LOGGER_IMPORT_RELATIVE.test(content)) {
    return content;
  }
  
  // Siempre usar path absoluto para el import de logger
  const importStatement = `import { logger } from '@/services/logger';\n`;
  
  // Agregar después de los imports de react
  const reactImportMatch = content.match(/^import\s+.*\s+from\s+['"]react['"]/m);
  if (reactImportMatch) {
    return content.replace(reactImportMatch[0], reactImportMatch[0] + '\n' + importStatement);
  }
  
  // O al inicio del archivo
  return importStatement + content;
}

// Convertir console a logger
function convertConsole(content, pattern, loggerMethod) {
  return content.replace(pattern, (match, ...args) => {
    // Extraer el contenido dentro del paréntesis
    const argsMatch = match.match(/\((.*)\)/s);
    if (!argsMatch) return match;
    
    const innerContent = argsMatch[1].trim();
    
    // Detectar formato: logger.consoleMethod(args)
    // El nuevo logger flexible puede manejar diferentes formatos
    
    return `logger.${loggerMethod}(${innerContent})`;
  });
}

// Procesar archivo
function processFile(filePath) {
  // Saltar archivos de test
  if (filePath.includes('.test.') || filePath.includes('.spec.') || filePath.includes('setup.ts')) {
    if (VERBOSE) console.log(`  ⏭️  Saltando archivo de test: ${path.relative(SRC_DIR, filePath)}`);
    return { skipped: true };
  }
  
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error(`  ❌ Error leyendo archivo: ${err.message}`);
    return { error: err.message };
  }
  
  let modified = false;
  let originalContent = content;
  
  // Contadores
  let conversions = {
    log: 0,
    warn: 0,
    error: 0,
    info: 0,
    debug: 0,
  };
  
  // Convertir cada tipo de console.*
  if (CONSOLE_PATTERNS.console_log.test(content)) {
    const matches = content.match(CONSOLE_PATTERNS.console_log);
    conversions.log = matches.length;
    content = convertConsole(content, CONSOLE_PATTERNS.console_log, 'info');
    modified = true;
  }
  
  if (CONSOLE_PATTERNS.console_warn.test(content)) {
    const matches = content.match(CONSOLE_PATTERNS.console_warn);
    conversions.warn = matches.length;
    content = convertConsole(content, CONSOLE_PATTERNS.console_warn, 'warn');
    modified = true;
  }
  
  if (CONSOLE_PATTERNS.console_error.test(content)) {
    const matches = content.match(CONSOLE_PATTERNS.console_error);
    conversions.error = matches.length;
    content = convertConsole(content, CONSOLE_PATTERNS.console_error, 'error');
    modified = true;
  }
  
  if (CONSOLE_PATTERNS.console_info.test(content)) {
    const matches = content.match(CONSOLE_PATTERNS.console_info);
    conversions.info = matches.length;
    content = convertConsole(content, CONSOLE_PATTERNS.console_info, 'info');
    modified = true;
  }
  
  if (CONSOLE_PATTERNS.console_debug.test(content)) {
    const matches = content.match(CONSOLE_PATTERNS.console_debug);
    conversions.debug = matches.length;
    content = convertConsole(content, CONSOLE_PATTERNS.console_debug, 'debug');
    modified = true;
  }
  
  // Agregar import si se modificó
  if (modified && !LOGGER_IMPORT.test(content) && !LOGGER_IMPORT_RELATIVE.test(content)) {
    content = addLoggerImport(content, filePath);
  }
  
  // Resumen
  const total = conversions.log + conversions.warn + conversions.error + conversions.info + conversions.debug;
  if (total > 0) {
    if (VERBOSE) {
      console.log(`  ✅ ${path.relative(SRC_DIR, filePath)}: ${total} console.* → logger.*`);
    }
  }
  
  return {
    modified,
    conversions,
    total,
    content: modified ? content : null,
  };
}

// Recorrer directorio
function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Saltar node_modules y directorios no deseados
      if (!['node_modules', '.next', 'dist', '__pycache__'].includes(file)) {
        walkDir(fullPath, callback);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      callback(fullPath);
    }
  }
}

// Main
function main() {
  console.log('\n🔄 Script de Migración: console.* → logger.*\n');
  console.log(`📁 Directorio: ${SRC_DIR}`);
  console.log(`🔍 Modo: ${DRY_RUN ? 'DRY RUN (sin cambios)' : 'LIVE (con cambios)'}\n`);
  
  const stats = {
    total: 0,
    modified: 0,
    skipped: 0,
    errors: 0,
    totalConversions: 0,
  };
  
  const files = [];
  
  walkDir(SRC_DIR, (filePath) => {
    const result = processFile(filePath);
    stats.total++;
    
    if (result.skipped) {
      stats.skipped++;
    } else if (result.error) {
      stats.errors++;
    } else if (result.modified) {
      stats.modified++;
      stats.totalConversions += result.total;
      files.push({
        path: filePath,
        conversions: result.conversions,
        total: result.total,
        content: result.content,
      });
    }
  });
  
  // Mostrar resumen
  console.log('─'.repeat(60));
  console.log('📊 RESUMEN:');
  console.log(`   Archivos procesados: ${stats.total}`);
  console.log(`   Archivos modificados: ${stats.modified}`);
  console.log(`   Archivos saltados: ${stats.skipped}`);
  console.log(`   Errores: ${stats.errors}`);
  console.log(`   Total de conversiones: ${stats.totalConversions}`);
  console.log('─'.repeat(60));
  
  if (files.length > 0) {
    console.log('\n📝 ARCHIVOS MODIFICADOS:');
    for (const file of files) {
      const parts = [];
      if (file.conversions.log > 0) parts.push(`log:${file.conversions.log}`);
      if (file.conversions.warn > 0) parts.push(`warn:${file.conversions.warn}`);
      if (file.conversions.error > 0) parts.push(`error:${file.conversions.error}`);
      if (file.conversions.info > 0) parts.push(`info:${file.conversions.info}`);
      if (file.conversions.debug > 0) parts.push(`debug:${file.conversions.debug}`);
      console.log(`   • ${path.relative(SRC_DIR, file.path)} [${parts.join(', ')}]`);
    }
  }
  
  // Aplicar cambios si no es dry-run
  if (!DRY_RUN && files.length > 0) {
    console.log('\n💾 Aplicando cambios...');
    for (const file of files) {
      try {
        fs.writeFileSync(file.path, file.content, 'utf8');
        console.log(`   ✅ ${path.relative(SRC_DIR, file.path)}`);
      } catch (err) {
        console.error(`   ❌ Error escribiendo ${file.path}: ${err.message}`);
      }
    }
    console.log('\n✨ Migración completada!');
  } else if (DRY_RUN) {
    console.log('\n⚠️  Modo DRY RUN - No se aplicaron cambios');
    console.log('   Ejecuta sin --dry-run para aplicar los cambios');
  }
  
  console.log('');
}

main();
