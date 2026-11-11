import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { combinarContenidoWeb } from '@/lib/contenidoWeb'

export const dynamic = 'force-dynamic'

// Contenido de la web de inicio (lo que se edita en Panel → Página web)
export async function GET() {
  const { data } = await supabase.from('configuracion').select('valor').eq('clave', 'web').maybeSingle()
  return NextResponse.json(combinarContenidoWeb(data?.valor), {
    headers: { 'Cache-Control': 'no-store' },
  })
}
