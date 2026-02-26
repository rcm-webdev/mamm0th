import { inngest } from '../client';
import { supabaseAdmin } from '@/lib/supabase/server';
import { openai } from '@/lib/openai';

interface Transaction {
  id: string;
  date: string;
  amount: number;
  item_details: unknown;
}

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  const dayOfWeek = d.getDay();
  const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

function buildWeekChunk(weekKey: string, transactions: Transaction[]): string {
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  const lines = [
    `Week of ${weekKey}: ${transactions.length} transactions, $${total.toFixed(2)} total revenue.`,
  ];
  for (const t of transactions) {
    lines.push(`  - $${t.amount.toFixed(2)} on ${t.date.substring(0, 10)}`);
  }
  return lines.join('\n');
}

export const embedTransactions = inngest.createFunction(
  { id: 'embed-transactions', retries: 3 },
  { event: 'mamm0th/transactions.synced' },
  async ({ event, step }) => {
    const { user_id, user_ids } = event.data as {
      user_id: string | null;
      user_ids?: string[];
    };

    const targetUsers = user_id ? [user_id] : (user_ids || []);

    for (const uid of targetUsers) {
      await step.run(`embed-user-${uid}`, async () => {
        const { data: transactions, error } = await supabaseAdmin
          .from('transaction')
          .select('id, date, amount, item_details')
          .eq('user_id', uid)
          .order('date', { ascending: false })
          .limit(500);

        if (error) throw new Error(`Failed to fetch transactions: ${error.message}`);
        if (!transactions || transactions.length === 0) return;

        // Group by week
        const byWeek = new Map<string, Transaction[]>();
        for (const t of transactions) {
          const key = getWeekKey(t.date);
          const existing = byWeek.get(key) || [];
          existing.push(t);
          byWeek.set(key, existing);
        }

        // Delete existing transaction_chunk embeddings for this user
        await supabaseAdmin
          .from('embeddings')
          .delete()
          .eq('user_id', uid)
          .eq('source_type', 'transaction_chunk');

        // Embed each week chunk
        for (const [weekKey, weekTxns] of byWeek.entries()) {
          const content = buildWeekChunk(weekKey, weekTxns);

          const embeddingRes = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: content,
          });

          const embedding = embeddingRes.data[0].embedding;

          await supabaseAdmin.from('embeddings').insert({
            user_id: uid,
            source_type: 'transaction_chunk',
            source_id: weekKey,
            content,
            embedding,
            metadata: {
              week: weekKey,
              transaction_count: weekTxns.length,
              total_revenue: weekTxns.reduce((s, t) => s + t.amount, 0),
            },
          });
        }

        return { user_id: uid, weeks_embedded: byWeek.size };
      });
    }

    await step.sendEvent('trigger-priorities', {
      name: 'mamm0th/embeddings.ready',
      data: { user_id: user_id || null, user_ids: targetUsers },
    });
  }
);
