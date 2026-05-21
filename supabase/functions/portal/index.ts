// Supabase Edge Function: portal
// GET  /portal?token=<uuid>          → returns session + client info
// POST /portal?token=<uuid>&action=confirm|cancel  → updates session status

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const action = url.searchParams.get('action'); // confirm | cancel

  if (!token) {
    return new Response(JSON.stringify({ error: 'Missing token' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // GET: return session info
  if (req.method === 'GET') {
    const { data: session, error } = await supabase
      .from('sessions')
      .select('id, date, time, duration, type, status, client_id')
      .eq('portal_token', token)
      .single();

    if (error || !session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get therapist profile from subscriptions/auth (just get user email)
    const { data: client } = await supabase
      .from('clients')
      .select('first_name, last_name')
      .eq('id', session.client_id)
      .single();

    return new Response(JSON.stringify({ session, client }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // POST: update status
  if (req.method === 'POST' && (action === 'confirm' || action === 'cancel')) {
    const newStatus = action === 'confirm' ? 'scheduled' : 'cancelled';

    const { error } = await supabase
      .from('sessions')
      .update({ status: newStatus })
      .eq('portal_token', token);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, status: newStatus }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
