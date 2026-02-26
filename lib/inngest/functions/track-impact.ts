import { inngest } from '../client';
import { supabaseAdmin } from '@/lib/supabase/server';

export const trackImpact = inngest.createFunction(
  { id: 'track-impact', retries: 3 },
  { cron: '0 6 * * *' },
  async ({ step }) => {
    const outcomes = await step.run('fetch-due-outcomes', async () => {
      const { data, error } = await supabaseAdmin.rpc('get_priorities_due_for_measurement');
      if (error) throw new Error(`Failed to fetch outcomes: ${error.message}`);
      return data || [];
    });

    for (const outcome of outcomes) {
      await step.run(`measure-outcome-${outcome.outcome_id}`, async () => {
        const { data: recentTxns } = await supabaseAdmin
          .from('transaction')
          .select('amount, date')
          .eq('user_id', outcome.user_id)
          .gte('date', outcome.acted_on_at)
          .lte(
            'date',
            new Date(new Date(outcome.acted_on_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
          );

        const weeklyRevenue = (recentTxns || []).reduce((s: number, t: { amount: number }) => s + t.amount, 0);
        const txnCount = (recentTxns || []).length;

        const metricBefore = outcome.metric_before as {
          weekly_revenue?: number;
          transaction_count?: number;
        };
        const revenueBefore = metricBefore?.weekly_revenue || 0;
        const deltaRevenue = weeklyRevenue - revenueBefore;

        await supabaseAdmin
          .from('priority_outcomes')
          .update({
            metric_after: {
              weekly_revenue: weeklyRevenue,
              transaction_count: txnCount,
              measured_at: new Date().toISOString(),
            },
            delta_revenue: deltaRevenue,
            uplift_confirmed: deltaRevenue > 0,
            measured_at: new Date().toISOString(),
          })
          .eq('id', outcome.outcome_id);
      });
    }

    return { outcomes_measured: outcomes.length };
  }
);
