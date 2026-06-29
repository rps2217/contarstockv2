import React from 'react';
import { motion } from 'framer-motion';
import { Database, Loader2 } from 'lucide-react';

interface DbLoaderProps {
  message?: string;
}

export const DbLoader: React.FC<DbLoaderProps> = ({ 
  message = 'Inicializando base de datos...' 
}) => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-base">
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-500/10 via-transparent to-transparent"
        />
      </div>
      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-20 h-20 rounded-3xl bg-blue-600 flex items-center justify-center mb-6 shadow-xl shadow-blue-900/30"
        >
          <Database className="w-10 h-10 text-white" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <h2 className="text-2xl font-bold text-primary mb-2">ContarStock</h2>
          <div className="flex items-center gap-2 text-secondary">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">{message}</span>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: 200 }}
          transition={{ delay: 0.4 }}
          className="mt-6 h-1 bg-subtle rounded-full overflow-hidden"
        >
          <motion.div
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="h-full w-1/2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
          />
        </motion.div>
      </div>
    </div>
  );
};

export const DbError: React.FC<{ error?: Error; onRetry?: () => void }> = ({ 
  error, 
  onRetry 
}) => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-base p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-6">
          <Database className="w-10 h-10 text-rose-500" />
        </div>
        <h2 className="text-xl font-bold text-primary mb-2">Error de Base de Datos</h2>
        <p className="text-secondary text-sm mb-6">
          {error?.message || 'No se pudo inicializar la base de datos local.'}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors"
          >
            Reintentar
          </button>
        )}
      </div>
    </div>
  );
};
