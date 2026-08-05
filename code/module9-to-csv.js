const fs = require('fs');
const d = JSON.parse(fs.readFileSync('C:/Users/User/Downloads/module-9-output-bundles.json', 'utf8'));

const stageNames = {
  'cd731ab3-ef71-4889-ad1b-4990da46eefd': 'On Hold',
  'a4161b5f-9c79-4883-82fd-80efb6cb09e8': 'Sent to Property Team',
  'eb93cb17-3ff1-49ed-83c3-d81d37510d1e': 'Buyer Brief Scheduled',
  '1231b977-0f9c-4120-9f7e-631cb5111a6a': 'Buyer Brief sent for signature',
  '5178d032-35d5-4b8e-8694-48a1afb0145a': '$300k-$400k | PERSONAL',
  '09e08409-928f-4a37-89a0-9b8b20fb58dc': '$300k-$400k | SMSF',
  '1ab3d6d1-e7cb-44c2-89ae-c32c663a4c92': '$400k-$500k | PERSONAL',
  '3dbb7880-05d1-4430-9c5f-f0bb97ac0c81': '$400k-$500k | SMSF',
  '25e97d2a-5001-4107-9764-4d39bf1ead00': '$500k-$600k | PERSONAL',
  '45c37207-8210-4e9d-b943-7eb5bf17c75a': '$500k-$600k | SMSF',
  'c050aa00-cf8a-44fe-be16-d0dc3069dd3b': '$600k-$700k | PERSONAL',
  '02656e9e-d8eb-4267-a3fc-8fe91a8b9cc7': '$600k-$700k | SMSF',
  'cef16f11-457a-4192-9ba2-c7a9f88b68d3': '$700k-$800k | PERSONAL',
  'edd71d3e-11f5-4de5-8546-21b0595be9cd': '$700k-$800k | SMSF',
  '5aaeb8c3-4680-438f-b545-21e5b9e92582': '$800k+ | PERSONAL',
  'f66556a2-08bc-4731-a5f1-161838e85487': '$800k+ | SMSF',
  'c25bab49-3841-42ca-a6b0-7db6f730b788': 'EOI / Under Negotiation',
  '62298717-2f72-4159-85ce-ddacbb5d7b9d': 'Deal Accepted',
  'eea0bb53-0172-414b-9883-dc96a3fae6a1': 'Contracts Issued | HOLD-WIP',
  '02775ef3-8b84-468f-8a4e-28655265d4f8': 'Contracts Issued | Finalised',
};

const cfLabels = {
  'PlNx1851lV5PSAotT4FT': 'Registered Address',
  'NXqFwEzo28k6lOkbyT5N': 'Assigned BA',
  'QOoYpW6A8G1Jk8xWs7h1': 'Solicitor Name',
  '5rgUZN6RJ0jC90eiH7ie': 'Agent/Builder Details',
  'V62a5vivXnAKQ4pwKajt': 'Property Entity Type',
  'EbDMmXJTBxkkWFBDChy5': 'TRUST Name',
  '5MeAFf0G7MwIuYKdPA7L': 'Preferred Name',
  '80Pulu9pcLddehLTDbux': 'Pipeline Stage',
  'bQ7bndudaNLmlLkYeDpG': 'Solicitor Company',
  'UgtJu3I87HQLVdt918BZ': 'PM Details',
  'SQwuifVkGaYglkBUGseP': 'Property Manager',
  'VBQfmOaYOGj4JwiiRWGh': 'Rent Per Week',
  '7K332cn6Z3MHFcZeXQVy': 'Value',
  'A0k1s96skC3NPTt3p1bK': 'Price',
  'YlibNITZMTN5lvdNJhyc': 'Purchase Price',
  '7uiohiqscNxUqcWtSqZD': 'Formal Loan Amount',
  'KpxtSsE1JT2Hgo8gSkvF': 'Partner Address',
  'ZL5nvIr4c8sznqZ298Hc': 'Sale Type',
};

const INCLUDED = new Set([
  '5178d032-35d5-4b8e-8694-48a1afb0145a','09e08409-928f-4a37-89a0-9b8b20fb58dc',
  '1ab3d6d1-e7cb-44c2-89ae-c32c663a4c92','3dbb7880-05d1-4430-9c5f-f0bb97ac0c81',
  '25e97d2a-5001-4107-9764-4d39bf1ead00','45c37207-8210-4e9d-b943-7eb5bf17c75a',
  'c050aa00-cf8a-44fe-be16-d0dc3069dd3b','02656e9e-d8eb-4267-a3fc-8fe91a8b9cc7',
  'cef16f11-457a-4192-9ba2-c7a9f88b68d3','edd71d3e-11f5-4de5-8546-21b0595be9cd',
  '5aaeb8c3-4680-438f-b545-21e5b9e92582','f66556a2-08bc-4731-a5f1-161838e85487',
]);

function esc(v) {
  const s = String(v || '').replace(/\r?\n/g, ' ').replace(/"/g, '""');
  return '"' + s + '"';
}

const headers = ['#','Name','Status','Stage','Passes Filter','Assigned To (ID)','Assigned BA','Registered Address','Property Entity Type','Sale Type','Created','Updated'];

const rows = d.map((r, i) => {
  const cf = {};
  if (r.customFields) {
    r.customFields.forEach(f => {
      const label = cfLabels[f.id] || f.id;
      cf[label] = f.fieldValueString || (f.fieldValue != null ? String(f.fieldValue) : '');
    });
  }
  return [
    i + 1,
    r.name || '',
    r.status || '',
    stageNames[r.pipelineStageId] || r.pipelineStageId,
    INCLUDED.has(r.pipelineStageId) ? 'YES' : 'NO',
    r.assignedTo || '',
    cf['Assigned BA'] || '',
    cf['Registered Address'] || '',
    cf['Property Entity Type'] || '',
    cf['Sale Type'] || '',
    r.createdAt ? r.createdAt.split('T')[0] : '',
    r.updatedAt ? r.updatedAt.split('T')[0] : '',
  ];
});

const csv = [headers.join(','), ...rows.map(r => r.map(esc).join(','))].join('\n');
const outPath = 'C:/Users/User/Downloads/module-9-all-records.csv';
fs.writeFileSync(outPath, csv);
console.log('Written ' + rows.length + ' rows to ' + outPath);
