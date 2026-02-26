import { inngest } from '../client';
import { supabaseAdmin } from '@/lib/supabase/server';
import { openai } from '@/lib/openai';

export const updateMemory = inngest.createFunction(
  { id: 'update-memory', retries: 3 },
  { event: 'mamm0th/memory.update.requested' },
  async ({ event, step }) => {
    const { user_id, trigger_type, context } = event.data as {
      user_id: string;
      trigger_type: 'chat_completed' | 'priority_acted';
      context: {
        message?: string;
        response?: string;
        priority_id?: string;
      };
    };

    const memoryEntry = await step.run('extract-memory', async () => {
      let prompt = '';

      if (trigger_type === 'chat_completed' && context.message && context.response) {
        prompt = `Based on this seller conversation, extract a brief memory entry (1-2 sentences) capturing any important decision, preference, or business insight revealed:

User: ${context.message}
Assistant: ${context.response}

Return only the memory text, nothing else.`;
      } else if (trigger_type === 'priority_acted' && context.priority_id) {
        const { data: priority } = await supabaseAdmin
          .from('priorities')
          .select('title, recommended_action, pattern_type')
          .eq('id', context.priority_id)
          .single();

        if (!priority) return null;

        prompt = `The seller acted on this business priority. Write a brief memory entry (1-2 sentences) capturing what action was taken:

Priority: ${priority.title}
Recommended action: ${priority.recommended_action}
Pattern type: ${priority.pattern_type}

Return only the memory text, nothing else.`;

        // Also record the priority outcome baseline
        const { data: recentTxns } = await supabaseAdmin
          .from('transaction')
          .select('amount, date')
          .eq('user_id', user_id)
          .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('date', { ascending: false });

        const weeklyRevenue = (recentTxns || []).reduce((s, t) => s + t.amount, 0);
        const txnCount = (recentTxns || []).length;

        await supabaseAdmin.from('priority_outcomes').insert({
          priority_id: context.priority_id,
          user_id,
          measurement_window_days: 7,
          metric_before: {
            weekly_revenue: weeklyRevenue,
            transaction_count: txnCount,
            measured_at: new Date().toISOString(),
          },
        });
      }

      if (!prompt) return null;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.3,
      });

      return completion.choices[0].message.content?.trim() || null;
    });

    if (!memoryEntry) return;

    await step.run('save-memory', async () => {
      const embeddingRes = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: memoryEntry,
      });

      const embedding = embeddingRes.data[0].embedding;

      await supabaseAdmin.from('seller_memory').insert({
        user_id,
        memory_type: trigger_type === 'priority_acted' ? 'decision' : 'pattern',
        content: memoryEntry,
        metadata: { trigger_type, ...event.data.context },
        embedding,
      });
    });
  }
);
