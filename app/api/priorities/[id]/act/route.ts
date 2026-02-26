import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { inngest } from '@/lib/inngest/client';

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabaseAdmin
      .from('priorities')
      .update({ acted_on_at: new Date().toISOString(), status: 'acted' })
      .eq('id', params.id)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Priority update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await inngest.send({
      name: 'mamm0th/memory.update.requested',
      data: {
        user_id: session.user.id,
        trigger_type: 'priority_acted',
        context: { priority_id: params.id },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/priorities/[id]/act error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
