#!/usr/bin/env node
/*
 * roadmap-board-sync.mjs -- keeps the roadmap columns on the GitHub project board in step with
 * .github/roadmap-board.csv, so nobody updates them by hand. Run by .github/workflows/project-roadmap-sync.yml.
 *
 * NOTE: "Gating (proposed...)" in the Release status column is the project manager's PROPOSAL, not a decision,
 * until Thomas confirms the gating table (documentation/plans/plan-release.md). The sync copies the CSV as it is.
 *
 * The Start date and Target date columns hold an ESTIMATE, set by Phase: estimated by the project manager at a fast
 * pace (several builders in parallel, checks only for what changed), not a commitment. They are optional per row; an empty cell writes nothing, and a date
 * on the board is never cleared.
 *
 * What it does, in order:
 *   1. Reads and checks the CSV (columns Issue, URL, Area, Title, Release status, Phase, Start date, Target date; dates YYYY-MM-DD, may be empty; Target not before Start). A bad row refuses the
 *      whole file with one plain sentence, before anything is sent anywhere.
 *   2. Finds the project (a user's project: PROJECT_OWNER, PROJECT_NUMBER, like the other project workflows).
 *   3. Makes sure the single-select fields Area, Release status and Phase exist. A missing field is created with
 *      the options found in the CSV. A field that exists but lacks an option is NOT recreated: it is reported as a
 *      failure naming the field and the options, so they can be added by hand. A field of another type is also a
 *      failure. Makes sure the Date fields "Start date" and "Target date" exist (a same-named field of another type
 *      is a failure and is left alone).
 *   4. Adds every open issue of this repository (GITHUB_REPOSITORY) that is in the CSV to the project, if it is
 *      not already on it.
 *   5. Sets Area, Release status, Phase, Start date and Target date on those issues, only where the value differs
 *      (a date only when the CSV has one).
 *   6. Prints one line per issue and a summary: added, changed, unchanged, skipped, failed.
 * Skipped: closed issues, pull requests, numbers that do not exist, rows of another repository.
 *
 * Safety: the only writes are createProjectV2Field (for the fields above, when missing),
 * addProjectV2ItemById and updateProjectV2ItemFieldValue on those field ids. Nothing is ever deleted or cleared,
 * and no other field (Status and the rest) is touched. CSV text only ever travels as GraphQL variables, never in
 * query text. The token goes only in the Authorization header, is never printed, and redirects are refused.
 *
 * Environment: PROJECT_TOKEN, PROJECT_OWNER, PROJECT_NUMBER, GITHUB_REPOSITORY (owner/name), optional
 * GITHUB_GRAPHQL_URL (the runner sets it; https only, except localhost for the check), GITHUB_STEP_SUMMARY.
 * Usage: node tools/roadmap-board-sync.mjs [--dry-run] [--csv <file>]
 * A missing token, owner or number ends green with a notice. Exit 1 on a bad CSV or any failure.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HEADER = ['Issue', 'URL', 'Area', 'Title', 'Release status', 'Phase', 'Start date', 'Target date'];
const SELECT_FIELDS = [
  { name: 'Area', column: 'Area', alias: 'area' },
  { name: 'Release status', column: 'Release status', alias: 'release' },
  { name: 'Phase', column: 'Phase', alias: 'phase', sort: true },
];
const DATE_FIELDS = [
  { name: 'Start date', alias: 'start' },
  { name: 'Target date', alias: 'target' },
];
const MAX_TEXT = 200;
const MAX_BYTES = 1024 * 1024;
const MAX_ROWS = 2000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => String(s ?? '').trim().toLowerCase();

class Refusal extends Error {}

// ---- CSV -------------------------------------------------------------------------------------------------

/** RFC 4180: quoted fields may hold commas, doubled quotes and line breaks. Returns rows of strings. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  let wasQuoted = false;
  const src = String(text).replace(/^﻿/, '');
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i += 1; } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"' && field === '' && !wasQuoted) { quoted = true; wasQuoted = true; continue; }
    if (c === ',') { row.push(field); field = ''; wasQuoted = false; continue; }
    if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i += 1;
      row.push(field); field = ''; wasQuoted = false;
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
      continue;
    }
    if (wasQuoted) throw new Refusal('The roadmap CSV has text after a closing quote; check the quotes.');
    field += c;
  }
  if (quoted) throw new Refusal('The roadmap CSV has a quote that is never closed.');
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/** Checks the CSV and returns its rows as objects. Throws Refusal with one plain sentence. */
export function readRows(text, repo) {
  if (String(text).length > MAX_BYTES) throw new Refusal('The roadmap CSV is larger than 1 MB.');
  // Leading lines starting with # are comments (the file's header comment); the header row follows them.
  const grid = parseCsv(String(text).replace(/^(?:#[^\n]*\n)+/, ''));
  if (!grid.length || grid[0].map((h) => h.trim()).join('|') !== HEADER.join('|')) {
    throw new Refusal(`The roadmap CSV must start with the columns ${HEADER.join(', ')}.`);
  }
  const rows = [];
  const seen = new Set();
  for (let i = 1; i < grid.length; i += 1) {
    const cells = grid[i];
    const where = `Row ${i + 1} of the roadmap CSV`;
    if (cells.length !== HEADER.length) throw new Refusal(`${where} has ${cells.length} columns, but it needs ${HEADER.length}.`);
    const [issueText, url, area, title, release, phase, start, target] = cells.map((c) => c.trim());
    if (!/^[1-9][0-9]{0,8}$/.test(issueText)) throw new Refusal(`${where}: Issue must be a whole number, but it is "${clean(issueText).slice(0, 40)}".`);
    const issue = Number(issueText);
    if (seen.has(issue)) throw new Refusal(`${where}: issue #${issue} is listed twice.`);
    seen.add(issue);
    const m = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\/issues\/([0-9]+)$/.exec(url);
    if (!m || Number(m[2]) !== issue) throw new Refusal(`${where}: URL must be the link of issue #${issue}.`);
    for (const [label, value] of [['Area', area], ['Release status', release], ['Phase', phase]]) {
      if (!value) throw new Refusal(`${where}: ${label} is empty.`);
      if (value.length > MAX_TEXT) throw new Refusal(`${where}: ${label} is longer than ${MAX_TEXT} characters.`);
      if (/[\u0000-\u001f\u007f]/.test(value)) throw new Refusal(`${where}: ${label} has a line break or control character.`);
    }
    for (const [label, value] of [['Start date', start], ['Target date', target]]) {
      if (value && !isDate(value)) throw new Refusal(`${where}: ${label} must be a date like 2026-12-31 (year 2000 to 2100), but it is "${clean(value).slice(0, 40)}".`);
    }
    if (start && target && target < start) throw new Refusal(`${where}: Target date is before Start date.`);
    rows.push({ issue, repo: m[1], area, title, release, phase, start, target });
  }
  if (!rows.length) throw new Refusal('The roadmap CSV has no rows.');
  if (rows.length > MAX_ROWS) throw new Refusal(`The roadmap CSV has more than ${MAX_ROWS} rows.`);
  return rows;
}

/** True for a real calendar date written YYYY-MM-DD, in the years 2000 to 2100. */
function isDate(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m || Number(m[1]) < 2000 || Number(m[1]) > 2100) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toISOString().slice(0, 10) === v;
}

/** Text from the CSV or the API, made safe to print: one line, no control characters. */
function clean(s) {
  return String(s ?? '').replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ').trim();
}

// ---- GraphQL ---------------------------------------------------------------------------------------------

function makeClient({ url, token }) {
  const u = new URL(url);
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(u.hostname))) {
    throw new Refusal('GITHUB_GRAPHQL_URL must be an https address.');
  }
  const redact = (s) => (token ? String(s).split(token).join('***') : String(s));
  /** Returns { data, errors }. Throws only when the request itself fails. */
  async function raw(query, variables) {
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(30000),
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'roadmap-board-sync' },
        body: JSON.stringify({ query, variables }),
      });
    } catch (err) {
      throw new Error(redact(`GitHub could not be reached (${err?.cause?.code || err?.name || 'error'}).`));
    }
    let body = null;
    try { body = await res.json(); } catch { /* not JSON */ }
    if (res.status === 403 || res.status === 429 || (body?.errors || []).some((e) => e.type === 'RATE_LIMITED')) {
      const err = new Error(`GitHub answered ${res.status === 200 ? 'with a rate limit' : res.status}: it is limiting requests or refusing this token.`);
      err.rateLimited = true;
      throw err;
    }
    if (!res.ok && !body?.errors) throw new Error(`GitHub answered ${res.status}.`);
    return { data: body?.data ?? null, errors: body?.errors || [] };
  }
  async function gql(query, variables) {
    const { data, errors } = await raw(query, variables);
    if (errors.length) throw new Error(redact(clean(errors.map((e) => e.message).join('; ')) || 'GitHub refused the request.'));
    return data;
  }
  return { raw, gql, redact };
}

