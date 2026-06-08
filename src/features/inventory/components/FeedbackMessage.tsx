import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface FeedbackMessageProps {
  feedback: { type: 'success' | 'error'; msg: string } | null;
}

export const FeedbackMessage: React.FC<FeedbackMessageProps> = ({ feedback }) => {
  if (!feedback) return null;

  return (
    <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-xl flex items-center gap-2 animate-in slide-in-from-top-4 fade-in duration-300 font-bold text-sm ${feedback.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
      {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
      {feedback.msg}
    </div>
  );
};
