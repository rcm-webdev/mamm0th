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
      name: 'mamm0th/square.sync.requested',
      data: { user_id: session.user.id, full_sync: false },
    });

    return NextResponse.json({
      success: true,
      message: 'Sync triggered successfully'
    });
  } catch (error) {
    console.error('POST /api/sync error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