const Q_PROJECT = `query($owner: String!, $number: Int!) {
  user(login: $owner) {
    projectV2(number: $number) {
      id
      title
      fields(first: 100) {
        nodes {
          ... on ProjectV2Field { id name dataType }
          ... on ProjectV2SingleSelectField { id name dataType options { id name } }
          ... on ProjectV2IterationField { id name dataType }
        }
      }
    }
  }
}`;
const M_CREATE_SELECT = `mutation($project: ID!, $name: String!, $options: [ProjectV2SingleSelectFieldOptionInput!]) {
  createProjectV2Field(input: { projectId: $project, dataType: SINGLE_SELECT, name: $name, singleSelectOptions: $options }) {
    projectV2Field { ... on ProjectV2SingleSelectField { id name dataType options { id name } } }
  }
}`;
const M_CREATE_DATE = `mutation($project: ID!, $name: String!) {
  createProjectV2Field(input: { projectId: $project, dataType: DATE, name: $name }) {
    projectV2Field { ... on ProjectV2Field { id name dataType } }
  }
}`;
const Q_ITEMS = `query($project: ID!, $after: String, $f1: String!, $f2: String!, $f3: String!, $f4: String!, $f5: String!) {
  node(id: $project) {
    ... on ProjectV2 {
      items(first: 100, after: $after) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          content { ... on Issue { number repository { nameWithOwner } } }
          area: fieldValueByName(name: $f1) { ... on ProjectV2ItemFieldSingleSelectValue { optionId } }
          release: fieldValueByName(name: $f2) { ... on ProjectV2ItemFieldSingleSelectValue { optionId } }
          phase: fieldValueByName(name: $f3) { ... on ProjectV2ItemFieldSingleSelectValue { optionId } }
          start: fieldValueByName(name: $f4) { ... on ProjectV2ItemFieldDateValue { date } }
          target: fieldValueByName(name: $f5) { ... on ProjectV2ItemFieldDateValue { date } }
        }
      }
    }
  }
}`;
const Q_OPEN_ISSUES = `query($owner: String!, $name: String!, $after: String) {
  repository(owner: $owner, name: $name) {
    issues(first: 100, after: $after, states: OPEN) {
      pageInfo { hasNextPage endCursor }
      nodes { id number }
    }
  }
}`;
const Q_ONE = `query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    issueOrPullRequest(number: $number) { __typename ... on Issue { state } }
  }
}`;
const M_ADD = `mutation($project: ID!, $content: ID!) {
  addProjectV2ItemById(input: { projectId: $project, contentId: $content }) { item { id } }
}`;
const M_SET = `mutation($project: ID!, $item: ID!, $field: ID!, $option: String!) {
  updateProjectV2ItemFieldValue(
    input: { projectId: $project, itemId: $item, fieldId: $field, value: { singleSelectOptionId: $option } }
  ) { projectV2Item { id } }
}`;

