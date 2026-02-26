import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { inngest } from '@/lib/inngest/client';

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await inngest.send({
      name: 'mamm0th/generate.priorities.requested',
      data: { user_id: session.user.id, trigger_source: 'manual' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/generate-priorities error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
