const fs = require('fs');
const path = require('path');

const webBundleDir = path.join(__dirname, '..', 'dist', '_expo', 'static', 'js', 'web');

if (!fs.existsSync(webBundleDir)) {
  process.exit(0);
}

const importMetaEnvFallback =
  /if\(void 0!==import\.meta&&import\.meta\.env&&"string"==typeof import\.meta\.env\[[^\]]+\]\)return import\.meta\.env\[[^\]]+\];/g;

for (const fileName of fs.readdirSync(webBundleDir)) {
  if (!fileName.endsWith('.js')) {
    continue;
  }

  const filePath = path.join(webBundleDir, fileName);
  const source = fs.readFileSync(filePath, 'utf8');
  const patched = source.replace(importMetaEnvFallback, '');

  if (patched !== source) {
    fs.writeFileSync(filePath, patched);
    console.log(`Patched import.meta fallback in ${fileName}`);
  }
}
