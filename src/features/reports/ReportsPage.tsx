/**
 * ReportsPage - Página de reportes simplificada
 * 
 * Muestra directamente AuditPage (consolidación e historial)
 */

import React, { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

const AuditPage = lazy(() => import('./AuditPage').then(m => ({ default: m.AuditPage })));

const TabLoader = () => (
  <div className="h-full flex items-center justify-center">
    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
  </div>
);

export const ReportsPage: React.FC = () => {
  return (
    <Suspense fallback={<TabLoader />}>
      <AuditPage />
    </Suspense>
  );
};

export default ReportsPage;
