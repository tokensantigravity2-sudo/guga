import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hmtzrpbhychrvrgufmtq.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtdHpycGJoeWNocnZyZ3VmbXRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNTI5MzMsImV4cCI6MjEwMjcyODkzM30.w5LturOzrJOa6l6tDuDnfeIVQc8YgOlNpW5cIBDlKLI'

export const supabase = createClient(supabaseUrl, supabaseKey)
