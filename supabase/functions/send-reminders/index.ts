// Supabase Edge Function: send-reminders
// Cron: every day at 09:00 UTC
// Finds sessions in the next 24h with status=scheduled and reminder_sent=false
// Sends email via Resend and/or SMS via Twilio, then marks reminder_sent=true

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? 'noreply@therapydesk.gr';
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') ?? '';
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') ?? '';
const TWILIO_FROM_NUMBER = Deno.env.get('TWILIO_FROM_NUMBER') ?? '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Fetch upcoming sessions needing reminders
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('id, date, time, duration, type, client_id, user_id')
    .eq('status', 'scheduled')
    .eq('reminder_sent', false)
    .gte('date', now.toISOString().split('T')[0])
    .lte('date', in24h.toISOString().split('T')[0]);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const results: { sessionId: string; email: boolean; sms: boolean }[] = [];

  for (const session of sessions ?? []) {
    // Fetch client info
    const { data: client } = await supabase
      .from('clients')
      .select('first_name, last_name, email, phone')
      .eq('id', session.client_id)
      .single();

    if (!client) continue;

    const sessionDate = new Date(`${session.date}T${session.time}`);
    const dateStr = sessionDate.toLocaleDateString('el-GR', { weekday: 'long', day: 'numeric', month: 'long' });
    const timeStr = session.time.substring(0, 5);
    const clientName = `${client.first_name} ${client.last_name}`;

    let emailSent = false;
    let smsSent = false;

    // --- Send Email via Resend ---
    if (RESEND_API_KEY && client.email) {
      try {
        const emailBody = `
          <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 24px;">
            <h2 style="color: #2a5a3c;">Υπενθύμιση Ραντεβού</h2>
            <p>Αγαπητέ/ή ${clientName},</p>
            <p>Σας υπενθυμίζουμε ότι έχετε <strong>ραντεβού αύριο</strong>:</p>
            <div style="background: #f0f7f3; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 4px 0;">📅 <strong>${dateStr}</strong></p>
              <p style="margin: 4px 0;">🕐 <strong>${timeStr}</strong></p>
              <p style="margin: 4px 0;">⏱ Διάρκεια: ${session.duration} λεπτά</p>
            </div>
            <p style="color: #666; font-size: 13px;">Αν χρειαστεί να ακυρώσετε, παρακαλούμε επικοινωνήστε μαζί μας.</p>
          </div>
        `;
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: RESEND_FROM,
            to: client.email,
            subject: `Υπενθύμιση ραντεβού — ${dateStr} στις ${timeStr}`,
            html: emailBody,
          }),
        });
        emailSent = res.ok;
      } catch { /* email send failed — continue */ }
    }

    // --- Send SMS via Twilio ---
    if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM_NUMBER && client.phone) {
      try {
        const smsBody = `TherapyDesk: Υπενθύμιση ραντεβού ${dateStr} στις ${timeStr} (${session.duration}λ.). Για ακύρωση επικοινωνήστε μαζί μας.`;
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
        const params = new URLSearchParams({
          From: TWILIO_FROM_NUMBER,
          To: client.phone,
          Body: smsBody,
        });
        const res = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });
        smsSent = res.ok;
      } catch { /* sms send failed — continue */ }
    }

    // Mark reminder sent
    if (emailSent || smsSent) {
      await supabase.from('sessions').update({ reminder_sent: true }).eq('id', session.id);
    }

    results.push({ sessionId: session.id, email: emailSent, sms: smsSent });
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
