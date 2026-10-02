import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the production TypeScript modules with Vite's import.meta.env contract.
async function loadModule(path, globals = {}) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  const context = vm.createContext({ Date, Intl, Map, Set, URL, URLSearchParams, Response, ...globals });
  const module = new vm.SourceTextModule(output, { context, initializeImportMeta(meta) { meta.env = {}; } });
  await module.link(() => { throw new Error('Unexpected runtime dependency'); });
  await module.evaluate();
  return module.namespace;
}
const tools = await loadModule('../src/lib/invoice-tools.ts');
const invoice = (overrides = {}) => ({ id: '1', invoiceNumber: '2026-0001', issueDate: '2026-09-01', dueDate: '2026-10-01', createdAt: '2026-09-01T12:00:00Z', status: 'sent', total: '120.10', currency: 'CHF', customer: { name: 'Studio Zürich' }, ...overrides });

test('Only sent and overdue bills become overdue, after their due calendar day', () => {
  for (const status of ['draft', 'paid', 'cancelled']) assert.equal(tools.isLate(invoice({status}), '2026-10-02'), false);
  assert.equal(tools.isLate(invoice(), '2026-10-01'), false);
  assert.equal(tools.isLate(invoice(), '2026-10-02'), true);
  assert.equal(tools.daysUntilDue(invoice({dueDate: '2026-10-09'}), '2026-10-02'), 7);
  assert.equal(tools.isLate(invoice({dueDate: 'invalid'}), '2026-10-02'), false);
});
test('Zurich calendar dates respect midnight and daylight saving time', () => {
  assert.equal(tools.businessDate(new Date('2026-10-01T22:30:00Z')), '2026-10-02');
  assert.equal(tools.businessDate(new Date('2026-12-01T23:30:00Z')), '2026-12-02');
  assert.equal(tools.daysUntilDue(invoice({dueDate: '2026-03-30'}), '2026-03-28'), 2);
});
test('Currency totals keep CHF and EUR separate and preserve cents', () => {
  assert.equal(JSON.stringify(tools.currencyTotals([invoice({total: '0.10'}), invoice({total: '0.20'}), invoice({currency: 'EUR', total: '50.01'})])), JSON.stringify([['CHF',0.3],['EUR',50.01]]));
});
test('Search, overdue and currency filters combine without mutating the source', () => {
  const invoices = [invoice(), invoice({id: '2', currency: 'EUR'}), invoice({id:'3',status:'draft'}), invoice({id:'4',dueDate:'2026-10-09'})];
  const results = tools.filterInvoices(invoices, {search:'  ZÜRICH ',status:'late',currency:'CHF',sort:'due'}, '2026-10-02');
  assert.equal(results.length, 1); assert.equal(results[0].id, '1'); assert.equal(invoices.length, 4);
  const receivables = tools.filterInvoices(invoices, {search:'2026-0001',status:'receivable',currency:'',sort:'newest'}, '2026-10-02');
  assert.equal(receivables.length, 3);
});
test('CSV preserves unicode, quotes, line breaks, currency and neutralizes formulas', () => {
  const csv = tools.invoiceCsv([invoice({customer: {name: '=HYPERLINK("bad")\nZürich'}})], ['Number','Customer','Issue','Due','Status','Total','Currency'], () => 'Sent');
  assert.ok(csv.startsWith('\uFEFF')); assert.ok(csv.includes('"\'=HYPERLINK(""bad"")\nZürich"')); assert.ok(csv.includes('"120.1","CHF"')); assert.ok(csv.includes('\r\n'));
});
test('API unwraps invoice arrays and authentication responses and keeps the auth header', async () => {
  let options;
  let payload = {data:[invoice()]};
  const api = await loadModule('../src/lib/api.ts', {localStorage: {getItem:()=> 'test-token'}, fetch: async (_url, request) => {options=request; return new Response(JSON.stringify(payload), {headers:{'Content-Type':'application/json'}});}});
  const list = await api.api.get('/invoices'); assert.equal(list[0].invoiceNumber,'2026-0001'); assert.equal(options.headers.Authorization,'Bearer test-token');
  payload={data:{token:'new-token',user:{id:'test-user'}}};
  const login = await api.api.post('/auth/login',{email:'test@example.test'}); assert.equal(login.token,'new-token'); assert.equal(options.method,'POST');
  payload={plain:true}; assert.equal((await api.api.get('/plain')).plain,true);
});
test('API exposes errors and handles successful no-content deletes', async () => {
  let response = new Response(JSON.stringify({error:{code:'DENIED',message:'Not allowed'}}), {status:403,headers:{'Content-Type':'application/json'}});
  const api = await loadModule('../src/lib/api.ts',{localStorage:{getItem:()=>null},fetch:async()=>response});
  await assert.rejects(api.api.get('/invoices'), (error) => error.status===403 && error.code==='DENIED' && error.message==='Not allowed');
  response=new Response(null,{status:204}); assert.equal(await api.api.delete('/invoices/1'),undefined);
});
