import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { validateInviteCode, markCodeUsed } from '@/hooks/useInviteCodes';

export default function LoginPage() {
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true });
  }, [user, loading]);

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg w-full glass-card rounded-2xl p-8 text-center"
        >
          <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
          <h1 className="font-display text-2xl font-semibold mb-2">Απαιτείται Ρύθμιση Supabase</h1>
          <p className="text-muted-foreground mb-6 text-sm">
            Για να χρησιμοποιήσεις την εφαρμογή χρειάζεσαι να δημιουργήσεις ένα δωρεάν Supabase project.
          </p>
          <ol className="text-left text-sm space-y-3 bg-muted/50 rounded-xl p-4 mb-6">
            <li><strong>1.</strong> Πήγαινε στο <strong>supabase.com</strong> και δημιούργησε δωρεάν λογαριασμό</li>
            <li><strong>2.</strong> Δημιούργησε νέο project</li>
            <li><strong>3.</strong> Άνοιξε το <strong>SQL Editor</strong> και εκτέλεσε το αρχείο <code className="bg-muted px-1 rounded">supabase/migrations/001_initial.sql</code></li>
            <li><strong>4.</strong> Από <strong>Project Settings → API</strong> αντέγραψε το URL και το anon key</li>
            <li><strong>5.</strong> Δημιούργησε αρχείο <code className="bg-muted px-1 rounded">.env</code> βάσει του <code className="bg-muted px-1 rounded">.env.example</code></li>
            <li><strong>6.</strong> Κάνε restart την εφαρμογή</li>
          </ol>
          <p className="text-xs text-muted-foreground">
            Το Supabase Free tier παρέχει 500MB βάση, 50MB αρχεία και 50.000 active users/μήνα — αρκετό για θεραπευτήριο.
          </p>
        </motion.div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);

    if (mode === 'register') {
      const valid = await validateInviteCode(inviteCode);
      if (!valid) {
        toast.error('Μη έγκυρος κωδικός πρόσκλησης.');
        setSubmitting(false);
        return;
      }
    }

    const fn = mode === 'login' ? signIn : signUp;
    const { error } = await fn(email, password);

    if (error) {
      toast.error(error);
      setSubmitting(false);
    } else {
      if (mode === 'register') {
        // Mark invite code as used (userId set after auth state update)
        const { data: { user: newUser } } = await (await import('@/lib/supabase')).supabase.auth.getUser();
        if (newUser) await markCodeUsed(inviteCode, newUser.id);
        toast.success('Ο λογαριασμός δημιουργήθηκε! Έχετε 14 ημέρες δωρεάν δοκιμή.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-semibold text-primary mb-1">TherapyDesk</h1>
          <p className="text-muted-foreground text-sm">Διαχείριση Θεραπευτικού Γραφείου</p>
        </div>

        <div className="glass-card rounded-2xl p-8">
          <h2 className="font-display text-xl font-semibold mb-6 text-center">
            {mode === 'login' ? 'Σύνδεση' : 'Εγγραφή'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="therapist@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Κωδικός</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {mode === 'register' && (
              <div className="space-y-1.5">
                <Label htmlFor="invite">Κωδικός Πρόσκλησης</Label>
                <Input
                  id="invite"
                  placeholder="XXXXX-XXXXX"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  required
                />
                <p className="text-xs text-muted-foreground">Ζήτησε κωδικό από τον διαχειριστή.</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {mode === 'login' ? 'Σύνδεση' : 'Δημιουργία Λογαριασμού'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            {mode === 'login' ? (
              <>
                Δεν έχεις λογαριασμό;{' '}
                <button onClick={() => setMode('register')} className="text-primary hover:underline font-medium">
                  Εγγραφή
                </button>
              </>
            ) : (
              <>
                Έχεις ήδη λογαριασμό;{' '}
                <button onClick={() => setMode('login')} className="text-primary hover:underline font-medium">
                  Σύνδεση
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
