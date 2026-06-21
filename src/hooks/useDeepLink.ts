/**
 * useDeepLink - Hook para manejar deep links en la aplicación
 * 
 * Permite abrir la app directamente en un registro específico
 */

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useLocation } from 'react-router-dom';

export interface DeepLinkParams {
  tab?: string;
  id?: string;
  barcode?: string;
  quickCapture?: boolean;
  sessionId?: string;
  [key: string]: string | boolean | undefined;
}

export const useDeepLink = () => {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  
  const [deepLinkData, setDeepLinkData] = useState<DeepLinkParams>({});

  useEffect(() => {
    const parsed: DeepLinkParams = {};
    
    // Parámetros de ruta
    Object.entries(params).forEach(([key, value]) => {
      if (value) parsed[key] = value;
    });
    
    // Parámetros de query string
    searchParams.forEach((value, key) => {
      if (value === 'true') parsed[key] = true;
      else if (value === 'false') parsed[key] = false;
      else parsed[key] = value;
    });
    
    setDeepLinkData(parsed);
    
    if (Object.keys(parsed).length > 0) {
      console.log('[DeepLink] Navegación con datos:', parsed);
    }
  }, [params, searchParams, location.pathname]);

  return {
    deepLinkData,
    isDeepLink: Object.keys(deepLinkData).length > 0,
    isQuickCapture: deepLinkData.quickCapture === true,
    sessionId: deepLinkData.sessionId as string | undefined,
    tab: deepLinkData.tab as string | undefined,
  };
};

export default useDeepLink;
