// ==============================================================
// COLEGIO BOSTON - Base de Datos Local (archivos JSON)
// ==============================================================
// Para probar localmente SIN necesitar MySQL ni internet.
// Los datos se guardan en /data/*.json en tu computador.
//
// Cuando quieras pasarlo a producción (Vercel + MySQL):
//   1. Reemplaza este archivo por api/config/db.mysql.js
//   2. Configura las variables de entorno DB_*
//   ¡El resto del backend no cambia nada!
//
// ARCHIVOS QUE SE CREAN EN /data/:
//   roles.json, usuarios.json, departamentos.json,
//   empleados.json, periodos_nomina.json, nominas.json,
//   detalle_nomina.json, conceptos_nomina.json,
//   notificaciones.json, logs_actividad.json
// ==============================================================

const fs   = require('fs');
const path = require('path');

// Ruta donde se guardan los JSON (raíz del proyecto /data/)
const DATA_DIR = path.join(__dirname, '../../data');

// Crear la carpeta si no existe
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log('📁 [DB-LOCAL] Carpeta /data creada');
}

// ==============================================================
// Helpers internos
// ==============================================================

// Leer tabla desde JSON
function readTable(name) {
  const file = path.join(DATA_DIR, `${name}.json`);
  if (!fs.existsSync(file)) return [];
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return []; }
}

// Guardar tabla a JSON
function writeTable(name, data) {
  fs.writeFileSync(path.join(DATA_DIR, `${name}.json`), JSON.stringify(data, null, 2), 'utf8');
}

// ID autoincremental
function nextId(table) {
  const rows = readTable(table);
  if (!rows.length) return 1;
  return Math.max(...rows.map(r => r.id || 0)) + 1;
}

// Timestamp ISO
const now = () => new Date().toISOString();

