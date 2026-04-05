import fs from 'fs';
import path from 'path';

function walkDir(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (!content.includes('// Forced GitHub sync')) {
        fs.writeFileSync(fullPath, content + '\n// Forced GitHub sync\n');
        console.log(`Modified: ${fullPath}`);
      }
    }
  }
}

walkDir('./src');
console.log('Done!');
