import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface BlockedDate {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  createdAt: string;
}

export function useBlockedDates() {
  const qc = useQueryClient();

  const { data: blockedDates = [] } = useQuery({
    queryKey: ['blocked_dates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blocked_dates')
        .select('*')
        .order('start_date');
      if (error) throw error;
      return data.map((r: Record<string, string>) => ({
        id: r.id,
        startDate: r.start_date,
        endDate: r.end_date,
        reason: r.reason ?? '',
        createdAt: r.created_at,
      })) as BlockedDate[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (b: Omit<BlockedDate, 'id' | 'createdAt'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Δεν είστε συνδεδεμένος.');
      const { error } = await supabase.from('blocked_dates').insert([{
        user_id: user.id, start_date: b.startDate, end_date: b.endDate, reason: b.reason,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blocked_dates'] });
      toast.success('Η απουσία καταχωρήθηκε.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blocked_dates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blocked_dates'] });
      toast.success('Η απουσία αφαιρέθηκε.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isDateBlocked = (dateStr: string): BlockedDate | undefined => {
    return blockedDates.find(b => b.startDate <= dateStr && b.endDate >= dateStr);
  };

  return {
    blockedDates,
    addBlockedDate: (b: Omit<BlockedDate, 'id' | 'createdAt'>) => addMutation.mutateAsync(b),
    deleteBlockedDate: (id: string) => deleteMutation.mutateAsync(id),
    isDateBlocked,
  };
}
