// Shared client helpers

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

async function requireAuthRole(role) {
  try {
    const me = await api('/api/auth/me');
    if (role !== undefined && me.role !== role) {
      window.location.href = me.role === 'donor' ? '/donor-dashboard.html' : '/ngo-dashboard.html';
      return null;
    }
    return me;
  } catch {
    window.location.href = '/index.html';
    return null;
  }
}

function renderNavbar(me, active) {
  const isDonor = me.role === 'donor';
  const links = isDonor
    ? [
        ['Dashboard', '/donor-dashboard.html'],
        ['Add Food', '/add-food.html'],
        ['My Listings', '/my-listings.html'],
        ['Claims', '/donor-claims.html']
      ]
    : [
        ['Dashboard', '/ngo-dashboard.html'],
        ['Browse Food', '/browse-food.html'],
        ['My Claims', '/my-claims.html']
      ];

  const linkHtml = links
    .map(([label, href]) => `<a href="${href}" class="${active === href ? 'active' : ''}">${label}</a>`)
    .join('');

  document.body.insertAdjacentHTML(
    'afterbegin',
    `<header class="navbar">
      <h1>FoodShare · ${me.role.toUpperCase()}</h1>
      <nav>
        ${linkHtml}
        <span class="user-info">${me.name}</span>
        <a href="#" id="logoutBtn">Logout</a>
      </nav>
    </header>`
  );

  document.getElementById('logoutBtn').addEventListener('click', async (e) => {
    e.preventDefault();
    await api('/api/auth/logout', { method: 'POST' });
    window.location.href = '/index.html';
  });
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString();
}

function expiryClass(d) {
  const ms = new Date(d).getTime() - Date.now();
  if (ms < 0) return 'expiry-danger';
  if (ms < 6 * 3600 * 1000) return 'expiry-danger';
  if (ms < 24 * 3600 * 1000) return 'expiry-warning';
  return '';
}

function showAlert(container, type, msg) {
  container.innerHTML = `<div class="alert ${type}">${msg}</div>`;
  if (type === 'success') setTimeout(() => (container.innerHTML = ''), 2500);
}
