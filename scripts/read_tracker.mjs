import xlsx from 'xlsx';

const wb = xlsx.readFile('docs/tests/Plexi_ERP_E2E_Test_Tracker.xlsx');
console.log('Sheet names:', wb.SheetNames);
for (const name of wb.SheetNames) {
  const sheet = wb.Sheets[name];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`\n--- Sheet: ${name} (rows: ${data.length}) ---`);
  console.log('Header / first 5 rows:', data.slice(0, 5));
}
