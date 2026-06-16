import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { count, error } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'SUPER_ADMIN')

    if (error) {
      return NextResponse.json({ error: error.message || error.code || 'Unknown database error' }, { status: 500 })
    }

    return NextResponse.json({ setupRequired: !count || count === 0 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { email, password, fullName } = await req.json()

    const supabaseAdmin = getSupabaseAdmin()

    // Security Check: count existing super admins
    const { count, error: countError } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'SUPER_ADMIN')

    if (countError) {
      const errorMsg = countError.message || countError.code || JSON.stringify(countError)
      return NextResponse.json({ error: 'Database check failed: ' + errorMsg }, { status: 500 })
    }

    if (count && count > 0) {
      return NextResponse.json({ error: 'Setup is locked. A Super Admin already exists on this platform.' }, { status: 403 })
    }

    // Create Super Admin user in Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: {
        role: 'SUPER_ADMIN',
        full_name: fullName
      }
    })

    if (authError) {
      return NextResponse.json({ error: 'Auth user creation failed: ' + authError.message }, { status: 500 })
    }

    // Log the action
    await supabaseAdmin.from('audit_logs').insert({
      actor_id: authUser.user.id,
      actor_email: email,
      action: 'PLATFORM_SETUP',
      entity_type: 'USER',
      entity_id: authUser.user.id,
      metadata: { description: 'Primary Super Admin account created.' }
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}
