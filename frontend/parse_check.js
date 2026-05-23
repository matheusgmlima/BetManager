const parser = require('@babel/parser');
const fs = require('fs');
const file = process.argv[2];
try {
  const code = fs.readFileSync(file, 'utf8');
  parser.parse(code, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
  console.log('OK: ' + file);
} catch(e) {
  console.log('ERR: ' + file + ' | ' + e.message);
  process.exit(1);
}
