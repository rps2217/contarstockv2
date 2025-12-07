
import React from 'react';
import { Product } from '../../types';
import { Pencil, Trash2, Package, Globe, Factory, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';

interface ProductListProps {
  products?: Product[];
  isLoading?: boolean;
  page: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
  onEdit: (product: Product) => void;
  onDelete: (barcode: string) => void;
  onDeleteAll: () => void;
  hasFilter: boolean;
}

export const ProductList: React.FC<ProductListProps> = ({
  products,
  page,
  totalCount,
  pageSize,
  onPageChange,
  onEdit,
  onDelete,
  onDeleteAll,
  hasFilter
}) => {
  const maxPage = Math.ceil(totalCount / pageSize) - 1;

  if (!products || products.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
        <Package className="w-12 h-12 mx-auto text-slate-200 mb-3" />
        <p className="text-slate-400 font-medium italic">
          {hasFilter ? 'No se encontraron resultados.' : 'Base de datos vacía.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* DESKTOP TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hidden md:block">
        <table className="w-full text-left">
          <thead className="bg-slate-50/80 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-40">CODIGO</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">DESCRIPCION</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-40">MUNDO</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-40">PROVEEDOR</th>
              <th className="px-6 py-4 text-right w-24">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((p) => (
              <tr key={p.barcode} className="hover:bg-blue-50/30 transition-colors group">
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    <div className="font-mono text-blue-600 font-bold bg-blue-50 inline-block px-2.5 py-1 rounded-md text-xs border border-blue-100 group-hover:bg-white group-hover:border-blue-200">
                      {p.barcode}
                    </div>
                    {p.syncStatus && p.syncStatus !== 'synced' && (
                      <span
                        className={`w-2 h-2 rounded-full ${p.syncStatus === 'add' ? 'bg-green-500' : 'bg-orange-500'}`}
                        title={p.syncStatus === 'add' ? 'Nuevo (No sincronizado)' : 'Modificado (No sincronizado)'}
                      ></span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-3 font-medium text-slate-700">{p.name}</td>
                <td className="px-6 py-3">
                  {p.category ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 uppercase tracking-wide">
                      <Globe className="w-3 h-3" /> {p.category}
                    </span>
                  ) : (
                    <span className="text-slate-300 text-xs">-</span>
                  )}
                </td>
                <td className="px-6 py-3">
                  <div className="text-xs text-slate-600 truncate max-w-[150px]" title={p.supplier}>
                    {p.supplier || '-'}
                  </div>
                  {p.supplierRut && <div className="text-[10px] text-slate-400 font-mono">{p.supplierRut}</div>}
                </td>
                <td className="px-6 py-3 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEdit(p)}
                      className="text-slate-400 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-all"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(p.barcode)}
                      className="text-slate-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-all"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARDS */}
      <div className="md:hidden space-y-3">
        {products.map((p) => (
          <div key={p.barcode} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-start active:scale-[0.99] transition-transform">
            <div className="flex-1 mr-4">
              <div className="font-bold text-slate-900 leading-tight mb-1.5 flex items-center gap-2">
                {p.name}
                {p.syncStatus && p.syncStatus !== 'synced' && (
                  <span className={`w-2 h-2 rounded-full shrink-0 ${p.syncStatus === 'add' ? 'bg-green-500' : 'bg-orange-500'}`}></span>
                )}
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div className="text-blue-600 font-mono text-xs font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{p.barcode}</div>
                {p.category && <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide bg-slate-50 px-1.5 py-0.5 rounded">{p.category}</div>}
              </div>
              {p.supplier && (
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <Factory className="w-3 h-3" /> {p.supplier}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={() => onEdit(p)} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-lg">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => onDelete(p.barcode)} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* PAGINATION */}
      {!hasFilter && totalCount > pageSize && (
        <div className="flex justify-center items-center gap-4 pt-4">
          <button
            onClick={() => onPageChange(Math.max(0, page - 1))}
            disabled={page === 0}
            className="p-2.5 bg-white border border-slate-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-95"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
            Página {page + 1} de {maxPage + 1}
          </span>
          <button
            onClick={() => onPageChange(Math.min(maxPage, page + 1))}
            disabled={page >= maxPage}
            className="p-2.5 bg-white border border-slate-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-95"
          >
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      )}

      {/* DANGER ZONE */}
      {!hasFilter && totalCount > 0 && (
        <div className="mt-12 border border-red-200 bg-red-50/50 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="bg-red-100 p-2 rounded-lg text-red-600 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-red-900 font-bold text-sm">Zona de Peligro</h3>
              <p className="text-red-700/70 text-xs mt-1 max-w-md">
                Esta acción eliminará permanentemente todos los productos. Solo úsala si necesitas reiniciar la base de datos para una nueva importación.
              </p>
            </div>
          </div>
          <button
            onClick={onDeleteAll}
            className="bg-white border-2 border-red-100 text-red-600 hover:bg-red-600 hover:border-red-600 hover:text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm w-full md:w-auto"
          >
            Eliminar Todo
          </button>
        </div>
      )}
    </div>
  );
};