// ==============================================================
// DATOS INICIALES
// Se crean solo si los archivos JSON no existen todavía
// ==============================================================
function initData() {
  // Roles
  if (!readTable('roles').length) {
    writeTable('roles', [
      { id:1, nombre:'superadmin', descripcion:'Acceso total',             permisos:'["all"]' },
      { id:2, nombre:'admin',      descripcion:'Administrador de nómina',  permisos:'["nomina","empleados","reportes","usuarios"]' },
      { id:3, nombre:'contador',   descripcion:'Acceso contable',          permisos:'["nomina","reportes","libros"]' },
      { id:4, nombre:'empleado',   descripcion:'Solo sus recibos',         permisos:'["recibos"]' }
    ]);
    console.log('✅ [DB-LOCAL] Roles creados');
  }

  // Usuario admin por defecto
  // Contraseña: "password" hasheada con bcrypt
  if (!readTable('usuarios').length) {
    const bcrypt = require('bcryptjs');
    const hash   = bcrypt.hashSync('password', 10);
    writeTable('usuarios', [{
      id:1, nombre:'Super', apellido:'Admin',
      email:'admin@colegioboston.edu.co', password: hash,
      rol_id:1, activo:true,
      ultimo_login: null, created_at: now(), updated_at: now()
    }]);
    console.log('✅ [DB-LOCAL] Usuario admin creado → admin@colegioboston.edu.co / password');
  }

  // Departamentos
  if (!readTable('departamentos').length) {
    writeTable('departamentos', [
      { id:1, nombre:'Dirección',          descripcion:'Dirección general',    activo:true },
      { id:2, nombre:'Docentes',           descripcion:'Personal académico',   activo:true },
      { id:3, nombre:'Administrativo',     descripcion:'Personal admin',       activo:true },
      { id:4, nombre:'Finanzas',           descripcion:'Finanzas y contabilidad', activo:true },
      { id:5, nombre:'Sistemas',           descripcion:'Tecnología',           activo:true },
      { id:6, nombre:'Servicios Generales',descripcion:'Mantenimiento',        activo:true }
    ]);
    console.log('✅ [DB-LOCAL] Departamentos creados');
  }

  // Conceptos de nómina
  if (!readTable('conceptos_nomina').length) {
    writeTable('conceptos_nomina', [
      { id:1, codigo:'SAL001', nombre:'Salario Base',            tipo:'ingreso',         calculo:'fijo',       valor:0,    aplica_todos:true,  activo:true },
      { id:2, codigo:'BON001', nombre:'Bono de Transporte',      tipo:'ingreso',         calculo:'fijo',       valor:150,  aplica_todos:true,  activo:true },
      { id:3, codigo:'DED001', nombre:'Seguro Social',           tipo:'deduccion',       calculo:'porcentaje', valor:4,    aplica_todos:true,  activo:true },
      { id:4, codigo:'DED002', nombre:'Impuesto sobre la Renta', tipo:'deduccion',       calculo:'porcentaje', valor:5,    aplica_todos:true,  activo:true },
      { id:5, codigo:'PAT001', nombre:'Aporte Patronal Seguro',  tipo:'aporte_patronal', calculo:'porcentaje', valor:8,    aplica_todos:true,  activo:true }
    ]);
    console.log('✅ [DB-LOCAL] Conceptos de nómina creados');
  }

  // Empleados de ejemplo para pruebas
  if (!readTable('empleados').length) {
    writeTable('empleados', [
      { id:1, codigo:'EMP001', nombre:'María',  apellido:'González', email:'maria@colegioboston.edu.co',  departamento_id:2, cargo:'Docente de Matemáticas', tipo_contrato:'tiempo_completo', fecha_ingreso:'2020-01-15', salario_base:2500, activo:true, created_at:now() },
      { id:2, codigo:'EMP002', nombre:'Carlos', apellido:'Ramírez',  email:'carlos@colegioboston.edu.co', departamento_id:2, cargo:'Docente de Ciencias',    tipo_contrato:'tiempo_completo', fecha_ingreso:'2019-03-01', salario_base:2400, activo:true, created_at:now() },
      { id:3, codigo:'EMP003', nombre:'Laura',  apellido:'Martínez', email:'laura@colegioboston.edu.co',  departamento_id:3, cargo:'Secretaria Académica',   tipo_contrato:'tiempo_completo', fecha_ingreso:'2021-06-01', salario_base:1800, activo:true, created_at:now() },
      { id:4, codigo:'EMP004', nombre:'Pedro',  apellido:'López',    email:'pedro@colegioboston.edu.co',  departamento_id:4, cargo:'Contador General',       tipo_contrato:'tiempo_completo', fecha_ingreso:'2018-09-15', salario_base:3000, activo:true, created_at:now() }
    ]);
    console.log('✅ [DB-LOCAL] Empleados de ejemplo creados');
  }

  // Tablas vacías (se llenan con el uso)
  ['periodos_nomina','nominas','detalle_nomina','notificaciones','logs_actividad','libros_contables','asientos_contables'].forEach(t => {
    if (!fs.existsSync(path.join(DATA_DIR, `${t}.json`))) writeTable(t, []);
  });
}

// Inicializar datos al cargar el módulo
initData();
console.log('✅ [DB-LOCAL] Base de datos JSON lista en /data/');

