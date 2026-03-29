const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  let entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    let srcPath = path.join(src, entry.name);
    let destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log('Copied', srcPath, 'to', destPath);
    }
  }
}

copyDir('features/expiry-module', 'features/expiry-feature');
copyDir('features/events-module', 'features/events-feature');
console.log('Done copying.');
