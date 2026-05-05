
import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import * as sessionService from '../services/sessionService';
import { sanitizeBarcode } from '../services/utils';
import { useAppStore } from '@/store/mainAppStore';

/**
 * HOOK DE INTELIGENCIA OPERATIVA: useAutoSession
 * Permite que un operario simplemente comience a "pistear" sin configurar nada.
 * Si detecta un escaneo fuera de una sesión activa, crea una automáticamente.
 */
export const useAutoSession = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setStartSessionModalOpen } = useAppStore();
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ignorar si estamos en un input o textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Detectar si estamos en un modo de escaneo inmersivo
      const isScanningMode = location.pathname.startsWith('/counting/') || 
        location.pathname === '/reception' || 
        location.pathname === '/documents' ||
        location.pathname === '/visual-picking' ||
        location.pathname === '/expiry' ||
        location.pathname.startsWith('/massive/');

      if (isScanningMode) return;

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // Si el tiempo entre teclas es muy corto (< 50ms), es probablemente un scanner
      // O si es una tecla normal, la agregamos al buffer
      if (e.key.length === 1) {
        bufferRef.current += e.key;
      } else if (e.key === 'Enter') {
        const barcode = sanitizeBarcode(bufferRef.current);
        bufferRef.current = '';

        if (barcode && barcode.length >= 3) {
          // ¡DETECCIÓN DE ESCANEO ESPONTÁNEO!
          // Creamos una sesión "Ciega" automática
          const autoLabel = `AUTO-${new Date().getHours()}${new Date().getMinutes()}-${barcode.slice(-4)}`;
          const session = await sessionService.createSession(
            'AUTO_INFERENCIA', 
            autoLabel, 
            'standard'
          );
          
          // Navegamos a la sesión y pasamos el barcode para que se procese de inmediato
          navigate(`/counting/${session.id}`, { state: { initialScan: barcode } });
        }
      }

      // Limpiar buffer si pasa mucho tiempo entre teclas (escritura manual lenta)
      if (timeDiff > 200) {
        // Si no es Enter, reiniciamos el buffer con la tecla actual
        if (e.key.length === 1) bufferRef.current = e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [location.pathname, navigate]);

  return null;
};

