import { useState, useEffect } from 'react';
import { localBrain } from '../../../services/localBrain';
import { VectorService } from '../../../services/vectorService';

export const useProductAI = (showFeedback: (type: 'success' | 'error', msg: string) => void) => {
  const [brainStatus, setBrainStatus] = useState({ status: 'idle', progress: 0, details: '' });
  const [isVectorizing, setIsVectorizing] = useState(false);
  const [vectorProgress, setVectorProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    const unsubscribe = localBrain.subscribe((status, progress, details) => {
      setBrainStatus({ status, progress, details: details || '' });
    });
    return () => { unsubscribe(); };
  }, []);

  const handleInitializeBrain = async () => {
    try {
      await localBrain.init();
    } catch (e) {
      showFeedback('error', 'Error al descargar motor IA');
    }
  };

  const handleVectorize = async () => {
    if (brainStatus.status === 'disabled') {
      showFeedback('error', 'Modo Bajo Rendimiento Activo');
      return;
    }
    if (brainStatus.status !== 'ready') {
      showFeedback('error', 'Instale el motor IA primero');
      return;
    }
    setIsVectorizing(true);
    try {
      await VectorService.vectorizeMissingProducts((current, total) => {
        setVectorProgress({ current, total });
      });
      showFeedback('success', 'Entrenamiento completo');
    } catch (e) {
      showFeedback('error', 'Fallo en motor neural');
    } finally {
      setIsVectorizing(false);
    }
  };

  return {
    brainStatus,
    isVectorizing,
    vectorProgress,
    handleInitializeBrain,
    handleVectorize
  };
};
