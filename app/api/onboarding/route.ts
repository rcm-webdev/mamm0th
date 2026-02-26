import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { inngest } from '@/lib/inngest/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('seller_profile')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    return NextResponse.json({
      onboarded: !!profile,
      profile
    });
  } catch (error) {
    console.error('GET /api/onboarding error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const { data: profile, error } = await supabaseAdmin
      .from('seller_profile')
      .upsert({
        id: session.user.id,
        business_name: body.business_name,
        business_type: body.business_type,
        quarterly_revenue_goal: body.quarterly_revenue_goal,
        risk_tolerance: body.risk_tolerance || 'medium'
      })
      .select()
      .single();

    if (error) {
      console.error('Seller profile upsert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await inngest.send({
      name: 'mamm0th/user.onboarded',
      data: { user_id: session.user.id },
    });

    return NextResponse.json({
      success: true,
      profile_id: profile.id
    });
  } catch (error) {
    console.error('POST /api/onboarding error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
