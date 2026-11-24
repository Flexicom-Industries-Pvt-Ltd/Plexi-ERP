const fs = require('fs');
const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

const modelRegex = /model\s+([A-Za-z0-9_]+)\s+\{([\s\S]*?)\}/g;
let match;
const models = [];

while ((match = modelRegex.exec(schema)) !== null) {
  const modelName = match[1];
  const body = match[2];
  const fields = [];
  const indexes = [];
  const foreignKeys = [];

  const lines = body.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('@@index(') || trimmed.startsWith('@@unique(')) {
      indexes.push(trimmed);
    } else if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('@@')) {
      const parts = trimmed.split(/\s+/);
      const fieldName = parts[0];
      const fieldType = parts[1];
      fields.push({ fieldName, fieldType });
      if (
        (fieldName.endsWith('Id') || fieldName.endsWith('Code') || fieldName === 'status' || fieldName === 'date' || fieldName === 'timestamp') &&
        fieldName !== 'id'
      ) {
        foreignKeys.push(fieldName);
      }
    }
  }
  models.push({ modelName, fieldsCount: fields.length, foreignKeys, indexes });
}

console.log('Total Prisma Models:', models.length);

const unindexedColumns = [];
for (const m of models) {
  const indexStr = m.indexes.join(' ');
  for (const fk of m.foreignKeys) {
    // Check if field has @unique or @id inline or in @@index/@@unique
    const hasInline = schema.includes(`${fk} `) && schema.includes('@unique');
    if (!indexStr.includes(fk)) {
      unindexedColumns.push({ model: m.modelName, column: fk });
    }
  }
}

console.log('Potentially Unindexed Foreign Keys / Filter Columns:', unindexedColumns.length);
console.log(JSON.stringify(unindexedColumns.slice(0, 30), null, 2));

fs.writeFileSync('scripts/schema-index-results.json', JSON.stringify({ models, unindexedColumns }, null, 2));
