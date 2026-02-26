import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase
      .from('priorities')
      .update({
        status: 'dismissed',
        dismissed_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Dismiss priority error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/priorities/[id]/dismiss error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
