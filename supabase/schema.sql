-- =====================================================
-- SCHEMA COMPLETO – CRM GUGA IMPRENTA (V2)
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Tabla de CLIENTES
CREATE TABLE IF NOT EXISTS clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  rut TEXT,
  notas TEXT,
  tipo TEXT DEFAULT 'regular',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de SERVICIOS (catálogo de productos de impresión)
CREATE TABLE IF NOT EXISTS servicios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  precio_base NUMERIC(10,2) NOT NULL DEFAULT 0,
  categoria TEXT NOT NULL,
  unidad TEXT DEFAULT 'unidad',
  tiempo_estimado TEXT,
  disponible BOOLEAN DEFAULT TRUE,
  imagen_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de PEDIDOS
CREATE TABLE IF NOT EXISTS pedidos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT NOT NULL,
  cliente_id UUID REFERENCES clientes(id),
  cliente_nombre TEXT,
  items JSONB NOT NULL,
  subtotal NUMERIC(10,2),
  descuento NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  metodo_pago TEXT DEFAULT 'efectivo',
  estado TEXT DEFAULT 'presupuesto',
  fecha_entrega DATE,
  notas TEXT,
  archivo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de PROVEEDORES
CREATE TABLE IF NOT EXISTS proveedores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  rubro TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabla de GASTOS
CREATE TABLE IF NOT EXISTS gastos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  concepto TEXT NOT NULL,
  monto NUMERIC(10,2) NOT NULL,
  categoria TEXT NOT NULL,
  fecha DATE DEFAULT CURRENT_DATE,
  proveedor_id UUID REFERENCES proveedores(id),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabla de EMPLEADOS
