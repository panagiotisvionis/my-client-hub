// Supabase Edge Function: stripe-webhook
// POST /stripe-webhook  (called by Stripe)
// Handles: checkout.session.completed, customer.subscription.updated/deleted, invoice.payment_failed

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const signature = req.headers.get('stripe-signature');
  if (!signature || !STRIPE_WEBHOOK_SECRET) {
    return new Response('Missing signature', { status: 400 });
  }

  const body = await req.text();
  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return new Response(`Webhook error: ${err}`, { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Update both subscriptions table AND user_profiles.status
  const syncSubscription = async (
    customerId: string,
    stripeStatus: string,
    extra: Record<string, unknown> = {},
  ) => {
    // 1. Update subscriptions table
    await supabase
      .from('subscriptions')
      .update({ status: stripeStatus, ...extra })
      .eq('stripe_customer_id', customerId);

    // 2. Map Stripe status → user_profiles status
    let profileStatus: string;
    if (stripeStatus === 'active' || stripeStatus === 'trialing') {
      profileStatus = 'active';
    } else if (stripeStatus === 'past_due' || stripeStatus === 'unpaid') {
      profileStatus = 'trial'; // grace period — still let them in
    } else {
      profileStatus = 'suspended'; // canceled, incomplete_expired
    }

    // 3. Find user_id from subscriptions table
    const { data: subRow } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (subRow?.user_id) {
      await supabase
        .from('user_profiles')
        .update({ status: profileStatus })
        .eq('id', subRow.user_id);
    }
  };

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const sub = await stripe.subscriptions.retrieve(session.subscription as string);
      await syncSubscription(session.customer as string, sub.status, {
        stripe_subscription_id: sub.id,
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
      });
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      await syncSubscription(sub.customer as string, sub.status, {
        stripe_subscription_id: sub.id,
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
      });
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await syncSubscription(sub.customer as string, 'canceled', {
        stripe_subscription_id: sub.id,
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      });
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      await syncSubscription(invoice.customer as string, 'past_due');
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      await syncSubscription(invoice.customer as string, 'active');
      break;
    }

    default:
      break;
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
