import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hmtzrpbhychrvrgufmtq.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_WNxegFfe3E2zYwDGHAJOMg_UWjgwnvr'

// Client initialization for GUGA Imprenta CRM (Vercel Ready)
export const supabase = createClient(supabaseUrl, supabaseKey)
