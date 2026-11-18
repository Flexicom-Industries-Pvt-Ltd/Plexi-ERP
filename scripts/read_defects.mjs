import xlsx from 'xlsx';

const wb = xlsx.readFile('docs/tests/Plexi_ERP_E2E_Test_Tracker.xlsx');
const sheet = wb.Sheets['Defect_Log'];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
for (let i = 3; i < data.length; i++) {
  if (data[i] && data[i][0]) {
    console.log(`${data[i][0]} | ${data[i][1]} | ${data[i][2]} | ${data[i][3]} | ${data[i][5]} | ${data[i][7]}`);
  }
}
