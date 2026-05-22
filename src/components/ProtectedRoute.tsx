import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { profile, isLoading: profileLoading, isTrialExpired, isSuspended, daysLeftInTrial, isAdmin } = useUserProfile();
  const navigate = useNavigate();

  if (loading || (user && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Suspended account
  if (isSuspended) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm text-center space-y-4">
          <p className="text-2xl font-display font-semibold text-destructive">Ο λογαριασμός σας έχει ανασταλεί</p>
          <p className="text-muted-foreground text-sm">Επικοινωνήστε με τον διαχειριστή στο panagiotisvionis@gmail.com</p>
        </div>
      </div>
    );
  }

  // Trial expired → redirect to subscription
  if (isTrialExpired && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm text-center space-y-4">
          <p className="text-2xl font-display font-semibold">Η δοκιμαστική περίοδος έληξε</p>
          <p className="text-muted-foreground text-sm">Συνεχίστε με συνδρομή €25/μήνα για πλήρη πρόσβαση.</p>
          <Button onClick={() => navigate('/subscription')}>Δείτε τα Πλάνα</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Trial banner */}
      {profile?.status === 'trial' && !isAdmin && daysLeftInTrial <= 7 && daysLeftInTrial > 0 && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white text-xs text-center py-1.5 font-medium">
          Απομένουν {daysLeftInTrial} ημέρες δοκιμαστικής περιόδου.{' '}
          <button onClick={() => navigate('/subscription')} className="underline font-bold">Εγγραφείτε τώρα</button>
        </div>
      )}
      {children}
    </>
  );
}