const M_SET_DATE = `mutation($project: ID!, $item: ID!, $field: ID!, $date: Date!) {
  updateProjectV2ItemFieldValue(
    input: { projectId: $project, itemId: $item, fieldId: $field, value: { date: $date } }
  ) { projectV2Item { id } }
}`;

// ---- The sync --------------------------------------------------------------------------------------------

export async function run(args) {
  const lines = [];
  try {
    return await sync(args, lines);
  } catch (err) {
    if (!err.rateLimited) throw err;
    const token = args.env.PROJECT_TOKEN || '';
    const say = (l) => args.out.line(token ? l.split(token).join('***') : l);
    for (const l of lines) say(l);
    say(`::error::${clean(err.message)} The run stopped early; run it again later. Nothing was deleted.`);
    return 1;
  }
}

async function sync({ env, argv, out }, lines) {
  const dry = argv.includes('--dry-run');
  const csvAt = argv.indexOf('--csv');
  const csvPath = csvAt >= 0 ? path.resolve(argv[csvAt + 1] || '') : path.join(ROOT, '.github/roadmap-board.csv');
  const token = env.PROJECT_TOKEN || '';
  const owner = (env.PROJECT_OWNER || '').trim();
  const numberText = (env.PROJECT_NUMBER || '').trim();
  const repoText = (env.GITHUB_REPOSITORY || '').trim();
  const log = (line) => out.line(token ? line.split(token).join('***') : line);

  const repoMatch = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/.exec(repoText);
  if (!repoMatch) { log('GITHUB_REPOSITORY must look like owner/name.'); return 1; }
  const [, repoOwner, repoName] = repoMatch;

  let rows;
  try {
    rows = readRows(fs.readFileSync(csvPath, 'utf8'), repoText);
  } catch (err) {
    if (err instanceof Refusal) { log(`::error::${clean(err.message)}`); log('Nothing was changed.'); return 1; }
    log(`::error::The roadmap CSV could not be read (${clean(err.code || 'error')}).`);
    return 1;
  }

  if (!rows.some((r) => norm(r.repo) === norm(repoText))) {
    const csvRepos = [...new Set(rows.map((r) => r.repo))].slice(0, 3).join(', ');
    log(`::error::Every row of the roadmap CSV belongs to ${clean(csvRepos)}, but this repository is ${repoText}, so nothing was done.`);
    return 1;
  }

  if (!token || !owner || !numberText) {
    const missing = [!token && 'secret PROJECT_TOKEN', !owner && 'variable PROJECT_OWNER', !numberText && 'variable PROJECT_NUMBER'].filter(Boolean);
    log(`::notice::The project board is not set up for this repository (missing ${missing.join(', ')}), so the roadmap was not synced.`);
    return 0;
  }
  const number = Number(numberText);
  if (!Number.isInteger(number) || number < 1) { log(`::error::PROJECT_NUMBER must be a whole number, but it is "${clean(numberText).slice(0, 40)}".`); return 1; }

  let client;
  try {
    client = makeClient({ url: env.GITHUB_GRAPHQL_URL || 'https://api.github.com/graphql', token });
  } catch (err) { log(`::error::${err.message}`); return 1; }
  const { raw, gql } = client;
  const delay = Math.max(0, Number(env.ROADMAP_MUTATION_DELAY_MS ?? 150) || 0);
  const mutate = async (query, variables) => { await sleep(delay); return gql(query, variables); };

  const setupFailures = [];
  const prefix = dry ? '(dry run) ' : '';

  // 1. The project.
  let project;
  try {
    const found = await gql(Q_PROJECT, { owner, number });
    project = found?.user?.projectV2;
  } catch (err) { if (err.rateLimited) throw err; log(`::error::Could not read project ${number} of user ${clean(owner)}: ${err.message}`); return 1; }
  if (!project) { log(`::error::Project ${number} of user ${clean(owner)} was not found, or PROJECT_TOKEN cannot see it.`); return 1; }
  const existing = (project.fields?.nodes || []).filter((f) => f && f.name);
  log(`${prefix}Project "${clean(project.title)}", ${rows.length} row(s) in the CSV, repository ${repoText}.`);

  // 2. The fields.
  const fields = {};
  for (const def of SELECT_FIELDS) {
    const wanted = [];
    const spellings = new Map();
    for (const row of rows) {
      const v = row[def.alias];
      const k = norm(v);
      if (!spellings.has(k)) { spellings.set(k, [v]); wanted.push(v); } else if (!spellings.get(k).includes(v)) spellings.get(k).push(v);
    }
    for (const list of spellings.values()) {
      if (list.length > 1) lines.push(`Field "${def.name}": ${list.map((v) => `"${clean(v)}"`).join(' and ')} are one option; "${clean(list[0])}" is used.`);
    }
    if (def.sort) wanted.sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
    const have = existing.find((f) => norm(f.name) === norm(def.name));
    if (have && !Array.isArray(have.options)) {
      setupFailures.push(`Field "${def.name}" exists but is not a single-select field, so it was not touched and its values were not set.`);
      fields[def.alias] = null;
      continue;
    }
    if (have) {
      const known = new Map(have.options.map((o) => [norm(o.name), o.id]));
      const missing = wanted.filter((v) => !known.has(norm(v)));
      if (missing.length) {
        setupFailures.push(`Field "${def.name}" is missing option(s) ${missing.map((v) => `"${clean(v)}"`).join(', ')}. The field was not recreated; add the option(s) to it on the board, then run again.`);
      }
      fields[def.alias] = { id: have.id, name: def.name, known };
      continue;
    }
    if (dry) {
      lines.push(`${prefix}Would create field "${def.name}" with ${wanted.length} option(s).`);
      fields[def.alias] = { id: null, name: def.name, known: new Map(wanted.map((v) => [norm(v), null])), virtual: true };
      continue;
    }
    try {
      const made = await mutate(M_CREATE_SELECT, {
        project: project.id,
        name: def.name,
        options: wanted.map((name) => ({ name, color: 'GRAY', description: '' })),
      });
      const f = made?.createProjectV2Field?.projectV2Field;
      if (!f?.id || !Array.isArray(f.options)) throw new Error('GitHub did not return the new field.');
      lines.push(`Created field "${def.name}" with ${f.options.length} option(s).`);
      fields[def.alias] = { id: f.id, name: def.name, known: new Map(f.options.map((o) => [norm(o.name), o.id])) };
    } catch (err) {
      if (err.rateLimited) throw err;
      setupFailures.push(`Could not create field "${def.name}": ${err.message}`);
      fields[def.alias] = null;
    }
  }
  const dateFields = {};
  for (const def of DATE_FIELDS) {
    const have = existing.find((f) => norm(f.name) === norm(def.name));
    if (have) {
      if (have.dataType !== 'DATE') {
        setupFailures.push(`Field "${def.name}" exists but is not a date field; it was not touched and its values were not set.`);
        dateFields[def.alias] = null;
      } else dateFields[def.alias] = { id: have.id, name: def.name };
    } else if (dry) {
      lines.push(`${prefix}Would create date field "${def.name}".`);
      dateFields[def.alias] = { id: null, name: def.name, virtual: true };
    } else {
      try {
        const made = await mutate(M_CREATE_DATE, { project: project.id, name: def.name });
        const f = made?.createProjectV2Field?.projectV2Field;
        if (!f?.id) throw new Error('GitHub did not return the new field.');
        lines.push(`Created date field "${def.name}".`);
        dateFields[def.alias] = { id: f.id, name: def.name };
      } catch (err) {
        if (err.rateLimited) throw err;
        setupFailures.push(`Could not create field "${def.name}": ${err.message}`);
        dateFields[def.alias] = null;
      }
    }
  }

  // 3. What is on the board, and which issues are open.
  const onBoard = new Map(); // number -> { id, area, release, phase } option ids
  try {
    let after = null;
    for (;;) {
      const page = await gql(Q_ITEMS, {
        project: project.id, after,
        f1: SELECT_FIELDS[0].name, f2: SELECT_FIELDS[1].name, f3: SELECT_FIELDS[2].name, f4: DATE_FIELDS[0].name, f5: DATE_FIELDS[1].name,
      });
      const items = page?.node?.items;
      if (!items) throw new Error('The board items could not be read.');
      for (const it of items.nodes || []) {
        const c = it?.content;
        if (!c || typeof c.number !== 'number' || norm(c.repository?.nameWithOwner) !== norm(repoText)) continue;
        onBoard.set(c.number, { id: it.id, area: it.area?.optionId || null, release: it.release?.optionId || null, phase: it.phase?.optionId || null, start: it.start?.date || null, target: it.target?.date || null });
      }
      if (!items.pageInfo?.hasNextPage) break;
      after = items.pageInfo.endCursor;
    }
  } catch (err) { if (err.rateLimited) throw err; log(`::error::Could not read the board: ${err.message}`); return 1; }

  const open = new Map(); // number -> node id
  try {
    let after = null;
    for (;;) {
      const page = await gql(Q_OPEN_ISSUES, { owner: repoOwner, name: repoName, after });
      const issues = page?.repository?.issues;
      if (!issues) throw new Error(`Repository ${repoText} was not found, or PROJECT_TOKEN cannot see it.`);
      for (const n of issues.nodes || []) open.set(n.number, n.id);
      if (!issues.pageInfo?.hasNextPage) break;
      after = issues.pageInfo.endCursor;
    }
  } catch (err) { if (err.rateLimited) throw err; log(`::error::Could not read the issues of ${repoText}: ${err.message}`); return 1; }

  // 4. Each row.
  let dateWrites = 0;
  const counts = { added: 0, changed: 0, unchanged: 0, skipped: 0, failed: 0 };
  for (const row of rows) {
    const tag = `#${row.issue}`;
    if (norm(row.repo) !== norm(repoText)) { counts.skipped += 1; lines.push(`${tag} skipped: it belongs to ${clean(row.repo)}, not ${repoText}.`); continue; }
    if (!open.has(row.issue)) {
      let why = 'it does not exist';
      try {
        const { data, errors } = await raw(Q_ONE, { owner: repoOwner, name: repoName, number: row.issue });
        const node = data?.repository?.issueOrPullRequest;
        if (node?.__typename === 'PullRequest') why = 'it is a pull request';
        else if (node?.__typename === 'Issue') why = node.state === 'OPEN' ? 'it could not be read' : 'it is closed';
        else if (errors.length && !errors.every((e) => e.type === 'NOT_FOUND')) why = 'it could not be looked up';
      } catch (err) { if (err.rateLimited) throw err; why = 'it could not be looked up'; }
      counts.skipped += 1;
      lines.push(`${tag} skipped: ${why}.`);
      continue;
    }

    const notes = [];
    let failed = false;
    let item = onBoard.get(row.issue);
    let wasAdded = false;
    if (!item) {
      if (dry) { item = { id: null, area: null, release: null, phase: null, start: null, target: null }; wasAdded = true; notes.push('would be added to the board'); }
      else {
        try {
          const added = await mutate(M_ADD, { project: project.id, content: open.get(row.issue) });
          const id = added?.addProjectV2ItemById?.item?.id;
          if (!id) throw new Error('GitHub did not return the card.');
          item = { id, area: null, release: null, phase: null, start: null, target: null };
          wasAdded = true;
          notes.push('added to the board');
        } catch (err) {
          if (err.rateLimited) throw err;
          counts.failed += 1;
          lines.push(`${tag} failed: could not add it to the board: ${err.message}`);
          continue;
        }
      }
    }
    let wrote = 0;
    for (const def of SELECT_FIELDS) {
      const f = fields[def.alias];
      const value = row[def.alias];
      if (!f) { failed = true; notes.push(`${def.name} not set (field problem)`); continue; }
      if (!f.known.has(norm(value))) { failed = true; notes.push(`${def.name} not set (no option "${clean(value)}")`); continue; }
      const optionId = f.known.get(norm(value));
      if (!f.virtual && item[def.alias] === optionId) continue;
      if (dry || f.virtual) { wrote += 1; notes.push(`would set ${def.name} to "${clean(value)}"`); continue; }
      try {
        await mutate(M_SET, { project: project.id, item: item.id, field: f.id, option: optionId });
        wrote += 1;
        notes.push(`${def.name} set to "${clean(value)}"`);
      } catch (err) { if (err.rateLimited) throw err; failed = true; notes.push(`${def.name} failed: ${err.message}`); }
    }
    // Dates: only where the CSV has one and it differs; an empty cell writes nothing and nothing is ever cleared.
    for (const def of DATE_FIELDS) {
      const value = row[def.alias];
      if (!value) continue;
      const f = dateFields[def.alias];
      if (!f) { failed = true; notes.push(`${def.name} not set (field problem)`); continue; }
      if (!f.virtual && item[def.alias] === value) continue;
      if (dry || f.virtual) { wrote += 1; dateWrites += 1; notes.push(`would set ${def.name} to ${value}`); continue; }
      try {
        await mutate(M_SET_DATE, { project: project.id, item: item.id, field: f.id, date: value });
        wrote += 1;
        dateWrites += 1;
        notes.push(`${def.name} set to ${value}`);
      } catch (err) { if (err.rateLimited) throw err; failed = true; notes.push(`${def.name} failed: ${err.message}`); }
    }
    if (wasAdded) counts.added += 1;
    if (wrote) counts.changed += 1;
    if (failed) counts.failed += 1;
    else if (!wasAdded && !wrote) counts.unchanged += 1;
    lines.push(`${tag} ${failed ? 'failed' : wrote || wasAdded ? 'ok' : 'unchanged'}${notes.length ? `: ${notes.join('; ')}` : ''}.`);
  }

  // 5. The report.
  const failedTotal = counts.failed + setupFailures.length;
  for (const l of lines) log(l);
  for (const f of setupFailures) log(`::error::${clean(f)}`);
  const verb = dry ? 'would be ' : '';
  const summary = `${prefix}Roadmap sync of "${clean(project.title)}": ${counts.added} ${verb}added, ${counts.changed} ${verb}changed, ${counts.unchanged} unchanged, ${counts.skipped} skipped, ${failedTotal} failed` +
    (setupFailures.length ? ` (${setupFailures.length} field problem(s), ${counts.failed} issue(s)).` : '.') +
    ` Dates ${verb}set: ${dateWrites}.`;
  log(summary);
  if (env.GITHUB_STEP_SUMMARY) {
    const esc = (s) => clean(s).replace(/[&<>|`*_\[\]]/g, (c) => `&#${c.charCodeAt(0)};`);
    const md = ['## Roadmap sync', esc(summary), '', ...setupFailures.map((f) => `- Field problem: ${esc(f)}`), ...lines.map((l) => `- ${esc(l)}`), ''].join('\n');
    try { fs.appendFileSync(env.GITHUB_STEP_SUMMARY, md); } catch { /* the log has it */ }
  }
  return failedTotal ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const code = await run({ env: process.env, argv: process.argv.slice(2), out: { line: (l) => console.log(l) } });
  process.exitCode = code;
}
