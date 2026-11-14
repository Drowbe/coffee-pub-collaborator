#!/usr/bin/env node
/*
 * check-roadmap-board-sync.mjs -- tools/roadmap-board-sync.mjs run against a local stub GraphQL server
 * (no network, no token): checked against a stub only, never against the real GitHub project.
 *   - a missing field is created with the CSV's options, and the "Target date" field too;
 *   - a field that exists but lacks an option is reported by name, not recreated, and the run fails;
 *   - an issue not on the board is added; a field is set only where the value differs (a second run changes nothing);
 *   - closed issues, pull requests and numbers that do not exist are skipped;
 *   - --dry-run sends no mutation at all;
 *   - a missing token, owner or number ends green with a notice and sends nothing;
 *   - a CSV with a bad row is refused with one plain sentence and nothing is sent;
 *   - hostile: CSV text never appears in a query, only the three fields are ever written, nothing is deleted,
 *     Status is untouched, and the token is in no output and no step summary.
 * The committed .github/roadmap-board.csv is also read and checked.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readRows } from './roadmap-board-sync.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = path.join(ROOT, 'tools/roadmap-board-sync.mjs');
const TOKEN = 'ghp_TESTTOKEN_do_not_print_0123456789';
const REPO = 'o/r';
const TMP = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'roadmap-check-'));

let n = 0;
let failed = 0;
const test = async (name, fn) => {
  try { await fn(); n += 1; console.log(`ok   ${name}`); } catch (err) { failed += 1; console.log(`FAIL ${name}\n     ${err.message.split('\n').join('\n     ')}`); }
};

// ---- the stub --------------------------------------------------------------------------------------------
function makeState({ withFields = false, phaseMissing = null } = {}) {
  let id = 0;
  const next = (p) => `${p}${(id += 1)}`;
  const st = {
    next, requests: [], mutations: [], tokens: new Set(), titleLeaks: 0,
    fields: [
      { id: 'F_status', name: 'Status', dataType: 'SINGLE_SELECT', options: [{ id: 'S1', name: 'Now' }, { id: 'S2', name: 'Done' }] },
      { id: 'F_notes', name: 'Notes', dataType: 'TEXT' },
    ],
    items: [],
    issues: { 1: 'OPEN', 2: 'OPEN', 3: 'OPEN', 4: 'CLOSED', 5: 'PR' },
    values: {}, // itemId -> { fieldId: optionId }
  };
  const addSelect = (name, names) => {
    const f = { id: next('F_'), name, dataType: 'SINGLE_SELECT', options: names.map((o) => ({ id: next('O_'), name: o })) };
    st.fields.push(f);
    return f;
  };
  if (withFields) {
    const area = addSelect('Area', ['Home', 'Planner', 'Server']);
    const rel = addSelect('Release status', ['Gating (proposed)', 'Not gating (proposed)']);
    const phase = addSelect('Phase', ['1 Before', '2 After'].filter((p) => p !== phaseMissing));
    st.fields.push({ id: 'F_target', name: 'Target date', dataType: 'DATE' });
    const opt = (f, name) => f.options.find((o) => o.name === name)?.id;
    // issue 1 is on the board and already matches; issue 2 is on it with a different Area.
    st.items.push({ id: 'I1', number: 1 }, { id: 'I2', number: 2 });
    st.values.I1 = { [area.id]: opt(area, 'Home'), [rel.id]: opt(rel, 'Gating (proposed)'), [phase.id]: opt(phase, '1 Before'), F_status: 'S1' };
    st.values.I2 = { [area.id]: opt(area, 'Server'), [rel.id]: opt(rel, 'Gating (proposed)'), [phase.id]: opt(phase, '1 Before'), F_status: 'S1' };
  }
  return st;
}

const fieldNode = (f) => ({ id: f.id, name: f.name, dataType: f.dataType, ...(f.options ? { options: f.options } : {}) });

function handle(st, query, v) {
  const q = query.replace(/\s+/g, ' ');
  if (q.includes('createProjectV2Field')) {
    st.mutations.push({ op: 'createField', name: v.name, kind: q.includes('SINGLE_SELECT') ? 'select' : 'date' });
    const f = q.includes('SINGLE_SELECT')
      ? { id: st.next('F_'), name: v.name, dataType: 'SINGLE_SELECT', options: v.options.map((o) => ({ id: st.next('O_'), name: o.name })) }
      : { id: st.next('F_'), name: v.name, dataType: 'DATE' };
    st.fields.push(f);
    return { createProjectV2Field: { projectV2Field: fieldNode(f) } };
  }
  if (q.includes('addProjectV2ItemById')) {
    st.mutations.push({ op: 'addItem', content: v.content });
    const number = Number(String(v.content).replace('N_', ''));
    const item = { id: st.next('I'), number };
    st.items.push(item);
    st.values[item.id] = {};
    return { addProjectV2ItemById: { item: { id: item.id } } };
  }
  if (q.includes('updateProjectV2ItemFieldValue')) {
    st.mutations.push({ op: 'setValue', item: v.item, field: v.field, option: v.option });
    st.values[v.item] ||= {};
    st.values[v.item][v.field] = v.option;
    return { updateProjectV2ItemFieldValue: { projectV2Item: { id: v.item } } };
  }
  if (q.includes('projectV2(number')) {
    if (v.owner !== 'owner') return { user: null };
    return { user: { projectV2: { id: 'P1', title: 'Roadmap', fields: { nodes: st.fields.map(fieldNode) } } } };
  }
  if (q.includes('items(first')) {
    const nodes = st.items.map((it) => {
      const val = st.values[it.id] || {};
      const by = (name) => { const f = st.fields.find((x) => x.name === name); return f && val[f.id] ? { optionId: val[f.id] } : null; };
      return { id: it.id, content: { number: it.number, repository: { nameWithOwner: REPO } }, area: by(v.f1), release: by(v.f2), phase: by(v.f3) };
    });
    // another repository's issue 1 on the same board must not be mistaken for ours
    nodes.push({ id: 'IX', content: { number: 3, repository: { nameWithOwner: 'x/y' } }, area: null, release: null, phase: null });
    return { node: { items: { pageInfo: { hasNextPage: false, endCursor: null }, nodes } } };
  }
  if (q.includes('issues(first')) {
    const nodes = Object.entries(st.issues).filter(([, s]) => s === 'OPEN').map(([num]) => ({ id: `N_${num}`, number: Number(num) }));
    return { repository: { issues: { pageInfo: { hasNextPage: false, endCursor: null }, nodes } } };
  }
  if (q.includes('issueOrPullRequest')) {
    const s = st.issues[v.number];
    if (!s) return { __errors: [{ type: 'NOT_FOUND', message: 'Could not resolve to an issue or pull request.' }], repository: { issueOrPullRequest: null } };
    return { repository: { issueOrPullRequest: s === 'PR' ? { __typename: 'PullRequest' } : { __typename: 'Issue', state: s } } };
  }
  throw new Error(`stub: unknown query ${q.slice(0, 60)}`);
}

async function withStub(st, fn) {
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      st.tokens.add(req.headers.authorization);
      const { query, variables } = JSON.parse(body);
      st.requests.push({ query, variables });
      if (/delete|DROP/i.test(query)) st.titleLeaks += 1;
      if (st.forbid && /^\s*mutation/.test(query)) { st.attempts = (st.attempts || 0) + 1; res.statusCode = 403; res.end(); return; }
      let out;
      try {
        const data = handle(st, query, variables || {});
        const errors = data.__errors;
        delete data.__errors;
        out = errors ? { data, errors } : { data };
      } catch (err) { out = { errors: [{ message: err.message }] }; }
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(out));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  try { return await fn(`http://127.0.0.1:${server.address().port}/graphql`); } finally { server.close(); }
}

function runSync(url, { args = [], env = {}, csv } ) {
  const summaryFile = path.join(TMP, `summary-${Math.random().toString(36).slice(2)}.md`);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [SCRIPT, ...args, '--csv', csv], {
      env: {
        PATH: process.env.PATH, TMPDIR: TMP,
        PROJECT_TOKEN: TOKEN, PROJECT_OWNER: 'owner', PROJECT_NUMBER: '8', GITHUB_REPOSITORY: REPO,
        ROADMAP_MUTATION_DELAY_MS: '0', GITHUB_GRAPHQL_URL: url, GITHUB_STEP_SUMMARY: summaryFile, ...env,
      },
    });
    let out = '';
    child.stdout.on('data', (c) => { out += c; });
    child.stderr.on('data', (c) => { out += c; });
    child.on('close', (code) => resolve({ code, out, summary: fs.existsSync(summaryFile) ? fs.readFileSync(summaryFile, 'utf8') : '' }));
  });
}

const HEAD = 'Issue,URL,Area,Title,Release status,Phase\n';
const url = (i) => `https://github.com/${REPO}/issues/${i}`;
const GOOD = HEAD + [
  `1,${url(1)},Home,one,Gating (proposed),1 Before`,
  `2,${url(2)},Planner,"two, with ""quotes"" and\na line break",Gating (proposed),1 Before`,
  `3,${url(3)},Server,"three"") { delete } mutation { x",Not gating (proposed),2 After`,
  `4,${url(4)},Home,closed,Gating (proposed),1 Before`,
  `5,${url(5)},Home,a pull request,Gating (proposed),1 Before`,
  `6,${url(6)},Home,does not exist,Gating (proposed),1 Before`,
].join('\n') + '\n';
const csvFile = (name, text) => { const f = path.join(TMP, name); fs.writeFileSync(f, text); return f; };
const good = csvFile('good.csv', GOOD);
const writes = (st) => st.mutations.filter((m) => m.op === 'setValue');
const fid = (st, name) => st.fields.find((f) => f.name === name)?.id;

// ---- the cases -------------------------------------------------------------------------------------------
await test('the committed roadmap CSV is valid', () => {
  const rows = readRows(fs.readFileSync(path.join(ROOT, '.github/roadmap-board.csv'), 'utf8'), 'x');
  assert.ok(rows.length > 100);
});

await test('missing fields are created with the CSV options, issues added, values set, the rest skipped', async () => {
  const st = makeState();
  await withStub(st, async (u) => {
    const r = await runSync(u, { csv: good });
    assert.equal(r.code, 0, r.out);
    const made = st.mutations.filter((m) => m.op === 'createField').map((m) => `${m.kind}:${m.name}`).sort();
    assert.deepEqual(made, ['date:Target date', 'select:Area', 'select:Phase', 'select:Release status']);
    assert.deepEqual(st.fields.find((f) => f.name === 'Area').options.map((o) => o.name), ['Home', 'Planner', 'Server']);
    assert.deepEqual(st.fields.find((f) => f.name === 'Phase').options.map((o) => o.name), ['1 Before', '2 After']);
    assert.deepEqual(st.mutations.filter((m) => m.op === 'addItem').map((m) => m.content).sort(), ['N_1', 'N_2', 'N_3']);
    assert.equal(writes(st).length, 9); // 3 issues x 3 fields
    assert.match(r.out, /#4 skipped: it is closed/);
    assert.match(r.out, /#5 skipped: it is a pull request/);
    assert.match(r.out, /#6 skipped: it does not exist/);
    assert.match(r.out, /3 added, 3 changed, 0 unchanged, 3 skipped, 0 failed/);
    // a second run finds everything in place
    st.mutations.length = 0;
    const again = await runSync(u, { csv: good });
    assert.equal(again.code, 0, again.out);
    assert.equal(st.mutations.length, 0, JSON.stringify(st.mutations));
    assert.match(again.out, /0 added, 0 changed, 3 unchanged, 3 skipped, 0 failed/);
  });
});

await test('existing fields: a value is set only where it differs; Status and other fields are never written', async () => {
  const st = makeState({ withFields: true });
  await withStub(st, async (u) => {
    const r = await runSync(u, { csv: good });
    assert.equal(r.code, 0, r.out);
    assert.equal(st.mutations.filter((m) => m.op === 'createField').length, 0);
    const w = writes(st);
    // issue 2 only the Area (Server -> Planner); issue 3 all three (new card); issue 1 nothing
    assert.equal(w.filter((m) => m.item === 'I1').length, 0);
    assert.deepEqual(w.filter((m) => m.item === 'I2').map((m) => m.field), [fid(st, 'Area')]);
    assert.equal(w.filter((m) => m.item !== 'I1' && m.item !== 'I2').length, 3);
    const ours = new Set([fid(st, 'Area'), fid(st, 'Release status'), fid(st, 'Phase')]);
    assert.ok(w.every((m) => ours.has(m.field)), 'a field that is not ours was written');
    assert.equal(st.values.I2.F_status, 'S1');
    assert.match(r.out, /1 added, 2 changed, 1 unchanged, 3 skipped, 0 failed/);
  });
});

await test('a missing option is reported by field and option, the field is not recreated, the run fails', async () => {
  const st = makeState({ withFields: true, phaseMissing: '2 After' });
  const before = st.fields.length;
  await withStub(st, async (u) => {
    const r = await runSync(u, { csv: good });
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /Field "Phase" is missing option\(s\) "2 After"\. The field was not recreated/);
    assert.equal(st.mutations.filter((m) => m.op === 'createField').length, 0);
    assert.equal(st.fields.length, before);
    assert.ok(st.fields.some((f) => f.name === 'Phase'));
    // the other fields of the issue are still set
    assert.ok(writes(st).length > 0);
    assert.ok(writes(st).every((m) => m.field !== fid(st, 'Phase') || st.fields.find((f) => f.name === 'Phase').options.some((o) => o.id === m.option)));
  });
});

await test('a field of the wrong type fails and is not touched', async () => {
  const st = makeState();
  st.fields.push({ id: 'F_bad', name: 'Area', dataType: 'TEXT' });
  await withStub(st, async (u) => {
    const r = await runSync(u, { csv: good });
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /Field "Area" exists but is not a single-select field/);
    assert.ok(!st.mutations.some((m) => m.op === 'createField' && m.name === 'Area'));
  });
});

await test('--dry-run sends no mutation and says what it would do', async () => {
  const st = makeState();
  await withStub(st, async (u) => {
    const r = await runSync(u, { csv: good, args: ['--dry-run'] });
    assert.equal(r.code, 0, r.out);
    assert.equal(st.mutations.length, 0, JSON.stringify(st.mutations));
    assert.match(r.out, /Would create field "Area"/);
    assert.match(r.out, /#3 ok: would be added to the board/);
    assert.match(r.out, /\(dry run\)/);
  });
  const st2 = makeState({ withFields: true });
  await withStub(st2, async (u) => {
    const r = await runSync(u, { csv: good, args: ['--dry-run'] });
    assert.equal(r.code, 0, r.out);
    assert.equal(st2.mutations.length, 0);
    assert.match(r.out, /would set Area to "Planner"/);
  });
});

await test('a missing token, owner or number ends green with a notice and sends nothing', async () => {
  for (const [env, word] of [[{ PROJECT_TOKEN: '' }, 'PROJECT_TOKEN'], [{ PROJECT_OWNER: '' }, 'PROJECT_OWNER'], [{ PROJECT_NUMBER: '' }, 'PROJECT_NUMBER']]) {
    const st = makeState();
    await withStub(st, async (u) => {
      const r = await runSync(u, { csv: good, env });
      assert.equal(r.code, 0, r.out);
      assert.match(r.out, new RegExp(`^::notice::The project board is not set up for this repository \\(missing .*${word}`, 'm'));
      assert.equal(st.requests.length, 0);
    });
  }
});

await test('a CSV with a bad row is refused with one plain sentence and nothing is sent', async () => {
  const cases = [
    [`${HEAD}x1,${url(1)},Home,t,Gating (proposed),1 Before\n`, /Row 2 of the roadmap CSV: Issue must be a whole number/],
    [`${HEAD}1,${url(1)},Home,t,Gating (proposed)\n`, /Row 2 of the roadmap CSV has 5 columns, but it needs 6/],
    [`${HEAD}1,${url(2)},Home,t,Gating (proposed),1 Before\n`, /Row 2 of the roadmap CSV: URL must be the link of issue #1/],
    [`${HEAD}1,${url(1)},,t,Gating (proposed),1 Before\n`, /Row 2 of the roadmap CSV: Area is empty/],
    [`${HEAD}1,${url(1)},Home,t,Gating (proposed),1 Before\n1,${url(1)},Home,t,Gating (proposed),1 Before\n`, /Row 3 of the roadmap CSV: issue #1 is listed twice/],
    [`Issue,URL,Area\n1,${url(1)},Home\n`, /must start with the columns/],
    [`${HEAD}1,${url(1)},"Home,t,Gating (proposed),1 Before\n`, /quote that is never closed/],
    [`${HEAD}`, /has no rows/],
  ];
  for (const [text, re] of cases) {
    const st = makeState();
    await withStub(st, async (u) => {
      const r = await runSync(u, { csv: csvFile('bad.csv', text) });
      assert.equal(r.code, 1, r.out);
      assert.match(r.out, re);
      assert.match(r.out, /Nothing was changed\./);
      assert.equal(st.requests.length, 0);
    });
  }
});

await test('hostile: CSV text never reaches a query, nothing is deleted, the token is never printed', async () => {
  const st = makeState();
  await withStub(st, async (u) => {
    const r = await runSync(u, { csv: good });
    assert.equal(r.code, 0, r.out);
    assert.equal(st.titleLeaks, 0);
    for (const req of st.requests) {
      assert.ok(!req.query.includes('delete }') && !/\bdelete[A-Z]/.test(req.query), 'a delete mutation was sent');
      assert.ok(!JSON.stringify(req.variables).includes('delete }'), 'the title was sent');
    }
    assert.deepEqual([...st.tokens], [`Bearer ${TOKEN}`]);
    assert.ok(!r.out.includes(TOKEN) && !r.summary.includes(TOKEN));
    assert.ok(r.summary.includes('Roadmap sync'));
  });
  // a failing API: the error text never carries the token and the run fails without a delete
  const bad = makeState();
  await withStub(bad, async (u) => {
    const r = await runSync(u, { csv: good, env: { PROJECT_OWNER: 'nobody' } });
    assert.equal(r.code, 1);
    assert.ok(!r.out.includes(TOKEN));
    assert.match(r.out, /Project 8 of user nobody was not found/);
  });
  const src = fs.readFileSync(SCRIPT, 'utf8');
  assert.ok(!/\bdelete[A-Z]\w*\s*\(/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')), 'the script holds a delete mutation');
  const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/project-roadmap-sync.yml'), 'utf8');
  assert.match(wf, /permissions:\n {2}contents: read\n {2}issues: read\n/);
  assert.ok(!/echo .*PROJECT_TOKEN/.test(wf));
  assert.ok(!/uses: (?!actions\/)/.test(wf));
});

await test('every row of another repository is an error, not a green run, and nothing is created', async () => {
  const other = HEAD + `1,https://github.com/z/q/issues/1,Home,t,Gating (proposed),1 Before\n2,https://github.com/z/q/issues/2,Home,t,Gating (proposed),1 Before\n`;
  const st = makeState();
  await withStub(st, async (u) => {
    const r = await runSync(u, { csv: csvFile('other.csv', other) });
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /::error::Every row of the roadmap CSV belongs to z\/q, but this repository is o\/r, so nothing was done\./);
    assert.equal(st.requests.length, 0);
  });
});

await test('a 403 with no errors body stops the run early with one plain sentence', async () => {
  const st = makeState({ withFields: true });
  st.forbid = true;
  await withStub(st, async (u) => {
    const r = await runSync(u, { csv: good });
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /::error::GitHub answered 403: it is limiting requests or refusing this token\. The run stopped early/);
    assert.equal(st.attempts, 1, `mutation attempts: ${st.attempts}`);
    assert.ok(!r.out.includes(TOKEN));
  });
});

await test('options are deduplicated without regard to case, and the CSV is told', async () => {
  const text = HEAD + `1,${url(1)},Home,t,Gating (proposed),1 Before\n2,${url(2)},home,t,Gating (proposed),1 Before\n`;
  const st = makeState();
  await withStub(st, async (u) => {
    const r = await runSync(u, { csv: csvFile('case.csv', text) });
    assert.equal(r.code, 0, r.out);
    assert.deepEqual(st.fields.find((f) => f.name === 'Area').options.map((o) => o.name), ['Home']);
    assert.match(r.out, /Field "Area": "Home" and "home" are one option; "Home" is used\./);
  });
});

await test('the CSV is capped in size and rows', () => {
  const row = (i) => `${i},https://github.com/o/r/issues/${i},Home,t,G,P\n`;
  const many = HEAD + Array.from({ length: 2001 }, (_, i) => row(i + 1)).join('');
  assert.throws(() => readRows(many, 'o/r'), /more than 2000 rows/);
  assert.throws(() => readRows(HEAD + 'x'.repeat(1024 * 1024 + 1), 'o/r'), /larger than 1 MB/);
});

await test('the workflow uses the same action versions as the other workflows', () => {
  const dir = path.join(ROOT, '.github/workflows');
  const majors = {};
  for (const f of fs.readdirSync(dir)) {
    if (f === 'project-roadmap-sync.yml') continue;
    for (const m of fs.readFileSync(path.join(dir, f), 'utf8').matchAll(/uses: (actions\/(?:checkout|setup-node))@(v\d+)/g)) (majors[m[1]] ||= new Set()).add(m[2]);
  }
  const mine = fs.readFileSync(path.join(dir, 'project-roadmap-sync.yml'), 'utf8');
  for (const m of mine.matchAll(/uses: (actions\/[a-z-]+)@(v\d+)/g)) {
    assert.ok(majors[m[1]], `${m[1]} is used by no other workflow`);
    assert.ok(majors[m[1]].has(m[2]), `${m[1]}@${m[2]} differs from ${[...majors[m[1]]]}`);
  }
});

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`check-roadmap-board-sync: ${n} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
