import React, { useState } from 'react';
import { FileNode } from '../types';

interface FileTreeProps {
  nodes: FileNode[];
  onSelectFile: (file: FileNode) => void;
  selectedPath?: string;
  depth?: number;
}

export const FileTree: React.FC<FileTreeProps> = ({ nodes, onSelectFile, selectedPath, depth = 0 }) => {
  return (
    <div className="select-none">
      {nodes.map((node) => (
        <FileTreeNode 
            key={node.path} 
            node={node} 
            onSelectFile={onSelectFile} 
            selectedPath={selectedPath} 
            depth={depth} 
        />
      ))}
    </div>
  );
};

const FileTreeNode: React.FC<{
  node: FileNode;
  onSelectFile: (file: FileNode) => void;
  selectedPath?: string;
  depth: number;
}> = ({ node, onSelectFile, selectedPath, depth }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const isSelected = node.path === selectedPath;
  
  const handleClick = () => {
    if (node.isFolder) {
      setIsOpen(!isOpen);
    } else {
      onSelectFile(node);
    }
  };

  return (
    <div>
      <div
        onClick={handleClick}
        className={`
            flex items-center py-1 px-2 cursor-pointer hover:bg-gray-700 transition-colors
            ${isSelected ? 'bg-blue-900 text-blue-100 border-l-2 border-blue-400' : 'text-gray-300'}
        `}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
      >
        <span className="mr-2 w-4 text-center text-sm opacity-70">
          {node.isFolder ? (
            <i className={`fas fa-folder${isOpen ? '-open' : ''} text-yellow-500`}></i>
          ) : (
             <i className="fas fa-file-code text-blue-400"></i>
          )}
        </span>
        <span className="text-sm truncate">{node.name}</span>
      </div>
      
      {node.isFolder && isOpen && node.children && (
        <FileTree 
            nodes={node.children} 
            onSelectFile={onSelectFile} 
            selectedPath={selectedPath} 
            depth={depth + 1} 
        />
      )}
    </div>
  );
};