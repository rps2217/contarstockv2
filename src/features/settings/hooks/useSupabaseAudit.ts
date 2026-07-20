/**
 * useSupabaseAudit - Hook para auditoría de tablas en Supabase
 */

import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { SoundFX } from '../../../services/audio';
import { toast } from 'sonner';

export interface TableAuditResult {
  tableName: string;
  exists: boolean | null;
  count: number | null;
  error?: string;
  isTesting: boolean;
}

export interface SystemTable {
  name: string;
  pkey: string;
  desc: string;
  required: boolean;
}

export const SYSTEM_TABLES: SystemTable[] = [
  { name: 'PRODUCTOS', pkey: 'barcode', desc: 'Catálogo Maestro de Productos SKU', required: true },
  { name: 'PROVEEDORES', pkey: 'rut', desc: 'Registro de Proveedores Autorizados', required: true },
  { name: 'SESSIONS', pkey: 'id', desc: 'Sesiones de Conteo Activas e Históricas', required: true },
  { name: 'SCANS', pkey: 'id', desc: 'Registros de Escaneo Individuales', required: true },
  // CONFIG_SISTEMA fue eliminado - no existe en Supabase
  { name: 'VENCIMIENTOS', pkey: 'id', desc: 'Lotes de Vencimiento Registrados', required: true },
  { name: 'EVENTOS', pkey: 'id', desc: 'Bitácora de Siniestros y Mermas', required: true },
  { name: 'CLIENTES', pkey: 'id', desc: 'Asignación de Cargas a Clientes', required: true },
  {
    name: 'MESSAGE_TEMPLATES',
    pkey: 'id',
    desc: 'Plantillas de Textos/Notificaciones',
    required: false,
  },
  { name: 'PLANTILLAS_CORREOS', pkey: 'id', desc: 'Plantillas de Emails', required: false },
];

export const SUGGESTED_LEGACY_TABLES: string[] = [
  'STOCK',
  'HISTORIAL_CONTEOS',
  'COLA_SINCRONIZACION',
  'PRODUCT_MAPPING',
  'PRODUCTOS_HISTORIAL',
  'test',
  'temp_products',
];

interface UseSupabaseAuditReturn {
  // Estado
  results: Record<string, TableAuditResult>;
  legacyResults: Record<string, TableAuditResult>;
  customTable: string;
  customLegacyList: string[];
  selectedForDeletion: Record<string, boolean>;
  copied: boolean;

  // Acciones
  setCustomTable: (value: string) => void;
  testTable: (tableName: string, isLegacy?: boolean) => Promise<void>;
  auditAll: () => Promise<void>;
  addCustomLegacyTable: () => void;
  toggleDeletionSelection: (tableName: string) => void;
  getSQLDropScript: () => string;
  handleCopy: () => Promise<void>;
}

export function useSupabaseAudit(): UseSupabaseAuditReturn {
  const [results, setResults] = useState<Record<string, TableAuditResult>>({});
  const [legacyResults, setLegacyResults] = useState<Record<string, TableAuditResult>>({});
  const [customTable, setCustomTable] = useState('');
  const [customLegacyList, setCustomLegacyList] = useState<string[]>(SUGGESTED_LEGACY_TABLES);
  const [selectedForDeletion, setSelectedForDeletion] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  const testTable = useCallback(async (tableName: string, isLegacy = false) => {
    const updateFn = isLegacy ? setLegacyResults : setResults;

    updateFn(prev => ({
      ...prev,
      [tableName]: { tableName, exists: null, count: null, isTesting: true },
    }));

    try {
      const { error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        const errorMsg = error.message || '';
        const notFound =
          errorMsg.includes('does not exist') ||
          errorMsg.includes('not find') ||
          errorMsg.includes('404');

        updateFn(prev => ({
          ...prev,
          [tableName]: {
            tableName,
            exists: !notFound,
            count: 0,
            error: notFound ? 'Tabla no encontrada en Postgres' : errorMsg,
            isTesting: false,
          },
        }));

        if (notFound && isLegacy) {
          setSelectedForDeletion(prev => ({ ...prev, [tableName]: false }));
        }
      } else {
        updateFn(prev => ({
          ...prev,
          [tableName]: {
            tableName,
            exists: true,
            count: count ?? 0,
            isTesting: false,
          },
        }));

        if (isLegacy) {
          setSelectedForDeletion(prev => ({ ...prev, [tableName]: true }));
        }
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      updateFn(prev => ({
        ...prev,
        [tableName]: {
          tableName,
          exists: false,
          count: null,
          error: errorMessage,
          isTesting: false,
        },
      }));
    }
  }, []);

  const auditAll = useCallback(async () => {
    SoundFX.play('success');
    toast.info('Iniciando auditoría de tablas en Supabase...');

    await Promise.all(SYSTEM_TABLES.map(t => testTable(t.name, false)));
    await Promise.all(customLegacyList.map(t => testTable(t, true)));

    toast.success('Auditoría completada.');
  }, [testTable, customLegacyList]);

  const addCustomLegacyTable = useCallback(() => {
    if (!customTable.trim()) return;
    const cleanName = customTable.trim().toUpperCase();
    if (customLegacyList.includes(cleanName) || SYSTEM_TABLES.some(s => s.name === cleanName)) {
      toast.info('La tabla ya se encuentra en el rango de auditoría');
      return;
    }

    setCustomLegacyList(prev => [...prev, cleanName]);
    setCustomTable('');
    testTable(cleanName, true);
  }, [customTable, customLegacyList, testTable]);

  const toggleDeletionSelection = useCallback((tableName: string) => {
    setSelectedForDeletion(prev => ({
      ...prev,
      [tableName]: !prev[tableName],
    }));
  }, []);

  const getSQLDropScript = useCallback(() => {
    const tablesToDrop = Object.entries(selectedForDeletion)
      .filter(([, select]) => select)
      .map(([name]) => name);

    if (tablesToDrop.length === 0) {
      return '-- Selecciona las tablas obsoletas arriba para generar el comando DROP TABLE.';
    }

    const now = new Date();
    return `-- ==========================================
-- SCRIPT DE AUDITORÍA Y LIMPIEZA SUPABASE
-- Generado el ${now.toLocaleDateString()} ${now.toLocaleTimeString()}
-- ==========================================

${tablesToDrop.map(table => `DROP TABLE IF EXISTS "${table}" CASCADE;`).join('\n')}

-- Operación recomendada terminada exitosamente. 
-- Copia este texto y ejecútalo en la terminal SQL Editor de Supabase.`;
  }, [selectedForDeletion]);

  const handleCopy = useCallback(async () => {
    navigator.clipboard.writeText(getSQLDropScript());
    setCopied(true);
    SoundFX.play('success');
    toast.success('Script SQL copiado al portapapeles');
    setTimeout(() => setCopied(false), 2000);
  }, [getSQLDropScript]);

  return {
    results,
    legacyResults,
    customTable,
    customLegacyList,
    selectedForDeletion,
    copied,
    setCustomTable,
    testTable,
    auditAll,
    addCustomLegacyTable,
    toggleDeletionSelection,
    getSQLDropScript,
    handleCopy,
  };
}
