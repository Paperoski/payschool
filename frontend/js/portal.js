(function () {
  const ROLE_ORDER = { empleado: 1, usuario: 1, contador: 2, admin: 3, rectoria: 4, superadmin: 5 };

  function getUser() {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  }

  function level(role) { return ROLE_ORDER[String(role || '').toLowerCase()] || 1; }

  function guardPage(minRole) {
    const user = getUser();
    if (!user.email) {
      window.location.href = '/';
      return false;
    }
    if (minRole && level(user.rol) < level(minRole)) {
      alert('No tienes permisos para entrar en esta sección.');
      window.location.href = '/dashboard.html';
      return false;
    }
    return true;
  }

  function applyMenuAccess() {
    const user = getUser();
    const lvl = level(user.rol);
    const accountingLink = document.querySelector('a[href="/accounting.html"]');
    const usersLink = document.querySelector('a[href="/users.html"]');
    if (accountingLink && lvl < level('contador')) accountingLink.style.display = 'none';
    if (usersLink && lvl < level('admin')) usersLink.style.display = 'none';
  }

  async function apiFetch(url, options = {}) {
    const user = getUser();
    const headers = { ...(options.headers || {}), 'X-User-Role': user.rol || 'usuario', 'X-User-Email': user.email || '' };
    return fetch(url, { ...options, headers });
  }

  window.portal = { getUser, level, guardPage, applyMenuAccess, apiFetch };
})();
