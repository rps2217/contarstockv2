#!/usr/bin/env node

/**
 * =============================================================================
 * AUDITORÍA DE SUPABASE - ContarStock
 * =============================================================================
 * 
 * Uso:
 *   node scripts/audit-supabase.mjs
 * 
 * Requiere:
 *   - Variables de entorno: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
 *   - O archivo .env en la raíz del proyecto
 * 
 * =============================================================================
 */

import 'dotenv/config';
import https from 'https';

// =============================================================================
// CONFIGURACIÓN
// =============================================================================

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Error: Faltan variables de entorno');
  console.error('   Necesitas VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

// =============================================================================
// HELPERS
// =============================================================================

function apiRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SUPABASE_URL);
    const reqOptions = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function log(title, data) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📋 ${title}`);
  console.log('='.repeat(60));
  console.log(JSON.stringify(data, null, 2));
}

// =============================================================================
// AUDITORÍA
// =============================================================================

async function auditSupabase() {
  console.log('🔍 Iniciando auditoría de Supabase...');
  console.log(`📡 URL: ${SUPABASE_URL}`);

  const results = {
    timestamp: new Date().toISOString(),
    tables: {},
    issues: [],
    recommendations: []
  };

  // Tablas principales basadas en syncRegistry
  const tables = [
    'PRODUCTOS',
    'PROVEEDORES',
    'VENCIMIENTOS',
    'EVENTOS',
    'SESIONES_CONTEO',
    'SCANS',
    'PRODUCTO_PROVEEDOR',
    'AUDIT_LOGS'
  ];

  // 1. Intentar obtener estructura de cada tabla
  console.log('\n📊 Verificando tablas...\n');
  
  for (const table of tables) {
    try {
      // Intentar SELECT * LIMIT 1 para ver columnas
      const response = await apiRequest(`/rest/v1/${table}?select=*&limit=1`);
      
      if (response.status === 200 || response.status === 201) {
        // La tabla existe, verificar count
        const countResponse = await apiRequest(`/rest/v1/${table}?select=*&limit=0`);
        results.tables[table] = {
          exists: true,
          status: '✅ Accesible',
          records: Array.isArray(response.data) ? response.data.length : 1
        };
        
        // Verificar si tiene updated_at
        if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
          results.tables[table].columns = Object.keys(response.data);
          results.tables[table].hasUpdatedAt = response.data.hasOwnProperty('updated_at') 
            || response.data.hasOwnProperty('updatedAt');
        } else if (Array.isArray(response.data) && response.data.length > 0) {
          results.tables[table].columns = Object.keys(response.data[0]);
          results.tables[table].hasUpdatedAt = response.data[0].hasOwnProperty('updated_at')
            || response.data[0].hasOwnProperty('updatedAt');
        }
        
        console.log(`  ✅ ${table}`);
      } else if (response.status === 404) {
        results.tables[table] = {
          exists: false,
          status: '❌ No existe'
        };
        results.issues.push(`Tabla ${table} no encontrada`);
        console.log(`  ❌ ${table} - No existe`);
      } else if (response.status === 400) {
        results.tables[table] = {
          exists: 'maybe',
          status: `⚠️ Error 400: ${JSON.stringify(response.data)}`
        };
        results.issues.push(`Tabla ${table}: Error 400 - ${JSON.stringify(response.data)}`);
        console.log(`  ⚠️ ${table} - Error 400`);
      } else {
        results.tables[table] = {
          exists: 'unknown',
          status: `❓ Status ${response.status}: ${JSON.stringify(response.data)}`
        };
        console.log(`  ❓ ${table} - Status ${response.status}`);
      }
    } catch (error) {
      results.tables[table] = {
        exists: false,
        status: `❌ Error: ${error.message}`
      };
      results.issues.push(`Tabla ${table}: ${error.message}`);
      console.log(`  ❌ ${table} - ${error.message}`);
    }
  }

  // 2. Verificar tablas dinámicas (dynamic_data)
  console.log('\n📊 Verificando tablas dinámicas...\n');
  
  try {
    const dynamicResponse = await apiRequest(
      '/rest/v1/dynamic_data?select=tableName&limit=100'
    );
    
    if (Array.isArray(dynamicResponse.data)) {
      const tableNames = [...new Set(dynamicResponse.data.map(r => r.tableName))];
      results.dynamicTables = tableNames;
      console.log(`  📋 Tablas dinámicas encontradas: ${tableNames.join(', ')}`);
    }
  } catch (error) {
    console.log(`  ⚠️ No se pudo verificar dynamic_data: ${error.message}`);
  }

  // 3. Resumen y recomendaciones
  console.log('\n');
  console.log('='.repeat(60));
  console.log('📊 RESUMEN DE AUDITORÍA');
  console.log('='.repeat(60));

  const existingTables = Object.entries(results.tables)
    .filter(([_, v]) => v.exists === true)
    .map(([k]) => k);
  
  const missingTables = Object.entries(results.tables)
    .filter(([_, v]) => v.exists === false)
    .map(([k]) => k);

  console.log(`\n📋 Tablas existentes: ${existingTables.length}`);
  existingTables.forEach(t => console.log(`   ✅ ${t}`));

  console.log(`\n📋 Tablas faltantes: ${missingTables.length}`);
  missingTables.forEach(t => console.log(`   ❌ ${t}`));

  if (results.issues.length > 0) {
    console.log(`\n⚠️ Problemas detectados: ${results.issues.length}`);
    results.issues.forEach(issue => console.log(`   - ${issue}`));
  }

  // 4. Recomendaciones
  console.log('\n💡 RECOMENDACIONES:');
  console.log('-'.repeat(40));

  if (missingTables.includes('VENCIMIENTOS')) {
    console.log('1. ⚠️ CREAR TABLA VENCIMIENTOS');
    console.log('   Ejecuta: docs/migrations/FIX_VENCIMIENTOS_2026-06-21.sql');
    results.recommendations.push('Crear tabla VENCIMIENTOS con columnas updated_at');
  }

  if (missingTables.includes('EVENTOS')) {
    console.log('2. ⚠️ CREAR TABLA EVENTOS');
    results.recommendations.push('Crear tabla EVENTOS con columnas updated_at');
  }

  // Verificar columnas updated_at
  const tablesWithoutUpdatedAt = Object.entries(results.tables)
    .filter(([_, v]) => v.exists === true && v.hasUpdatedAt === false)
    .map(([k]) => k);

  if (tablesWithoutUpdatedAt.length > 0) {
    console.log(`\n3. ⚠️ AGREGAR updated_at A: ${tablesWithoutUpdatedAt.join(', ')}`);
    results.recommendations.push('Agregar columna updated_at a: ' + tablesWithoutUpdatedAt.join(', '));
  }

  // 5. Guardar resultado
  const fs = await import('fs');
  const reportPath = `docs/audit-report-${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Reporte guardado en: ${reportPath}`);

  return results;
}

// Ejecutar
auditSupabase()
  .then(results => {
    console.log('\n✅ Auditoría completada');
    process.exit(results.issues.length > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('\n❌ Error en auditoría:', error);
    process.exit(1);
  });
