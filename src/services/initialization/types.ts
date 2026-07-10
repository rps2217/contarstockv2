/**
 * Initialization Types - Tipos para el sistema de inicialización
 */

export type InitStep = 
  | 'idle' 
  | 'version_check' 
  | 'config' 
  | 'database' 
  | 'ready' 
  | 'offline' 
  | 'purging' 
  | 'migrating';

export type InitStepCallback = (step: InitStep) => void;

export interface InitContext {
  step: InitStep;
  progress: number;
  error?: Error;
  canRetry: boolean;
  metadata?: Record<string, unknown>;
}

export interface InitTask {
  name: string;
  execute: () => Promise<void>;
  onProgress?: (message: string) => void;
}

export interface InitResult {
  success: boolean;
  step: InitStep;
  error?: Error;
  duration: number;
}

export const CURRENT_APP_VERSION = "5.8.1";
