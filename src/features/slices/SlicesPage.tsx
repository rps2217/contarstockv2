import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { 
  Database, 
  Plus, 
  Trash2, 
  Filter, 
  SlidersHorizontal, 
  Eye, 
  TrendingDown, 
  Clock, 
  AlertTriangle,
  PlayCircle,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  Info,
  CheckCircle,
  XCircle,
  Edit,
  ArrowRight,
  Sparkles,
  Search,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToastStore } from '../../store/useToastStore';

interface AppSheetSlice {
  id: string;
  name: string;
  description: string;
  sourceTable: 'scans' | 'products' | 'sessions' | 'providers' | 'customers' | 'dynamic_data';
  filterField: string;
  filterOperator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'isEmpty' | 'isNotEmpty';
  filterValue: string;
  selectedColumns: string[];
  allowEdits: boolean;
  allowDeletes: boolean;
  isSystem?: boolean;
}

const DEFAULT_SLICES: AppSheetSlice[] = [
  {
    id: 'sys-scans-error',
    name: 'Escaneos con Error de Servidor',
    description: 'Vistas de capturas de inventario locales retenidas por fallas o conflictos pendientes de forzar.',
    sourceTable: 'scans',
    filterField: 'syncStatus',
    filterOperator: 'equals',
    filterValue: 'error',
    selectedColumns: ['id', 'barcode', 'scannedQty', 'syncStatus', 'timestamp'],
    allowEdits: true,
    allowDeletes: true,
    isSystem: true
  },
  {
    id: 'sys-sessions-active',
    name: 'Sesiones de Inventario en Curso',
    description: 'Revisión ágil de las auditorías actualmente abiertas y operativas en los andenes o estanterías.',
    sourceTable: 'sessions',
    filterField: 'status',
    filterOperator: 'equals',
    filterValue: 'active',
    selectedColumns: ['id', 'name', 'status', 'createdBy', 'createdAt'],
    allowEdits: true,
    allowDeletes: false,
    isSystem: true
  },
  {
    id: 'sys-products-offline',
    name: 'Artículos Creados en Offline',
    description: 'Nuevos productos configurados de forma local que aún no han sido replicados al catálogo maestro.',
    sourceTable: 'products',
    filterField: 'syncStatus',
    filterOperator: 'equals',
    filterValue: 'pending',
    selectedColumns: ['barcode', 'name', 'sku', 'category', 'syncStatus'],
    allowEdits: true,
    allowDeletes: true,
    isSystem: true
  },
  {
    id: 'sys-vencimiento-alerta',
    name: 'Lotes Próximos a Vencer',
    description: 'Esquema de lotes y fechas de caducidad en alerta roja registrados en la tabla dinámica.',
    sourceTable: 'dynamic_data',
    filterField: 'tableName',
    filterOperator: 'equals',
    filterValue: 'expiry',
    selectedColumns: ['id', 'syncStatus', 'timestamp'],
    allowEdits: false,
    allowDeletes: true,
    isSystem: true
  }
];

