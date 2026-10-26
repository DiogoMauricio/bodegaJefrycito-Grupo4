-- ==============================================================================
-- SISTEMA DE GESTIÓN DE INVENTARIO BODEGA JEFRYSITO (GESTOCK)
-- Base de Datos: SQLite 3
-- Cumplimiento de Historias de Usuario: HU-01 a HU-15
-- ==============================================================================

PRAGMA foreign_keys = ON;

-- ------------------------------------------------------------------------------
-- 1. HU-01: USUARIOS Y AUTENTICACIÓN ADMINISTRATIVA
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(120) NOT NULL,
    rol VARCHAR(30) NOT NULL DEFAULT 'administrador' CHECK(rol IN ('administrador', 'almacenero', 'cajero')),
    intentos_fallidos INTEGER NOT NULL DEFAULT 0,
    bloqueado_hasta DATETIME NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK(estado IN ('activo', 'inactivo')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 2. HU-02 & HU-03: MAESTRO DE PRODUCTOS
-- Regla: El producto es el maestro del artículo, no la entrada física.
-- Stock físico y disponible inician en 0 hasta que haya entradas de mercadería.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS productos (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'p1', 'p2' o UUID
    codigo_barras VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    categoria VARCHAR(60) NOT NULL,
    unidad_medida VARCHAR(30) NOT NULL, -- e.g. 'Unidad', 'Botella', 'Bolsa', 'Lata', 'Paquete'
    precio_venta DECIMAL(10, 2) NOT NULL CHECK(precio_venta > 0),
    stock_minimo INTEGER NOT NULL DEFAULT 0 CHECK(stock_minimo >= 0),
    estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK(estado IN ('activo', 'inactivo')),
    imagen_url TEXT DEFAULT '/placeholder.png',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria);
CREATE INDEX IF NOT EXISTS idx_productos_estado ON productos(estado);
CREATE INDEX IF NOT EXISTS idx_productos_codigo_barras ON productos(codigo_barras);

-- ------------------------------------------------------------------------------
-- 3. PROVEEDORES (Apoyo a HU-04)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS proveedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ruc VARCHAR(20) UNIQUE,
    razon_social VARCHAR(150) NOT NULL,
    telefono VARCHAR(30),
    email VARCHAR(100),
    direccion TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 4. HU-04: ENTRADAS DE MERCADERÍA DE PROVEEDORES
-- Regla: Duplicidad impedida para combinación (proveedor + numero_comprobante).
-- Transacción atómica en recepción.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entradas_mercaderia (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proveedor VARCHAR(150) NOT NULL,
    tipo_comprobante VARCHAR(30) NOT NULL DEFAULT 'Factura' CHECK(tipo_comprobante IN ('Factura', 'Boleta', 'Guia_Remision', 'Otro')),
    numero_comprobante VARCHAR(50) NOT NULL,
    fecha_recepcion DATE NOT NULL,
    usuario_id INTEGER,
    observaciones TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT uq_proveedor_comprobante UNIQUE (proveedor, numero_comprobante)
);

CREATE INDEX IF NOT EXISTS idx_entradas_proveedor ON entradas_mercaderia(proveedor);
CREATE INDEX IF NOT EXISTS idx_entradas_fecha ON entradas_mercaderia(fecha_recepcion);

-- ------------------------------------------------------------------------------
-- 5. HU-04 & HU-09: LOTES DE PRODUCTO (Trazabilidad, Vencimiento y FEFO)
-- Cada entrada crea lotes asociados a un producto con costo, cantidad y vencimiento.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lotes (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'l1', 'l2' o UUID
    producto_id VARCHAR(50) NOT NULL,
    entrada_id INTEGER NULL,
    codigo_lote VARCHAR(50) NOT NULL,
    cantidad_inicial INTEGER NOT NULL CHECK(cantidad_inicial > 0),
    cantidad_actual INTEGER NOT NULL CHECK(cantidad_actual >= 0),
    costo_unitario DECIMAL(10, 2) NOT NULL CHECK(costo_unitario > 0),
    fecha_vencimiento DATE NULL, -- Puede ser null para productos sin vencimiento
    fecha_recepcion DATE NOT NULL,
    proveedor VARCHAR(150) NOT NULL,
    numero_comprobante VARCHAR(50) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'vigente' CHECK(estado IN ('vigente', 'vencido', 'agotado')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (entrada_id) REFERENCES entradas_mercaderia(id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_lotes_producto ON lotes(producto_id);
CREATE INDEX IF NOT EXISTS idx_lotes_vencimiento ON lotes(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_lotes_cantidad ON lotes(cantidad_actual);

-- ------------------------------------------------------------------------------
-- 6. HU-14 & HU-15: RESERVAS WEB Y SUS NOTIFICACIONES
-- Regla: Vigencia de 24h. Si no se atiende, cambia a 'expirada' y libera unidades.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reservas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo_reserva VARCHAR(30) NOT NULL UNIQUE, -- e.g. 'RSV-2026-001'
    cliente_nombre VARCHAR(120) NOT NULL,
    cliente_telefono VARCHAR(30) NOT NULL,
    comentario TEXT,
    fecha_reserva DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion DATETIME NOT NULL, -- fecha_reserva + 24 horas
    total_estimado DECIMAL(10, 2) NOT NULL CHECK(total_estimado >= 0),
    estado VARCHAR(30) NOT NULL DEFAULT 'pendiente' 
        CHECK(estado IN ('pendiente', 'confirmada_recojo', 'atendida', 'rechazada', 'expirada')),
    notificacion_leida BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reservas_codigo ON reservas(codigo_reserva);
CREATE INDEX IF NOT EXISTS idx_reservas_estado ON reservas(estado);
CREATE INDEX IF NOT EXISTS idx_reservas_expiracion ON reservas(fecha_expiracion);

CREATE TABLE IF NOT EXISTS detalle_reservas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reserva_id INTEGER NOT NULL,
    producto_id VARCHAR(50) NOT NULL,
    cantidad INTEGER NOT NULL CHECK(cantidad > 0),
    precio_unitario DECIMAL(10, 2) NOT NULL CHECK(precio_unitario >= 0),
    subtotal DECIMAL(10, 2) NOT NULL CHECK(subtotal >= 0),
    FOREIGN KEY (reserva_id) REFERENCES reservas(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_det_reservas_reserva ON detalle_reservas(reserva_id);
CREATE INDEX IF NOT EXISTS idx_det_reservas_producto ON detalle_reservas(producto_id);

-- ------------------------------------------------------------------------------
-- 7. HU-05: VENTAS EN TIENDA (PUNTO DE VENTA)
-- Regla: Valida stock disponible (no solo físico).
-- Aplica FEFO para descontar de lotes vigentes con vencimiento más próximo.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ventas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_ticket VARCHAR(40) NOT NULL UNIQUE,
    fecha_venta DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuario_id INTEGER NULL,
    reserva_id INTEGER NULL, -- En caso provenga de la atención de una reserva web
    cliente_tipo VARCHAR(20) NOT NULL DEFAULT 'publico_general',
    cliente_documento VARCHAR(20),
    cliente_nombre VARCHAR(120),
    subtotal DECIMAL(10, 2) NOT NULL CHECK(subtotal >= 0),
    total DECIMAL(10, 2) NOT NULL CHECK(total >= 0),
    metodo_pago VARCHAR(30) NOT NULL DEFAULT 'efectivo' CHECK(metodo_pago IN ('efectivo', 'yape', 'plin', 'tarjeta')),
    estado VARCHAR(20) NOT NULL DEFAULT 'completada' CHECK(estado IN ('completada', 'anulada')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL,
    FOREIGN KEY (reserva_id) REFERENCES reservas(id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha_venta);
CREATE INDEX IF NOT EXISTS idx_ventas_ticket ON ventas(numero_ticket);

-- Detalle de venta discriminado por Lote (Garantía de salida FEFO y Kardex exacto)
CREATE TABLE IF NOT EXISTS detalle_ventas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venta_id INTEGER NOT NULL,
    producto_id VARCHAR(50) NOT NULL,
    lote_id VARCHAR(50) NOT NULL,
    cantidad INTEGER NOT NULL CHECK(cantidad > 0),
    precio_unitario DECIMAL(10, 2) NOT NULL CHECK(precio_unitario >= 0),
    subtotal DECIMAL(10, 2) NOT NULL CHECK(subtotal >= 0),
    FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (lote_id) REFERENCES lotes(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_det_ventas_venta ON detalle_ventas(venta_id);
CREATE INDEX IF NOT EXISTS idx_det_ventas_lote ON detalle_ventas(lote_id);

-- ------------------------------------------------------------------------------
-- 8. HU-13: AJUSTES DE INVENTARIO
-- Regla: Corrige diferencias por merma, daño, pérdida, conteo físico o sobrante.
-- Exige motivo, usuario, fecha, cantidad anterior, variación y saldo resultante.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ajustes_inventario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    producto_id VARCHAR(50) NOT NULL,
    lote_id VARCHAR(50) NOT NULL,
    tipo_ajuste VARCHAR(20) NOT NULL CHECK(tipo_ajuste IN ('positivo', 'negativo')),
    motivo VARCHAR(50) NOT NULL CHECK(motivo IN ('merma', 'daño', 'pérdida', 'corrección de inventario', 'sobrante', 'otro')),
    cantidad_variacion INTEGER NOT NULL CHECK(cantidad_variacion > 0),
    saldo_anterior INTEGER NOT NULL CHECK(saldo_anterior >= 0),
    saldo_posterior INTEGER NOT NULL CHECK(saldo_posterior >= 0),
    observacion TEXT,
    usuario_id INTEGER NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (lote_id) REFERENCES lotes(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ajustes_producto ON ajustes_inventario(producto_id);
CREATE INDEX IF NOT EXISTS idx_ajustes_fecha ON ajustes_inventario(fecha);

-- ------------------------------------------------------------------------------
-- 9. HU-06: KARDEX DE MOVIMIENTOS DE INVENTARIO
-- Trazabilidad cronológica completa: entrada, venta, reserva, liberación, ajuste, merma.
-- Saldo anterior y saldo posterior garantizan auditoría exacta.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kardex_movimientos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    producto_id VARCHAR(50) NOT NULL,
    lote_id VARCHAR(50) NULL,
    tipo_movimiento VARCHAR(30) NOT NULL 
        CHECK(tipo_movimiento IN ('entrada', 'venta', 'reserva', 'liberacion', 'ajuste', 'merma')),
    cantidad_entrada INTEGER NOT NULL DEFAULT 0 CHECK(cantidad_entrada >= 0),
    cantidad_salida INTEGER NOT NULL DEFAULT 0 CHECK(cantidad_salida >= 0),
    saldo_anterior INTEGER NOT NULL CHECK(saldo_anterior >= 0),
    saldo_posterior INTEGER NOT NULL CHECK(saldo_posterior >= 0),
    referencia VARCHAR(150) NOT NULL, -- e.g. 'Entrada F001-1201', 'Ticket TIK-0001', 'Reserva RSV-2759'
    usuario_id INTEGER NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (lote_id) REFERENCES lotes(id) ON UPDATE CASCADE ON DELETE SET NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_kardex_producto_fecha ON kardex_movimientos(producto_id, fecha);
CREATE INDEX IF NOT EXISTS idx_kardex_tipo ON kardex_movimientos(tipo_movimiento);

-- ==============================================================================
-- VISTAS INTELIGENTES (CUMPLIMIENTO DIRECTO DE LAS REGLAS DE NEGOCIO Y HU)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- VISTA 1: HU-07 & HU-08 CONSULTA DE STOCK ACTUAL Y ESTADO DE ALERTA
-- Regla de negocio:
-- - Stock físico: unidades totales existentes en lotes.
-- - Stock físico vigente: unidades en lotes no vencidos (o sin fecha de vencimiento).
-- - Stock vencido: unidades en lotes con fecha_vencimiento < fecha actual.
-- - Stock reservado: suma de unidades en reservas activas ('pendiente', 'confirmada_recojo') y no expiradas.
-- - Stock disponible: MAX(0, stock físico vigente - stock reservado).
-- - Alerta: 'Agotado' si disponible = 0, 'Stock bajo' si disponible <= stock_minimo, sino 'En stock'.
-- ------------------------------------------------------------------------------
CREATE VIEW IF NOT EXISTS v_stock_actual AS
WITH stock_lotes AS (
    SELECT 
        p.id AS producto_id,
        COALESCE(SUM(l.cantidad_actual), 0) AS stock_fisico,
        COALESCE(SUM(CASE 
            WHEN l.fecha_vencimiento IS NOT NULL AND DATE(l.fecha_vencimiento) < DATE('now') 
            THEN l.cantidad_actual 
            ELSE 0 
        END), 0) AS stock_vencido,
        COALESCE(SUM(CASE 
            WHEN l.fecha_vencimiento IS NULL OR DATE(l.fecha_vencimiento) >= DATE('now') 
            THEN l.cantidad_actual 
            ELSE 0 
        END), 0) AS stock_fisico_vigente,
        COALESCE(SUM(l.cantidad_actual * l.costo_unitario), 0) AS valor_inventario_costo
    FROM productos p
    LEFT JOIN lotes l ON p.id = l.producto_id AND l.cantidad_actual > 0
    GROUP BY p.id
),
stock_reservado AS (
    SELECT 
        dr.producto_id,
        COALESCE(SUM(dr.cantidad), 0) AS total_reservado
    FROM detalle_reservas dr
    JOIN reservas r ON dr.reserva_id = r.id
    WHERE r.estado IN ('pendiente', 'confirmada_recojo')
      AND r.fecha_expiracion > CURRENT_TIMESTAMP
    GROUP BY dr.producto_id
)
SELECT 
    p.id AS producto_id,
    p.codigo_barras,
    p.nombre,
    p.categoria,
    p.unidad_medida,
    p.precio_venta,
    p.stock_minimo,
    p.estado AS estado_producto,
    p.imagen_url,
    sl.stock_fisico,
    sl.stock_vencido,
    sl.stock_fisico_vigente,
    COALESCE(sr.total_reservado, 0) AS stock_reservado,
    CASE 
        WHEN p.estado = 'inactivo' THEN 0
        ELSE MAX(0, sl.stock_fisico_vigente - COALESCE(sr.total_reservado, 0))
    END AS stock_disponible,
    sl.valor_inventario_costo,
    (MAX(0, sl.stock_fisico_vigente - COALESCE(sr.total_reservado, 0)) * p.precio_venta) AS valor_inventario_venta,
    CASE
        WHEN p.estado = 'inactivo' THEN 'Inactivo'
        WHEN (sl.stock_fisico_vigente - COALESCE(sr.total_reservado, 0)) <= 0 THEN 'Agotado'
        WHEN (sl.stock_fisico_vigente - COALESCE(sr.total_reservado, 0)) <= p.stock_minimo THEN 'Stock bajo'
        ELSE 'En stock'
    END AS alerta_stock
FROM productos p
LEFT JOIN stock_lotes sl ON p.id = sl.producto_id
LEFT JOIN stock_reservado sr ON p.id = sr.producto_id;

-- ------------------------------------------------------------------------------
-- VISTA 2: HU-08 ALERTAS DE STOCK MÍNIMO (Productos en nivel crítico)
-- ------------------------------------------------------------------------------
CREATE VIEW IF NOT EXISTS v_alertas_stock AS
SELECT 
    producto_id,
    codigo_barras,
    nombre,
    categoria,
    stock_minimo,
    stock_disponible,
    alerta_stock,
    CASE 
        WHEN alerta_stock = 'Agotado' THEN 'Agotado - requiere reposición inmediata'
        WHEN alerta_stock = 'Stock bajo' THEN 'Stock bajo - disponible ' || stock_disponible || ' de un mínimo de ' || stock_minimo
        ELSE 'Normal'
    END AS mensaje_alerta
FROM v_stock_actual
WHERE estado_producto = 'activo'
  AND alerta_stock IN ('Agotado', 'Stock bajo')
ORDER BY stock_disponible ASC, stock_minimo DESC;

-- ------------------------------------------------------------------------------
-- VISTA 3: HU-09 PRODUCTOS PRÓXIMOS A VENCER Y VENCIDOS
-- Regla: Umbral de 30 días calendario para 'Próximo a vencer'.
-- Si supera fecha de vencimiento pasa a 'Vencido' y queda bloqueado.
-- ------------------------------------------------------------------------------
CREATE VIEW IF NOT EXISTS v_lotes_vencimiento AS
SELECT 
    l.id AS lote_id,
    l.codigo_lote,
    p.id AS producto_id,
    p.nombre AS producto_nombre,
    p.categoria,
    p.imagen_url,
    l.cantidad_actual AS unidades,
    l.fecha_vencimiento,
    CAST(JULIANDAY(l.fecha_vencimiento) - JULIANDAY(DATE('now')) AS INTEGER) AS dias_restantes,
    CASE 
        WHEN l.fecha_vencimiento IS NULL THEN 'Sin vencimiento'
        WHEN DATE(l.fecha_vencimiento) < DATE('now') THEN 'Vencido'
        WHEN (JULIANDAY(l.fecha_vencimiento) - JULIANDAY(DATE('now'))) <= 30 THEN 'Próximo a vencer'
        ELSE 'Vigente'
    END AS estado_vencimiento,
    l.proveedor,
    l.numero_comprobante
FROM lotes l
JOIN productos p ON l.producto_id = p.id
WHERE l.cantidad_actual > 0 
  AND l.fecha_vencimiento IS NOT NULL
  AND (
      DATE(l.fecha_vencimiento) < DATE('now')
      OR (JULIANDAY(l.fecha_vencimiento) - JULIANDAY(DATE('now'))) <= 30
  )
ORDER BY l.fecha_vencimiento ASC;

-- ------------------------------------------------------------------------------
-- VISTA 4: HU-10 DASHBOARD DE INVENTARIO (KPIs en Tiempo Real)
-- ------------------------------------------------------------------------------
CREATE VIEW IF NOT EXISTS v_dashboard_indicadores AS
SELECT 
    (SELECT COUNT(*) FROM v_stock_actual WHERE estado_producto = 'activo' AND alerta_stock = 'Agotado') AS productos_agotados,
    (SELECT COUNT(*) FROM v_stock_actual WHERE estado_producto = 'activo' AND alerta_stock = 'Stock bajo') AS productos_stock_bajo,
    (SELECT COUNT(*) FROM v_lotes_vencimiento WHERE estado_vencimiento = 'Próximo a vencer') AS lotes_proximos_vencer,
    (SELECT COUNT(*) FROM v_lotes_vencimiento WHERE estado_vencimiento = 'Vencido') AS lotes_vencidos,
    (SELECT COUNT(*) FROM reservas WHERE estado IN ('pendiente', 'confirmada_recojo') AND fecha_expiracion > CURRENT_TIMESTAMP) AS reservas_activas,
    (SELECT COALESCE(SUM(valor_inventario_costo), 0) FROM v_stock_actual) AS valor_aproximado_inventario_costo,
    (SELECT COALESCE(SUM(valor_inventario_venta), 0) FROM v_stock_actual) AS valor_aproximado_inventario_venta,
    (SELECT COALESCE(SUM(stock_fisico_vigente), 0) FROM v_stock_actual WHERE estado_producto = 'activo') AS unidades_vigentes_almacen,
    (SELECT COUNT(*) FROM productos WHERE estado = 'activo') AS productos_activos;

-- ------------------------------------------------------------------------------
-- VISTA 5: HU-11 CATÁLOGO WEB DE PRODUCTOS (Para Clientes)
-- Muestra solo productos activos con disponibilidad vendible real.
-- ------------------------------------------------------------------------------
CREATE VIEW IF NOT EXISTS v_catalogo_web AS
SELECT 
    producto_id,
    codigo_barras,
    nombre,
    categoria,
    unidad_medida,
    precio_venta,
    imagen_url,
    stock_disponible,
    CASE 
        WHEN stock_disponible > 0 THEN 1 
        ELSE 0 
    END AS permite_reserva,
    CASE 
        WHEN stock_disponible > 0 THEN 'Disponible' 
        ELSE 'Agotado' 
    END AS etiqueta_disponibilidad
FROM v_stock_actual
WHERE estado_producto = 'activo'
ORDER BY categoria ASC, nombre ASC;

-- ------------------------------------------------------------------------------
-- VISTA 6: HU-05 DISPONIBILIDAD FEFO POR PRODUCTO
-- Lista los lotes vigentes ordenados por fecha de vencimiento más próxima (FEFO)
-- para saber exactamente de qué lote debe descontar cada venta.
-- ------------------------------------------------------------------------------
CREATE VIEW IF NOT EXISTS v_lotes_fefo AS
SELECT 
    l.id AS lote_id,
    l.codigo_lote,
    l.producto_id,
    p.nombre AS producto_nombre,
    l.cantidad_actual AS stock_lote,
    l.costo_unitario,
    l.fecha_vencimiento,
    l.fecha_recepcion,
    l.proveedor,
    l.numero_comprobante
FROM lotes l
JOIN productos p ON l.producto_id = p.id
WHERE p.estado = 'activo'
  AND l.cantidad_actual > 0
  AND (l.fecha_vencimiento IS NULL OR DATE(l.fecha_vencimiento) >= DATE('now'))
ORDER BY 
    CASE WHEN l.fecha_vencimiento IS NULL THEN 1 ELSE 0 END ASC,
    l.fecha_vencimiento ASC,
    l.fecha_recepcion ASC;
