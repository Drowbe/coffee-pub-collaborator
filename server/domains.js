// The addresses a server with environments answers at (documentation/plans/plan-domains.md): environments at
// <slug>.<BASE_DOMAIN>, the host console at admin.<BASE_DOMAIN>, and the product pages (the front page, the use pages
// and sign-up) at PRODUCT_DOMAIN, the bare BASE_DOMAIN when that is unset. Every host is a setting, never code.
// Pure functions, so tools/check-host-registry.mjs can run them on their own; server/index.js reads the settings
// and acts on what these return (a line on start, a stop, the door).
'use strict';

// A host name: dot-separated labels of letters, digits and hyphens, none starting or ending with a hyphen. No
// scheme, no port, no path; at most 253 characters.
const LABEL = '[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?';
const HOST_RE = new RegExp(`^${LABEL}(\\.${LABEL})*$`);

function isHostName(value) {
  return typeof value === 'string' && value.length <= 253 && HOST_RE.test(value);
}

// The host part of an address that may carry a scheme, a port or a path (LIVEKIT_HOST is "localhost:7880" or
// "livekit.example.com" or, by hand, "wss://livekit.example.com/"), lower-cased; '' when there is none.
function hostOf(address) {
  let s = String(address || '').trim().toLowerCase();
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  s = s.split(/[/?#]/)[0];
  if (s.startsWith('[')) return ''; // an IPv6 address is never a name under a base domain
  return s.split(':')[0];
}

// The first label of `host` when it sits directly under `base` (livekit.example.com under example.com: "livekit"),
// else null.
function labelUnder(host, base) {
  if (!host || !base || !host.endsWith(`.${base}`)) return null;
  const label = host.slice(0, host.length - base.length - 1);
  return label && !label.includes('.') ? label : null;
}

// A comma list of names (RESERVED_SLUGS): trimmed, lower-cased, empty ones dropped, each once.
function nameList(value) {
  return [...new Set(String(value || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean))];
}

// What the settings mean, before any environment is looked at:
//   productHost      the host the product pages answer at (the bare base when PRODUCT_DOMAIN is unset, equal to the
//                    base, or not a host name: then the start stops)
//   productElsewhere true when that is not the bare base, so the bare base redirects there
//   consoleHost      admin.<base>, always (plan-domains decision 6: no CONSOLE_HOST)
//   reservedNames    RESERVED_SLUGS' names, plus the automatic labels: PRODUCT_DOMAIN's and LIVEKIT_HOST's first
//                    label when each sits directly under the base
//   productLabel     PRODUCT_DOMAIN's own first label when it sits directly under the base (an environment with that
//                    slug would be hidden by the product pages: the start stops), else null
//   warnings         lines to print on start, the setting named in each
//   stop             a line that stops the start, or null
// With no base domain every setting here is ignored, and one warning names those that are set.
function domainSettings({ baseDomain = '', productDomain = '', reservedSlugs = '', livekitHost = '' } = {}) {
  const base = String(baseDomain || '').trim().toLowerCase();
  const product = String(productDomain || '').trim().toLowerCase();
  const warnings = [];
  if (!base) {
    const set = [['PRODUCT_DOMAIN', productDomain], ['RESERVED_SLUGS', reservedSlugs]].filter(([, v]) => String(v || '').trim()).map(([k]) => k);
    if (set.length) warnings.push(`${set.join(' and ')} ${set.length === 1 ? 'is' : 'are'} ignored without BASE_DOMAIN: this server has one environment, at its own address.`);
    return { productHost: '', productElsewhere: false, consoleHost: '', reservedNames: [], productLabel: null, warnings, stop: null };
  }
  const consoleHost = `admin.${base}`;
  let productHost = base;
  let stop = null;
  if (product && product !== base) {
    if (!isHostName(product)) {
      stop = `PRODUCT_DOMAIN=${String(productDomain).trim()} is not a host name (like www.example.com: no https://, no port, no path). Fix or remove it.`;
    } else if (product === consoleHost) {
      stop = `PRODUCT_DOMAIN=${product} is the host console's address. Pick another host for the product pages.`;
    } else {
      productHost = product;
    }
  }
  const reservedNames = [];
  for (const name of nameList(reservedSlugs)) {
    if (/^[a-z0-9-]+$/.test(name)) reservedNames.push(name);
    else warnings.push(`RESERVED_SLUGS: "${name}" is not a name an environment could have, so it is left out.`);
  }
  const productLabel = productHost !== base ? labelUnder(productHost, base) : null;
  const livekitLabel = labelUnder(hostOf(livekitHost), base);
  for (const label of [productLabel, livekitLabel]) if (label && !reservedNames.includes(label)) reservedNames.push(label);
  return { productHost, productElsewhere: productHost !== base, consoleHost, reservedNames, productLabel, warnings, stop };
}

module.exports = { domainSettings, isHostName, hostOf, labelUnder, nameList };
