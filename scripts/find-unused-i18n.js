const fs = require('fs');
const path = require('path');
const root = process.cwd();
const enPath = path.join(root, 'src', 'i18n', 'en.json');
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
function collectKeys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === 'object' && !Array.isArray(v) ? collectKeys(v, key) : [key];
  });
}
const allKeys = collectKeys(en);
const files = [];
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full);
    else if (/\.(ts|tsx|js|jsx)$/.test(name)) files.push(full);
  }
}
walk(path.join(root, 'src'));
const content = files.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
function isUsed(key) {
  const patterns = [
    `t(\"${key}\")`,
    `t(\'${key}\')`,
    `t(\`${key}\`)`,
    `translate(\"${key}\")`,
    `translate(\'${key}\')`,
  ];
  return patterns.some((p) => content.includes(p));
}
const unused = allKeys.filter((key) => !isUsed(key));
console.log(`total keys ${allKeys.length}`);
console.log(`unused keys ${unused.length}`);
console.log(unused.join('\n'));
