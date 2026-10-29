import { supabase } from './supabase'

// Textos del pie de la tienda, editables desde Panel → E-commerce → Configuración
export const TEXTOS_PIE_TIENDA = {
  textoPie: 'Tu imprenta de confianza. Fabricamos folletos, talonarios, tarjetas, banners y etiquetas con la mayor calidad gráfica.',
  horarioRetiro: 'Retiro en taller: Lunes a Viernes 08:30 a 18:30hs',
  textoEnvios: 'Envíos a todo el país por agencia o cadetería',
  textoConsultas: 'Consultas directas al WhatsApp oficial',
  formasPago: 'Aceptamos Efectivo contra entrega, Transferencias bancarias (BROU, Itaú, Santander) y Mercado Pago.',
  textoCopyright: 'GUGA Imprenta & Gráfica · Tienda Oficial',
}

// Falta ejecutar supabase/tienda.sql (la tabla no existe todavía)
export const esTablaFaltante = (error: { code?: string; message?: string } | null) =>
  !!error && (error.code === '42P01' || error.code === 'PGRST205' || /does not exist|schema cache/i.test(error.message || ''))

// La configuración vive en la tabla `configuracion` para que la vean todos los clientes, no solo este navegador
export const leerConfigTienda = async (): Promise<Record<string, any> | null> => {
  const { data, error } = await supabase.from('configuracion').select('valor').eq('clave', 'tienda').maybeSingle()
  if (error || !data) return null
  return data.valor as Record<string, any>
}

export const guardarConfigTienda = async (valor: Record<string, any>) => {
  const { error } = await supabase
    .from('configuracion')
    .upsert({ clave: 'tienda', valor, updated_at: new Date().toISOString() })
  return error
}
