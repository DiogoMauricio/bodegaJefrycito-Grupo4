-- ==============================================================================
-- SISTEMA DE GESTIÓN DE INVENTARIO BODEGA JEFRYSITO (GESTOCK)
-- Datos Iniciales (Seed Data)
-- Representa exactamente la información de prueba de las HU y prototipos
-- ==============================================================================

PRAGMA foreign_keys = ON;

-- ------------------------------------------------------------------------------
-- 1. USUARIOS (HU-01)
-- Credencial demo: usuario 'admin' / contraseña 'gestock123'
-- Hash SHA-256 de 'gestock123': 03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4
-- ------------------------------------------------------------------------------
INSERT OR IGNORE INTO usuarios (id, username, password_hash, nombre_completo, rol, estado) VALUES
(1, 'admin', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', 'Jefry Cayetano (Administrador)', 'administrador', 'activo'),
(2, 'almacen', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', 'Fiorella Camayoc (Almacenera)', 'almacenero', 'activo'),
(3, 'caja', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', 'Carlos Llamocca (Cajero)', 'cajero', 'activo');

-- ------------------------------------------------------------------------------
-- 2. PRODUCTOS MAESTROS (HU-02, HU-03)
-- ------------------------------------------------------------------------------
INSERT OR IGNORE INTO productos (id, codigo_barras, nombre, categoria, unidad_medida, precio_venta, stock_minimo, estado, imagen_url) VALUES
('p1', '7750001000011', 'Agua Mineral San Luis 625ml', 'Bebidas', 'Unidad', 1.50, 24, 'activo', '/products/agua.png'),
('p2', '7750001000028', 'Arroz Costeño 5kg', 'Abarrotes', 'Bolsa', 24.90, 10, 'activo', '/products/arroz.png'),
('p3', '7750001000035', 'Aceite Primor 1L', 'Abarrotes', 'Botella', 9.80, 12, 'activo', '/products/aceite.png'),
('p4', '7750001000042', 'Leche Gloria Evaporada 400g', 'Lácteos', 'Lata', 4.20, 20, 'activo', '/products/leche.png'),
('p5', '7750001000059', 'Inca Kola 1.5L', 'Bebidas', 'Botella', 7.50, 15, 'activo', '/products/gaseosa.png'),
('p6', '7750001000066', 'Atún Florida 170g', 'Conservas', 'Lata', 5.90, 18, 'activo', '/products/atun.png'),
('p7', '7750001000073', 'Galletas Soda Field 6pack', 'Snacks', 'Paquete', 3.60, 16, 'activo', '/products/galletas.png'),
('p8', '7750001000080', 'Detergente Bolívar 780g', 'Limpieza', 'Bolsa', 8.40, 10, 'inactivo', '/products/detergente.png');

-- ------------------------------------------------------------------------------
-- 3. PROVEEDORES
-- ------------------------------------------------------------------------------
INSERT OR IGNORE INTO proveedores (id, ruc, razon_social, telefono, email, direccion) VALUES
(1, '20100017491', 'Distribuidora Andina S.A.C.', '01-4455667', 'ventas@andina.com.pe', 'Av. Argentina 1420, Lima'),
(2, '20100107211', 'Molinos del Sur S.A.', '01-3322114', 'pedidos@molinosdelsur.pe', 'Carretera Central Km 8.5, Lima'),
(3, '20100055237', 'Industrias Primor / Alicorp S.A.A.', '01-5950400', 'atencionalcliente@alicorp.com.pe', 'Av. Argentina 4793, Carmen de la Legua'),
(4, '20100190797', 'Gloria S.A.', '01-4707170', 'contacto@gloria.com.pe', 'Av. República de Panamá 2461, Lima');

-- ------------------------------------------------------------------------------
-- 4. ENTRADAS DE MERCADERÍA (HU-04)
-- Cumple restricción UNIQUE(proveedor, numero_comprobante)
-- ------------------------------------------------------------------------------
INSERT OR IGNORE INTO entradas_mercaderia (id, proveedor, tipo_comprobante, numero_comprobante, fecha_recepcion, usuario_id, observaciones) VALUES
(1, 'Distribuidora Andina', 'Factura', 'F001-1201', DATE('now', '-40 days'), 1, 'Recepción inicial de aguas'),
(2, 'Molinos del Sur', 'Factura', 'F002-0087', DATE('now', '-20 days'), 1, 'Reposición de sacos de arroz'),
(3, 'Industrias Primor', 'Factura', 'F003-0450', DATE('now', '-60 days'), 1, 'Lote anterior de aceite'),
(4, 'Industrias Primor', 'Factura', 'F003-0511', DATE('now', '-10 days'), 1, 'Nuevo lote de aceite Primor'),
(5, 'Gloria S.A.', 'Factura', 'F004-0210', DATE('now', '-90 days'), 1, 'Cajas de leche lote LE-2310'),
(6, 'Gloria S.A.', 'Factura', 'F004-0233', DATE('now', '-15 days'), 1, 'Cajas de leche lote LE-2404'),
(7, 'Distribuidora Andina', 'Factura', 'F001-1240', DATE('now', '-12 days'), 1, 'Bebidas gaseosas Inca Kola'),
(8, 'Alicorp', 'Factura', 'F006-0777', DATE('now', '-30 days'), 1, 'Galletas Soda Field');

-- ------------------------------------------------------------------------------
-- 5. LOTES POR PRODUCTO (HU-04, HU-07, HU-09)
-- Demuestra casos:
-- - Lote normal vigente (AG-2401)
-- - Lote con stock bajo (AR-2405)
-- - Lotes múltiples para el mismo producto (AC-2312 vcto en 18 días, AC-2404 vcto en 210 días -> prueba de FEFO)
-- - Lote vencido (LE-2310 venció hace 5 días -> bloqueado)
-- - Lote próximo a vencer (GA-2402 vence en 9 días)
-- ------------------------------------------------------------------------------
INSERT OR IGNORE INTO lotes (id, producto_id, entrada_id, codigo_lote, cantidad_inicial, cantidad_actual, costo_unitario, fecha_vencimiento, fecha_recepcion, proveedor, numero_comprobante, estado) VALUES
('l1', 'p1', 1, 'AG-2401', 80, 80, 0.80, DATE('now', '+300 days'), DATE('now', '-40 days'), 'Distribuidora Andina', 'F001-1201', 'vigente'),
('l2', 'p2', 2, 'AR-2405', 6,  6,  18.00, DATE('now', '+420 days'), DATE('now', '-20 days'), 'Molinos del Sur', 'F002-0087', 'vigente'),
('l3', 'p3', 3, 'AC-2312', 10, 10, 7.10, DATE('now', '+18 days'),  DATE('now', '-60 days'), 'Industrias Primor', 'F003-0450', 'vigente'),
('l4', 'p3', 4, 'AC-2404', 24, 24, 7.40, DATE('now', '+210 days'), DATE('now', '-10 days'), 'Industrias Primor', 'F003-0511', 'vigente'),
('l5', 'p4', 5, 'LE-2310', 12, 12, 3.10, DATE('now', '-5 days'),   DATE('now', '-90 days'), 'Gloria S.A.', 'F004-0210', 'vencido'),
('l6', 'p4', 6, 'LE-2404', 40, 40, 3.20, DATE('now', '+160 days'), DATE('now', '-15 days'), 'Gloria S.A.', 'F004-0233', 'vigente'),
('l7', 'p5', 7, 'IK-2403', 30, 30, 5.50, DATE('now', '+120 days'), DATE('now', '-12 days'), 'Distribuidora Andina', 'F001-1240', 'vigente'),
('l9', 'p7', 8, 'GA-2402', 28, 28, 2.50, DATE('now', '+9 days'),   DATE('now', '-30 days'), 'Alicorp', 'F006-0777', 'vigente');

-- ------------------------------------------------------------------------------
-- 6. RESERVAS ACTIVAS (HU-14, HU-15)
-- Conforme a los prototipos de la documentación
-- ------------------------------------------------------------------------------
INSERT OR IGNORE INTO reservas (id, codigo_reserva, cliente_nombre, cliente_telefono, comentario, fecha_reserva, fecha_expiracion, total_estimado, estado, notificacion_leida) VALUES
(1, 'RSV-2759', 'María Quispe', '961706093', 'Paso por la tarde a eso de las 4pm', DATETIME('now', '-2 hours'), DATETIME('now', '+22 hours'), 34.70, 'pendiente', 0),
(2, 'RSV-2049', 'Jorge Ramírez', '956112233', 'Pago con Yape en tienda', DATETIME('now', '-3 hours'), DATETIME('now', '+21 hours'), 29.40, 'confirmada_recojo', 1),
(3, 'RSV-2048', 'María Quispe', '961706093', 'Pedido anterior', DATETIME('now', '-28 hours'), DATETIME('now', '-4 hours'), 24.00, 'expirada', 1);

-- Detalle de las reservas (Apartan unidades del stock disponible)
INSERT OR IGNORE INTO detalle_reservas (id, reserva_id, producto_id, cantidad, precio_unitario, subtotal) VALUES
-- RSV-2759: 1 Arroz Costeño (S/ 24.90) + 1 Aceite Primor (S/ 9.80) = S/ 34.70
(1, 1, 'p2', 1, 24.90, 24.90),
(2, 1, 'p3', 1, 9.80, 9.80),
-- RSV-2049: 1 Arroz Costeño (S/ 24.90) + 3 Agua San Luis (S/ 4.50) = S/ 29.40
(3, 2, 'p2', 1, 24.90, 24.90),
(4, 2, 'p1', 3, 1.50, 4.50),
-- RSV-2048: 1 Inca Kola 1.5L + otras (ya expirada, no compromete stock actual)
(5, 3, 'p5', 2, 7.50, 15.00);

-- ------------------------------------------------------------------------------
-- 7. KARDEX HISTÓRICO DE MOVIMIENTOS (HU-06)
-- Conserva saldo anterior y saldo posterior para auditoría perfecta
-- ------------------------------------------------------------------------------
INSERT OR IGNORE INTO kardex_movimientos (id, fecha, producto_id, lote_id, tipo_movimiento, cantidad_entrada, cantidad_salida, saldo_anterior, saldo_posterior, referencia, usuario_id) VALUES
(1, DATETIME('now', '-40 days', '10:00:00'), 'p1', 'l1', 'entrada', 80, 0, 0, 80, 'Entrada Distribuidora Andina · F001-1201', 1),
(2, DATETIME('now', '-30 days', '11:15:00'), 'p7', 'l9', 'entrada', 28, 0, 0, 28, 'Entrada Alicorp · F006-0777', 1),
(3, DATETIME('now', '-20 days', '09:30:00'), 'p2', 'l2', 'entrada', 6,  0, 0, 6,  'Entrada Molinos del Sur · F002-0087', 1),
(4, DATETIME('now', '-15 days', '14:20:00'), 'p4', 'l6', 'entrada', 40, 0, 12, 52, 'Entrada Gloria S.A. · F004-0233', 1),
(5, DATETIME('now', '-12 days', '16:45:00'), 'p5', 'l7', 'entrada', 30, 0, 0, 30, 'Entrada Distribuidora Andina · F001-1240', 1),
(6, DATETIME('now', '-10 days', '08:50:00'), 'p3', 'l4', 'entrada', 24, 0, 10, 34, 'Entrada Industrias Primor · F003-0511', 1);