// ==============================================================
// db - Simula la API de mysql2/promise
// Cada query SQL se analiza y se ejecuta con los JSON locales
// ==============================================================
const db = {

  async query(sql, params = []) {
    const s = sql.trim().replace(/\s+/g, ' ').toLowerCase();

    // ----------------------------------------------------------
    // AUTH
    // ----------------------------------------------------------

    // Login: usuario por email con su rol
    if (s.includes('from usuarios') && s.includes('join roles') && s.includes('email = ?')) {
      const usuarios = readTable('usuarios');
      const roles    = readTable('roles');
      const user     = usuarios.find(u => u.email === params[0] && u.activo !== false);
      if (!user) return [[], []];
      const rol = roles.find(r => r.id === user.rol_id) || {};
      return [[{ ...user, rol_nombre: rol.nombre, permisos: rol.permisos }], []];
    }

    // Auth middleware: usuario por ID con rol
    if (s.includes('from usuarios') && s.includes('join roles') && s.includes('u.id = ?')) {
      const usuarios = readTable('usuarios');
      const roles    = readTable('roles');
      const user     = usuarios.find(u => u.id === params[0] && u.activo !== false);
      if (!user) return [[], []];
      const rol = roles.find(r => r.id === user.rol_id) || {};
      return [[{ ...user, rol_nombre: rol.nombre, permisos: rol.permisos }], []];
    }

    // Leer hash de contraseña (para cambio de contraseña)
    if (s.includes('select password from usuarios')) {
      const user = readTable('usuarios').find(u => u.id === params[0]);
      return [user ? [{ password: user.password }] : [], []];
    }

    // Actualizar ultimo_login
    if (s.includes('update usuarios set ultimo_login')) {
      const usuarios = readTable('usuarios');
      const idx = usuarios.findIndex(u => u.id === params[0]);
      if (idx >= 0) { usuarios[idx].ultimo_login = now(); writeTable('usuarios', usuarios); }
      return [{ affectedRows: 1 }, []];
    }

    // Cambiar contraseña
    if (s.startsWith('update usuarios set password')) {
      const [hash, id] = params;
      const usuarios = readTable('usuarios');
      const idx = usuarios.findIndex(u => u.id === id);
      if (idx >= 0) { usuarios[idx].password = hash; writeTable('usuarios', usuarios); }
      return [{ affectedRows: 1 }, []];
    }

    // ----------------------------------------------------------
    // USUARIOS
    // ----------------------------------------------------------

    // Listar todos con rol
    if (s.includes('from usuarios') && s.includes('join roles') && s.includes('order by u.created_at')) {
      const usuarios = readTable('usuarios');
      const roles    = readTable('roles');
      return [usuarios
        .sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
        .map(u => {
          const { password: _, ...safe } = u;
          const rol = roles.find(r => r.id === u.rol_id) || {};
          return { ...safe, rol: rol.nombre, rol_id: u.rol_id };
        }), []];
    }

    // Verificar email único
    if (s.includes('select id from usuarios where email')) {
      return [readTable('usuarios').filter(u => u.email === params[0]), []];
    }

    // Crear usuario
    if (s.startsWith('insert into usuarios')) {
      const usuarios = readTable('usuarios');
      const [nombre, apellido, email, password, rol_id] = params;
      const id = nextId('usuarios');
      usuarios.push({ id, nombre, apellido, email, password, rol_id, activo:true, ultimo_login:null, created_at:now(), updated_at:now() });
      writeTable('usuarios', usuarios);
      return [{ insertId: id, affectedRows: 1 }, []];
    }

    // Actualizar usuario (con o sin contraseña)
    if (s.startsWith('update usuarios set nombre')) {
      const usuarios = readTable('usuarios');
      const id = params[params.length - 1];
      const idx = usuarios.findIndex(u => u.id === id);
      if (idx >= 0) {
        if (params.length === 7) {
          const [nombre, apellido, email, rol_id, activo, password] = params;
          Object.assign(usuarios[idx], { nombre, apellido, email, rol_id, activo:!!activo, password, updated_at:now() });
        } else {
          const [nombre, apellido, email, rol_id, activo] = params;
          Object.assign(usuarios[idx], { nombre, apellido, email, rol_id, activo:!!activo, updated_at:now() });
        }
        writeTable('usuarios', usuarios);
      }
      return [{ affectedRows: 1 }, []];
    }

    // Desactivar usuario
    if (s.startsWith('update usuarios set activo = false')) {
      const usuarios = readTable('usuarios');
      const idx = usuarios.findIndex(u => u.id === params[0]);
      if (idx >= 0) { usuarios[idx].activo = false; writeTable('usuarios', usuarios); }
      return [{ affectedRows: 1 }, []];
    }

    // Roles disponibles
    if (s.includes('from roles') && s.includes('order by id')) {
      return [readTable('roles').map(r => ({ id:r.id, nombre:r.nombre, descripcion:r.descripcion })), []];
    }

    // ----------------------------------------------------------
    // EMPLEADOS
    // ----------------------------------------------------------

    // Listar con filtros opcionales
    if (s.includes('from empleados') && s.includes('left join departamentos') && s.includes('where 1=1')) {
      let empleados = readTable('empleados');
      const deptos  = readTable('departamentos');
      let pIdx = 0;

      // Filtro activo
      if (sql.includes('e.activo = ?')) {
        const val = params[pIdx++];
        empleados = empleados.filter(e => e.activo === (val === true || val === 1 || val === 'true'));
      }
      // Filtro departamento
      if (sql.includes('e.departamento_id = ?')) {
        empleados = empleados.filter(e => e.departamento_id == params[pIdx++]);
      }
      // Búsqueda de texto
      if (sql.includes('e.nombre LIKE ?')) {
        const term = (params[pIdx] || '').replace(/%/g,'').toLowerCase();
        pIdx += 4;
        empleados = empleados.filter(e =>
          (e.nombre+e.apellido+(e.codigo||'')+(e.email||'')).toLowerCase().includes(term)
        );
      }

      return [empleados
        .sort((a,b) => (a.apellido+a.nombre).localeCompare(b.apellido+b.nombre))
        .map(e => ({ ...e, departamento_nombre: (deptos.find(d => d.id === e.departamento_id)||{}).nombre })),
      []];
    }

    // Un empleado por ID
    if (s.includes('from empleados') && s.includes('left join departamentos') && s.includes('where e.id')) {
      const emp   = readTable('empleados').find(e => e.id === params[0]);
      const deptos = readTable('departamentos');
      if (!emp) return [[], []];
      return [[{ ...emp, departamento_nombre: (deptos.find(d => d.id === emp.departamento_id)||{}).nombre }], []];
    }

    // Crear empleado
    if (s.startsWith('insert into empleados')) {
      const empleados = readTable('empleados');
      const [codigo, nombre, apellido, email, telefono, fecha_nacimiento, genero,
             direccion, departamento_id, cargo, tipo_contrato, fecha_ingreso,
             salario_base, cuenta_bancaria, banco, numero_identificacion] = params;
      const id = nextId('empleados');
      empleados.push({
        id, codigo, nombre, apellido, email,
        telefono:telefono||null, fecha_nacimiento:fecha_nacimiento||null, genero:genero||null,
        direccion:direccion||null,
        departamento_id: departamento_id ? parseInt(departamento_id) : null,
        cargo:cargo||null, tipo_contrato:tipo_contrato||'tiempo_completo',
        fecha_ingreso, salario_base:parseFloat(salario_base),
        cuenta_bancaria:cuenta_bancaria||null, banco:banco||null,
        numero_identificacion:numero_identificacion||null,
        activo:true, created_at:now(), updated_at:now()
      });
      writeTable('empleados', empleados);
      return [{ insertId: id, affectedRows: 1 }, []];
    }

    // Actualizar empleado
    if (s.startsWith('update empleados set')) {
      const empleados = readTable('empleados');
      const id = params[params.length - 1];
      const idx = empleados.findIndex(e => e.id === id);
      if (idx >= 0) {
        const [nombre, apellido, email, telefono, fecha_nacimiento, genero,
               direccion, departamento_id, cargo, tipo_contrato, salario_base,
               cuenta_bancaria, banco, numero_identificacion, activo] = params;
        Object.assign(empleados[idx], {
          nombre, apellido, email,
          telefono:telefono||null, fecha_nacimiento:fecha_nacimiento||null, genero:genero||null,
          direccion:direccion||null,
          departamento_id: departamento_id ? parseInt(departamento_id) : null,
          cargo:cargo||null, tipo_contrato, salario_base:parseFloat(salario_base),
          cuenta_bancaria:cuenta_bancaria||null, banco:banco||null,
          numero_identificacion:numero_identificacion||null,
          activo: activo !== undefined ? !!activo : true, updated_at:now()
        });
        writeTable('empleados', empleados);
      }
      return [{ affectedRows: 1 }, []];
    }

    // Dar de baja empleado
    if (s.startsWith('update empleados set activo = false')) {
      const empleados = readTable('empleados');
      const idx = empleados.findIndex(e => e.id === params[0]);
      if (idx >= 0) {
        empleados[idx].activo = false;
        empleados[idx].fecha_egreso = now().split('T')[0];
        writeTable('empleados', empleados);
      }
      return [{ affectedRows: 1 }, []];
    }

    // Departamentos activos
    if (s.includes('from departamentos') && s.includes('activo = true')) {
      return [readTable('departamentos')
        .filter(d => d.activo !== false)
        .sort((a,b) => a.nombre.localeCompare(b.nombre)), []];
    }

    // Todos los empleados activos (para procesar nómina)
    if (s.includes('from empleados where activo')) {
      return [readTable('empleados').filter(e => e.activo !== false), []];
    }

    // ----------------------------------------------------------
    // NÓMINA - Dashboard stats
    // ----------------------------------------------------------
    if (s.includes('total_empleados') && s.includes('periodos_pagados')) {
      const empleados = readTable('empleados');
      const periodos  = readTable('periodos_nomina');
      const mes  = new Date().getMonth();
      const anyo = new Date().getFullYear();
      const nominaMes = periodos
        .filter(p => { const d = new Date(p.fecha_pago); return d.getMonth()===mes && d.getFullYear()===anyo; })
        .reduce((s,p) => s + parseFloat(p.total_neto||0), 0);
      return [[{
        total_empleados:     empleados.filter(e => e.activo!==false).length,
        periodos_pagados:    periodos.filter(p => p.estado==='pagado').length,
        periodos_pendientes: periodos.filter(p => ['borrador','procesando','aprobado'].includes(p.estado)).length,
        nomina_mes:          nominaMes
      }], []];
    }

    // Últimos 5 períodos (dashboard)
    if (s.includes('from periodos_nomina') && s.includes('limit 5')) {
      return [readTable('periodos_nomina')
        .sort((a,b) => new Date(b.created_at)-new Date(a.created_at))
        .slice(0,5), []];
    }

    // Listar períodos con creador
    if (s.includes('from periodos_nomina') && s.includes('left join usuarios') && s.includes('order by')) {
      const periodos  = readTable('periodos_nomina');
      const usuarios  = readTable('usuarios');
      return [periodos
        .sort((a,b) => new Date(b.fecha_inicio)-new Date(a.fecha_inicio))
        .map(p => ({ ...p, creado_por_nombre: (usuarios.find(u => u.id===p.created_by)||{}).nombre||null })),
      []];
    }

    // Período por ID (para procesar)
    if (s.includes('from periodos_nomina where id')) {
      const p = readTable('periodos_nomina').find(p => p.id===params[0]);
      return [p ? [p] : [], []];
    }

    // Crear período
    if (s.startsWith('insert into periodos_nomina')) {
      const periodos = readTable('periodos_nomina');
      const [nombre, tipo, fecha_inicio, fecha_fin, fecha_pago, observaciones, created_by] = params;
      const id = nextId('periodos_nomina');
      periodos.push({
        id, nombre, tipo:tipo||'mensual', fecha_inicio, fecha_fin, fecha_pago,
        observaciones:observaciones||null, created_by, estado:'borrador',
        total_ingresos:0, total_deducciones:0, total_neto:0,
        created_at:now(), updated_at:now()
      });
      writeTable('periodos_nomina', periodos);
      return [{ insertId: id, affectedRows: 1 }, []];
    }

    // Marcar período como "procesando"
    if (s.startsWith('update periodos_nomina set estado =') && s.includes('procesando')) {
      const periodos = readTable('periodos_nomina');
      const idx = periodos.findIndex(p => p.id===params[0]);
      if (idx>=0) { periodos[idx].estado='procesando'; writeTable('periodos_nomina', periodos); }
      return [{ affectedRows:1 }, []];
    }

    // Actualizar período con totales y marcarlo 'aprobado'
    if (s.includes('update periodos_nomina') && s.includes('total_ingresos')) {
      const periodos = readTable('periodos_nomina');
      const [totalIng, totalDed, totalNeto, id] = params;
      const idx = periodos.findIndex(p => p.id===id);
      if (idx>=0) {
        Object.assign(periodos[idx], {
          estado:'aprobado',
          total_ingresos:parseFloat(totalIng),
          total_deducciones:parseFloat(totalDed),
          total_neto:parseFloat(totalNeto),
          updated_at:now()
        });
        writeTable('periodos_nomina', periodos);
      }
      return [{ affectedRows:1 }, []];
    }

    // Marcar período como pagado
    if (s.includes('update periodos_nomina') && s.includes("estado = 'pagado'")) {
      const [aprobado_por, id] = params;
      const periodos = readTable('periodos_nomina');
      const idx = periodos.findIndex(p => p.id===id);
      if (idx>=0) {
        periodos[idx].estado = 'pagado';
        periodos[idx].aprobado_por = aprobado_por;
        periodos[idx].aprobado_en  = now();
        writeTable('periodos_nomina', periodos);
      }
      return [{ affectedRows:1 }, []];
    }

    // Upsert nómina de empleado
    if (s.startsWith('insert into nominas')) {
      const nominas = readTable('nominas');
      const [periodo_id, empleado_id, salario_base, total_ingresos, total_deducciones, total_aportes, salario_neto] = params;
      const existing = nominas.findIndex(n => n.periodo_id===periodo_id && n.empleado_id===empleado_id);
      if (existing>=0) {
        Object.assign(nominas[existing], {
          total_ingresos:parseFloat(total_ingresos),
          total_deducciones:parseFloat(total_deducciones),
          total_aportes_patronales:parseFloat(total_aportes),
          salario_neto:parseFloat(salario_neto)
        });
        writeTable('nominas', nominas);
        return [{ insertId: nominas[existing].id, affectedRows:1 }, []];
      }
      const id = nextId('nominas');
      nominas.push({
        id, periodo_id, empleado_id,
        salario_base:parseFloat(salario_base),
        total_ingresos:parseFloat(total_ingresos),
        total_deducciones:parseFloat(total_deducciones),
        total_aportes_patronales:parseFloat(total_aportes),
        salario_neto:parseFloat(salario_neto),
        dias_trabajados:30, horas_extra:0,
        estado:'pendiente', created_at:now(), updated_at:now()
      });
      writeTable('nominas', nominas);
      return [{ insertId: id, affectedRows:1 }, []];
    }

    // Borrar detalle de nómina (antes de reinsertar)
    if (s.startsWith('delete from detalle_nomina')) {
      writeTable('detalle_nomina', readTable('detalle_nomina').filter(d => d.nomina_id!==params[0]));
      return [{ affectedRows:1 }, []];
    }

    // Insertar detalle de nómina
    if (s.startsWith('insert into detalle_nomina')) {
      const detalles = readTable('detalle_nomina');
      const [nomina_id, concepto_id, descripcion, monto] = params;
      const id = nextId('detalle_nomina');
      detalles.push({ id, nomina_id, concepto_id, descripcion, monto:parseFloat(monto), created_at:now() });
      writeTable('detalle_nomina', detalles);
      return [{ insertId:id, affectedRows:1 }, []];
    }

    // Marcar nóminas individuales como pagadas
    if (s.startsWith('update nominas set estado = "pagado"')) {
      const nominas = readTable('nominas');
      nominas.forEach(n => { if (n.periodo_id===params[0]) { n.estado='pagado'; n.fecha_pago=now(); } });
      writeTable('nominas', nominas);
      return [{ affectedRows:1 }, []];
    }

    // Detalle de período con datos de empleado
    if (s.includes('from nominas') && s.includes('join empleados') && s.includes('where n.periodo_id')) {
      const nominas  = readTable('nominas').filter(n => n.periodo_id===params[0]);
      const empleados = readTable('empleados');
      const deptos   = readTable('departamentos');
      return [nominas.map(n => {
        const e = empleados.find(e => e.id===n.empleado_id)||{};
        const d = deptos.find(d => d.id===e.departamento_id)||{};
        return { ...n, empleado:`${e.nombre||''} ${e.apellido||''}`.trim(), codigo:e.codigo, departamento:d.nombre };
      }).sort((a,b) => a.empleado.localeCompare(b.empleado)), []];
    }

    // Empleados con usuario vinculado (para notificaciones de pago)
    if (s.includes('e.usuario_id is not null')) {
      const nominas   = readTable('nominas').filter(n => n.periodo_id===params[0]);
      const empleados = readTable('empleados');
      return [nominas
        .map(n => empleados.find(e => e.id===n.empleado_id))
        .filter(e => e?.usuario_id)
        .map(e => ({ usuario_id: e.usuario_id })), []];
    }

    // Conceptos automáticos (aplica_todos)
    if (s.includes('from conceptos_nomina') && s.includes('aplica_todos = true')) {
      return [readTable('conceptos_nomina').filter(c => c.activo!==false && c.aplica_todos===true), []];
    }

    // Masa salarial por departamento
    if (s.includes('from departamentos d') && s.includes('left join empleados e')) {
      const deptos   = readTable('departamentos');
      const empleados = readTable('empleados').filter(e => e.activo!==false);
      return [deptos.map(d => {
        const emps = empleados.filter(e => e.departamento_id===d.id);
        return { nombre:d.nombre, total:emps.length, masa_salarial: emps.reduce((s,e) => s+parseFloat(e.salario_base||0),0) };
      }).sort((a,b) => b.masa_salarial - a.masa_salarial), []];
    }

    // ----------------------------------------------------------
    // NOTIFICACIONES
    // ----------------------------------------------------------

    if (s.includes('from notificaciones') && s.includes('order by created_at')) {
      return [readTable('notificaciones')
        .filter(n => n.usuario_id===params[0])
        .sort((a,b) => new Date(b.created_at)-new Date(a.created_at))
        .slice(0,50), []];
    }

    if (s.includes('count(*)') && s.includes('from notificaciones')) {
      return [[{ total: readTable('notificaciones').filter(n => n.usuario_id===params[0] && !n.leida).length }], []];
    }

    if (s.startsWith('insert into notificaciones')) {
      const notifs = readTable('notificaciones');
      const [usuario_id, titulo, mensaje, tipo, icono] = params;
      const id = nextId('notificaciones');
      notifs.push({ id, usuario_id, titulo, mensaje, tipo, icono, leida:false, created_at:now() });
      writeTable('notificaciones', notifs);
      return [{ insertId:id, affectedRows:1 }, []];
    }

    if (s.startsWith('update notificaciones set leida = true where id')) {
      const notifs = readTable('notificaciones');
      const idx = notifs.findIndex(n => n.id===params[0] && n.usuario_id===params[1]);
      if (idx>=0) { notifs[idx].leida=true; writeTable('notificaciones', notifs); }
      return [{ affectedRows:1 }, []];
    }

    if (s.startsWith('update notificaciones set leida = true where usuario_id')) {
      const notifs = readTable('notificaciones');
      notifs.forEach(n => { if (n.usuario_id===params[0]) n.leida=true; });
      writeTable('notificaciones', notifs);
      return [{ affectedRows:1 }, []];
    }

    // ----------------------------------------------------------
    // CONTABILIDAD
    // ----------------------------------------------------------

    if (s.includes('from libros_contables') && s.includes('order by')) {
      let libros    = readTable('libros_contables');
      const usuarios = readTable('usuarios');
      let pIdx = 0;
      if (sql.toLowerCase().includes('l.tipo = ?'))   { libros = libros.filter(l => l.tipo===params[pIdx++]); }
      if (sql.toLowerCase().includes('l.fecha >= ?')) { libros = libros.filter(l => l.fecha>=params[pIdx++]); }
      if (sql.toLowerCase().includes('l.fecha <= ?')) { libros = libros.filter(l => l.fecha<=params[pIdx++]); }
      return [libros
        .sort((a,b) => b.fecha.localeCompare(a.fecha))
        .map(l => ({ ...l, creado_por:(usuarios.find(u=>u.id===l.created_by)||{}).nombre })), []];
    }

    if (s.includes('from libros_contables where id')) {
      const libro = readTable('libros_contables').find(l => l.id===params[0]);
      return [libro ? [libro] : [], []];
    }

    if (s.includes('from asientos_contables where libro_id')) {
      return [readTable('asientos_contables').filter(a => a.libro_id===params[0]), []];
    }

    if (s.startsWith('insert into libros_contables')) {
      const libros = readTable('libros_contables');
      const [tipo, fecha, numero_asiento, descripcion, referencia, created_by] = params;
      const id = nextId('libros_contables');
      libros.push({ id, tipo, fecha, numero_asiento, descripcion, referencia:referencia||null, created_by, created_at:now() });
      writeTable('libros_contables', libros);
      return [{ insertId:id, affectedRows:1 }, []];
    }

    if (s.startsWith('insert into asientos_contables')) {
      const asientos = readTable('asientos_contables');
      const [libro_id, cuenta_codigo, cuenta_nombre, debe, haber] = params;
      const id = nextId('asientos_contables');
      asientos.push({ id, libro_id, cuenta_codigo, cuenta_nombre, debe:parseFloat(debe)||0, haber:parseFloat(haber)||0, created_at:now() });
      writeTable('asientos_contables', asientos);
      return [{ insertId:id, affectedRows:1 }, []];
    }

    if (s.includes('sum(debe)') && s.includes('from asientos_contables')) {
      const map = {};
      readTable('asientos_contables').forEach(a => {
        const k = a.cuenta_codigo;
        if (!map[k]) map[k] = { cuenta_codigo:k, cuenta_nombre:a.cuenta_nombre, total_debe:0, total_haber:0 };
        map[k].total_debe  += parseFloat(a.debe||0);
        map[k].total_haber += parseFloat(a.haber||0);
      });
      return [Object.values(map)
        .map(r => ({ ...r, saldo:r.total_debe-r.total_haber }))
        .sort((a,b) => a.cuenta_codigo.localeCompare(b.cuenta_codigo)), []];
    }

    // ----------------------------------------------------------
    // LOGS (registro de actividad)
    // ----------------------------------------------------------
    if (s.startsWith('insert into logs_actividad')) {
      const logs = readTable('logs_actividad');
      const [usuario_id, accion, modulo, descripcion, ip] = params;
      logs.push({ id:nextId('logs_actividad'), usuario_id, accion, modulo:modulo||null, descripcion:descripcion||null, ip:ip||null, created_at:now() });
      // Limitar a 500 logs para no crecer indefinidamente
      if (logs.length > 500) logs.splice(0, logs.length - 500);
      writeTable('logs_actividad', logs);
      return [{ affectedRows:1 }, []];
    }

    // Fallback: loguear queries no reconocidas
    console.warn('[DB-LOCAL] Query no reconocida:', sql.substring(0, 100));
    return [[], []];
  },

  // getConnection simula transacciones (no hay rollback real en local)
  async getConnection() {
    return {
      query:            (sql, params) => db.query(sql, params),
      beginTransaction: async () => {},
      commit:           async () => {},
      rollback:         async () => {},
      release:          ()       => {}
    };
  }
};

module.exports = db;
