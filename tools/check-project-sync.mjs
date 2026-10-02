#!/usr/bin/env node
/*
 * check-project-sync.mjs -- the workflow that makes the issues' `priority: ...` labels follow the project board
 * (.github/workflows/project-priority-sync.yml), the reverse of project-priority.yml:
 *   - it runs only on workflow_dispatch (no inputs, no schedule), with only `issues: write`, and uses no action
 *     outside actions/*; the project's owner and number come from repository variables, never from the file;
 *   - its inline script, run here with stand-ins for GitHub, pages through the board, gives open issues of this
 *     repository in Now, Next or Later exactly that priority label, clears it for Inbox or no column, leaves Done
 *     alone, skips closed issues and other repositories, writes nothing when the labels already match, and ends
 *     green with a notice when the board isn't set up. A missing, non-single-select or mis-pointed field (none of
 *     Now, Next, Later) fails the run before any write. Each change is a notice and a summary line.
 * No network. The YAML is read as text: no YAML parser is a dependency here.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, '.github/workflows/project-priority-sync.yml');
const text = fs.readFileSync(FILE, 'utf8');
const lines = text.split('\n');

let n = 0;
let failed = 0;
const test = async (name, fn) => {
  try {
    await fn();
    n += 1;
  } catch (err) {
    failed += 1;
    console.error(`FAIL ${name}\n${err.stack || err}`);
  }
};

// The block under `script: |`, de-indented, as github-script receives it.
function scriptBlock() {
  const start = lines.findIndex((l) => /^\s*script:\s*\|\s*$/.test(l));
  assert.ok(start >= 0, 'the workflow has an inline `script: |` block');
  const indent = lines[start].match(/^\s*/)[0].length;
  const body = [];
  for (const l of lines.slice(start + 1)) {
    if (l.trim() && l.match(/^\s*/)[0].length <= indent) break;
    body.push(l);
  }
  const pad = Math.min(...body.filter((l) => l.trim()).map((l) => l.match(/^\s*/)[0].length));
  return body.map((l) => l.slice(pad)).join('\n');
}

const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
const run = scriptBlock();
const fn = new AsyncFunction('github', 'context', 'core', 'getOctokit', 'process', run);

// One board object. `repo` defaults to this repository; `column` is the Status option's name, or null for none.
const item = (number, column, labels = [], { state = 'OPEN', repo = 'o/r', kind = 'issue' } = {}) => ({
  fieldValueByName: column == null ? null : { name: column },
  content:
    kind === 'draft'
      ? { title: 'a draft' }
      : { number, state, repository: { nameWithOwner: repo }, labels: { nodes: labels.map((name) => ({ name })) } },
});

// `items` is the board, split into pages of `pageSize`. Labels live in `state.labels[number]`, changed by the writes.
const STATUS = { id: 'F_status', name: 'Status', options: ['Inbox', 'Now', 'Next', 'Later', 'Done'].map((name) => ({ name })) };

// `field` is what `projectV2.field(name:)` answers: a single-select field, `{}` for a field of another kind (the
// fragment matches nothing), or null when there is no field of that name.
async function simulate({ items = [], pageSize = 100, env = {}, project = 'present', field = STATUS, removeStatus = {} }) {
  const calls = { removed: [], added: [], graphql: [], notices: [], infos: [], failed: [], tokens: [], summary: [] };
  const labels = {};
  for (const it of items) if (it.content?.labels) labels[it.content.number] = it.content.labels.nodes.map((l) => l.name);
  const context = { repo: { owner: 'o', repo: 'r' } };
  const github = {
    rest: {
      issues: {
        removeLabel: async ({ owner, repo, issue_number, name }) => {
          assert.deepEqual([owner, repo], ['o', 'r']);
          if (removeStatus[name]) throw Object.assign(new Error('gone'), { status: removeStatus[name] });
          calls.removed.push(`#${issue_number} ${name}`);
          labels[issue_number] = labels[issue_number].filter((l) => l !== name);
        },
        addLabels: async ({ owner, repo, issue_number, labels: add }) => {
          assert.deepEqual([owner, repo], ['o', 'r']);
          calls.added.push(`#${issue_number} ${add.join(', ')}`);
          labels[issue_number].push(...add);
        },
      },
    },
  };
  const getOctokit = (token) => {
    calls.tokens.push(token);
    return {
      graphql: async (query, vars) => {
        calls.graphql.push({ query, vars });
        if (project === null) return { user: { projectV2: null } };
        if (/field\(name: \$field\)/.test(query)) return { user: { projectV2: { title: 'Board', field } } };
        assert.match(query, /items\(first: 100, after: \$after\)/);
        const start = vars.after ? Number(vars.after.slice(1)) : 0;
        const nodes = items.slice(start, start + pageSize);
        const end = start + nodes.length;
        return {
          user: {
            projectV2: {
              title: 'Board',
              items: { pageInfo: { hasNextPage: end < items.length, endCursor: `c${end}` }, nodes },
            },
          },
        };
      },
    };
  };
  const summary = {
    addHeading: (t) => (calls.summary.push(`# ${t}`), summary),
    addRaw: (t) => (calls.summary.push(t), summary),
    addList: (list) => (calls.summary.push(...list.map((l) => `- ${l}`)), summary),
    write: async () => summary,
  };
  const core = {
    notice: (m) => calls.notices.push(m),
    info: (m) => calls.infos.push(m),
    setFailed: (m) => calls.failed.push(m),
    summary,
  };
  const fullEnv = { PROJECT_TOKEN: 'tok', PROJECT_OWNER: 'someone', PROJECT_NUMBER: '8', PROJECT_FIELD: '', ...env };
  await fn(github, context, core, getOctokit, { env: fullEnv });
  calls.labels = labels;
  calls.writes = calls.removed.length + calls.added.length;
  return calls;
}

