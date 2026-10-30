# AI Integration Plan

**Audience:** Thomas decides how AI reaches the app and what it may do there (the open questions at the end).
server-development builds the catalog, the tool routes, the tokens, the MCP endpoint, the tool-calling loop and the
checks; experience-design builds the Profile and Manage pages for tokens, the AI inbox in Chat and the Assistant, and
how an AI's steps and costs show; quality-assurance reviews the tokens, the OAuth pages and the MCP endpoint as security
changes; content-manager documents.

**Status:** draft for Thomas, 2026-11-02. Nothing below is decided or built. From GitHub #382, raised by Thomas on
2026-11-02: today "a person pastes our custom prompt into the client, copies the JSON it returns, and pastes that into
the app. It works anywhere but is manual, error-prone and one-way", and inside the app "a prompt goes out and JSON comes
back that we parse". Thomas wants "a better process for both. Ideally ChatGPT (or Claude) could talk to our server
directly."

Related: #64 (integration tokens), #232 (the Chrome extension), #373 (`hooks.ai` optional),
[plan-object-handoff](plan-object-handoff.md) (the objects format, `takes`, Send to...),
[plan-research-import](plan-research-import.md) ("Later: a direct connection"), [plan-assistant-module](plan-assistant-module.md),
[plan-chat-model](plan-chat-model.md) (`/ai` answers are private), [plan-attachments-vault](plan-attachments-vault.md)
(files and who may see their names), [plan-realtime-optional-livekit](plan-realtime-optional-livekit.md) (the live stream),
[plan-template-games](plan-template-games.md).

## What it is today

### The AI service (`server/ai.js`)

