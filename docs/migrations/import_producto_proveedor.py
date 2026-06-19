#!/usr/bin/env python3
"""
===========================================================
Script: import_producto_proveedor.py
Fecha: 2026-06-19
Descripción: Importa datos de relación producto-proveedor
             desde Excel a Supabase
===========================================================

Uso:
    python import_producto_proveedor.py --file "archivo.xlsx" [--dry-run]

El Excel debe tener las siguientes columnas:
- PROVEEDOR: Nombre del proveedor
- RUT PROVEEDOR: RUT del proveedor (numérico)
- COD PRODUCTO: Código/EAN del producto
- DESCRIPCION: Nombre del producto
- MUNDO: Categoría (ALMACEN, MED, COM, ALI, etc.)
- MARCA BCM 5,0: Marca (A, B, C, TN)
"""

import pandas as pd
import argparse
import sys
from pathlib import Path
from typing import List, Dict, Any
import json

# ============================================================
# CONFIGURACIÓN - Ajustar según tu entorno
# ============================================================

SUPABASE_URL = "TU_SUPABASE_URL"
SUPABASE_KEY = "TU_SUPABASE_ANON_KEY"

# ============================================================

def load_excel(filepath: str) -> pd.DataFrame:
    """Carga y limpia datos del Excel."""
    df = pd.read_excel(filepath)
    
    # Limpiar nombres de columnas
    df.columns = df.columns.str.strip()
    
    # Verificar columnas requeridas
    required_cols = ['PROVEEDOR', 'RUT PROVEEDOR', 'COD PRODUCTO', 'DESCRIPCION', 'MUNDO', 'MARCA BCM 5,0']
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise ValueError(f"Columnas faltantes: {missing}")
    
    # Limpiar datos y devolver DataFrame limpio
    df = df.copy()  # Evitar SettingWithCopyWarning
    df['RUT PROVEEDOR'] = df['RUT PROVEEDOR'].fillna(0).astype(int).astype(str)
    df['COD PRODUCTO'] = df['COD PRODUCTO'].fillna(0).astype(int).astype(str)
    df['PROVEEDOR'] = df['PROVEEDOR'].fillna('').str.strip()
    df['DESCRIPCION'] = df['DESCRIPCION'].fillna('').str.strip()
    df['MUNDO'] = df['MUNDO'].fillna('').str.strip()
    df['MARCA BCM 5,0'] = df['MARCA BCM 5,0'].fillna('').str.strip()
    
    return df.reset_index(drop=True)

