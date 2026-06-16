import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

async function authenticateContractorOwner() {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null

    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .eq('role', 'CONTRACTOR_OWNER')
      .single()

    return profile ? profile : null
  } catch (e) {
    console.error(e)
    return null
  }
}

export async function POST(req: Request) {
  try {
    const owner = await authenticateContractorOwner()
    if (!owner) {
      return NextResponse.json({ error: 'Unauthorized. Contractor Owner access required.' }, { status: 401 })
    }

    const { fullName, email, password } = await req.json()
    const cleanEmail = email.toLowerCase().trim()

    const supabaseAdmin = getSupabaseAdmin()

    // Check email unique in public.users
    const { data: existing } = await supabaseAdmin.from('users').select('id').eq('email', cleanEmail)
    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'This email address is already in use.' }, { status: 400 })
    }

    // Create site engineer in Auth (trigger creates public user profile)
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'SITE_ENGINEER',
        full_name: fullName,
        company_id: owner.company_id
      }
    })

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Failed to create site engineer: ' + authError?.message }, { status: 500 })
    }

    // Log action to audit
    await supabaseAdmin.from('audit_logs').insert({
      actor_id: owner.id,
      actor_email: owner.email,
      action: 'USER_CREATED',
      entity_type: 'USER',
      entity_id: authUser.user.id,
      metadata: { role: 'SITE_ENGINEER', email: cleanEmail }
    })

    return NextResponse.json({ success: true, engineerId: authUser.user.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const owner = await authenticateContractorOwner()
    if (!owner) {
      return NextResponse.json({ error: 'Unauthorized. Contractor Owner access required.' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const engineerId = searchParams.get('id')
    if (!engineerId) {
      return NextResponse.json({ error: 'Missing engineer ID.' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Verify the site engineer belongs to the owner's company
    const { data: targetProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', engineerId)
      .eq('company_id', owner.company_id)
      .eq('role', 'SITE_ENGINEER')
      .single()

    if (profileError || !targetProfile) {
      return NextResponse.json({ error: 'Site Engineer not found or does not belong to your company.' }, { status: 404 })
    }

    // Delete user from Supabase Auth (database profile cascade deletes)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(engineerId)
    if (deleteError) {
      return NextResponse.json({ error: 'Deletion failed: ' + deleteError.message }, { status: 500 })
    }

    // Log to audit
    await supabaseAdmin.from('audit_logs').insert({
      actor_id: owner.id,
      actor_email: owner.email,
      action: 'USER_DELETED',
      entity_type: 'USER',
      entity_id: engineerId,
      metadata: { role: 'SITE_ENGINEER', email: targetProfile.email }
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const owner = await authenticateContractorOwner()
    if (!owner) {
      return NextResponse.json({ error: 'Unauthorized. Contractor Owner access required.' }, { status: 401 })
    }

    const { id, fullName, email, password } = await req.json()
    if (!id) return NextResponse.json({ error: 'Missing user ID' }, { status: 400 })

    const supabaseAdmin = getSupabaseAdmin()

    // Verify ownership
    const { data: targetProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .eq('company_id', owner.company_id)
      .eq('role', 'SITE_ENGINEER')
      .single()

    if (profileError || !targetProfile) {
      return NextResponse.json({ error: 'Site Engineer not found or does not belong to your company.' }, { status: 404 })
    }

    const updates: any = {}
    if (email && email.toLowerCase().trim() !== targetProfile.email) {
      updates.email = email.toLowerCase().trim()
      updates.email_confirm = true
    }
    if (password && password.trim().length > 0) {
      updates.password = password
    }
    if (fullName && fullName !== targetProfile.full_name) {
      updates.user_metadata = {
        ...targetProfile.raw_user_meta_data,
        full_name: fullName
      }
    }

    // Update in Auth
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(id, updates)
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
    }

    // If full_name changed, also manually update the public.users table just in case triggers miss it
    if (fullName && fullName !== targetProfile.full_name) {
      await supabaseAdmin.from('users').update({ full_name: fullName }).eq('id', id)
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}