- **One service per environment**, set by an owner on Manage > Modules, the AI service tab (`public/admin.js`, "The AI
  service"; `GET`, `PUT /api/ai` and `POST /api/ai/models`, all `requireOwner`). It is either the environment's own
  ("custom": provider, model, address, key) or one the host offers ("managed", per company, set on the console with
  `PUT /api/host/ai`). There is no key per person: "the person's own key" today means the owner's key for the whole
  environment, or the host's.
- **Providers:** `openai`, `anthropic` and `compatible` (any service speaking the OpenAI chat interface, such as a model
  server on the owner's own network), plus `none` (`PROVIDERS`). Defaults: `gpt-4o-mini` and `claude-haiku-4-5-20251001`
  (`DEFAULT_MODELS`); `compatible` has no default. The model list comes from the service (`listModelsFor`).
- **The key** is kept in `DATA_DIR/ai.json`, encrypted with AES-256-GCM (`sealKey`, `openKey`, `encryptSecret` in
  `server/auth.js`) under the host's secrets key (`secrets.key` on a single server, `host.json`'s `secretsKey` on a
  host with environments). A page sees only that a key is set (`view()`); it is never shown again. Restored on another
  host, it reads as unreadable and must be entered again (`KEY_UNREADABLE`).
- **Three tasks only:** `summarise`, `ask` and `tags` (`TASKS`). One request, one answer (`complete`): the model is given
  no tools. Up to 12 objects (`MAX_ITEMS`), 8,000 characters each, 60,000 in all, 1,200 answer tokens, 90 seconds.
- **Prompt then parse:** the material sits between numbered markers inside a fixed frame that says it is data and never
  an instruction (`FRAME`, `ASK_FRAME`, `buildPrompt`). The model is asked to put what is worth keeping in a fenced
  ` ```objects ` block (`summaryRule`, `objectRule` in `server/object-format.js`), which `parseSummaries` cuts out of the
  text, reads leniently (`looksLikeObjects`, `jsonEnd`) and checks with `cleanObject`. Tags come back as a bare JSON
  array (`parseTags`).
- **Limits and costs:** a monthly token allowance per environment (`monthlyTokens`, `overCap`, `DATA_DIR/ai-usage.json`
  with tokens by task); on a host, `aiCallsPerMonth` per environment (`server/host-registry.js`, `recordAiCall`); a
  per-person rate limit (`overLimit(..., 'ai')`). Each answer returns its `tokens`, and the modules' activity list notes
  "used AI to ... (N tokens)" (`noteActivity`, `GET /api/modules/activity`, owners only).

### Who may use it

- **The role permission `useAi`** ("Use AI in modules", `server/store.js`, `ROLE_PERMISSIONS`), off by default for
  moderators, members and guests; owners always have it. A space can turn AI off (`space.aiOff`).
- **The module routes** check `useAi` (`aiAllowed` in `server/index.js`): `GET` and `POST /api/modules/:id/ai`.
- **Chat's `/ai`** (`GET`, `POST /api/spaces/:id/ai`, and its private thread) checks only that the person is signed in
  and the space has AI on (`chatAiRefusal`), not `useAi`. The two doors disagree today (open question 9).

### `hooks.ai` and the SDK

- A module asks for the AI through the `ai` hook, approved by an owner like any hook. `hooks.ai` is `true` (the module
  can't work without the service: the Assistant) or `"optional"` (it uses it when it is on: Research), per #373
  (`cleanHooks` in `server/modules.js`; `aiDependents` lists only the `true` ones).
- `host.ai.available()` and `host.ai.ask({ task, question, objects })` in `public/sdk/host.js`; `host.chat.ask({ question,
  refs })` posts a private `/ai` question in Chat. Research uses `host.ai.available()` and `host.ai.ask({ task: 'tags' })`
  (`modules/research/src/research.js`) and `host.chat.ask` for "Research this"; the Assistant uses `host.chat.ask`
  (`modules/assistant/src/assistant.js`). No other bundled module calls the AI.

### The paste flow

- Chat's "Copy the prompt" (`chat-import-copy` in `public/chat-input.js`) copies `GET /api/objects/format`'s
  `instructions` (`instructions()` in `server/object-format.js`): answer as usual, then put every thing worth keeping in
  one JSON array in one ` ```objects ` block, or a `<something>.objects.json` file holding
  `{"format":"objects","formatVersion":1,"objects":[...]}`. The kinds listed are those the environment's enabled
  modules take (`kindsTaken`). `GET /api/objects/format/schema` serves the JSON Schema (`schema()`), built from the same
  `DETAILS` and `KINDS`.
- The person pastes the answer back (`chat-bring`); `POST /api/spaces/:id/objects/check` (or a module's own) reads it
  with `readObjects` and `cleanObject`, and Chat shows a preview to Keep or Send to... a module.

### Modules, actions and the bus

- **Modules run no server code.** A module's data is opaque to the server, kept by key (`/api/modules/:id/data`). The
  server can read a module's objects only through what its manifest declares in `refs.produces` (a key pattern and a
  summary mapping): `resolveRef`, `objectSummary`, `GET /api/objects/search`.
- **Actions** (`actions.provides` in `module.json`, `cleanBus`): a name, a label, a typed `input` (`string`, `text`,
  `date`, `datetime`, `boolean`, `number`, `ref`, `object`), optional `local`, `needs` and `takes`. There is no
  description sentence and no mark of whether an action only reads, changes or removes. `actions.uses` is the "ask other
  modules to do things" grant, approved by an owner.
- **A request is carried out by the module that owns the action** (`server/module-bus.js`): the server queues it and
  the providing module's open page claims it, does it under its own rules and reports back. Nothing happens until
  someone with that module open picks it up (a request lives seven days). Chat's Keep and Send to... use this:
  `GET /api/spaces/:id/actions` (with `may` for this person) and `POST /api/spaces/:id/action`, then
  `GET /api/spaces/:id/action/:requestId` for how it went. Chat's requests share one limit of 60 a minute per person.
- Module access is per role through each module's own `permissions` and `access.read` / `access.write` (`moduleCan`).

### Sign-in and tokens

- A session is a signed cookie, or the same token sent as `Authorization: Bearer` (the Studio app, `server/auth.js`).
  `sameOriginOnly` lets a bearer request through. There are no tokens a person can make, name, limit or revoke: #64
  asks for them (hashed, shown once, named, scoped, last used, revocable), and #232 and plan-research-import's "direct
  connection" wait on it. The OBS access key reads only a module's keyed page.

### The live stream, the Vault and templates

- Pages hear changes through server-sent events: `GET /api/live` (presence, per environment) and
  `GET /api/modules/:id/events` (a module's data changed). A write to a module's data shows on every open page at once.
- The Vault (plan-attachments-vault): files are Vault objects, linked through `host.files`; a file's name reaches
  summaries, search and the AI only for people who can read the Vault (its decision 8). The server never opens a file
  except the bounded PDF scan, so there is no file text for an AI to read.
- Words come from the environment's template (`word()`); the games template makes the owner a "game master" and members
  "players" (proposed in plan-template-games).

## The target

One catalog of what the app can do, made from the modules' manifests, and three ways in that all use it:

1. **Inside the app**, with the environment's AI service: the model calls the catalog's tools through the provider's
   own tool calling, instead of writing a fenced block we parse.
2. **From outside**, ChatGPT, Claude or another client talks to the server directly through an MCP endpoint, or a plain
   API with a personal token, acting as one person with no more than that person's rights.
3. **The paste flow** stays for any AI anywhere, with its prompt and schema made from the same catalog.

Anything an AI wants to change waits for the person to say yes in the app. An AI can never do more than the person.

## Decisions

None yet. Everything below is a proposal with a lean, for Thomas to decide.

## The options

### (a) One catalog

What an AI may ask for, listed once and generated from the enabled modules' manifests at request time, filtered to the
person asking (their spaces, roles and each module's `access`).

- **Read tools, from the core**, built on what the server can already read: `list_spaces`, `search_objects` (a space,
  words, a kind, `has=place` or a date range; the summaries `GET /api/objects/search` makes), `read_object` (one pointer,
  with its text, as `resolveRef` does) and `list_actions`. These need nothing new from modules.
- **Write tools, from the modules**: one per `actions.provides` entry that is not `local`, named
  `<module>__<action>` (module ids have no underscore, and providers allow only letters, digits, `_` and `-` up to 64).
  The input schema is made from the action's `input` types (a `date` becomes a dated string pattern, a `ref` the pointer
  shape, an `object` the objects format's schema narrowed to the kinds in `takes`). Plus one core tool, `propose_objects`,
  for objects with no chosen destination (what the paste flow does today).
- **What modules add to `module.json`**: on each action, a `description` (one plain sentence, up to 200 characters, in
  the template's words where it uses `{object}` and such) and an `effect`, one of `read`, `write` or `destructive`
  (default `write`). An action may say `"ai": false` to stay out of the catalog. The permission each needs is already
  known: the module's `access.write`, plus a `takes` entry's `permission`.
- **A check** (`tools/check-catalog.mjs`) fails when a bundled module's action has no description, and when the
  generated schemas do not compile or do not accept the format's own example.

Options:

1. **Generate it from manifests, with the two new fields** (lean). Cost: a manifest field pair and a version bump for
   each bundled module with actions. It can't drift, and a third-party module joins by declaring the same fields.
2. **Generate it from manifests as they are, labels only.** No module changes; the model guesses from a label such as
   "Add a task", and nothing marks what is destructive. Rules out reliable safety marks.
3. **A hand-written catalog in the core.** Quick to start; drifts the first time a module changes, and names modules in
   the core, which the project avoids.

### (b) Inside the app: tool calling

**The loop.** `server/ai.js` gains a tool-calling run beside `complete`: send the question, the material the person
chose and the catalog's tools; when the model calls a read tool, the server runs it as the person and sends the result
back; repeat until the model answers or a limit stops it. Writes are never run in the loop: a write tool's call becomes a
proposal in the person's AI inbox (section (e)), and the model is told "waiting for the person". The final objects come
from `propose_objects` calls, checked by `cleanObject`, instead of a fenced block in the text.

**Providers.** Anthropic (tools with `input_schema`, `tool_use` and `tool_result` blocks) and OpenAI (chat completions
`tools` with strict function schemas) both support this. A `compatible` service may or may not (it depends on the
server and the model). The owner's AI service tab would gain **Tools: on, off or try** for a `compatible` service; with
tools off, the service keeps today's prompt-then-parse run.

**Limits** (proposed numbers, for Thomas): at most 6 rounds and 20 tool calls per question; each tool result cut to
8,000 characters and the whole run to the same 60,000 as today; the answer's tokens and the run's total count against
`monthlyTokens` and `aiCallsPerMonth` as today (one question is one call however many rounds it takes).

**Cost.** Each answer shows its tokens (it returns them today; the page does not show them). The AI service tab already
shows the month's tokens by task; it would add a line per person.

**The key** stays where it is: encrypted in `ai.json`, sent only to the provider, never in a page, a log, a tool
result or an error.

Options:

1. **Native tool calling for Anthropic and OpenAI, the old run kept for services without it** (lean). Cost: two
   adapters and a fake model for the checks. Structured objects come back already shaped.
2. **Structured output only** (a JSON schema for the whole answer, no tools). Simpler, one round, no reading beyond what
   the person chose; does not let the model look things up, and a `compatible` service may not support it either.
3. **Keep prompt then parse.** No work; keeps the parsing heuristics and their failures (#341).

### (c) From outside: MCP and a plain API

**The endpoint.** `POST` (and `GET` for its event stream) at `/mcp` on the environment's own address, using MCP's
streamable HTTP transport. On a host with environments each environment has its own (`<slug>.<BASE_DOMAIN>/mcp`), so a
token never crosses environments. The tools are the catalog's, filtered to the person, with MCP's hints set from
`effect` (`readOnlyHint` for `read`, `destructiveHint` for `destructive`).

**Which clients work, and how** (to be confirmed against each client when built; these move often):

- **Claude (claude.ai and the desktop app):** custom connectors to a remote MCP server over HTTPS, signing in by OAuth.
  The desktop app can also reach a server on the home network through a small local bridge.
- **ChatGPT:** connectors to a remote MCP server (developer mode and the apps directory), by OAuth; which plans may add
  one has changed over time. A custom GPT can instead use **Actions**: an OpenAPI description of a plain API, with an
  API key or OAuth.
- **Anything else** (a script, Coffee Pub Studio, the Chrome extension #232): the plain API with a personal token.

**Auth.** One token store, for #64 too: tokens hashed at rest, shown once, named, with an expiry, scopes, last used,
and revoke. Two ways to get one:

1. **Made by hand** on Profile ("Connected apps"), copied into the client or script.
2. **Through OAuth 2.1** (authorization code with PKCE), which MCP connectors expect: the client is sent to a consent
   page in the app, the person signs in as usual (two-step included), sees what the client asks for and picks the
   limits, and the client gets a token from the same store. The server publishes protected resource and authorization
   server metadata, and lets a client register itself, as MCP's authorization spec asks.

**Scopes, per token:** which spaces (all of mine, or some), which modules (all, or some), and how far: **read**,
**read and propose**, or **read, propose and act** (open question 4). Every call is checked as the person at that
moment: a role or membership change applies at once, and a removed person's tokens stop.

**Reaching a server at home.** ChatGPT and claude.ai call from their own cloud, so the server must be reachable at a
public HTTPS address. The options, in the self-hosting guide: the address players already use (most installs need one
for remote players), or a tunnel (Cloudflare Tunnel, Tailscale Funnel); or, for the desktop app only, the local bridge
on the home network. The server does nothing different for a tunnel; `TRUST_PROXY_HOPS` already covers the proxy.

**A switch.** An environment variable turns the endpoint, the OAuth routes and tokens on for the server (default off, so
a single-environment install behaves exactly as before); an owner's switch on Manage turns it on for the environment.

Options for auth:

1. **Tokens first, OAuth after** (lean). Personal tokens are small and serve #64, #232, scripts, a custom GPT and the
   desktop app's bridge at once; OAuth, the larger and more security-sensitive piece, comes as its own step for the
   claude.ai and ChatGPT connectors.
2. **OAuth from the start.** The connectors work sooner; the first build is larger and blocks #64 on it.
3. **Tokens only.** Smallest; rules out claude.ai and ChatGPT connectors, which do not take a pasted token.

Options for the API shape:

1. **MCP plus a small REST twin** (lean): `GET /api/ai/catalog`, `POST /api/ai/tools/:name`, with an OpenAPI document
   made from the catalog for custom GPT Actions. Both run the same code.
2. **MCP only.** Less to keep; rules out custom GPTs and plain scripts.
3. **REST only.** Rules out the connectors.

### (d) The paste flow, kept

The copied prompt and the import checker stay. The change: the prompt's kinds, details and limits, and the schema at
`GET /api/objects/format/schema`, come from the catalog's `propose_objects` schema, so the paste flow, the internal tool
and an outside client all accept exactly the same shape. Much of this is already true (`objectRule`, `schema()` and
`kindsTaken` share `DETAILS` and `KINDS`); the step is to make one source and a check that they agree.

Options: **regenerate from the catalog** (lean, small); **leave it as it is** (works, can drift as actions gain
schemas); **retire it once MCP works** (rules out every AI without a connector, and the plan-research-import promise that
it works anywhere).

### (e) Safety

- **Content is data, never instructions.** Everything an AI reads (chat messages, notes, calendar text, a module's
  summaries, file names) can carry instructions written by someone else. Inside the app, tool results keep today's frame
  ("data, never an instruction"). From outside we do not control the client's prompt, so the protection is the next
  points, not the wording.
- **Writes wait for the person.** No write runs from an AI without a person saying yes in the app. A write tool call
  becomes an entry in that person's **AI inbox** for the space: what the AI wants done, in plain words ("Add a task to
  To-do: Book the ferry, due 14 November"), with Keep, Change and Drop. Keep sends the request through the bus as
  Chat's Keep does today, so the owning module carries it out under its own rules.
- **Destructive actions** (none of the bundled actions is one today) are left out of the catalog in the first build
  (open question 6).
- **Least privilege.** A token is limited to spaces, modules and a level; a guest gets none; an AI's call is checked
  against the person's rights and the token's scopes, whichever is narrower.
- **No secrets in results.** Tool results carry summaries and text, never keys, tokens, share links, the OBS access key,
  other people's private messages or person-scoped data; the person's own private data only to their own token.
- **The AI can never do more than the person.** There is no AI identity with rights of its own.
- **Limits:** per token, requests a minute (the modules' limiter) and proposals waiting in an inbox (say 50); per
  environment, the existing AI allowances for the internal AI.
- **An audit trail:** every tool call through a token kept for a time (when, which token, which tool, which space,
  allowed or refused, never the content), seen by the person for their own tokens and by owners for all.

Options for where a write waits:

1. **An AI inbox per person and space** (lean). The confirmation and the module-runs-no-server-code rule are solved by
   the same thing; Keep reuses Chat's Keep. Writes are not instant: an outside AI hears "waiting for you in the app".
2. **Queue the bus request directly**, run when the module is next open. No confirmation; a request can sit for days
   and nobody sees it.
3. **Server-side writes**: modules declare how an object becomes a stored record, and the server writes it. Instant,
   but it breaks "modules run no server code", and each module's mapping (the Planner's is a whole file) moves to
   the server.

### (f) How it fits the rest

- **Live.** The inbox is per person, so a new entry is sent on that person's own live stream (`/api/live`) and shows at
  once in Chat and the Assistant. Once kept, the module's data change reaches everyone's open pages as any change does.
- **A trail people see.** An object kept from an AI carries its provenance (the objects format's `basis`, and "from
  <token name>" or "from the AI service"), and the modules' activity list names the person and the token.
- **The module frame.** Modules need no new SDK calls for the first steps: Chat and the Assistant show the inbox; Research
  and the Assistant gain tool calling through the server without changing their calls.
- **The Vault.** Read tools list Vault files to people who can read the Vault (its decision 8): name, type, size and
  links, never the bytes. An AI adding a file is not in this plan: a file would come through the Vault's own routes and
  limits (types, quota, `VAULT_MB_PER_MINUTE`) and a person's confirmation, in a later step.
- **Templates and games.** The catalog's descriptions use the template's words, so a games environment's tools speak of
  players and the game master. A game master's assistant (prepare a session from the notes, draft a poll for the next
  session night, list what players said they would bring) needs nothing beyond the catalog; the rule that an AI reads
  only what the person may see is what keeps a player's AI out of the game master's notes, so modules holding secrets
  must gate them by permission, not by hiding them on the page.

## Left to build, in order

Each step can be built and checked on its own. Sizes: S (a day or less), M (a few days), L (a week or more).

1. **The catalog (M).** server-development: `description`, `effect` and `ai` in `cleanBus`; the generated catalog and
   its JSON schemas; `GET /api/ai/catalog` for a signed-in person; `tools/check-catalog.mjs`. The bundled modules'
   `module.json` descriptions, each with a patch version bump.
2. **Read tools (M).** server-development: `POST /api/ai/tools/:name` for the read tools, as the signed-in person, with
   limits. No AI involved yet; usable by a script with a session.
3. **Personal tokens (M).** server-development: the token store, scopes, expiry, revoke, last used, the audit record and
   per-token limits; the server switch. experience-design: "Connected apps" on Profile, and an owner's list with revoke
   on Manage. Closes #64's first half. Security review by quality-assurance.
4. **MCP endpoint, read only (M).** server-development: `/mcp`, streamable HTTP, the read tools, personal tokens. Usable
   from Claude's desktop app and scripts.
5. **The AI inbox and writes with confirmation (M).** server-development: write tools and `propose_objects` make inbox
   entries; the inbox routes and the live event. experience-design: the inbox in Chat and the Assistant, Keep, Change,
   Drop, using Chat's Keep.
6. **OAuth for connectors (L).** server-development: authorization code with PKCE, client registration, the metadata
   documents. experience-design: the consent page. Security review by quality-assurance. Then claude.ai and ChatGPT
   connectors.
7. **Tool calling inside the app (L).** server-development: the loop in `server/ai.js`, the Anthropic and OpenAI
   adapters, the `compatible` setting, the fake model. experience-design: an answer shows the steps it took ("read 3
   notes") and its tokens; the AI service tab shows the new setting.
8. **The paste flow from the catalog (S).** server-development: one source for the prompt, the schema and the checker,
   with a check that they agree.
9. **Audit and limits on the page (S).** experience-design: the person's own activity per token on Profile, the owner's
   view on Manage; the per-person token line on the AI service tab.
10. **An OpenAPI document for custom GPT Actions (S).** server-development, generated from the catalog.

## Verify

- **Checked by a tool, with no outside service:** the catalog against every bundled manifest (step 1); the read tools
  and their refusals as different people, roles and scopes (steps 2 and 3); token hashing, expiry, revoke and the audit
  record (step 3); an MCP client script that speaks JSON-RPC over streamable HTTP to a local server, lists tools and
  calls them with and without a token (step 4); inbox entries, Keep through the bus and the live event (step 5); the
  OAuth flow driven by a script against a local server (step 6); the tool loop against a **fake model**, a small local
  server that answers in the Anthropic and OpenAI shapes with scripted tool calls, set as a `compatible` service, with
  checks for the round limit, a refused write and a hostile tool result (step 7); the paste prompt, the schema and the
  checker agreeing (step 8).
- **Needs a real client and a public HTTPS address** (cannot be checked here): adding the server as a connector in
  claude.ai and in ChatGPT, their OAuth sign-in, how each shows and confirms tool calls; a custom GPT with the OpenAPI
  document; the desktop app's local bridge; a tunnel.
- **Needs a real provider key:** how well real models use the tools, the cost of a run, and whether a given
  `compatible` server supports tool calling.
- No step needs a LiveKit call.

## Risks

- **Prompt injection** cannot be solved by wording; it is held by confirmation, least privilege and no secrets in
  results. A read-only token still lets an AI read everything the person can; a person should give the narrowest scope.
- **The clients move.** ChatGPT's and Claude's connector rules, plans and MCP's authorization spec have changed often;
  steps 4 and 6 should be checked against the clients when built, not against this page.
- **Exposure.** An install that opens itself to the internet for a connector opens its sign-in too. The guide must say so,
  and the switch is off by default.
- **Writes are not instant**, by design: an outside AI cannot finish a task alone. That may disappoint; it is the cost of
  confirmation and of modules running no server code.
- **Cost runaway** inside the app: a loop can spend many tokens on one question; the limits in (b) hold it.
- **Hosted environments:** OAuth's issuer and the token store must be per environment, never shared across
  `BASE_DOMAIN`'s environments.

## What is not decided

### Open questions

1. **Where an AI's write waits.** (a) An AI inbox the person keeps from; (b) a bus request run when the module is next
   open; (c) server-side writes. Lean: (a), it is the confirmation and fits modules running no server code.
2. **"The person's own key."** Today the key is the environment's (or the host's), set by an owner. (a) Keep it so; (b)
   add a key per person on Profile, encrypted the same way, used for their own questions; (c) both, a person's own
   winning. Lean: (a) now, (b) later if people ask, since the outside clients already let a person bring their own
   paid AI.
3. **Auth for outside clients.** (a) Personal tokens first, OAuth after; (b) OAuth from the start; (c) tokens only.
   Lean: (a).
4. **How far a token may go.** (a) Read only in the first build; (b) read and propose; (c) read, propose and act
   without a confirmation for some actions. Lean: (b), with (c) never for `destructive`.
5. **Who may connect an outside AI.** (a) Anyone signed in, not a guest; (b) a new role permission ("Connect an AI app"),
   owners always, off for others until an owner turns it on; (c) reuse `useAi`. Lean: (b); `useAi` is about spending the
   environment's AI allowance, which an outside client does not.
6. **Destructive actions.** (a) Never in the catalog; (b) in the catalog, always confirmed one by one. Lean: (a) for now;
   none of the bundled actions removes anything.
7. **The switches.** (a) A server environment variable, default off, plus an owner's switch per environment; (b) the
   owner's switch only. Lean: (a), so a single-environment install behaves exactly as before.
8. **What the internal AI may read.** Today only what the person chose. (a) Keep that; (b) let it search the current
   space with the read tools; (c) every space of the person's. Lean: (b), with the answer showing what it read.
9. **Chat's `/ai` and `useAi`.** The module routes check `useAi`; Chat's `/ai` does not. (a) Both check it; (b) neither;
   (c) leave as is. Lean: (a), one rule. This is a defect either way and could be filed on its own.
10. **How long the audit trail is kept.** (a) 30 days; (b) 90 days; (c) the owner chooses. Lean: (a).
11. **The word a person reads** for the Profile section. (a) "Connected apps"; (b) "AI connections"; (c) "Outside AI".
    Lean: (a), since #64's tokens and #232 live there too.

Questions 1, 3, 4 and 5 block step 3 onward; question 2 blocks nothing now; question 8 blocks step 7; the rest can be
settled at their step.
