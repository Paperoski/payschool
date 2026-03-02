-- ============================================================
-- PAYSCHOOL - Base de Datos MySQL
-- Sistema de Nómina Escolar
--
-- INSTRUCCIONES:
--   1. Conéctate a tu servidor MySQL
--   2. Ejecuta: mysql -u USUARIO -p < database.sql
--   O impórtalo desde phpMyAdmin / MySQL Workbench
-- ============================================================

CREATE DATABASE IF NOT EXISTS payschool CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE payschool;

-- ============================================================
-- TABLA: roles
-- Define los niveles de acceso del sistema
-- ============================================================
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    permisos JSON,                         -- Array de permisos en formato JSON
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Roles predefinidos del sistema
INSERT INTO roles (nombre, descripcion, permisos) VALUES
('superadmin', 'Acceso total al sistema',                  '["all"]'),
('admin',      'Administrador de nómina',                  '["nomina","empleados","reportes","usuarios"]'),
('contador',   'Acceso contable y reportes',               '["nomina","reportes","libros"]'),
('empleado',   'Solo visualización de sus recibos',        '["recibos"]');

-- ============================================================
-- TABLA: usuarios
-- Usuarios con acceso al sistema
-- ============================================================
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,        -- Hash bcrypt
    rol_id INT NOT NULL,
    avatar VARCHAR(255) DEFAULT NULL,
    activo BOOLEAN DEFAULT TRUE,
    ultimo_login TIMESTAMP NULL,
    token_reset VARCHAR(255) DEFAULT NULL, -- Token para recuperar contraseña
    token_reset_expiry TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (rol_id) REFERENCES roles(id)
);

-- Usuario admin por defecto
-- IMPORTANTE: Cambia la contraseña después del primer login
-- Contraseña inicial: Admin123!
INSERT INTO usuarios (nombre, apellido, email, password, rol_id) VALUES
('Super', 'Admin', 'admin@payschool.com',
 '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1);

-- ============================================================
-- TABLA: departamentos
-- Departamentos o áreas de la institución
-- ============================================================
CREATE TABLE departamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    presupuesto DECIMAL(15,2) DEFAULT 0.00, -- Presupuesto mensual asignado
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO departamentos (nombre, descripcion) VALUES
('Dirección',          'Dirección general de la institución'),
('Docentes',           'Personal docente y académico'),
('Administrativo',     'Personal administrativo'),
('Finanzas',           'Departamento de finanzas y contabilidad'),
('Sistemas',           'Tecnología e infraestructura'),
('Servicios Generales','Mantenimiento y servicios');

-- ============================================================
-- TABLA: empleados
-- Registro completo del personal de la institución
-- ============================================================
CREATE TABLE empleados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT DEFAULT NULL,           -- Vinculado a un usuario del sistema (opcional)
    codigo VARCHAR(20) NOT NULL UNIQUE,    -- Código único del empleado, ej: EMP001
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    telefono VARCHAR(20),
    fecha_nacimiento DATE,
    genero ENUM('M','F','Otro') DEFAULT NULL,
    direccion TEXT,
    departamento_id INT,
    cargo VARCHAR(100),
    tipo_contrato ENUM('tiempo_completo','medio_tiempo','temporal','honorarios') DEFAULT 'tiempo_completo',
    fecha_ingreso DATE NOT NULL,
    fecha_egreso DATE DEFAULT NULL,        -- Se llena cuando el empleado sale
    salario_base DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    cuenta_bancaria VARCHAR(50),
    banco VARCHAR(100),
    numero_identificacion VARCHAR(50),     -- Cédula / DUI / CC / Pasaporte
    activo BOOLEAN DEFAULT TRUE,
    foto VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (departamento_id) REFERENCES departamentos(id)
);

-- Empleados de muestra para pruebas
INSERT INTO empleados (codigo, nombre, apellido, email, telefono, departamento_id, cargo, tipo_contrato, fecha_ingreso, salario_base) VALUES
('EMP001','María',  'González', 'maria.gonzalez@payschool.com',  '555-0101', 2, 'Docente de Matemáticas', 'tiempo_completo', '2020-01-15', 2500.00),
('EMP002','Carlos', 'Ramírez',  'carlos.ramirez@payschool.com',  '555-0102', 2, 'Docente de Ciencias',    'tiempo_completo', '2019-03-01', 2400.00),
('EMP003','Laura',  'Martínez', 'laura.martinez@payschool.com',  '555-0103', 3, 'Secretaria Académica',   'tiempo_completo', '2021-06-01', 1800.00),
('EMP004','Pedro',  'López',    'pedro.lopez@payschool.com',     '555-0104', 4, 'Contador General',       'tiempo_completo', '2018-09-15', 3000.00),
('EMP005','Ana',    'Torres',   'ana.torres@payschool.com',      '555-0105', 2, 'Docente de Historia',    'medio_tiempo',    '2022-02-01', 1500.00);