CREATE TABLE IF NOT EXISTS empleados (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  cargo TEXT,
  telefono TEXT,
  email TEXT,
  salario NUMERIC(10,2),
  fecha_ingreso DATE DEFAULT CURRENT_DATE,
  activo BOOLEAN DEFAULT TRUE,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabla de MOVIMIENTOS DE CAJA
CREATE TABLE IF NOT EXISTS caja_movimientos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL,
  monto NUMERIC(10,2) NOT NULL,
  concepto TEXT,
  referencia_id UUID,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tabla de STOCK / MATERIALES
CREATE TABLE IF NOT EXISTS stock (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  cantidad NUMERIC(10,2) DEFAULT 0,
  unidad TEXT DEFAULT 'unidad',
  minimo NUMERIC(10,2) DEFAULT 0,
  costo_unitario NUMERIC(10,2) DEFAULT 0,
  proveedor_id UUID REFERENCES proveedores(id),
  categoria TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Tabla de TAREAS (Pendientes)
CREATE TABLE IF NOT EXISTS tareas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  completada BOOLEAN DEFAULT FALSE,
  prioridad TEXT DEFAULT 'media',
  fecha_vencimiento DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Tabla de NOTAS / IDEAS / TIPS
CREATE TABLE IF NOT EXISTS notas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  contenido TEXT NOT NULL,
  color TEXT DEFAULT '#fef08a',
  categoria TEXT DEFAULT 'Idea',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- HABILITAR RLS
-- =====================================================
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE caja_movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso público (desarrollo)
CREATE POLICY "public_all_clientes" ON clientes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_servicios" ON servicios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_pedidos" ON pedidos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_gastos" ON gastos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_proveedores" ON proveedores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_empleados" ON empleados FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_caja" ON caja_movimientos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_stock" ON stock FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_tareas" ON tareas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all_notas" ON notas FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- DATOS INICIALES DE PRUEBA
-- =====================================================

INSERT INTO servicios (nombre, descripcion, precio_base, categoria, unidad, tiempo_estimado) VALUES
('Folletos A4', 'Folleto full color impreso en ambas caras', 8.00, 'Folletos', 'unidad', '2-3 dias'),
('Folletos A5', 'Folleto diptico full color', 6.00, 'Folletos', 'unidad', '2-3 dias'),
('Volantes A5', 'Volante promocional full color una cara', 3.50, 'Volantes', 'unidad', '1-2 dias'),
('Volantes A6', 'Volante pequeno full color una cara', 2.50, 'Volantes', 'unidad', '1-2 dias'),
('Tarjetas de Presentacion', 'Tarjetas 9x5 cm en cartulina 300g', 5.00, 'Tarjetas', 'unidad', '2 dias'),
('Tarjetas Doble Faz', 'Tarjetas impresas ambas caras', 7.00, 'Tarjetas', 'unidad', '2 dias'),
('Stickers Troquelados', 'Sticker con corte a medida en vinilo', 15.00, 'Stickers', 'unidad', '3-4 dias'),
('Stickers Rectangulares', 'Sticker rectangular en papel ilustracion', 8.00, 'Stickers', 'unidad', '2-3 dias'),
('Stickers para Packaging', 'Stickers para etiquetado de productos', 5.00, 'Stickers', 'unidad', '2 dias'),
('Banner Roll Up', 'Banner enrollable 80x200 cm full color', 1800.00, 'Banners', 'unidad', '3-5 dias'),
('Banner Lona', 'Banner en lona vinilica para exterior', 350.00, 'Banners', 'metro cuadrado', '3-5 dias'),
('Afiches A3', 'Afiche full color papel ilustracion 150g', 25.00, 'Afiches', 'unidad', '2 dias'),
('Afiches A2', 'Afiche full color papel ilustracion 150g', 45.00, 'Afiches', 'unidad', '2-3 dias'),
('Sobres Membretados', 'Sobre carta con logo impreso', 12.00, 'Papeleria', 'unidad', '3 dias'),
('Hojas Membretadas', 'Hoja A4 con membrete a color', 8.00, 'Papeleria', 'unidad', '2 dias'),
('Carpetas Corporativas', 'Carpeta A4 con solapa, full color', 85.00, 'Papeleria', 'unidad', '5-7 dias'),
('Recetarios / Talonarios', 'Talonario autocopiativo 50x2', 250.00, 'Formularios', 'talonario', '5 dias'),
('Invitaciones', 'Invitaciones personalizadas en cartulina premium', 35.00, 'Especiales', 'unidad', '3-5 dias'),
('Calendarios', 'Calendario de escritorio o pared personalizado', 150.00, 'Especiales', 'unidad', '5-7 dias'),
('Packaging / Cajas', 'Cajas personalizadas con diseno full color', 120.00, 'Packaging', 'unidad', '7-10 dias')
ON CONFLICT DO NOTHING;

INSERT INTO stock (nombre, cantidad, unidad, minimo, costo_unitario, categoria) VALUES
('Papel Bond A4 75g (resma)', 50, 'resma', 10, 180.00, 'Papel'),
('Papel Couche 150g A4 (resma)', 30, 'resma', 8, 450.00, 'Papel'),
('Papel Couche 300g A4 (resma)', 20, 'resma', 5, 680.00, 'Papel'),
('Papel Ilustracion 150g A3 (resma)', 15, 'resma', 5, 520.00, 'Papel'),
('Cartulina 300g A4 (resma)', 25, 'resma', 8, 550.00, 'Papel'),
('Vinilo Adhesivo Blanco (rollo)', 8, 'rollo', 3, 1200.00, 'Vinilo'),
('Vinilo Transparente (rollo)', 5, 'rollo', 2, 1400.00, 'Vinilo'),
('Lona Vinilica (rollo)', 4, 'rollo', 2, 2500.00, 'Lona'),
('Tinta Negra (cartucho)', 10, 'cartucho', 4, 350.00, 'Tintas'),
('Tinta Cyan (cartucho)', 8, 'cartucho', 3, 380.00, 'Tintas'),
('Tinta Magenta (cartucho)', 8, 'cartucho', 3, 380.00, 'Tintas'),
('Tinta Amarilla (cartucho)', 8, 'cartucho', 3, 380.00, 'Tintas'),
('Toner Negro Laser', 6, 'unidad', 2, 1800.00, 'Toner'),
('Toner Color Laser', 4, 'unidad', 2, 2200.00, 'Toner'),
('Laminado Brillante (rollo)', 6, 'rollo', 2, 900.00, 'Acabados'),
('Laminado Mate (rollo)', 5, 'rollo', 2, 950.00, 'Acabados')
ON CONFLICT DO NOTHING;

INSERT INTO notas (titulo, contenido, color, categoria) VALUES
('Muestrario de Papeles', 'Tener siempre a mano el muestrario de Couché 150g vs 300g para mostrar a clientes de tarjetas.', '#fef08a', 'Tip'),
('Mantenimiento Plotter', 'Hacer limpieza de cabezales cada lunes a primera hora.', '#bfdbfe', 'Mantenimiento'),
('Proveedor de Lonas', 'Consultar descuento por volumen en compras mayores a 5 rollos.', '#bbf7d0', 'Idea')
ON CONFLICT DO NOTHING;

INSERT INTO tareas (titulo, descripcion, completada, prioridad) VALUES
('Revisar nivel de tinta Magenta', 'Queda poco tóner en la impresora principal', FALSE, 'alta'),
('Llamar a Papelera Central', 'Pedir presupuesto de cartulina 350g', FALSE, 'media'),
('Organizar muestras de stickers', 'Armar carpetita con troqueles de muestra', TRUE, 'baja')
ON CONFLICT DO NOTHING;
