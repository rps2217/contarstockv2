import fs from 'fs';
import path from 'path';

function walk(dir: string, callback: (filepath: string) => void) {
 const files = fs.readdirSync(dir);
 for (const file of files) {
 const filepath = path.join(dir, file);
 const stat = fs.statSync(filepath);
 if (stat.isDirectory()) {
 if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
 walk(filepath, callback);
 }
 } else if (filepath.endsWith('.tsx') || filepath.endsWith('.ts')) {
 callback(filepath);
 }
 }
}

walk('.', (filepath) => {
 let content = fs.readFileSync(filepath, 'utf8');
 const original = content;
 // Replace -[something] or 
 content = content.replace(/(-\w+)?(\[\w+\])?/g, '');
 // Clean up double spaces that might be left
 content = content.replace(/ +/g, ' ');
 if (content !== original) {
 fs.writeFileSync(filepath, content, 'utf8');
 console.log(`Updated ${filepath}`);
 }
});
