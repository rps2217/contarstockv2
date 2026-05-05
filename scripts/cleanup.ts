import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';

const files = globSync('src/**/*.{ts,tsx}');

for (const file of files) {
  const content = readFileSync(file, 'utf-8');
  if (content.includes('// Forced GitHub sync')) {
    const newContent = content.replace(/\/\/ Forced GitHub sync[\r\n]*/g, '');
    writeFileSync(file, newContent, 'utf-8');
  }
}