export const SlicesPage: React.FC = () => {
  const { addToast } = useToastStore();
  const [slices, setSlices] = useState<AppSheetSlice[]>(() => {
    const saved = localStorage.getItem('logicount_appsheet_slices');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_SLICES;
      }
    }
    return DEFAULT_SLICES;
  });

  const [activeSliceId, setActiveSliceId] = useState<string>(DEFAULT_SLICES[0].id);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Create state variables for new Slice creation
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSliceName, setNewSliceName] = useState('');
  const [newSliceDesc, setNewSliceDesc] = useState('');
  const [newSliceTable, setNewSliceTable] = useState<AppSheetSlice['sourceTable']>('scans');
  const [newSliceFilterField, setNewSliceFilterField] = useState('syncStatus');
  const [newSliceFilterOp, setNewSliceFilterOp] = useState<AppSheetSlice['filterOperator']>('equals');
  const [newSliceFilterVal, setNewSliceFilterVal] = useState('');
  const [newSliceAllowEdits, setNewSliceAllowEdits] = useState(true);
  const [newSliceAllowDeletes, setNewSliceAllowDeletes] = useState(true);

  // Get field names of selected layout to offer column customization
  const getTableFields = (table: AppSheetSlice['sourceTable']) => {
    switch (table) {
      case 'scans':
        return ['id', 'barcode', 'scannedQty', 'syncStatus', 'scannedBy', 'locationId', 'timestamp', 'expectedQty'];
      case 'products':
        return ['barcode', 'name', 'sku', 'category', 'price', 'syncStatus', 'createdAt'];
      case 'sessions':
        return ['id', 'name', 'status', 'createdBy', 'createdAt', 'notes'];
      case 'providers':
        return ['id', 'name', 'code', 'syncStatus', 'contactPhone'];
      case 'customers':
        return ['id', 'name', 'email', 'syncStatus', 'phone'];
      case 'dynamic_data':
        return ['id', 'tableName', 'syncStatus', 'timestamp'];
      default:
        return ['id', 'syncStatus'];
    }
  };

  const [newSliceCols, setNewSliceCols] = useState<string[]>(getTableFields('scans'));

  // Save Slices helper
  const saveSlices = (updatedList: AppSheetSlice[]) => {
    setSlices(updatedList);
    localStorage.setItem('logicount_appsheet_slices', JSON.stringify(updatedList));
  };

  const handleCreateSlice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSliceName.trim() || !newSliceFilterField.trim()) {
      addToast('Por favor introduce un nombre de Slice válido', 'error');
      return;
    }

    const newSlice: AppSheetSlice = {
      id: `slice-${Date.now()}`,
      name: newSliceName,
      description: newSliceDesc || 'Visualización de datos filtrada a medida.',
      sourceTable: newSliceTable,
      filterField: newSliceFilterField,
      filterOperator: newSliceFilterOp,
      filterValue: newSliceFilterVal,
      selectedColumns: newSliceCols.length > 0 ? newSliceCols : getTableFields(newSliceTable).slice(0, 5),
      allowEdits: newSliceAllowEdits,
      allowDeletes: newSliceAllowDeletes,
      isSystem: false
    };

    const updated = [...slices, newSlice];
    saveSlices(updated);
    setActiveSliceId(newSlice.id);
    setShowCreateModal(false);
    addToast(`Slice "${newSliceName}" creado con éxito`, 'success');

    // Reset Form
    setNewSliceName('');
    setNewSliceDesc('');
    setNewSliceTable('scans');
    setNewSliceFilterField('syncStatus');
    setNewSliceFilterOp('equals');
    setNewSliceFilterVal('');
    setNewSliceAllowEdits(true);
    setNewSliceAllowDeletes(true);
  };

  const handleDeleteSlice = (id: string, name: string) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar el slice "${name}"?`)) {
      const filtered = slices.filter(s => s.id !== id);
      saveSlices(filtered);
      addToast('Slice eliminado', 'success');
      if (activeSliceId === id && filtered.length > 0) {
        setActiveSliceId(filtered[0].id);
      }
    }
  };

  // Find active Slice
  const activeSlice = slices.find(s => s.id === activeSliceId) || slices[0];

  // 1. Fetching rows based on dynamic conditional row-level filtering logic
  const sliceData = useLiveQuery(async () => {
    if (!activeSlice) return [];
    const source = activeSlice.sourceTable;
    const tableInstance = (db as any)[source];
    if (!tableInstance) return [];

    let rawData: any[] = [];
    try {
      rawData = await tableInstance.toArray();
    } catch (e) {
      console.error(e);
      return [];
    }

    // Apply the Slice Row-Level conditional filter logic
    return rawData.filter((item: any) => {
      // Robust lookup inside nested objects if required (e.g. dynamic_data is wrapped inside item.data)
      let val = item[activeSlice.filterField];
      if (val === undefined && item.data) {
        val = item.data[activeSlice.filterField];
      }

      const target = activeSlice.filterValue;

      // Safe cast to strings for robust comparison
      const itemStr = val !== undefined && val !== null ? String(val).toLowerCase() : '';
      const targetStr = target ? target.toLowerCase() : '';

      switch (activeSlice.filterOperator) {
        case 'equals':
          return itemStr === targetStr;
        case 'notEquals':
          return itemStr !== targetStr;
        case 'contains':
          return itemStr.includes(targetStr);
        case 'greaterThan':
          return Number(val) > Number(target);
        case 'lessThan':
          return Number(val) < Number(target);
        case 'isEmpty':
          return val === undefined || val === null || val === '';
        case 'isNotEmpty':
          return val !== undefined && val !== null && val !== '';
        default:
          return true;
      }
    });
  }, [activeSlice, slices]);

  // Handle local cell edit
  const handleEditRow = async (rowId: any, rowData: any) => {
    if (!activeSlice.allowEdits) {
      addToast('La edición está bloqueada en este Slice táctico', 'warning');
      return;
    }

    const fieldToEdit = window.prompt(
      `Introduce la columna que deseas alterar:\nDisponibles: ${activeSlice.selectedColumns.join(', ')}`,
      activeSlice.selectedColumns[1]
    );
    if (!fieldToEdit) return;

    if (!activeSlice.selectedColumns.includes(fieldToEdit)) {
      addToast('Esa columna no está habilitada en la selección del Slice', 'error');
      return;
    }

    const newValue = window.prompt(`Nuevo valor para [${fieldToEdit}]:`, String(rowData[fieldToEdit] || ''));
    if (newValue === null) return;

    try {
      const tableInstance = (db as any)[activeSlice.sourceTable];
      if (tableInstance) {
        const updatePayload: Record<string, any> = {
          updatedAt: Date.now(),
          syncStatus: 'pending' // Mark as pending upload queue flow
        };

        // If the table is dynamic_data, the fields live inside the 'data' subobject
        if (activeSlice.sourceTable === 'dynamic_data') {
          const originalRecord = await tableInstance.get(rowId);
          if (originalRecord) {
            updatePayload.data = {
              ...originalRecord.data,
              [fieldToEdit]: newValue
            };
          }
        } else {
          updatePayload[fieldToEdit] = isNaN(Number(newValue)) ? newValue : Number(newValue);
        }

        // Apply update to local Dexie database schema
        await tableInstance.update(rowId, updatePayload);
        addToast('Registro actualizado de manera local. Se despachará en el siguiente ciclo.', 'success');
      }
    } catch (err: any) {
      addToast(`Error al actualizar en la BD local: ${err.message}`, 'error');
    }
  };

  // Handle local row deletion
  const handleDeleteRow = async (rowId: any) => {
    if (!activeSlice.allowDeletes) {
      addToast('La eliminación no está permitida en este Slice', 'warning');
      return;
    }

    const confirmDel = window.confirm(
      `¿Deseas marcar este registro para borrarse?\nSe eliminará de la base local y se programará la purga remota en la nube.`
    );
    if (!confirmDel) return;

    try {
      const tableInstance = (db as any)[activeSlice.sourceTable];
      if (tableInstance) {
        // AppSheet robust pattern: if synced, mark as pending_delete to sync, else just delete
        const item = await tableInstance.get(rowId);
        if (item && item.syncStatus !== 'synced') {
          await tableInstance.delete(rowId);
        } else {
          await tableInstance.update(rowId, {
            syncStatus: 'pending_delete',
            updatedAt: Date.now()
          });
        }
        addToast('Registro removido del flujo activo del Slice', 'success');
      }
    } catch (err: any) {
      addToast(`Error al borrar: ${err.message}`, 'error');
    }
  };

  const exportSliceCSV = () => {
    if (!sliceData || sliceData.length === 0) {
      addToast('No hay registros acumulados en este slice para exportar', 'warning');
      return;
    }

    const headers = activeSlice.selectedColumns.join(',');
    const rows = sliceData.map(row => {
      return activeSlice.selectedColumns.map(col => {
        let val = row[col];
        if (val === undefined && row.data) val = row.data[col];
        const valStr = val !== undefined && val !== null ? String(val).replace(/,/g, ' ') : '';
        return `"${valStr}"`;
      }).join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Slice_${activeSlice.name.replace(/\s+/g, '_')}_Offline.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Archivo CSV generado y descargado', 'success');
  };

  // Filter local slice rows by typing search term
  const filteredRows = (sliceData || []).filter((row: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return Object.values(row).some(val => {
      if (typeof val === 'object' && val !== null) {
        return Object.values(val).some(sub => String(sub).toLowerCase().includes(term));
      }
      return String(val).toLowerCase().includes(term);
    });
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 pb-24 text-white font-sans selection:bg-blue-500/30">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter leading-none flex items-center gap-2.5">
            <Layers className="w-8 h-8 text-blue-500" />
            Slices de Datos <span className="text-emerald-400 text-xs tracking-widest uppercase italic font-normal py-1 px-2.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">ESTILO APPSHEET</span>
          </h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2">
            Vistas Filtradas, Controles de Escritura y Columnas Personalizadas
          </p>
        </div>

        <button
          onClick={() => {
            setNewSliceTable('scans');
            setNewSliceCols(getTableFields('scans'));
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-xl shadow-blue-900/30 active:scale-95 text-white"
        >
          <Plus className="w-4 h-4" />
          Crear Slice Custom
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Sidebar: Lists of Slices */}
        <div className="bg-slate-950/40 border border-slate-900 rounded-3xl p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Slices Disponibles ({slices.length})
            </span>
            <Database className="w-4 h-4 text-slate-600" />
          </div>

          <div className="space-y-1">
            {slices.map((sl) => {
              const isActive = sl.id === activeSliceId;
              const isSys = sl.isSystem;
              return (
                <div 
                  key={sl.id}
                  className={`w-full group rounded-2xl p-3 flex items-center justify-between transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-blue-600/10 border border-blue-500/30 text-white' 
                      : 'border border-transparent hover:bg-white/5 text-slate-400 hover:text-white'
                  }`}
                  onClick={() => setActiveSliceId(sl.id)}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className={`p-1.5 rounded-lg mt-0.5 shrink-0 ${isActive ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-900/60 text-slate-500'}`}>
                      <Filter className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-black block truncate group-hover:text-white transition-colors">{sl.name}</span>
                      <span className="text-[9px] font-mono uppercase text-slate-500 tracking-wider">
                        {sl.sourceTable} • {isSys ? 'SISTEMA' : 'USUARIO'}
                      </span>
                    </div>
                  </div>

                  {!isSys && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSlice(sl.id, sl.name);
                      }}
                      className="p-1.5 text-slate-600 hover:text-rose-400 rounded-lg transition-transform hover:scale-115 shrink-0"
                      title="Eliminar Slice"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex gap-2.5">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-400 leading-normal">
              <strong>¿Qué es un Slice?</strong> Es una "segmentación de tabla" como en AppSheet. En lugar de procesar millones de filas, diseñas vistas compactas para la línea operativa, definiendo permisos locales.
            </p>
          </div>
        </div>

        {/* Content Panel: Display Selected Slice */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-slate-950/40 border border-slate-900 p-5 rounded-3xl space-y-4">
            {/* Header info for Active Slice */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-900">
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase text-blue-400 tracking-wider bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                  Tabla Madre: {activeSlice?.sourceTable.toUpperCase()}
                </span>
                <h2 className="text-lg font-black text-white uppercase mt-1">{activeSlice?.name}</h2>
                <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">{activeSlice?.description}</p>
              </div>

              {activeSlice && (
                <button
                  onClick={exportSliceCSV}
                  className="flex items-center gap-1.5 px-3.5 py-2 hover:bg-emerald-500/10 hover:text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 self-start text-emerald-500"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> EXPORTAR CSV
                </button>
              )}
            </div>

            {/* Segmenting Criteria block */}
            <div className="bg-slate-900/30 border border-slate-900/80 p-3.5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-slate-400 font-mono">Filtro Condicional:</span>
                <code className="text-blue-400 bg-blue-500/5 px-2 py-0.5 rounded border border-blue-500/10 font-mono font-bold">
                  [{activeSlice?.filterField}] {activeSlice?.filterOperator} "{activeSlice?.filterValue}"
                </code>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Edición:</span>
                  <span className={`w-2 h-2 rounded-full ${activeSlice?.allowEdits ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span className="text-[10px] font-bold uppercase">{activeSlice?.allowEdits ? 'Sí' : 'No'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Borrado:</span>
                  <span className={`w-2 h-2 rounded-full ${activeSlice?.allowDeletes ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span className="text-[10px] font-bold uppercase">{activeSlice?.allowDeletes ? 'Sí' : 'No'}</span>
                </div>
              </div>
            </div>

            {/* Input Filter bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Escribe para buscar o depurar en este Slice..."
                className="w-full bg-slate-950 border border-slate-900 rounded-2xl pl-11 pr-4 py-3 text-xs placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                id="slice-search"
              />
            </div>

            {/* Interactive Grid Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-900 bg-slate-950">
              <table className="w-full text-left font-mono text-[11px] leading-relaxed border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 bg-slate-900/40 text-slate-500 font-extrabold uppercase">
                    {activeSlice?.selectedColumns.map((col) => (
                      <th key={col} className="p-3.5 tracking-wider">{col}</th>
                    ))}
                    {(activeSlice?.allowEdits || activeSlice?.allowDeletes) && (
                      <th className="p-3.5 text-right tracking-wider">Acciones</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={activeSlice?.selectedColumns.length + 1} className="p-8 text-center text-slate-500 font-sans">
                        <BookOpen className="w-10 h-10 text-slate-800 mx-auto mb-3" />
                        Ningún registro cumple con los criterios de este Slice o la búsqueda actual.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((rowArr: any, index) => {
                      const rowId = rowArr.id || rowArr.barcode;
                      return (
                        <tr key={index} className="hover:bg-slate-900/10 transition-colors">
                          {activeSlice?.selectedColumns.map((col) => {
                            let cellVal = rowArr[col];
                            // Check nested structures
                            if (cellVal === undefined && rowArr.data) cellVal = rowArr.data[col];
                            
                            const displayStr = typeof cellVal === 'object' ? JSON.stringify(cellVal) : String(cellVal || '-');

                            // Rich status highlighting for beautiful display
                            let badgeStyle = '';
                            if (col === 'syncStatus' || col === 'status') {
                              if (['synced', 'completed', 'active'].includes(cellVal)) {
                                badgeStyle = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                              } else if (['pending', 'pending_delete'].includes(cellVal)) {
                                badgeStyle = 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
                              } else if (cellVal === 'error') {
                                badgeStyle = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
                              }
                            }

                            return (
                              <td key={col} className="p-3.5 truncate max-w-xs text-slate-300 font-medium">
                                {badgeStyle ? (
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${badgeStyle}`}>
                                    {displayStr}
                                  </span>
                                ) : (
                                  displayStr
                                )}
                              </td>
                            );
                          })}

                          {(activeSlice?.allowEdits || activeSlice?.allowDeletes) && (
                            <td className="p-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {activeSlice.allowEdits && (
                                  <button
                                    onClick={() => handleEditRow(rowId, rowArr)}
                                    className="p-1 px-2.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/10 hover:bg-blue-500/20 transition-all font-sans font-bold text-[9px] uppercase tracking-wide inline-flex items-center gap-1"
                                    title="Modificar Columna de Celda"
                                  >
                                    <Edit className="w-3 h-3" /> Alterar
                                  </button>
                                )}
                                {activeSlice.allowDeletes && (
                                  <button
                                    onClick={() => handleDeleteRow(rowId)}
                                    className="p-1 px-2 mb-0.5 text-rose-400 hover:text-white hover:bg-rose-600/20 rounded-lg transition-all"
                                    title="Remover Fila"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center px-1 text-slate-500 font-sans text-xs">
              <span className="font-bold uppercase tracking-wider">
                Total en Slice: <span className="text-white font-mono">{filteredRows.length}</span> registros de <span className="text-slate-400 font-mono">{sliceData?.length || 0}</span>
              </span>
              <span>Visualizando en Tiempo Real desde la Base Local</span>
            </div>
          </div>
        </div>
      </div>

      {/* CREATE SLICE MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="relative w-full max-w-xl bg-slate-950 border border-slate-900 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-blue-500" />
                  Constructor de Slices Inteligentes
                </h3>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-500 hover:text-white text-xs uppercase font-black"
                >
                  Cerrar
                </button>
              </div>

              {/* Form schema */}
              <form onSubmit={handleCreateSlice} className="space-y-4 font-sans text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-black uppercase tracking-wider block">Nombre del Slice</label>
                    <input
                      type="text"
                      required
                      value={newSliceName}
                      onChange={(e) => setNewSliceName(e.target.value)}
                      placeholder="Ej: Lotes con Error"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-black uppercase tracking-wider block">Tabla Origen</label>
                    <select
                      value={newSliceTable}
                      onChange={(e) => {
                        const tbl = e.target.value as AppSheetSlice['sourceTable'];
                        setNewSliceTable(tbl);
                        setNewSliceCols(getTableFields(tbl));
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="scans">scans (Operaciones)</option>
                      <option value="products">products (Catálogo)</option>
                      <option value="sessions">sessions (Sesiones)</option>
                      <option value="providers">providers (Proveedores)</option>
                      <option value="customers">customers (Clientes)</option>
                      <option value="dynamic_data">dynamic_data (Tablas Dinámicas)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-400 font-black uppercase tracking-wider block">Descripción de Seguridad</label>
                  <input
                    type="text"
                    value={newSliceDesc}
                    onChange={(e) => setNewSliceDesc(e.target.value)}
                    placeholder="Describe para qué sirve o quién supervisará este subconjunto de datos"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Filter construction style AppSheet */}
                <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-blue-400 tracking-widest flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5" /> Condición row-Level (Expresión del Slice)
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Columna Clave</label>
                      <select
                        value={newSliceFilterField}
                        onChange={(e) => setNewSliceFilterField(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-900 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-blue-500 block font-mono"
                      >
                        {getTableFields(newSliceTable).map(col => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Operador</label>
                      <select
                        value={newSliceFilterOp}
                        onChange={(e) => setNewSliceFilterOp(e.target.value as AppSheetSlice['filterOperator'])}
                        className="w-full bg-slate-950 border border-slate-900 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-blue-500 block font-mono"
                      >
                        <option value="equals">Es igual a</option>
                        <option value="notEquals">No es igual a</option>
                        <option value="contains">Contiene</option>
                        <option value="greaterThan">Mayor que (&gt;)</option>
                        <option value="lessThan">Menor que (&lt;)</option>
                        <option value="isEmpty">Está vacío</option>
                        <option value="isNotEmpty">No está vacío</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Valor de Referencia</label>
                      <input
                        type="text"
                        value={newSliceFilterVal}
                        disabled={['isEmpty', 'isNotEmpty'].includes(newSliceFilterOp)}
                        onChange={(e) => setNewSliceFilterVal(e.target.value)}
                        placeholder="Ej: error"
                        className="w-full bg-slate-950 border border-slate-900 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Columns Selection */}
                <div className="space-y-2">
                  <label className="text-slate-400 font-black uppercase tracking-wider block">Columnas Visibles en Tabla</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-900/40 p-3 rounded-2xl border border-slate-900">
                    {getTableFields(newSliceTable).map((col) => {
                      const isChecked = newSliceCols.includes(col);
                      return (
                        <label key={col} className="flex items-center gap-2 cursor-pointer select-none py-1 px-1 text-[11px] font-mono text-slate-300">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setNewSliceCols(prev => prev.filter(c => c !== col));
                              } else {
                                setNewSliceCols(prev => [...prev, col]);
                              }
                            }}
                            className="rounded border-slate-800 text-blue-600 focus:ring-blue-500 bg-slate-950 w-3.5 h-3.5"
                          />
                          {col}
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Permissions configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="flex items-center justify-between p-3.5 bg-slate-900/30 rounded-xl border border-slate-900">
                    <div>
                      <span className="font-extrabold text-slate-300 uppercase block tracking-wide">Permitir Edición</span>
                      <span className="text-[9px] text-slate-600">Acceso a Alterar valores localmente</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={newSliceAllowEdits}
                      onChange={(e) => setNewSliceAllowEdits(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 bg-slate-950 border-slate-800"
                    />
                  </div>
                  <div className="flex items-center justify-between p-3.5 bg-slate-900/30 rounded-xl border border-slate-900">
                    <div>
                      <span className="font-extrabold text-slate-300 uppercase block tracking-wide">Permitir Eliminación</span>
                      <span className="text-[9px] text-slate-600">Acceso de purga en este slice</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={newSliceAllowDeletes}
                      onChange={(e) => setNewSliceAllowDeletes(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 bg-slate-950 border-slate-800"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-4.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest mt-4 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl shadow-blue-900/30 border-b-4 border-blue-800"
                >
                  <Sparkles className="w-4 h-4" /> Configurar y Compilar Slice
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SlicesPage;
