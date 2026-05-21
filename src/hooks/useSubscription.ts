import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'incomplete'
  | 'none';

export interface Subscription {
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  stripeCustomerId: string | null;
}

export function useSubscription() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['subscription', user?.id],
    enabled: isSupabaseConfigured && !!user,
    queryFn: async (): Promise<Subscription> => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('status, current_period_end, trial_end, stripe_customer_id')
        .eq('user_id', user!.id)
        .single();

      if (error || !data) {
        return { status: 'none', currentPeriodEnd: null, trialEnd: null, stripeCustomerId: null };
      }

      return {
        status: (data.status as SubscriptionStatus) ?? 'none',
        currentPeriodEnd: data.current_period_end ?? null,
        trialEnd: data.trial_end ?? null,
        stripeCustomerId: data.stripe_customer_id ?? null,
      };
    },
  });

  const isActive = data?.status === 'active' || data?.status === 'trialing';

  return { subscription: data, isLoading, isActive };
}
