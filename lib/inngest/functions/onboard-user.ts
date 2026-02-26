import { inngest } from '../client';
import { supabaseAdmin } from '@/lib/supabase/server';

export const onboardUser = inngest.createFunction(
  { id: 'onboard-user', retries: 3 },
  { event: 'mamm0th/user.onboarded' },
  async ({ event, step }) => {
    const { user_id } = event.data;

    await step.run('verify-profile', async () => {
      const { data, error } = await supabaseAdmin
        .from('seller_profile')
        .select('id')
        .eq('id', user_id)
        .single();

      if (error || !data) {
        throw new Error(`No seller profile found for user ${user_id}`);
      }

      return data;
    });

    await step.sendEvent('trigger-square-sync', {
      name: 'mamm0th/square.sync.requested',
      data: { user_id, full_sync: true },
    });
  }
);
