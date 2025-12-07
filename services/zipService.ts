import JSZip from 'jszip';
import { FileNode } from '../types';

export const processZipFile = async (file: File): Promise<FileNode[]> => {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(file);
  const fileMap: { [key: string]: FileNode } = {};
  const rootNodes: FileNode[] = [];

  // 1. Create nodes for all files
  const filePromises: Promise<void>[] = [];

  loadedZip.forEach((relativePath, zipEntry) => {
    filePromises.push(
      (async () => {
        // Skip hidden files or __MACOSX
        if (relativePath.startsWith('__MACOSX') || relativePath.includes('/.')) {
          return;
        }

        const node: FileNode = {
          name: relativePath.split('/').filter(p => p).pop() || relativePath,
          path: relativePath,
          isFolder: zipEntry.dir,
          children: zipEntry.dir ? [] : undefined,
        };

        if (!zipEntry.dir) {
          try {
            // Attempt to read as text. If binary (images), we might skip or handle differently
            // For this demo, we assume code files.
            const content = await zipEntry.async('string');
            node.content = content;
          } catch (e) {
            console.warn(`Could not read text for ${relativePath}`, e);
            node.content = "// [Binary content or unreadable]";
          }
        }

        fileMap[relativePath] = node;
      })()
    );
  });

  await Promise.all(filePromises);

  // 2. Build the tree structure
  Object.keys(fileMap).forEach((path) => {
    const node = fileMap[path];
    const parts = path.split('/').filter((p) => p);
    
    // If it's a folder, path ends in /, so split might leave empty string
    // Standardize logic: 
    // "src/components/Button.tsx" -> Parent is "src/components/"
    // "src/" -> Parent is "" (root)

    let parentPath = '';
    
    if (path.endsWith('/')) {
        // It is a directory, remove the last slash and the dir name to find parent
        // e.g. src/components/ -> parent is src/
        const segments = path.split('/').filter(p => p);
        segments.pop(); // remove current dir name
        if (segments.length > 0) {
            parentPath = segments.join('/') + '/';
        }
    } else {
        // It is a file
        const segments = path.split('/');
        segments.pop(); // remove file name
        if (segments.length > 0) {
             parentPath = segments.join('/') + '/';
        }
    }
    
    if (parentPath && fileMap[parentPath]) {
      fileMap[parentPath].children?.push(node);
      node.parent = fileMap[parentPath];
    } else {
      rootNodes.push(node);
    }
  });

  // Sort nodes: Folders first, then files, alphabetical
  const sortNodes = (nodes: FileNode[]) => {
    nodes.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach(n => {
        if (n.children) sortNodes(n.children);
    });
  };

  sortNodes(rootNodes);

  return rootNodes;
};