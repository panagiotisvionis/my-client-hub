import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle2, Loader2, CreditCard, AlertTriangle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';

const FEATURES = [
  'Απεριόριστοι θεραπευόμενοι & συνεδρίες',
  'Ημερολόγιο & επαναλαμβανόμενα ραντεβού',
  'Email & SMS υπενθυμίσεις',
  'Οικονομικά, δαπάνες & αναλυτικά',
  'Τιμολόγηση & myDATA (ΑΑΔΕ)',
  'Μηνιαία αναφορά PDF',
  'Client portal (επιβεβαίωση ραντεβού)',
  'SOAP Notes & λίστα αναμονής',
  'Διαχείριση αδειών & διακοπών',
  'PWA — εγκατάσταση σε κινητό',
];

export default function SubscriptionPage() {
  const { subscription, isLoading, isActive } = useSubscription();
  const { user } = useAuth();
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('success') === '1') {
      toast.success('Η συνδρομή σας ενεργοποιήθηκε! Καλωσήρθατε στο TherapyDesk.');
    }
    if (searchParams.get('cancelled') === '1') {
      toast.info('Η πληρωμή ακυρώθηκε.');
    }
  }, []);

  const handleSubscribe = async () => {
    setLoadingCheckout(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const token = authSession?.access_token;
      if (!token) { toast.error('Δεν είστε συνδεδεμένος.'); return; }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            successUrl: `${window.location.origin}/subscription?success=1`,
            cancelUrl: `${window.location.origin}/subscription?cancelled=1`,
          }),
        },
      );

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error ?? 'Αποτυχία δημιουργίας checkout.');
      }
    } catch {
      toast.error('Σφάλμα σύνδεσης. Δοκιμάστε αργότερα.');
    } finally {
      setLoadingCheckout(false);
    }
  };

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('el-GR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

  const statusLabel: Record<string, { label: string; color: string }> = {
    trialing:   { label: 'Δοκιμαστική περίοδος', color: 'text-primary' },
    active:     { label: 'Ενεργή',                color: 'text-success' },
    past_due:   { label: 'Εκκρεμής πληρωμή',      color: 'text-destructive' },
    cancelled:  { label: 'Ακυρωμένη',             color: 'text-muted-foreground' },
    incomplete: { label: 'Ημιτελής',              color: 'text-muted-foreground' },
    none:       { label: 'Χωρίς συνδρομή',        color: 'text-muted-foreground' },
  };

  return (
    <AppLayout>
      <PageHeader
        title="Συνδρομή"
        subtitle="Διαχείριση πλάνου & χρέωσης"
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="max-w-2xl space-y-6">

          {/* Current status */}
          {subscription && subscription.status !== 'none' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-xl p-5 flex items-start gap-4">
              <CreditCard className="h-6 w-6 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold font-display">Κατάσταση Συνδρομής</p>
                <p className={`text-sm font-medium mt-0.5 ${statusLabel[subscription.status]?.color}`}>
                  {statusLabel[subscription.status]?.label}
                </p>
                {subscription.trialEnd && subscription.status === 'trialing' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Η δοκιμαστική περίοδος λήγει: {fmtDate(subscription.trialEnd)}
                  </p>
                )}
                {subscription.currentPeriodEnd && subscription.status === 'active' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Επόμενη χρέωση: {fmtDate(subscription.currentPeriodEnd)}
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* Pricing card */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="glass-card rounded-2xl p-6 border-2 border-primary/20">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">TherapyDesk Pro</span>
            </div>
            <div className="flex items-end gap-1 mb-1">
              <span className="text-4xl font-display font-bold text-primary">20€</span>
              <span className="text-muted-foreground mb-1">/μήνα</span>
            </div>
            <p className="text-sm text-muted-foreground mb-5">14 ημέρες δωρεάν δοκιμή · ακύρωση οποτεδήποτε</p>

            <ul className="space-y-2 mb-6">
              {FEATURES.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            {isActive ? (
              <div className="flex items-center gap-2 text-success font-medium text-sm">
                <CheckCircle2 className="h-5 w-5" />
                Η συνδρομή σας είναι ενεργή
              </div>
            ) : subscription?.status === 'past_due' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  Εκκρεμεί πληρωμή — ανανεώστε τη συνδρομή σας
                </div>
                <Button onClick={handleSubscribe} disabled={loadingCheckout} className="w-full">
                  {loadingCheckout ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Ανανέωση Συνδρομής
                </Button>
              </div>
            ) : (
              <Button onClick={handleSubscribe} disabled={loadingCheckout} size="lg" className="w-full">
                {loadingCheckout ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {subscription?.status === 'cancelled' ? 'Επαναφορά Συνδρομής' : 'Έναρξη Δωρεάν Δοκιμής'}
              </Button>
            )}
          </motion.div>

          <p className="text-xs text-muted-foreground text-center">
            Για ακύρωση ή ερωτήσεις επικοινωνήστε στο {' '}
            <a href="mailto:support@therapydesk.gr" className="underline">support@therapydesk.gr</a>
          </p>
        </div>
      )}
    </AppLayout>
  );
}
