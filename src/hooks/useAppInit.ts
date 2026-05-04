import { useState, useEffect } from 'react';
import { InitializationService, InitStep } from '@/services/initializationService';
import { initPersistence } from '@/services/backupService';

export const useAppInit = () => {
  const [bootState, setBootState] = useState<'initializing' | 'ready'>('initializing');
  const [initStep, setInitStep] = useState<InitStep>('idle');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    initPersistence();
    const authStatus = localStorage.getItem('logicount_auth') === 'true';
    setIsAuthenticated(authStatus);
    
    if (authStatus) {
      InitializationService.run((step) => {
        setInitStep(step);
        if (step === 'ready') setBootState('ready');
      });
    } else {
      setBootState('ready');
    }
  }, []);

  const handleLoginSuccess = () => setIsAuthenticated(true);

  return {
    bootState,
    initStep,
    isAuthenticated,
    handleLoginSuccess
  };
};
