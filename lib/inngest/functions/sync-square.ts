import { inngest } from '../client';
import { supabaseAdmin } from '@/lib/supabase/server';

interface SquarePayment {
  id: string;
  created_at: string;
  total_money?: { amount: number; currency: string };
  customer_id?: string;
  line_items?: unknown[];
}

interface SquareCustomer {
  id: string;
  given_name?: string;
  family_name?: string;
  email_address?: string;
}

async function fetchSquarePayments(
  accessToken: string,
  locationId: string | null,
  cursor?: string
): Promise<{ payments: SquarePayment[]; cursor?: string }> {
  const params = new URLSearchParams({ limit: '100', sort_order: 'DESC' });
  if (cursor) params.set('cursor', cursor);
  if (locationId) params.set('location_id', locationId);

  const baseUrl =
    process.env.SQUARE_ENVIRONMENT === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com';

  const res = await fetch(`${baseUrl}/v2/payments?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Square-Version': '2024-01-18' },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Square payments API error: ${res.status} ${text}`);
  }

  const json = await res.json();
  return { payments: json.payments || [], cursor: json.cursor };
}

async function fetchSquareCustomer(
  accessToken: string,
  customerId: string
): Promise<SquareCustomer | null> {
  const baseUrl =
    process.env.SQUARE_ENVIRONMENT === 'production'
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com';

  const res = await fetch(`${baseUrl}/v2/customers/${customerId}`, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Square-Version': '2024-01-18' },
  });

  if (!res.ok) return null;
  const json = await res.json();
  return json.customer || null;
}

export const syncSquare = inngest.createFunction(
  { id: 'sync-square', retries: 3 },
  [{ event: 'mamm0th/square.sync.requested' }, { cron: '0 */6 * * *' }],
  async ({ event, step }) => {
    const userId = event.data?.user_id as string | undefined;

    const users = await step.run('fetch-users', async () => {
      if (userId) {
        const { data, error } = await supabaseAdmin
          .from('seller_profile')
          .select('id')
          .eq('id', userId)
          .single();
        if (error || !data) throw new Error(`User not found: ${userId}`);
        return [{ id: userId }];
      }

      const { data, error } = await supabaseAdmin
        .from('seller_profile')
        .select('id');
      if (error) throw new Error(`Failed to fetch users: ${error.message}`);
      return data || [];
    });

    const syncedUserIds: string[] = [];

    for (const user of users) {
      await step.run(`sync-user-${user.id}`, async () => {
        const accessToken = process.env.SQUARE_ACCESS_TOKEN;
        if (!accessToken) throw new Error('SQUARE_ACCESS_TOKEN not configured');

        let cursor: string | undefined;
        let totalSynced = 0;

        do {
          const { payments, cursor: nextCursor } = await fetchSquarePayments(
            accessToken,
            null,
            cursor
          );
          cursor = nextCursor;

          for (const payment of payments) {
            let customerId: string | null = null;

            if (payment.customer_id) {
              const { data: existingCustomer } = await supabaseAdmin
                .from('customer')
                .select('id')
                .eq('square_customer_id', payment.customer_id)
                .maybeSingle();

              if (existingCustomer) {
                customerId = existingCustomer.id;
              } else {
                const squareCustomer = await fetchSquareCustomer(accessToken, payment.customer_id);
                if (squareCustomer) {
                  const { data: newCustomer } = await supabaseAdmin
                    .from('customer')
                    .upsert({
                      user_id: user.id,
                      square_customer_id: squareCustomer.id,
                      name: [squareCustomer.given_name, squareCustomer.family_name]
                        .filter(Boolean)
                        .join(' '),
                      email: squareCustomer.email_address,
                      raw_data: squareCustomer,
                    })
                    .select('id')
                    .single();
                  customerId = newCustomer?.id || null;
                }
              }
            }

            await supabaseAdmin.from('transaction').upsert(
              {
                user_id: user.id,
                customer_id: customerId,
                square_payment_id: payment.id,
                date: payment.created_at,
                amount: (payment.total_money?.amount || 0) / 100,
                item_details: payment.line_items || null,
                raw_data: payment,
              },
              { onConflict: 'square_payment_id' }
            );

            totalSynced++;
          }
        } while (cursor);

        return { user_id: user.id, synced: totalSynced };
      });

      syncedUserIds.push(user.id);
    }

    await step.sendEvent('trigger-embedding', {
      name: 'mamm0th/transactions.synced',
      data: { user_id: userId || null, user_ids: syncedUserIds },
    });
  }
);
