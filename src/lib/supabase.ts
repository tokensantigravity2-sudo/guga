import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zkjximlagfyqsgqegvlo.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_cgvuj27d6RN4oDAXiTUMwg_J232Fwis'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Supabase devuelve como máximo 1000 filas por consulta: pide de a páginas hasta traer todas.
// La consulta debe tener un orden estable para que las páginas no se pisen.
export const fetchAll = async <T = any>(
  consulta: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: any }>
): Promise<{ data: T[] | null; error: any }> => {
  const pagina = 1000
  const filas: T[] = []
  for (let desde = 0; ; desde += pagina) {
    const { data, error } = await consulta(desde, desde + pagina - 1)
    if (error) return { data: filas.length > 0 ? filas : null, error }
    filas.push(...(data || []))
    if (!data || data.length < pagina) return { data: filas, error: null }
  }
}

// Consulta la configuración pública de Auth: indica si un proveedor (ej. 'google') está activado en el proyecto
export const isAuthProviderEnabled = async (provider: string): Promise<boolean> => {
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/settings`, { headers: { apikey: supabaseKey } })
    const settings = await res.json()
    return settings?.external?.[provider] !== false
  } catch {
    return true
  }
}

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
export const supabaseAdmin = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : supabase