await test('the trigger, the permissions and the actions', () => {
  assert.match(text, /^on:\n  workflow_dispatch:\n\n/m, 'only workflow_dispatch, with no inputs');
  assert.ok(!/^\s*schedule:/m.test(text), 'no schedule');
  assert.match(text, /^permissions:\n  issues: write\n\n/m, 'only issues: write');
  const uses = [...text.matchAll(/uses:\s*(\S+)/g)].map((m) => m[1]);
  assert.deepEqual(uses, ['actions/github-script@v9']);
  assert.ok(!/\t/.test(text), 'no tabs in YAML');
  assert.match(text, /PROJECT_TOKEN: \$\{\{ secrets\.PROJECT_TOKEN \}\}/);
  assert.match(text, /PROJECT_OWNER: \$\{\{ vars\.PROJECT_OWNER \}\}/);
  assert.match(text, /PROJECT_NUMBER: \$\{\{ vars\.PROJECT_NUMBER \}\}/);
  assert.match(text, /PROJECT_FIELD: \$\{\{ vars\.PROJECT_FIELD \}\}/);
  assert.ok(!/Drowbe/i.test(run) && !/number:\s*8\b/.test(run), 'owner and number are not in the script');
  assert.ok(!/\$\{\{/.test(run), 'the script itself has no workflow expressions');
  assert.match(text, /GITHUB_TOKEN don't start other workflow\n# runs/, 'the no-loop reason is written down');
  assert.equal((run.match(/'priority: '/g) || []).length, 1, "'priority: ' appears once, as PREFIX");
});

await test('Next to Now: the old label goes, the new one comes, logged as a notice and in the summary', async () => {
  const c = await simulate({ items: [item(160, 'Now', ['bug', 'priority: next'])] });
  assert.deepEqual(c.failed, []);
  assert.deepEqual(c.tokens, ['tok']);
  assert.deepEqual(c.graphql[0].vars, { owner: 'someone', number: 8, field: 'Status' });
  assert.deepEqual(c.graphql[1].vars, { owner: 'someone', number: 8, field: 'Status', after: null });
  assert.deepEqual(c.removed, ['#160 priority: next']);
  assert.deepEqual(c.added, ['#160 priority: now']);
  assert.deepEqual(c.labels[160], ['bug', 'priority: now']);
  assert.equal(c.notices[0], '#160 priority: next → priority: now');
  assert.match(c.notices.at(-1), /1 issue\(s\) changed, 0 already matched, 0 left alone/);
  assert.ok(c.summary.includes('- #160 priority: next → priority: now'));
  assert.ok(c.summary.includes(c.notices.at(-1)));
});

await test('Now, Next, Later from none, and two priority labels down to one', async () => {
  const c = await simulate({
    items: [item(1, 'Later'), item(2, 'next', ['priority: now', 'priority: next', 'priority: later'])],
  });
  assert.deepEqual(c.labels[1], ['priority: later']);
  assert.deepEqual(c.labels[2], ['priority: next']);
  assert.deepEqual(c.added, ['#1 priority: later']);
  assert.deepEqual(c.removed, ['#2 priority: now', '#2 priority: later']);
  assert.equal(c.notices[0], '#1 (none) → priority: later');
  assert.equal(c.notices[1], '#2 priority: now, priority: next, priority: later → priority: next');
});

await test('Inbox, or no column, removes every priority label and keeps the rest', async () => {
  const c = await simulate({ items: [item(5, 'Inbox', ['priority: now', 'bug']), item(6, null, ['Priority: Later'])] });
  assert.deepEqual(c.labels[5], ['bug']);
  assert.deepEqual(c.labels[6], []);
  assert.deepEqual(c.added, []);
  assert.equal(c.notices[0], '#5 priority: now → (none)');
  assert.equal(c.notices[1], '#6 Priority: Later → (none)');
});

await test('Done is left alone', async () => {
  const c = await simulate({ items: [item(7, 'Done', ['priority: now']), item(8, 'Done')] });
  assert.equal(c.writes, 0);
  assert.deepEqual(c.labels[7], ['priority: now']);
  assert.match(c.notices.at(-1), /0 issue\(s\) changed, 0 already matched, 2 left alone/);
});

await test('a closed issue is skipped', async () => {
  const c = await simulate({ items: [item(9, 'Now', ['priority: later'], { state: 'CLOSED' })] });
  assert.equal(c.writes, 0);
  assert.match(c.notices.at(-1), /out of 0 open issue/);
});

await test("another repository's issue, a pull request or a draft is skipped", async () => {
  const c = await simulate({
    items: [
      item(10, 'Now', ['priority: later'], { repo: 'someone/else' }),
      item(0, 'Now', [], { kind: 'draft' }),
      { fieldValueByName: { name: 'Now' }, content: {} }, // a pull request: not an Issue, so no fields come back
      { fieldValueByName: null, content: null }, // content the token can't see
    ],
  });
  assert.equal(c.writes, 0);
  assert.deepEqual(c.failed, []);
  assert.match(c.notices.at(-1), /out of 0 open issue/);
});

await test('every page of the board is read', async () => {
  const items = Array.from({ length: 250 }, (_, i) => item(i + 1, 'Next'));
  const c = await simulate({ items, pageSize: 100 });
  assert.deepEqual(c.graphql.slice(1).map((g) => g.vars.after), [null, 'c100', 'c200']);
  assert.equal(c.added.length, 250);
  assert.deepEqual(c.labels[250], ['priority: next']);
  assert.match(c.notices.at(-1), /250 issue\(s\) changed/);
});

await test('no writes when every label already matches', async () => {
  const c = await simulate({
    items: [item(1, 'Now', ['priority: now', 'bug']), item(2, 'Inbox', ['bug']), item(3, null), item(4, 'Done', ['priority: next'])],
  });
  assert.equal(c.writes, 0);
  assert.equal(c.notices.length, 1, 'only the total');
  assert.match(c.notices[0], /0 issue\(s\) changed, 3 already matched, 1 left alone/);
  assert.ok(c.summary.includes('No labels changed.'));
});

await test('a label already gone is not an error', async () => {
  const c = await simulate({ items: [item(1, 'Now', ['priority: next'])], removeStatus: { 'priority: next': 404 } });
  assert.deepEqual(c.failed, []);
  assert.deepEqual(c.added, ['#1 priority: now']);
});

await test('not set up: a notice naming what is missing, nothing read or written, nothing fails', async () => {
  for (const [env, missing] of [
    [{ PROJECT_TOKEN: '' }, /missing secret PROJECT_TOKEN\)/],
    [{ PROJECT_OWNER: '', PROJECT_NUMBER: '' }, /missing variable PROJECT_OWNER, variable PROJECT_NUMBER\)/],
  ]) {
    const c = await simulate({ items: [item(1, 'Now')], env });
    assert.deepEqual(c.failed, []);
    assert.deepEqual(c.tokens, []);
    assert.equal(c.writes, 0);
    assert.equal(c.notices.length, 1);
    assert.match(c.notices[0], /not set up.*so no labels were changed/);
    assert.match(c.notices[0], missing);
    assert.ok(c.summary.includes(c.notices[0]));
  }
});

await test('a bad number or a missing project fails with one plain sentence', async () => {
  let c = await simulate({ env: { PROJECT_NUMBER: 'eight' } });
  assert.match(c.failed[0], /PROJECT_NUMBER must be a whole number/);
  c = await simulate({ project: null });
  assert.match(c.failed[0], /was not found, or PROJECT_TOKEN cannot see it/);
  assert.equal(c.writes, 0);
});

await test('the field name comes from PROJECT_FIELD', async () => {
  const c = await simulate({ items: [item(1, 'Now')], env: { PROJECT_FIELD: 'Phase' } });
  assert.equal(c.graphql[0].vars.field, 'Phase');
  assert.equal(c.graphql[1].vars.field, 'Phase');
});

// Without the field, every card would read as "no column" and every priority label would be cleared.
const labelled = () => [item(1, null, ['priority: now', 'bug']), item(2, null, ['priority: later'])];

await test('a missing or renamed field fails, naming it, and nothing is read or written', async () => {
  const c = await simulate({ items: labelled(), field: null, env: { PROJECT_FIELD: 'Phase' } });
  assert.equal(c.writes, 0);
  assert.equal(c.graphql.length, 1, 'the board is not paged');
  assert.equal(c.failed.length, 1);
  assert.equal(c.failed[0], 'Project "Board" has no single-select field named "Phase", so no labels were changed.');
});

await test('a field that is not single-select fails, and nothing is written', async () => {
  const c = await simulate({ items: labelled(), field: {} });
  assert.equal(c.writes, 0);
  assert.equal(c.graphql.length, 1);
  assert.match(c.failed[0], /no single-select field named "Status"/);
});

await test('a single-select field with none of Now, Next or Later fails, naming its options', async () => {
  const c = await simulate({ items: labelled(), field: { id: 'F_size', name: 'Size', options: [{ name: 'S' }, { name: 'L' }] } });
  assert.equal(c.writes, 0);
  assert.equal(c.failed[0], 'Field "Size" has none of the options Now, Next or Later (it has "S", "L"), so no labels were changed.');
});

if (failed) {
  console.error(`check-project-sync: ${failed} failed, ${n} passed`);
  process.exit(1);
}
console.log(`check-project-sync: ${n} passed`);
