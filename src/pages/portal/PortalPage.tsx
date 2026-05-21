import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, CalendarDays, Clock, Loader2, AlertTriangle } from 'lucide-react';

type PortalSession = {
  id: string;
  date: string;
  time: string;
  duration: number;
  type: string;
  status: string;
};

type PortalClient = {
  first_name: string;
  last_name: string;
};

const SESSION_TYPES: Record<string, string> = {
  individual: 'Ατομική Συνεδρία',
  couple: 'Συνεδρία Ζεύγους',
  family: 'Οικογενειακή Συνεδρία',
  online: 'Online Συνεδρία',
};

export default function PortalPage() {
  const { token } = useParams<{ token: string }>();
  const [session, setSession] = useState<PortalSession | null>(null);
  const [client, setClient] = useState<PortalClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [action, setAction] = useState<'confirmed' | 'cancelled' | null>(null);
  const [acting, setActing] = useState(false);

  const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/portal`;

  useEffect(() => {
    if (!token) { setError('Μη έγκυρο link.'); setLoading(false); return; }

    fetch(`${EDGE_FUNCTION_URL}?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError('Το ραντεβού δεν βρέθηκε ή έχει λήξει.'); }
        else { setSession(data.session); setClient(data.client); }
      })
      .catch(() => setError('Σφάλμα σύνδεσης. Δοκίμασε αργότερα.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAction = async (act: 'confirm' | 'cancel') => {
    if (!token) return;
    setActing(true);
    try {
      const res = await fetch(`${EDGE_FUNCTION_URL}?token=${token}&action=${act}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) setAction(act === 'confirm' ? 'confirmed' : 'cancelled');
      else setError(data.error ?? 'Αποτυχία ενημέρωσης.');
    } catch {
      setError('Σφάλμα σύνδεσης.');
    } finally {
      setActing(false);
    }
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('el-GR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-6">
          <h1 className="font-display text-2xl font-semibold text-primary">TherapyDesk</h1>
          <p className="text-sm text-muted-foreground">Επιβεβαίωση Ραντεβού</p>
        </div>

        <div className="glass-card rounded-2xl p-6">
          {loading && (
            <div className="flex flex-col items-center py-8 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground text-sm">Φόρτωση στοιχείων ραντεβού...</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center py-8 gap-3 text-center">
              <AlertTriangle className="h-10 w-10 text-destructive" />
              <p className="text-destructive font-medium">{error}</p>
              <p className="text-sm text-muted-foreground">Επικοινώνησε με τον/την θεραπευτή σου αν νομίζεις ότι υπάρχει πρόβλημα.</p>
            </div>
          )}

          {session && !loading && !action && (
            <>
              <div className="bg-muted/50 rounded-xl p-5 mb-5 space-y-3">
                {client && (
                  <p className="font-display font-semibold text-lg">
                    {client.last_name} {client.first_name}
                  </p>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <span className="capitalize">{fmtDate(session.date)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>{session.time} — διάρκεια {session.duration} λεπτά</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {SESSION_TYPES[session.type] ?? session.type}
                </div>
              </div>

              {session.status === 'cancelled' ? (
                <div className="text-center py-4">
                  <XCircle className="h-10 w-10 text-destructive mx-auto mb-2" />
                  <p className="font-medium text-destructive">Το ραντεβού έχει ήδη ακυρωθεί.</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    Παρακαλούμε επιβεβαίωσε ή ακύρωσε το ραντεβού σου.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => handleAction('cancel')} disabled={acting}>
                      {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                      Ακύρωση
                    </Button>
                    <Button className="gap-2" onClick={() => handleAction('confirm')} disabled={acting}>
                      {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Επιβεβαίωση
                    </Button>
                  </div>
                </>
              )}
            </>
          )}

          {action && (
            <div className="flex flex-col items-center py-8 gap-4 text-center">
              {action === 'confirmed' ? (
                <>
                  <CheckCircle2 className="h-14 w-14 text-success" />
                  <p className="font-display text-xl font-semibold text-success">Το ραντεβού επιβεβαιώθηκε!</p>
                  <p className="text-sm text-muted-foreground">Σας περιμένουμε. Αν χρειαστεί να ακυρώσετε, επικοινωνήστε μαζί μας.</p>
                </>
              ) : (
                <>
                  <XCircle className="h-14 w-14 text-muted-foreground" />
                  <p className="font-display text-xl font-semibold">Το ραντεβού ακυρώθηκε.</p>
                  <p className="text-sm text-muted-foreground">Για νέο ραντεβού επικοινωνήστε με τον/την θεραπευτή σας.</p>
                </>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
