import React, { useState } from 'react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, content }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl flex flex-col h-[80vh] border border-gray-700">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-900 rounded-t-lg">
          <div>
            <h2 className="text-xl font-bold text-white">Export for Gemini Chat</h2>
            <p className="text-xs text-gray-400 mt-1">Copy this prompt and paste it into the AI chat to rebuild your app.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-4 overflow-hidden bg-[#1e1e1e] relative group">
          <textarea 
            className="w-full h-full bg-transparent text-gray-300 font-mono text-xs resize-none outline-none p-2 custom-scrollbar"
            value={content}
            readOnly
          />
        </div>

        {/* Footer / Actions */}
        <div className="p-4 border-t border-gray-700 bg-gray-900 flex justify-end items-center gap-3 rounded-b-lg">
          <span className="text-xs text-gray-500 mr-auto">
            {content.length.toLocaleString()} characters generated
          </span>
          
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors"
          >
            Close
          </button>
          
          <button 
            onClick={handleCopy}
            className={`px-4 py-2 rounded text-sm font-bold flex items-center gap-2 transition-all ${
              copied 
                ? 'bg-green-600 text-white shadow-lg shadow-green-900/50' 
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/50'
            }`}
          >
            {copied ? (
              <>
                <i className="fas fa-check"></i> Copied!
              </>
            ) : (
              <>
                <i className="fas fa-copy"></i> Copy to Clipboard
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};