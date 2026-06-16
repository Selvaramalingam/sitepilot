import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

async function authenticateSuperAdmin() {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null

    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .eq('role', 'SUPER_ADMIN')
      .single()

    return profile ? user : null
  } catch (e) {
    console.error(e)
    return null
  }
}

export async function POST(req: Request) {
  try {
    const adminUser = await authenticateSuperAdmin()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized. Super Admin access required.' }, { status: 401 })
    }

    const { name, ownerName, email, password, planId, phone } = await req.json()
    const cleanEmail = email.toLowerCase().trim()

    const supabaseAdmin = getSupabaseAdmin()

    // Check if email already taken in auth.users
    const { data: existingUsers } = await supabaseAdmin.from('users').select('id').eq('email', cleanEmail)
    if (existingUsers && existingUsers.length > 0) {
      return NextResponse.json({ error: 'This email is already in use.' }, { status: 400 })
    }

    // 1. Create company
    const expiry = new Date()
    expiry.setDate(expiry.getDate() + 14) // default 14 days trial
    const expiryStr = expiry.toISOString().split('T')[0]

    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({
        name,
        owner_email: cleanEmail,
        subscription_plan_id: planId,
        status: 'Trial',
        expiry_date: expiryStr,
        phone,
        created_by: adminUser.id,
        updated_by: adminUser.id
      })
      .select()
      .single()

    if (companyError || !company) {
      return NextResponse.json({ error: 'Company creation failed: ' + companyError?.message }, { status: 500 })
    }

    // 2. Create Contractor Owner in Supabase Auth (trigger automatically inserts public profile)
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'CONTRACTOR_OWNER',
        full_name: ownerName,
        company_id: company.id
      }
    })

    if (authError || !authUser) {
      // Rollback company insert
      await supabaseAdmin.from('companies').delete().eq('id', company.id)
      return NextResponse.json({ error: 'Contractor user creation failed: ' + authError?.message }, { status: 500 })
    }

    // 3. Log Audit
    await supabaseAdmin.from('audit_logs').insert({
      actor_id: adminUser.id,
      actor_email: adminUser.email,
      action: 'COMPANY_CREATED',
      entity_type: 'COMPANY',
      entity_id: company.id,
      metadata: { companyName: name, ownerEmail: cleanEmail }
    })

    return NextResponse.json({ success: true, companyId: company.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const adminUser = await authenticateSuperAdmin()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized. Super Admin access required.' }, { status: 401 })
    }

    const { id, name, ownerName, email, password, planId, status, expiry, phone } = await req.json()
    const cleanEmail = email.toLowerCase().trim()

    const supabaseAdmin = getSupabaseAdmin()

    // 1. Fetch current owner profile
    const { data: ownerProfile } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('company_id', id)
      .eq('role', 'CONTRACTOR_OWNER')
      .single()

    if (!ownerProfile) {
      return NextResponse.json({ error: 'Contractor Owner profile not found for this company.' }, { status: 404 })
    }

    // Check email unique if changed
    if (cleanEmail !== ownerProfile.email.toLowerCase()) {
      const { data: existing } = await supabaseAdmin.from('users').select('id').eq('email', cleanEmail)
      if (existing && existing.length > 0) {
        return NextResponse.json({ error: 'New email address is already in use.' }, { status: 400 })
      }
    }

    // 2. Update company info
    const { error: companyError } = await supabaseAdmin
      .from('companies')
      .update({
        name,
        owner_email: cleanEmail,
        subscription_plan_id: planId,
        status,
        expiry_date: expiry,
        phone,
        updated_by: adminUser.id
      })
      .eq('id', id)

    if (companyError) {
      return NextResponse.json({ error: 'Company update failed: ' + companyError.message }, { status: 500 })
    }

    // 3. Update auth user and public user profile
    const authUpdate: any = {
      email: cleanEmail,
      user_metadata: { full_name: ownerName }
    }
    if (password && password.trim() !== '') {
      authUpdate.password = password
    }

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      ownerProfile.id,
      authUpdate
    )

    if (authError) {
      return NextResponse.json({ error: 'Auth credentials update failed: ' + authError.message }, { status: 500 })
    }

    await supabaseAdmin
      .from('users')
      .update({
        full_name: ownerName,
        email: cleanEmail
      })
      .eq('id', ownerProfile.id)

    // 4. Log Audit
    await supabaseAdmin.from('audit_logs').insert({
      actor_id: adminUser.id,
      actor_email: adminUser.email,
      action: 'COMPANY_UPDATED',
      entity_type: 'COMPANY',
      entity_id: id,
      metadata: { companyName: name, ownerEmail: cleanEmail, status }
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const adminUser = await authenticateSuperAdmin()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized. Super Admin access required.' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Missing company ID.' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // 1. Delete linked Auth users associated with this company
    const { data: companyUsers } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('company_id', id)

    if (companyUsers) {
      for (const u of companyUsers) {
        await supabaseAdmin.auth.admin.deleteUser(u.id)
      }
    }

    // 2. Delete company (cascades database profiles and entities)
    const { error: companyError } = await supabaseAdmin
      .from('companies')
      .delete()
      .eq('id', id)

    if (companyError) {
      return NextResponse.json({ error: 'Company deletion failed: ' + companyError.message }, { status: 500 })
    }

    // 3. Log Audit
    await supabaseAdmin.from('audit_logs').insert({
      actor_id: adminUser.id,
      actor_email: adminUser.email,
      action: 'COMPANY_DELETED',
      entity_type: 'COMPANY',
      entity_id: id,
      metadata: { companyId: id }
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}
