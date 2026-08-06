import React from 'react';
import { useTaskStore } from '@/stores';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';

export const TaskProgressIndicator: React.FC = () => {
  const { tasks, removeTask, clearCompleted } = useTaskStore();
  const activeTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'error');
  const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'error');

  if (tasks.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full">
      <AnimatePresence mode="popLayout">
        {tasks.map(task => (
          <motion.div
            key={task.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`p-4 rounded-xl border shadow-lg backdrop-blur-md flex flex-col gap-2 ${
              task.status === 'error'
                ? 'bg-red-500/10 border-red-500/20'
                : 'bg-surface/90 border-subtle/50'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {task.status === 'running' && (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                )}
                {task.status === 'completed' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
                {task.status === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
                <span className="text-sm font-medium text-white truncate">{task.name}</span>
              </div>
              <button
                onClick={() => removeTask(task.id)}
                className="p-1 hover:bg-white/10 rounded-md transition-colors"
              >
                <X className="w-3.5 h-3.5 text-muted" />
              </button>
            </div>

            {task.status === 'running' && (
              <div className="w-full h-1.5 bg-elevated rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${task.progress}%` }}
                  className="h-full bg-blue-500"
                />
              </div>
            )}

            {task.error && <span className="text-xs text-red-400 line-clamp-2">{task.error}</span>}
          </motion.div>
        ))}
      </AnimatePresence>

      {completedTasks.length > 0 && activeTasks.length === 0 && (
        <button
          onClick={clearCompleted}
          className="text-xs text-muted hover:text-white transition-colors text-right px-2"
        >
          Limpiar completados
        </button>
      )}
    </div>
  );
};
