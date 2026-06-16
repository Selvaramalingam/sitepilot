import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const { name, email, phone, company, message } = await req.json()

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Name, email, and message are required fields.' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { data, error } = await supabaseAdmin
      .from('contact_messages')
      .insert({
        name,
        email: email.toLowerCase().trim(),
        phone: phone || null,
        company: company || null,
        message
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message || 'Failed to submit contact message.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}
