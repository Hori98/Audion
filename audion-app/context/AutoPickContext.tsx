/**
 * AutoPick Context for managing progress state across the app
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AutoPickTask {
  task_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  message: string;
  result?: any;
  error?: string;
  debug_info?: any;
}

interface AutoPickContextType {
  currentTask: AutoPickTask | null;
  isProcessing: boolean;
  startTask: (taskId: string) => void;
  updateTask: (update: Partial<AutoPickTask>) => void;
  completeTask: (result: any, debugInfo?: any) => void;
  failTask: (error: string, debugInfo?: any) => void;
  clearTask: () => void;
}

const AutoPickContext = createContext<AutoPickContextType | undefined>(undefined);

export const AutoPickProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentTask, setCurrentTask] = useState<AutoPickTask | null>(null);

  const startTask = (taskId: string) => {
    setCurrentTask({
      task_id: taskId,
      status: 'pending',
      progress: 0,
      message: 'タスクを開始しています...',
    });
  };

  const updateTask = (update: Partial<AutoPickTask>) => {
    setCurrentTask(prev => 
      prev ? { ...prev, ...update } : null
    );
  };

  const completeTask = (result: any, debugInfo?: any) => {
    setCurrentTask(prev => 
      prev ? {
        ...prev,
        status: 'completed',
        progress: 100,
        message: '完了しました',
        result,
        debug_info: debugInfo,
      } : null
    );
  };

  const failTask = (error: string, debugInfo?: any) => {
    setCurrentTask(prev => 
      prev ? {
        ...prev,
        status: 'failed',
        progress: 0,
        message: `エラー: ${error}`,
        error,
        debug_info: debugInfo,
      } : null
    );
  };

  const clearTask = () => {
    setCurrentTask(null);
  };

  const isProcessing = currentTask?.status === 'pending' || currentTask?.status === 'in_progress';

  return (
    <AutoPickContext.Provider
      value={{
        currentTask,
        isProcessing,
        startTask,
        updateTask,
        completeTask,
        failTask,
        clearTask,
      }}
    >
      {children}
    </AutoPickContext.Provider>
  );
};

export const useAutoPick = (): AutoPickContextType => {
  const context = useContext(AutoPickContext);
  if (!context) {
    throw new Error('useAutoPick must be used within an AutoPickProvider');
  }
  return context;
};