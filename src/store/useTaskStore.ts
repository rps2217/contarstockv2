import { create } from 'zustand';

export interface Task {
  id: string;
  name: string;
  progress: number; // 0 to 100
  status: 'pending' | 'running' | 'completed' | 'error';
  error?: string;
}

interface TaskStore {
  tasks: Task[];
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;
  clearCompleted: () => void;
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: [],
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  updateTask: (id, updates) => set((state) => ({
    tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
  })),
  removeTask: (id) => set((state) => ({
    tasks: state.tasks.filter((t) => t.id !== id),
  })),
  clearCompleted: () => set((state) => ({
    tasks: state.tasks.filter((t) => t.status !== 'completed'),
  })),
}));
