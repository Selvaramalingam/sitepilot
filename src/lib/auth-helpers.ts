import { createClient } from '@/lib/supabase/client'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: 'SUPER_ADMIN' | 'CONTRACTOR_OWNER' | 'SITE_ENGINEER'
  company_id?: string
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    const supabase = createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return null

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) return null
    return profile as UserProfile
  } catch (e) {
    console.error('Error fetching current user profile on client:', e)
    return null
  }
}
