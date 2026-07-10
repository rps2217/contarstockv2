/**
 * Dashboard - Página principal con nuevo diseño de interfaz
 * Usa el RedesignDashboard para el nuevo look & feel
 */

import React, { memo } from "react";
import { RedesignDashboard } from "@/shared/components/redesign";

// Re-export del Dashboard redesignado
const Dashboard: React.FC = () => {
  return <RedesignDashboard />;
};

export default memo(Dashboard);

// Export nombrada para compatibilidad
export { Dashboard };