def transform_to_producto_proveedor(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Transforma el DataFrame a registros de PRODUCTO_PROVEEDOR."""
    
    # Determinar proveedor principal (el primero encontrado por producto)
    # Agrupar por producto para encontrar el proveedor "principal"
    producto_primer_proveedor = {}
    
    for _, row in df.iterrows():
        barcode = str(row['COD PRODUCTO'])
        if barcode not in producto_primer_proveedor:
            producto_primer_proveedor[barcode] = str(row['RUT PROVEEDOR'])
    
    records = []
    for _, row in df.iterrows():
        barcode = str(row['COD PRODUCTO'])
        rut = str(row['RUT PROVEEDOR'])
        
        records.append({
            'product_barcode': barcode,
            'provider_rut': rut,
            'is_primary': (producto_primer_proveedor.get(barcode) == rut),
            'mundo': row['MUNDO'],
            'marca': row['MARCA BCM 5,0'],
            # Políticas aún no definidas - heredarán del proveedor
            'has_exchange': None,
            'withdrawal_days': None,
            'exchange_policy': None,
        })
    
    return records

def transform_proveedores(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Extrae proveedores únicos del Excel."""
    
    # Agrupar por RUT
    grouped = df.groupby('RUT PROVEEDOR').agg({
        'PROVEEDOR': 'first'  # Tomar el primer nombre por RUT
    }).reset_index()
    
    proveedores = []
    for _, row in grouped.iterrows():
        rut = str(row['RUT PROVEEDOR'])
        
        # Ignorar RUT 0 (sin proveedor)
        if rut == '0':
            continue
            
        proveedores.append({
            'rut': rut,
            'name': row['PROVEEDOR'],
            # Políticas por defecto
            'has_exchange': True,  # Por defecto asume que acepta canje
            'withdrawal_days': 30,  # 30 días por defecto
            'exchange_policy': 'Política no definida',
        })
    
    return proveedores

def transform_productos(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Extrae productos únicos del Excel."""
    
    # Agrupar por barcode
    grouped = df.groupby('COD PRODUCTO').agg({
        'DESCRIPCION': 'first',
        'PROVEEDOR': 'first',
        'RUT PROVEEDOR': 'first',
        'MUNDO': 'first',
    }).reset_index()
    
    productos = []
    for _, row in grouped.iterrows():
        mundo = str(row['MUNDO']) if pd.notna(row['MUNDO']) and row['MUNDO'] else 'GENERAL'
        productos.append({
            'barcode': str(row['COD PRODUCTO']),
            'name': row['DESCRIPCION'],
            'supplier': row['PROVEEDOR'],
            'supplier_rut': str(row['RUT PROVEEDOR']),
            'category': mundo,
        })
    
    return productos

def generate_sql_inserts(records: List[Dict[str, Any]], table_name: str) -> str:
    """Genera sentencias SQL INSERT para los registros."""
    
    if not records:
        return f"-- No hay registros para {table_name}\n"
    
    columns = list(records[0].keys())
    column_list = ', '.join(columns)
    
    sql_lines = [f"\n-- Insertando {len(records)} registros en {table_name}\n"]
    sql_lines.append(f"INSERT INTO {table_name} ({column_list}) VALUES\n")
    
    values_lines = []
    for record in records:
        values = []
        for col in columns:
            val = record[col]
            if val is None:
                values.append('NULL')
            elif isinstance(val, bool):
                values.append('TRUE' if val else 'FALSE')
            elif isinstance(val, (int, float)):
                values.append(str(val))
            else:
                # Escapar comillas simples
                escaped = str(val).replace("'", "''")
                values.append(f"'{escaped}'")
        
        values_lines.append(f"  ({', '.join(values)})")
    
    sql_lines.append(',\n'.join(values_lines))
    sql_lines.append(';')
    
    return '\n'.join(sql_lines)

def generate_diagnostic_queries() -> str:
    """Genera queries de diagnóstico post-importación."""
    
    return """
-- ============================================================
-- QUERIES DE DIAGNÓSTICO POST-IMPORTACIÓN
-- ============================================================

-- 1. Verificar conteos
SELECT 'PRODUCTO_PROVEEDOR' AS tabla, COUNT(*) AS total FROM PRODUCTO_PROVEEDOR
UNION ALL
SELECT 'PRODUCTOS' AS tabla, COUNT(*) AS total FROM PRODUCTOS
UNION ALL
SELECT 'PROVEEDORES' AS tabla, COUNT(*) AS total FROM PROVEEDORES;

-- 2. Verificar proveedores principales por producto
SELECT 
    product_barcode,
    COUNT(*) AS total_proveedores,
    COUNT(*) FILTER (WHERE is_primary = TRUE) AS tiene_principal
FROM PRODUCTO_PROVEEDOR
GROUP BY product_barcode
HAVING COUNT(*) FILTER (WHERE is_primary = TRUE) != 1
LIMIT 10;

-- 3. Verificar integridad referencial
SELECT 
    pp.product_barcode,
    p.name AS product_name,
    CASE WHEN p.barcode IS NULL THEN '❌ Producto no existe' ELSE '✅ OK' END AS status
FROM PRODUCTO_PROVEEDOR pp
LEFT JOIN PRODUCTOS p ON pp.product_barcode = p.barcode
WHERE p.barcode IS NULL
LIMIT 10;

SELECT 
    pp.provider_rut,
    pr.name AS provider_name,
    CASE WHEN pr.rut IS NULL THEN '❌ Proveedor no existe' ELSE '✅ OK' END AS status
FROM PRODUCTO_PROVEEDOR pp
LEFT JOIN PROVEEDORES pr ON pp.provider_rut = pr.rut
WHERE pr.rut IS NULL
LIMIT 10;

-- 4. Resumen por proveedor
SELECT 
    pr.name AS proveedor,
    pr.rut,
    COUNT(pp.product_barcode) AS productos_asociados,
    COUNT(pp.product_barcode) FILTER (WHERE pp.is_primary = TRUE) AS productos_principales
FROM PROVEEDORES pr
LEFT JOIN PRODUCTO_PROVEEDOR pp ON pr.rut = pp.provider_rut
GROUP BY pr.rut, pr.name
ORDER BY productos_asociados DESC
LIMIT 20;

-- 5. Resumen por MUNDO
SELECT 
    mundo,
    COUNT(*) AS registros,
    COUNT(DISTINCT product_barcode) AS productos
FROM PRODUCTO_PROVEEDOR
WHERE mundo != ''
GROUP BY mundo
ORDER BY registros DESC;

-- 6. Resumen por MARCA
SELECT 
    marca,
    COUNT(*) AS registros,
    COUNT(DISTINCT product_barcode) AS productos
FROM PRODUCTO_PROVEEDOR
WHERE marca != ''
GROUP BY marca
ORDER BY registros DESC;
"""

def main():
    parser = argparse.ArgumentParser(
        description='Importa relación producto-proveedor desde Excel a Supabase'
    )
    parser.add_argument(
        '--file', '-f',
        required=True,
        help='Ruta al archivo Excel'
    )
    parser.add_argument(
        '--output', '-o',
        default='migrate_output.sql',
        help='Archivo SQL de salida (default: migrate_output.sql)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Solo genera el SQL sin mostrar stats'
    )
    parser.add_argument(
        '--supabase-url',
        default=SUPABASE_URL,
        help='URL de Supabase'
    )
    parser.add_argument(
        '--supabase-key',
        default=SUPABASE_KEY,
        help='API Key de Supabase'
    )
    
    args = parser.parse_args()
    
    # Verificar archivo
    if not Path(args.file).exists():
        print(f"❌ Error: Archivo no encontrado: {args.file}")
        sys.exit(1)
    
    print(f"📁 Cargando archivo: {args.file}")
    
    try:
        # Cargar Excel
        df = load_excel(args.file)
        print(f"   ✓ {len(df)} filas cargadas")
        
        if args.dry_run:
            print("\n🔍 Modo DRY-RUN - Solo estadísticas\n")
        
        # Estadísticas
        print(f"\n📊 ESTADÍSTICAS:")
        print(f"   - Total filas: {len(df)}")
        print(f"   - Proveedores únicos: {df['RUT PROVEEDOR'].nunique()}")
        print(f"   - Productos únicos: {df['COD PRODUCTO'].nunique()}")
        
        # Transformar datos
        print("\n🔄 Transformando datos...")
        
        producto_proveedor = transform_to_producto_proveedor(df)
        print(f"   - Registros PRODUCTO_PROVEEDOR: {len(producto_proveedor)}")
        
        proveedores = transform_proveedores(df)
        print(f"   - Nuevos proveedores: {len(proveedores)}")
        
        productos = transform_productos(df)
        print(f"   - Nuevos productos: {len(productos)}")
        
        if args.dry_run:
            # Mostrar muestra
            print("\n📋 MUESTRA DE PRODUCTO_PROVEEDOR:")
            for r in producto_proveedor[:3]:
                print(f"   {r}")
        
        # Generar SQL
        print(f"\n📝 Generando SQL en: {args.output}")
        
        sql_parts = []
        sql_parts.append("-- ============================================================")
        sql_parts.append("-- MIGRACIÓN: Importar relación producto-proveedor")
        sql_parts.append(f"-- Archivo origen: {args.file}")
        sql_parts.append(f"-- Fecha: 2026-06-19")
        sql_parts.append(f"-- Total registros: {len(producto_proveedor)}")
        sql_parts.append("-- ============================================================\n")
        
        # 1. Proveedores (solo INSERT, sin CREATE)
        sql_parts.append("-- -----------------------------------------------------------")
        sql_parts.append("-- 1. INSERTAR PROVEEDORES (upsert)")
        sql_parts.append("-- -----------------------------------------------------------")
        sql_parts.append(generate_sql_inserts(proveedores, 'PROVEEDORES'))
        
        # 2. Productos (solo INSERT, sin CREATE)
        sql_parts.append("\n-- -----------------------------------------------------------")
        sql_parts.append("-- 2. INSERTAR PRODUCTOS (upsert)")
        sql_parts.append("-- -----------------------------------------------------------")
        sql_parts.append(generate_sql_inserts(productos, 'PRODUCTOS'))
        
        # 3. PRODUCTO_PROVEEDOR
        sql_parts.append("\n-- -----------------------------------------------------------")
        sql_parts.append("-- 3. INSERTAR RELACIONES PRODUCTO_PROVEEDOR")
        sql_parts.append("-- -----------------------------------------------------------")
        sql_parts.append(generate_sql_inserts(producto_proveedor, 'PRODUCTO_PROVEEDOR'))
        
        # Queries de diagnóstico
        sql_parts.append(generate_diagnostic_queries())
        
        # Guardar SQL
        output_path = Path(args.output)
        output_path.write_text('\n'.join(sql_parts))
        print(f"   ✓ SQL guardado en: {output_path.absolute()}")
        
        print(f"""
✅ PROCESO COMPLETADO

Próximos pasos:
1. Revisa el archivo SQL generado: {args.output}
2. Ejecuta en Supabase SQL Editor o psql:
   \\i {args.output}

3. Verifica con los queries de diagnóstico incluidos
""")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
