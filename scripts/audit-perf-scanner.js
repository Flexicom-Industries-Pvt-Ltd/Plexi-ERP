const fs = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (['node_modules', '.next', '.git', 'coverage', '.githooks'].includes(file)) continue;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath, fileList);
    } else {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const baseDir = path.resolve(__dirname, '..');
const srcFiles = walk(path.join(baseDir, 'src'));

console.log('=== PLEXI-ERP SOURCE SCAN ===');
console.log('Total Source Files:', srcFiles.length);

const routes = srcFiles.filter(f => f.endsWith('route.ts'));
const services = srcFiles.filter(f => f.endsWith('.service.ts'));
const actions = srcFiles.filter(f => f.includes(path.sep + 'actions' + path.sep));
const components = srcFiles.filter(f => f.endsWith('.tsx'));

console.log('API Routes:', routes.length);
console.log('Services:', services.length);
console.log('Server Actions:', actions.length);
console.log('React TSX Components:', components.length);

// 1. Prisma Query Audit
const unboundedFindMany = [];
const loopQueries = [];
const heavyIncludes = [];

for (const file of srcFiles) {
  if (file.includes('__tests__') || file.includes('.test.') || file.includes('.spec.')) continue;
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  const rel = path.relative(baseDir, file).replace(/\\/g, '/');

  // Detect loop queries (N+1)
  const loopRegex = /(?:for\s*\(|for\s+await\s*\(|\.forEach\(|\.map\(async)[^)]*\)\s*\{[^}]*await\s+db\.[a-zA-Z]+\.[a-zA-Z]+/s;
  if (loopRegex.test(content)) {
    loopQueries.push({ file: rel, type: 'Potential N+1 loop query' });
  }

  // Detect findMany without take
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('.findMany(')) {
      // Look ahead up to 25 lines for 'take:'
      const block = lines.slice(i, i + 25).join('\n');
      if (!block.includes('take:') && !block.includes('take :')) {
        unboundedFindMany.push({ file: rel, line: i + 1, text: lines[i].trim() });
      }
    }
    if (lines[i].includes('include: {')) {
      // Count depth of include
      const block = lines.slice(i, i + 30).join('\n');
      const includeCount = (block.match(/include:/g) || []).length;
      if (includeCount > 2) {
        heavyIncludes.push({ file: rel, line: i + 1, depth: includeCount });
      }
    }
  }
}

console.log('\n--- POTENTIAL QUERY BOTTLENECKS ---');
console.log('Unbounded findMany candidates:', unboundedFindMany.length);
console.log('N+1 Loop Query candidates:', loopQueries.length);
console.log('Deep relation include candidates:', heavyIncludes.length);

// Write results to JSON for baseline analysis
const output = {
  summary: {
    totalFiles: srcFiles.length,
    routes: routes.length,
    services: services.length,
    actions: actions.length,
    components: components.length,
    unboundedFindManyCount: unboundedFindMany.length,
    loopQueriesCount: loopQueries.length,
    heavyIncludesCount: heavyIncludes.length,
  },
  unboundedFindMany,
  loopQueries,
  heavyIncludes,
};

fs.writeFileSync(path.join(baseDir, 'scripts', 'scanner-results.json'), JSON.stringify(output, null, 2));
console.log('Scan results written to scripts/scanner-results.json');
