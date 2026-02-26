import { inngest } from '../client';
import { supabaseAdmin } from '@/lib/supabase/server';
import { openai } from '@/lib/openai';

interface SellerProfile {
  id: string;
  business_name: string | null;
  business_type: string | null;
  quarterly_revenue_goal: number | null;
  risk_tolerance: string | null;
}

interface Priority {
  rank: number;
  title: string;
  rationale: string;
  recommended_action: string;
  expected_impact: string;
  pattern_type: string;
  supporting_data: Record<string, unknown>;
  impact_score: number;
}

const SYSTEM_PROMPT = `You are an AI business advisor for small sellers. Analyze the provided transaction data and generate exactly 3 actionable business priorities for the week. Each priority must be data-driven and specific.

Return a JSON object with a "priorities" array containing exactly 3 items. Each item must have:
- rank: 1, 2, or 3 (1 = highest priority)
- title: short, action-oriented title (max 10 words)
- rationale: why this matters based on the data (2-3 sentences)
- recommended_action: specific step the seller should take this week
- expected_impact: what success looks like (measurable when possible)
- pattern_type: one of: revenue_trend, customer_retention, peak_hours, product_mix, seasonal_opportunity, churn_risk, upsell_opportunity
- supporting_data: key metrics that support this priority (JSON object)
- impact_score: estimated revenue impact 1-100`;

export const generatePriorities = inngest.createFunction(
  { id: 'generate-priorities', retries: 3 },
  [
    { event: 'mamm0th/embeddings.ready' },
    { event: 'mamm0th/generate.priorities.requested' },
    { cron: '1 0 * * 1' },
  ],
  async ({ event, step }) => {
    const userId = event.data?.user_id as string | undefined;

    const users = await step.run('fetch-users', async () => {
      if (userId) {
        const { data, error } = await supabaseAdmin
          .from('seller_profile')
          .select('id, business_name, business_type, quarterly_revenue_goal, risk_tolerance')
          .eq('id', userId)
          .single();
        if (error || !data) throw new Error(`User not found: ${userId}`);
        return [data];
      }

      const { data, error } = await supabaseAdmin
        .from('seller_profile')
        .select('id, business_name, business_type, quarterly_revenue_goal, risk_tolerance');
      if (error) throw new Error(`Failed to fetch users: ${error.message}`);
      return data || [];
    });

    for (const profile of users as SellerProfile[]) {
      await step.run(`generate-for-${profile.id}`, async () => {
        // Expire old active priorities
        await supabaseAdmin
          .from('priorities')
          .update({ status: 'expired' })
          .eq('user_id', profile.id)
          .eq('status', 'active');

        // Fetch recent transaction embeddings as context
        const { data: embeddings } = await supabaseAdmin
          .from('embeddings')
          .select('content, metadata')
          .eq('user_id', profile.id)
          .eq('source_type', 'transaction_chunk')
          .order('created_at', { ascending: false })
          .limit(12);

        if (!embeddings || embeddings.length === 0) {
          console.log(`No embeddings for user ${profile.id}, skipping priority generation`);
          return;
        }

        const context = embeddings.map((e) => e.content).join('\n\n');

        const userContext = [
          profile.business_name ? `Business: ${profile.business_name}` : null,
          profile.business_type ? `Type: ${profile.business_type}` : null,
          profile.quarterly_revenue_goal
            ? `Quarterly revenue goal: $${profile.quarterly_revenue_goal}`
            : null,
          profile.risk_tolerance ? `Risk tolerance: ${profile.risk_tolerance}` : null,
        ]
          .filter(Boolean)
          .join('\n');

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
              role: 'user',
              content: `Seller profile:\n${userContext}\n\nRecent transaction data:\n${context}`,
            },
          ],
          temperature: 0.3,
        });

        const content = completion.choices[0].message.content;
        if (!content) throw new Error('No content from OpenAI');

        const parsed = JSON.parse(content) as { priorities: Priority[] };
        const generationId = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        await supabaseAdmin.from('priorities').insert(
          parsed.priorities.map((p) => ({
            user_id: profile.id,
            generation_id: generationId,
            rank: p.rank,
            title: p.title,
            rationale: p.rationale,
            recommended_action: p.recommended_action,
            expected_impact: p.expected_impact,
            pattern_type: p.pattern_type,
            supporting_data: p.supporting_data,
            impact_score: p.impact_score,
            status: 'active',
            expires_at: expiresAt,
          }))
        );

        return { user_id: profile.id, generation_id: generationId };
      });
    }
  }
);
