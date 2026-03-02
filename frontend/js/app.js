// ==============================================================
// PAYSCHOOL - Utilidades Globales del Frontend
// ==============================================================
// Este archivo se incluye en TODAS las páginas del sistema.
// Contiene:
//   - api: cliente HTTP para comunicarse con el backend
//   - toast: notificaciones visuales en pantalla
//   - modal: control de modales
//   - fmt: formateadores de moneda, fecha, etc.
//   - Helpers de estado (badges, etiquetas)
//   - Setup de sidebar y notificaciones
// ==============================================================

// --------------------------------------------------------------
// CONFIGURACIÓN
// Cambia API_URL según tu entorno:
//   LOCAL:      http://localhost:3000/api
//   VERCEL:     /api  (relativo, funciona automáticamente)
// --------------------------------------------------------------
const API_URL = '/api'; // En Vercel funciona con ruta relativa

// ==============================================================
// API CLIENT
// Todas las llamadas al backend pasan por aquí
// ==============================================================
const api = {

  // Leer token guardado en localStorage
  getToken: () => localStorage.getItem('ps_token'),

  // Leer datos del usuario guardado
  getUser: () => JSON.parse(localStorage.getItem('ps_user') || 'null'),

  // Construir headers de autorización
  headers: () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${api.getToken()}`
  }),

  // Método base para todas las solicitudes
  async request(method, path, body = null) {
    const opts = { method, headers: api.headers() };
    if (body) opts.body = JSON.stringify(body);

    try {
      const res  = await fetch(`${API_URL}${path}`, opts);
      const data = await res.json();

      // Si el servidor rechaza el token, redirigir al login
      if (res.status === 401) {
        api.logout();
        return null;
      }

      return data;
    } catch (err) {
      console.error(`[API] Error en ${method} ${path}:`, err.message);
      toast.error('Error de conexión con el servidor');
      return null;
    }
  },

  // Métodos HTTP abreviados
  get:    (path)       => api.request('GET',    path),
  post:   (path, body) => api.request('POST',   path, body),
  put:    (path, body) => api.request('PUT',    path, body),
  delete: (path)       => api.request('DELETE', path),

  // Cerrar sesión: limpiar storage y redirigir
  logout() {
    localStorage.removeItem('ps_token');
    localStorage.removeItem('ps_user');
    window.location.href = '/';
  },

  // Verificar que el usuario esté autenticado
  // Si no, redirigir al login
  requireAuth() {
    if (!this.getToken()) {
      window.location.href = '/';
      return false;
    }
    return true;
  }
};

// ==============================================================
// TOAST - Notificaciones visuales en pantalla
// Uso: toast.success('Guardado'), toast.error('Error')
// ==============================================================
const toast = {
  container: null,

  // Crear o encontrar el contenedor
  init() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  // Mostrar un toast
  show(message, type = 'info', duration = 4000) {
    this.init();
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
    this.container.appendChild(t);

    // Auto-remover después del tiempo indicado
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateX(100%)';
      t.style.transition = 'all 0.3s ease';
      setTimeout(() => t.remove(), 300);
    }, duration);
  },

  // Atajos
  success: (msg) => toast.show(msg, 'success'),
  error:   (msg) => toast.show(msg, 'error'),
  info:    (msg) => toast.show(msg, 'info'),
  warning: (msg) => toast.show(msg, 'warning')
};

// ==============================================================
// MODAL - Control de modales
// Uso: modal.open('mi-modal-id'), modal.close('mi-modal-id')
// ==============================================================
const modal = {
  open(id) {
    document.getElementById(id)?.classList.add('active');
    document.body.style.overflow = 'hidden'; // Bloquear scroll del fondo
  },
  close(id) {
    document.getElementById(id)?.classList.remove('active');
    document.body.style.overflow = '';
  },
  closeAll() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    document.body.style.overflow = '';
  }
};

// Cerrar modal al hacer clic en el overlay (fuera del modal)
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) modal.closeAll();
});

// ==============================================================
// FORMATTERS - Funciones de formato
// ==============================================================
const fmt = {
  // Formatear como moneda: fmt.currency(1234.5) → "$1,234.50"
  currency: (val, symbol = '$') =>
    `${symbol}${parseFloat(val || 0).toLocaleString('es', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`,

  // Formatear fecha legible: fmt.date('2025-01-15') → "15/01/2025"
  date: (d) => d
    ? new Date(d).toLocaleDateString('es', { day:'2-digit', month:'2-digit', year:'numeric' })
    : '—',

  // Formatear fecha para input[type=date]
  dateInput: (d) => d ? new Date(d).toISOString().split('T')[0] : '',

  // Número con separadores de miles
  number: (n) => parseInt(n || 0).toLocaleString('es'),

  // Porcentaje
  percent: (n) => `${parseFloat(n || 0).toFixed(1)}%`
};

// ==============================================================
// TIEMPO RELATIVO - "Hace 5 min", "Hace 2h", etc.
// ==============================================================
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr);
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Ahora mismo';
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `Hace ${hrs}h`;
  return `Hace ${Math.floor(hrs / 24)}d`;
}

// ==============================================================
// BADGES DE ESTADO - HTML para mostrar estado con colores
// ==============================================================
function statusBadge(estado) {
  const map = {
    'borrador':   '<span class="badge badge-info">📝 Borrador</span>',
    'procesando': '<span class="badge badge-warning">⚙️ Procesando</span>',
    'aprobado':   '<span class="badge badge-purple">✅ Aprobado</span>',
    'pagado':     '<span class="badge badge-success">💰 Pagado</span>',
    'cerrado':    '<span class="badge badge-error">🔒 Cerrado</span>',
    'pendiente':  '<span class="badge badge-warning">⏳ Pendiente</span>',
    'activo':     '<span class="badge badge-success">● Activo</span>',
    'inactivo':   '<span class="badge badge-error">● Inactivo</span>',
  };
  return map[estado] || `<span class="badge badge-info">${estado}</span>`;
}

// Etiqueta legible para tipo de contrato
function contratoLabel(tipo) {
  const map = {
    'tiempo_completo': 'Tiempo Completo',
    'medio_tiempo':    'Medio Tiempo',
    'temporal':        'Temporal',
    'honorarios':      'Honorarios'
  };
  return map[tipo] || tipo;
}

// ==============================================================
// SETUP DEL SIDEBAR
// Rellena nombre, apellido, rol y avatar con las iniciales
// ==============================================================
function setupSidebar() {
  const user = api.getUser();
  if (!user) return;

  const nameEl   = document.getElementById('user-name');
  const roleEl   = document.getElementById('user-role');
  const avatarEl = document.getElementById('user-avatar');

  if (nameEl)   nameEl.textContent = `${user.nombre} ${user.apellido}`;
  if (roleEl)   roleEl.textContent = user.rol_nombre || user.rol || 'usuario';
  if (avatarEl) {
    // Mostrar iniciales del nombre en el avatar
    const initials = `${user.nombre?.charAt(0) || ''}${user.apellido?.charAt(0) || ''}`.toUpperCase();
    avatarEl.textContent = initials;
  }
}

// ==============================================================
// NOTIFICACIONES - Panel de notificaciones
// ==============================================================
async function loadNotifications() {
  try {
    const data = await api.get('/notificaciones');
    if (!data?.success) return;

    // Actualizar punto rojo si hay no leídas
    const dot  = document.getElementById('notif-dot');
    const list = document.getElementById('notif-list');

    if (dot)  dot.style.display = data.no_leidas > 0 ? 'block' : 'none';

    // Renderizar lista de notificaciones
    if (list) {
      list.innerHTML = data.data.length
        ? data.data.slice(0, 10).map(n => `
            <div class="notif-item ${n.leida ? '' : 'unread'}" onclick="markRead(${n.id})">
              <div class="notif-icon-wrap ${n.tipo}">
                ${n.tipo === 'pago' ? '💰' : n.tipo === 'warning' ? '⚠️' : 'ℹ️'}
              </div>
              <div class="notif-content">
                <h4>${n.titulo}</h4>
                <p>${n.mensaje}</p>
                <div class="notif-time">${timeAgo(n.created_at)}</div>
              </div>
            </div>
          `).join('')
        : '<div style="padding:24px;text-align:center;color:var(--text-muted)">Sin notificaciones 🎉</div>';
    }
  } catch (e) {
    // Silenciar errores de notificaciones para no interrumpir la UI
  }
}

// Marcar una notificación como leída
async function markRead(id) {
  await api.put(`/notificaciones/${id}/leer`);
  loadNotifications();
}

// Marcar todas como leídas
async function markAllRead() {
  await api.put('/notificaciones/leer-todas/all');
  loadNotifications();
  toast.success('Todas las notificaciones marcadas como leídas');
}

// Toggle del panel de notificaciones
function toggleNotifPanel() {
  const panel = document.getElementById('notif-panel');
  if (panel) {
    panel.classList.toggle('active');
    if (panel.classList.contains('active')) loadNotifications();
  }
}

// ==============================================================
// INICIALIZACIÓN cuando el DOM está listo
// ==============================================================
document.addEventListener('DOMContentLoaded', () => {

  // Rellenar sidebar con datos del usuario
  setupSidebar();

  // Botón de logout
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    if (confirm('¿Cerrar sesión?')) {
      api.post('/auth/logout').finally(() => api.logout());
    }
  });

  // Botón de notificaciones en el topbar
  document.getElementById('notif-btn')?.addEventListener('click', toggleNotifPanel);

  // Cerrar panel de notificaciones al hacer clic afuera
  document.addEventListener('click', (e) => {
    const panel = document.getElementById('notif-panel');
    const btn   = document.getElementById('notif-btn');
    if (panel?.classList.contains('active')
        && !panel.contains(e.target)
        && !btn?.contains(e.target)) {
      panel.classList.remove('active');
    }
  });
});
