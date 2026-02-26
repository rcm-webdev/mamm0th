import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chat_id = searchParams.get('chat_id');

    if (!chat_id) {
      return NextResponse.json({ error: 'chat_id required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: messages, error } = await supabase
      .from('chat_message')
      .select('id, role, content, created_at')
      .eq('user_id', session.user.id)
      .eq('chat_id', chat_id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Fetch chat history error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('GET /api/chat/history error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
