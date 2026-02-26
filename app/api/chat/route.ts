import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { openai } from '@/lib/openai';
import { inngest } from '@/lib/inngest/client';

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are Mamm0th, an AI business advisor for small sellers using Square. You have access to the seller's transaction history, business priorities, and memory from past conversations.

Be concise, direct, and actionable. When you reference data, cite specific numbers. If you don't have enough data to answer confidently, say so.`;

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, chat_id } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const effectiveChatId = chat_id || session.user.id;

    // 1. Fetch seller context in parallel
    const [profileResult, prioritiesResult, memoryResult, historyResult] = await Promise.all([
      supabaseAdmin
        .from('seller_profile')
        .select('business_name, business_type, quarterly_revenue_goal, risk_tolerance')
        .eq('id', session.user.id)
        .maybeSingle(),
      supabaseAdmin
        .from('priorities')
        .select('title, rationale, recommended_action, rank, pattern_type')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .order('rank'),
      supabaseAdmin
        .from('seller_memory')
        .select('content, memory_type, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabaseAdmin
        .from('chat_message')
        .select('role, content')
        .eq('user_id', session.user.id)
        .eq('chat_id', effectiveChatId)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    // 2. Embed the user message for vector search
    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: message,
    });
    const queryEmbedding = embeddingRes.data[0].embedding;

    // 3. Vector search for relevant transaction chunks
    const { data: relevantChunks } = await supabaseAdmin.rpc('match_embeddings', {
      query_embedding: queryEmbedding,
      match_user_id: session.user.id,
      match_threshold: 0.5,
      match_count: 4,
    });

    // 4. Assemble context
    const profile = profileResult.data;
    const priorities = prioritiesResult.data || [];
    const memory = memoryResult.data || [];
    const history = (historyResult.data || []).reverse();

    const contextParts: string[] = [];

    if (profile) {
      contextParts.push(
        `Seller: ${profile.business_name || 'Unknown'} (${profile.business_type || 'Unknown type'})` +
        (profile.quarterly_revenue_goal ? `, Q goal: $${profile.quarterly_revenue_goal}` : '') +
        `, risk: ${profile.risk_tolerance || 'medium'}`
      );
    }

    if (priorities.length > 0) {
      contextParts.push(
        'Current priorities:\n' +
          priorities.map((p) => `${p.rank}. ${p.title} — ${p.recommended_action}`).join('\n')
      );
    }

    if (memory.length > 0) {
      contextParts.push('Past memory:\n' + memory.map((m) => `- ${m.content}`).join('\n'));
    }

    if (relevantChunks && relevantChunks.length > 0) {
      contextParts.push(
        'Relevant transaction data:\n' +
          relevantChunks.map((c: { content: string }) => c.content).join('\n\n')
      );
    }

    const contextBlock = contextParts.length > 0
      ? `\n\nContext:\n${contextParts.join('\n\n')}`
      : '';

    // 5. Build messages array
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: SYSTEM_PROMPT + contextBlock },
      ...history.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    // 6. Call GPT-4o
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      max_tokens: 600,
      temperature: 0.4,
    });

    const assistantResponse = completion.choices[0].message.content || '';

    // 7. Save messages to chat_message
    await supabaseAdmin.from('chat_message').insert([
      {
        chat_id: effectiveChatId,
        user_id: session.user.id,
        role: 'user',
        content: message,
      },
      {
        chat_id: effectiveChatId,
        user_id: session.user.id,
        role: 'assistant',
        content: assistantResponse,
      },
    ]);

    // 8. Fire-and-forget memory update
    inngest
      .send({
        name: 'mamm0th/memory.update.requested',
        data: {
          user_id: session.user.id,
          trigger_type: 'chat_completed',
          context: { message, response: assistantResponse },
        },
      })
      .catch((err) => console.error('Memory update event failed:', err));

    return NextResponse.json({ response: assistantResponse });
  } catch (error) {
    console.error('POST /api/chat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
