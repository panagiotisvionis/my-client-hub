import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type UserRole = 'admin' | 'user';
export type UserStatus = 'trial' | 'active' | 'suspended';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  trialEndsAt: string | null;
  invitedBy: string | null;
  createdAt: string;
}

function toProfile(row: Record<string, string>): UserProfile {
  return {
    id: row.id,
    email: row.email ?? '',
    role: (row.role as UserRole) ?? 'user',
    status: (row.status as UserStatus) ?? 'trial',
    trialEndsAt: row.trial_ends_at ?? null,
    invitedBy: row.invited_by ?? null,
    createdAt: row.created_at,
  };
}

export function useUserProfile() {
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user_profile', user?.id],
    enabled: isSupabaseConfigured && !!user,
    queryFn: async (): Promise<UserProfile | null> => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user!.id)
        .single();
      if (error || !data) return null;
      return toProfile(data as Record<string, string>);
    },
  });

  const isAdmin = profile?.role === 'admin';
  const isActive = profile?.status === 'active' || profile?.role === 'admin';
  const isTrialExpired = profile?.status === 'trial' && profile?.trialEndsAt
    ? new Date(profile.trialEndsAt) < new Date()
    : false;
  const isSuspended = profile?.status === 'suspended';

  const daysLeftInTrial = profile?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(profile.trialEndsAt).getTime() - Date.now()) / 86400000))
    : 0;

  return { profile, isLoading, isAdmin, isActive, isTrialExpired, isSuspended, daysLeftInTrial };
}

// Admin-only: list all user profiles
export function useAllUserProfiles() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['all_user_profiles'],
    enabled: isSupabaseConfigured && !!user,
    queryFn: async (): Promise<UserProfile[]> => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as Record<string, string>[]).map(toProfile);
    },
  });
}

// Admin-only: update a user's status/role
export function useUpdateUserProfile() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Pick<UserProfile, 'status' | 'role'>> }) => {
      const dbUpdates: Record<string, string> = {};
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.role) dbUpdates.role = updates.role;
      const { error } = await supabase.from('user_profiles').update(dbUpdates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all_user_profiles'] }),
  });
}
