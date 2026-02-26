import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: history, error } = await supabase
      .from('priorities')
      .select(`
        id,
        title,
        pattern_type,
        status,
        created_at,
        acted_on_at,
        priority_outcomes (
          delta_revenue,
          uplift_confirmed,
          measured_at
        )
      `)
      .eq('user_id', session.user.id)
      .neq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Fetch history error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ history });
  } catch (error) {
    console.error('GET /api/history error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
