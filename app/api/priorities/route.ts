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

    const { data: priorities, error } = await supabase
      .from('priorities')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .order('rank', { ascending: true });

    if (error) {
      console.error('Fetch priorities error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const unviewedIds = priorities
      .filter(p => !p.viewed_at)
      .map(p => p.id);

    if (unviewedIds.length > 0) {
      await supabase
        .from('priorities')
        .update({ viewed_at: new Date().toISOString() })
        .in('id', unviewedIds);
    }

    return NextResponse.json({ priorities });
  } catch (error) {
    console.error('GET /api/priorities error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
