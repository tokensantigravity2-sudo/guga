-- =====================================================
-- TIENDA: carritos abandonados + configuración editable desde el panel
-- Ejecutar una sola vez en Supabase → SQL Editor → New query → Run
-- =====================================================

-- Carritos de la tienda online (para ver quién dejó productos sin comprar)
CREATE TABLE IF NOT EXISTS carritos (
  id TEXT PRIMARY KEY,                       -- identificador del navegador del cliente
  cliente_nombre TEXT,
  cliente_telefono TEXT,
  cliente_email TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'activo',     -- activo | convertido | descartado
  pedido_numero TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE carritos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_all_carritos" ON carritos;
CREATE POLICY "public_all_carritos" ON carritos FOR ALL USING (true) WITH CHECK (true);

-- Configuración de la tienda (textos del pie, WhatsApp, banners...) que ven todos los clientes
CREATE TABLE IF NOT EXISTS configuracion (
  clave TEXT PRIMARY KEY,
  valor JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_all_configuracion" ON configuracion;
CREATE POLICY "public_all_configuracion" ON configuracion FOR ALL USING (true) WITH CHECK (true);
