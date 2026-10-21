// The owner's banner on every page of a hosted environment whose payment has lapsed (or that the host suspended):
// a line under the header saying so and when the environment goes to the free plan. Only the owner (or the host admin) sees
// it, and only on a host with environments; everyone else, and every single-environment server, costs nothing here.
// brand.js calls this once the header is drawn.
import { word } from '/words.js';

// getMe: brand.js's one shared GET /api/me (null for a guest, who is not asked at all).
export async function mountEnvironmentBanner(getMe) {
  if (document.querySelector('.sdk-banner-wide[data-page-banner="environment"]')) return;
  const me = await getMe();
  if (!me) return;
  const env = me && me.environment;
  if (!env || !env.hosted || !(env.owner || env.hostAdmin)) return;
  let info;
  try {
    const res = await fetch('/api/environment');
    if (!res.ok) return;
    info = await res.json();
  } catch (err) {
    return;
  }
  if (info.status !== 'pastDue' && info.status !== 'suspended') return;
  const banner = document.createElement('div');
  banner.className = 'sdk-banner sdk-banner-wide';
  banner.dataset.kind = 'danger';
  banner.dataset.pageBanner = 'environment';
  banner.setAttribute('role', 'status');
  banner.innerHTML = '<span class="sdk-banner-icon" aria-hidden="true"><i class="fa-solid fa-circle-exclamation"></i></span><span class="sdk-banner-text"></span><a class="btn btn-small sdk-banner-action" href="/admin">Manage</a>';
  const text = banner.querySelector('.sdk-banner-text');
  if (info.status === 'pastDue') {
    const until = info.graceEndsAt ? new Date(info.graceEndsAt).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) : 'soon';
    text.textContent = `Payment for this ${word('environment')} is overdue. It goes to the free plan on ${until}; nothing is deleted.`;
  } else {
    text.textContent = `This ${word('environment')} is suspended by the ${word('host')}.`;
  }
  const topbar = document.querySelector('.topbar');
  if (topbar) topbar.after(banner); else document.body.prepend(banner);
}
