import { createClient } from '@supabase/supabase-js'

export function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured in environment variables.')
  }
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured in environment variables.')
  }

  // Detect local CLI keys vs hosted URL mismatch
  if (serviceRoleKey.startsWith('sb_secret_') && supabaseUrl.includes('supabase.co')) {
    throw new Error(
      'Configuration Mismatch: You are pointing to a hosted Supabase URL (supabase.co) but using a local CLI service role key (starting with "sb_secret_"). Please use the service role key from your Supabase Dashboard settings (Project Settings -> API).'
    )
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
