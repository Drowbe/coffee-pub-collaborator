#!/usr/bin/env node
/*
 * check-project-status.mjs -- the workflow that keeps the project board in step with `status: ...` labels
 * (.github/workflows/project-status.yml):
 *   - it runs on issues labeled, only for status labels, with only `issues: write`, and uses no action outside
 *     actions/*; the project's owner and number come from repository variables, never from the file;
 *   - its inline script, run here with stand-ins for GitHub, keeps one status label on the issue, moves the card to
 *     the option named by the label (case-insensitively), skips the board quietly when it isn't set up, and fails
 *     with the label and the options when nothing matches.
 * No network. The YAML is read as text: no YAML parser is a dependency here.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, '.github/workflows/project-status.yml');
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

const PROJECT = {
  id: 'PVT_1',
  title: 'Board',
  fields: {
    nodes: [
      {}, // a plain field: no options in the fragment
      { id: 'F_other', name: 'Priority', options: [{ id: 'P1', name: 'Needs plan' }] },
      {
        id: 'F_status',
        name: 'Status',
        options: ['Inbox', 'Needs plan', 'Approved', 'Building', 'Shipped'].map((name, i) => ({ id: `O${i}`, name })),
      },
    ],
  },
};

// `state` is the issue as GitHub holds it now (its labels, and the option its card is on); it may be shared
// between runs. `labels` is what the event payload carried when the label was added.
async function simulate({ label, labels = [], env = {}, project = PROJECT, removeStatus = {}, state }) {
  const calls = { removed: [], graphql: [], notices: [], failed: [], tokens: [] };
  const payloadLabels = [...labels, label].filter(Boolean);
  state ??= { labels: [...payloadLabels], board: null };
  const issue = {
    number: 42,
    node_id: 'I_42',
    labels: payloadLabels.map((name) => ({ name })),
  };
  const context = { payload: { label: label ? { name: label } : undefined, issue }, repo: { owner: 'o', repo: 'r' } };
  const github = {
    paginate: async (method, params) => method(params),
    rest: {
      issues: {
        listLabelsOnIssue: async ({ issue_number, owner, repo }) => {
          assert.equal(issue_number, 42);
          assert.deepEqual([owner, repo], ['o', 'r']);
          return state.labels.map((name) => ({ name }));
        },
        removeLabel: async ({ name, issue_number, owner, repo }) => {
          assert.equal(issue_number, 42);
          assert.deepEqual([owner, repo], ['o', 'r']);
          if (removeStatus[name]) throw Object.assign(new Error('gone'), { status: removeStatus[name] });
          calls.removed.push(name);
          state.labels = state.labels.filter((l) => l !== name);
        },
      },
    },
  };
  const getOctokit = (token) => {
    calls.tokens.push(token);
    return {
      graphql: async (query, vars) => {
        calls.graphql.push({ query, vars });
        if (/projectV2\(number:/.test(query)) return { user: { projectV2: project } };
        if (/addProjectV2ItemById/.test(query)) return { addProjectV2ItemById: { item: { id: 'PVTI_1' } } };
        if (/updateProjectV2ItemFieldValue/.test(query)) {
          state.board = PROJECT.fields.nodes[2].options.find((o) => o.id === vars.option).name;
          return { updateProjectV2ItemFieldValue: { projectV2Item: { id: 'PVTI_1' } } };
        }
        throw new Error(`unexpected query ${query}`);
      },
    };
  };
  const core = {
    notice: (m) => calls.notices.push(m),
    info: () => {},
    setFailed: (m) => calls.failed.push(m),
  };
  const fullEnv = { PROJECT_TOKEN: 'tok', PROJECT_OWNER: 'someone', PROJECT_NUMBER: '8', PROJECT_FIELD: '', ...env };
  await fn(github, context, core, getOctokit, { env: fullEnv });
  return calls;
}

await test('the trigger, the condition, the permissions and the actions', () => {
  assert.match(text, /^on:\n  issues:\n    types: \[labeled\]\n/m);
  assert.match(text, /^    if: "startsWith\(github\.event\.label\.name, 'status: '\)"$/m, 'the job runs only for status labels (quoted: a bare ": " breaks the YAML)');
  assert.match(text, /^permissions:\n  issues: write\n\n/m, 'only issues: write');
  const uses = [...text.matchAll(/uses:\s*(\S+)/g)].map((m) => m[1]);
  assert.ok(uses.length > 0);
  for (const u of uses) assert.match(u, /^actions\/[\w-]+@v\d+$/, `${u} is an actions/* action pinned to a major version`);
  assert.ok(!/\t/.test(text), 'no tabs in YAML');
  assert.match(text, /PROJECT_TOKEN: \$\{\{ secrets\.PROJECT_TOKEN \}\}/);
  assert.match(text, /PROJECT_OWNER: \$\{\{ vars\.PROJECT_OWNER \}\}/);
  assert.match(text, /PROJECT_NUMBER: \$\{\{ vars\.PROJECT_NUMBER \}\}/);
  assert.ok(!/Drowbe/i.test(run) && !/number:\s*8\b/.test(run), 'owner and number are not in the script');
  assert.ok(!/\$\{\{/.test(run), 'the script itself has no workflow expressions');
});

await test('a matching label: other status labels go, the card moves to the matching option', async () => {
  const c = await simulate({ label: 'status: needs plan', labels: ['status: approved', 'bug', 'status: building'] });
  assert.deepEqual(c.removed, ['status: approved', 'status: building']);
  assert.deepEqual(c.failed, []);
  assert.deepEqual(c.tokens, ['tok']);
  assert.equal(c.graphql.length, 3);
  assert.deepEqual(c.graphql[0].vars, { owner: 'someone', number: 8 });
  assert.deepEqual(c.graphql[1].vars, { project: 'PVT_1', content: 'I_42' });
  assert.deepEqual(c.graphql[2].vars, { project: 'PVT_1', item: 'PVTI_1', field: 'F_status', option: 'O1' });
  assert.match(c.notices.at(-1), /moved to "Needs plan"/);
});

await test('case does not matter, in the label or the field name', async () => {
  const c = await simulate({ label: 'Status: APPROVED', env: { PROJECT_FIELD: 'status' } });
  assert.deepEqual(c.failed, []);
  assert.equal(c.graphql[2].vars.option, 'O2');
});

await test('a label that is already gone is not an error', async () => {
  const c = await simulate({ label: 'status: building', labels: ['status: approved'], removeStatus: { 'status: approved': 404 } });
  assert.deepEqual(c.failed, []);
  assert.equal(c.graphql.length, 3);
});

await test('two status labels added at once: the later run stands down, one label is left and the board matches it', async () => {
  for (const order of [['status: approved', 'status: building'], ['status: building', 'status: approved']]) {
    const state = { labels: ['bug', 'status: approved', 'status: building'], board: null };
    // Both events carry both labels; GitHub runs them one after the other.
    const first = await simulate({ label: order[0], labels: ['bug', order[1]], state });
    const second = await simulate({ label: order[1], labels: ['bug', order[0]], state });
    const left = state.labels.filter((l) => l.startsWith('status: '));
    assert.deepEqual(left, [order[0]], 'exactly one status label is left');
    assert.equal(state.board, order[0] === 'status: approved' ? 'Approved' : 'Building', 'the board matches the label');
    assert.deepEqual(first.failed, []);
    assert.deepEqual(second.failed, []);
    assert.deepEqual(second.graphql, [], 'the run whose label is gone leaves the board alone');
    assert.deepEqual(second.removed, []);
    assert.match(second.notices.at(-1), /is no longer on issue #42/);
    assert.ok(state.labels.includes('bug'), 'other labels are kept');
  }
});

await test('a non-status label does nothing', async () => {
  const c = await simulate({ label: 'bug', labels: ['status: approved'] });
  assert.deepEqual(c.removed, []);
  assert.deepEqual(c.graphql, []);
  assert.deepEqual(c.failed, []);
  assert.match(c.notices[0], /not a status label/);
});

await test('no token: labels are still tidied, the board is skipped with a notice, nothing fails', async () => {
  const c = await simulate({ label: 'status: approved', labels: ['status: needs plan'], env: { PROJECT_TOKEN: '' } });
  assert.deepEqual(c.removed, ['status: needs plan']);
  assert.deepEqual(c.tokens, []);
  assert.deepEqual(c.failed, []);
  assert.match(c.notices.at(-1), /not set up.*secret PROJECT_TOKEN/);
});

await test('no owner or number: skipped with a notice naming them', async () => {
  const c = await simulate({ label: 'status: approved', env: { PROJECT_OWNER: '', PROJECT_NUMBER: '' } });
  assert.deepEqual(c.failed, []);
  assert.deepEqual(c.graphql, []);
  assert.match(c.notices.at(-1), /variable PROJECT_OWNER, variable PROJECT_NUMBER/);
});

await test('no matching option fails, naming the label and the options', async () => {
  const c = await simulate({ label: 'status: review' });
  assert.equal(c.failed.length, 1);
  assert.match(c.failed[0], /label "status: review"/);
  assert.match(c.failed[0], /"Inbox", "Needs plan", "Approved", "Building", "Shipped"/);
  assert.equal(c.graphql.length, 1, 'nothing is added or changed');
});

await test('a bad number, a missing project or a missing field fails with one plain sentence', async () => {
  let c = await simulate({ label: 'status: approved', env: { PROJECT_NUMBER: 'eight' } });
  assert.match(c.failed[0], /PROJECT_NUMBER must be a whole number/);
  c = await simulate({ label: 'status: approved', project: null });
  assert.match(c.failed[0], /was not found, or PROJECT_TOKEN cannot see it/);
  c = await simulate({ label: 'status: approved', env: { PROJECT_FIELD: 'Phase' } });
  assert.match(c.failed[0], /no single-select field named "Phase"/);
});

if (failed) {
  console.error(`check-project-status: ${failed} failed, ${n} passed`);
  process.exit(1);
}
console.log(`check-project-status: ${n} passed`);
