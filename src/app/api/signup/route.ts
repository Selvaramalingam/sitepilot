import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const { companyName, ownerName, email, password, planId } = await req.json()
    const cleanEmail = email.toLowerCase().trim()

    const supabaseAdmin = getSupabaseAdmin()

    // 1. Verify email uniqueness
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 400 })
    }

    // 2. Create the company
    const expiry = new Date()
    expiry.setDate(expiry.getDate() + 14) // 14-day trial
    const expiryStr = expiry.toISOString().split('T')[0]

    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({
        name: companyName,
        owner_email: cleanEmail,
        subscription_plan_id: planId,
        status: 'Trial',
        expiry_date: expiryStr
      })
      .select()
      .single()

    if (companyError || !company) {
      return NextResponse.json({ error: companyError?.message || 'Failed to initialize company workspace.' }, { status: 500 })
    }

    // 3. Register Owner User in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'CONTRACTOR_OWNER',
        first_name: ownerName,
        company_id: company.id
      }
    })

    if (authError || !authData.user) {
      // Rollback Company insert to maintain consistency
      await supabaseAdmin.from('companies').delete().eq('id', company.id)
      return NextResponse.json({ error: authError?.message || 'Authentication setup failed.' }, { status: 500 })
    }

    // 4. Log setup audit log
    await supabaseAdmin.from('audit_logs').insert({
      actor_id: authData.user.id,
      actor_email: cleanEmail,
      action: 'TENANT_SIGNUP',
      entity_type: 'COMPANY',
      entity_id: company.id,
      metadata: { companyName }
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}