-- ============================================================
-- TABLA: conceptos_nomina
-- Rubros que componen la nómina (ingresos, deducciones, aportes)
-- ============================================================
CREATE TABLE conceptos_nomina (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    tipo ENUM('ingreso','deduccion','aporte_patronal') NOT NULL,
    calculo ENUM('fijo','porcentaje','formula') DEFAULT 'fijo',
    valor DECIMAL(15,4) DEFAULT 0.00,      -- Valor fijo o porcentaje
    aplica_todos BOOLEAN DEFAULT FALSE,    -- TRUE = se aplica a todos los empleados automáticamente
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conceptos base del sistema
INSERT INTO conceptos_nomina (codigo, nombre, tipo, calculo, valor, aplica_todos) VALUES
('SAL001', 'Salario Base',            'ingreso',          'fijo',       0.00,  TRUE),
('BON001', 'Bono de Transporte',      'ingreso',          'fijo',       150.00,TRUE),
('BON002', 'Bono de Alimentación',    'ingreso',          'fijo',       100.00,FALSE),
('BON003', 'Horas Extra',             'ingreso',          'fijo',       0.00,  FALSE),
('DED001', 'Seguro Social',           'deduccion',        'porcentaje', 4.00,  TRUE),
('DED002', 'Impuesto sobre la Renta', 'deduccion',        'porcentaje', 5.00,  TRUE),
('DED003', 'Adelanto de Sueldo',      'deduccion',        'fijo',       0.00,  FALSE),
('PAT001', 'Aporte Patronal Seguro',  'aporte_patronal',  'porcentaje', 8.00,  TRUE),
('PAT002', 'Aporte Patronal Pensión', 'aporte_patronal',  'porcentaje', 5.00,  TRUE);

-- ============================================================
-- TABLA: periodos_nomina
-- Cada período representa un ciclo de pago (semanal/quincenal/mensual)
-- ============================================================
CREATE TABLE periodos_nomina (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    tipo ENUM('semanal','quincenal','mensual') DEFAULT 'mensual',
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    fecha_pago DATE NOT NULL,
    estado ENUM('borrador','procesando','aprobado','pagado','cerrado') DEFAULT 'borrador',
    total_ingresos DECIMAL(15,2) DEFAULT 0.00,
    total_deducciones DECIMAL(15,2) DEFAULT 0.00,
    total_neto DECIMAL(15,2) DEFAULT 0.00,
    aprobado_por INT DEFAULT NULL,
    aprobado_en TIMESTAMP NULL,
    observaciones TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (aprobado_por) REFERENCES usuarios(id),
    FOREIGN KEY (created_by) REFERENCES usuarios(id)
);

-- ============================================================
-- TABLA: nominas
-- Nómina individual de cada empleado por período
-- ============================================================
CREATE TABLE nominas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    periodo_id INT NOT NULL,
    empleado_id INT NOT NULL,
    salario_base DECIMAL(15,2) NOT NULL,
    dias_trabajados DECIMAL(5,2) DEFAULT 30,
    horas_extra DECIMAL(5,2) DEFAULT 0,
    total_ingresos DECIMAL(15,2) DEFAULT 0.00,
    total_deducciones DECIMAL(15,2) DEFAULT 0.00,
    total_aportes_patronales DECIMAL(15,2) DEFAULT 0.00,
    salario_neto DECIMAL(15,2) DEFAULT 0.00,
    estado ENUM('pendiente','aprobado','pagado') DEFAULT 'pendiente',
    metodo_pago ENUM('transferencia','cheque','efectivo') DEFAULT 'transferencia',
    fecha_pago TIMESTAMP NULL,
    referencia_pago VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (periodo_id) REFERENCES periodos_nomina(id),
    FOREIGN KEY (empleado_id) REFERENCES empleados(id),
    UNIQUE KEY unique_nomina (periodo_id, empleado_id) -- Un empleado solo puede tener 1 nómina por período
);

-- ============================================================
-- TABLA: detalle_nomina
-- Desglose de cada concepto aplicado en la nómina del empleado
-- ============================================================
CREATE TABLE detalle_nomina (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nomina_id INT NOT NULL,
    concepto_id INT NOT NULL,
    descripcion VARCHAR(200),
    monto DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (nomina_id) REFERENCES nominas(id) ON DELETE CASCADE,
    FOREIGN KEY (concepto_id) REFERENCES conceptos_nomina(id)
);

