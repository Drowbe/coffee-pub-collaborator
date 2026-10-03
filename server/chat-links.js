// Links in Chat (plan-chat-links.md, GitHub #158): the one rule for which address in an ordinary message is "its
// link", and the shape of what is stored about it (`preview`, `kept`). The posting route and the preview route both use
// findLink, so the address a message's preview reads is the address Keep saves. Nothing here fetches anything: the
// page is read by fetchPreview in server/link-preview.js, and nothing here names a module.

'use strict';

const MAX_URL = 500; // Research's own limit for a link
const MAX_TITLE = 120;
const MAX_DESCRIPTION = 500;
const MAX_IMAGE = 2000;
const PREVIEW_WINDOW_MS = 5 * 60 * 1000; // a preview is asked for only in a message's first five minutes

// The same patterns hostText.markdown (public/sdk/host.js) links: `[text](https://...)`, and a bare address after
// the start of a line, a space or "(", with trailing punctuation left off.
const MARKDOWN_LINK = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g;
const BARE_LINK = /(^|[\s(])(https?:\/\/[^\s<]+[^\s<.,;:!?)"'])/g;

// An address as a link for this purpose, or '' (not http or https, a user name or password, over MAX_URL characters,
// or not an address at all).
function usableUrl(text) {
  const raw = String(text || '');
  if (!raw || raw.length > MAX_URL) return '';
  let u;
  try { u = new URL(raw); } catch { return ''; }
  if ((u.protocol !== 'https:' && u.protocol !== 'http:') || u.username || u.password || !u.hostname) return '';
  return raw;
}

// The first link in a message's text, or ''. Lines inside a ``` fence and `>` quoted lines are skipped (a reply
// quotes the message it answers; that link is the other message's), and `code` spans are blanked out. An address that
// is not usable (usableUrl) is not a link and is passed over; the first usable one is the message's one link (decision 8).
function findLink(text) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  let fenced = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) { fenced = !fenced; continue; }
    if (fenced || /^\s*>/.test(line)) continue;
    const plain = line.replace(/`[^`\n]+`/g, (m) => ' '.repeat(m.length));
    const found = [];
    const masked = plain.replace(MARKDOWN_LINK, (all, _label, url, at) => {
      found.push({ at, url });
      return ' '.repeat(all.length);
    });
    for (const m of masked.matchAll(BARE_LINK)) found.push({ at: m.index + m[1].length, url: m[2] });
    found.sort((a, b) => a.at - b.at);
    for (const f of found) {
      const url = usableUrl(f.url);
      if (url) return url;
    }
  }
  return '';
}

const oneLine = (v, max) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, max);

// What a successful read adds to a message's preview: title (120), description (500, cut with an ellipsis), image (an
// http or https address of up to 2000 characters, else left out) and when it was read. Empty fields are left out.
function readFields(fetched, at = Date.now()) {
  const out = {};
  const title = oneLine(fetched && fetched.title, MAX_TITLE);
  if (title) out.title = title;
  const full = oneLine(fetched && fetched.description, 4000);
  if (full) out.description = full.length > MAX_DESCRIPTION ? `${full.slice(0, MAX_DESCRIPTION - 1).trimEnd()}…` : full;
  const image = String((fetched && fetched.image) || '');
  if (image && image.length <= MAX_IMAGE && /^https?:\/\//i.test(image)) out.image = image;
  out.at = Math.floor(at);
  return out;
}

module.exports = { findLink, usableUrl, readFields, CHAT_LINK_LIMITS: { MAX_URL, MAX_TITLE, MAX_DESCRIPTION, MAX_IMAGE, PREVIEW_WINDOW_MS } };
