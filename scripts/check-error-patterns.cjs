/**
 * Script para detectar patrones de errores problemáticos
 * 
 * Uso: node scripts/check-error-patterns.cjs
 */

const fs = require('fs');
const path = require('path');

const SERVICES_DIR = 'src/services';
const EXCLUDE = ['node_modules', '.test.', '.spec.', 'check-error-patterns'];

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!EXCLUDE.some(e => filePath.includes(e))) {
        walkDir(filePath, callback);
      }
    } else if (file.endsWith('.ts')) {
      callback(filePath);
    }
  }
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const issues = [];
  
  // Patrón 1: throw err (sin new Error)
  const throwRaw = /throw\s+(err|error|e|ex)\s*;/g;
  let match;
  while ((match = throwRaw.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split('\n').length;
    issues.push({
      type: 'throw_raw',
      line: lineNum,
      message: `throw ${match[1]} - Debería ser throw new Error(...) o throw handleError(${match[1]})`,
      severity: 'high'
    });
  }
  
  // Patrón 2: catch (e) sin tipo
  const catchWithoutType = /catch\s*\(\s*e\s*\)/g;
  while ((match = catchWithoutType.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split('\n').length;
    issues.push({
      type: 'catch_without_type',
      line: lineNum,
      message: 'catch (e) - Debería ser catch (err: unknown)',
      severity: 'medium'
    });
  }
  
  // Patrón 3: catch (err: any)
  const catchAny = /catch\s*\(\s*err:\s*any\s*\)/g;
  while ((match = catchAny.exec(content)) !== null) {
    const lineNum = content.substring(0, match.index).split('\n').length;
    issues.push({
      type: 'catch_any',
      line: lineNum,
      message: 'catch (err: any) - Debería ser catch (err: unknown)',
      severity: 'low'
    });
  }
  
  return issues;
}

// Ejecutar análisis
console.log('🔍 Analizando patrones de errores en servicios...\n');

const allIssues = [];
walkDir(SERVICES_DIR, (filePath) => {
  const issues = analyzeFile(filePath);
  issues.forEach(issue => {
    allIssues.push({ file: filePath.replace(SERVICES_DIR + '/', ''), ...issue });
  });
});

// Agrupar por severity
const high = allIssues.filter(i => i.severity === 'high');
const medium = allIssues.filter(i => i.severity === 'medium');
const low = allIssues.filter(i => i.severity === 'low');

console.log(`📊 Resultados:\n`);
console.log(`  🔴 Alta severidad: ${high.length}`);
console.log(`  🟡 Media severidad: ${medium.length}`);
console.log(`  🟢 Baja severidad: ${low.length}`);
console.log('');

if (high.length > 0) {
  console.log('❌ PROBLEMAS CRÍTICOS ( throw err; ):\n');
  high.forEach(issue => {
    console.log(`  ${issue.file}:${issue.line}`);
    console.log(`    ${issue.message}\n`);
  });
}

if (medium.length > 0) {
  console.log('⚠️ PROBLEMAS MEDIOS ( catch sin tipo ):\n');
  medium.slice(0, 10).forEach(issue => {
    console.log(`  ${issue.file}:${issue.line} - ${issue.message}`);
  });
  if (medium.length > 10) {
    console.log(`  ... y ${medium.length - 10} más`);
  }
  console.log('');
}

console.log('✅ Análisis completado');

// Resumen
console.log('\n📝 Para corregir:');
console.log('  1. Reemplazar: throw err; → throw handleError(err, "Context");');
console.log('  2. Reemplazar: catch (e) → catch (err: unknown)');
console.log('  3. Importar: import { handleError } from "@/services/types/utilityTypes"');