-- ============================================================
-- TABLA: libros_contables
-- Encabezado de cada asiento contable
-- ============================================================
CREATE TABLE libros_contables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo ENUM('diario','mayor','auxiliar') DEFAULT 'diario',
    fecha DATE NOT NULL,
    numero_asiento VARCHAR(20) NOT NULL,
    descripcion TEXT NOT NULL,
    referencia VARCHAR(100),
    nomina_id INT DEFAULT NULL,            -- Vinculado a una nómina si aplica
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (nomina_id) REFERENCES nominas(id),
    FOREIGN KEY (created_by) REFERENCES usuarios(id)
);

-- ============================================================
-- TABLA: asientos_contables
-- Detalle del debe/haber de cada asiento
-- ============================================================
CREATE TABLE asientos_contables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    libro_id INT NOT NULL,
    cuenta_codigo VARCHAR(20) NOT NULL,
    cuenta_nombre VARCHAR(100) NOT NULL,
    debe DECIMAL(15,2) DEFAULT 0.00,
    haber DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (libro_id) REFERENCES libros_contables(id) ON DELETE CASCADE
);

-- ============================================================
-- TABLA: notificaciones
-- Notificaciones por usuario (pagos, alertas, etc.)
-- ============================================================
CREATE TABLE notificaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT NOT NULL,
    tipo ENUM('info','success','warning','error','pago') DEFAULT 'info',
    icono VARCHAR(50) DEFAULT 'bell',
    leida BOOLEAN DEFAULT FALSE,
    url_accion VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_usuario_leida (usuario_id, leida)   -- Índice para acelerar consultas de no leídas
);

-- ============================================================
-- TABLA: logs_actividad
-- Registro de todas las acciones importantes del sistema
-- ============================================================
CREATE TABLE logs_actividad (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT,
    accion VARCHAR(100) NOT NULL,          -- LOGIN, LOGOUT, CREATE_EMPLEADO, etc.
    modulo VARCHAR(50),                    -- auth, empleados, nomina, etc.
    descripcion TEXT,
    ip VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_fecha (created_at),
    INDEX idx_usuario (usuario_id)
);

-- ============================================================
-- TABLA: configuracion_sistema
-- Parámetros globales del sistema (editables desde el panel)
-- ============================================================
CREATE TABLE configuracion_sistema (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clave VARCHAR(100) NOT NULL UNIQUE,
    valor TEXT,
    descripcion VARCHAR(255),
    tipo ENUM('texto','numero','booleano','json') DEFAULT 'texto',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO configuracion_sistema (clave, valor, descripcion, tipo) VALUES
('nombre_institucion', 'Mi Institución Educativa', 'Nombre de la institución', 'texto'),
('moneda',             'USD',                       'Moneda del sistema',        'texto'),
('simbolo_moneda',     '$',                         'Símbolo de moneda',         'texto'),
('dias_laborales',     '30',                        'Días laborales por mes',    'numero'),
('porcentaje_ss',      '4.00',                      'Descuento seguro social %', 'numero'),
('porcentaje_ss_pat',  '8.00',                      'Aporte patronal seguro %',  'numero');

-- ============================================================
-- VISTAS útiles para consultas frecuentes
-- ============================================================

-- Vista resumen de nómina completa
CREATE OR REPLACE VIEW v_nomina_resumen AS
SELECT
    n.id,
    p.nombre AS periodo,
    p.fecha_inicio, p.fecha_fin, p.fecha_pago,
    e.codigo AS codigo_empleado,
    CONCAT(e.nombre,' ',e.apellido) AS empleado,
    d.nombre AS departamento,
    e.cargo,
    n.salario_base, n.dias_trabajados,
    n.total_ingresos, n.total_deducciones,
    n.salario_neto, n.estado, n.metodo_pago
FROM nominas n
JOIN periodos_nomina p ON n.periodo_id = p.id
JOIN empleados e ON n.empleado_id = e.id
LEFT JOIN departamentos d ON e.departamento_id = d.id;

-- Vista estadísticas para el dashboard
CREATE OR REPLACE VIEW v_dashboard AS
SELECT
    (SELECT COUNT(*) FROM empleados WHERE activo=TRUE)           AS total_empleados,
    (SELECT COUNT(*) FROM periodos_nomina WHERE estado='pagado') AS periodos_pagados,
    (SELECT COUNT(*) FROM periodos_nomina
     WHERE estado IN ('borrador','procesando','aprobado'))       AS periodos_pendientes,
    (SELECT IFNULL(SUM(total_neto),0) FROM periodos_nomina
     WHERE MONTH(fecha_pago)=MONTH(CURDATE())
       AND YEAR(fecha_pago)=YEAR(CURDATE()))                     AS nomina_mes_actual;

SELECT '✅ Base de datos PaySchool creada exitosamente' AS resultado;
