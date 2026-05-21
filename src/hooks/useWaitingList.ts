import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { WaitingListEntry } from '@/types';
import { toast } from 'sonner';

type DbEntry = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  notes: string;
  created_at: string;
};

function toEntry(row: DbEntry): WaitingListEntry {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone ?? '',
    email: row.email ?? '',
    notes: row.notes ?? '',
    createdAt: row.created_at,
  };
}

export function useWaitingList() {
  const qc = useQueryClient();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['waiting_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('waiting_list')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data as DbEntry[]).map(toEntry);
    },
  });

  const addMutation = useMutation({
    mutationFn: async (entry: Omit<WaitingListEntry, 'id' | 'createdAt'>) => {
      const { data, error } = await supabase
        .from('waiting_list')
        .insert([{
          first_name: entry.firstName,
          last_name: entry.lastName,
          phone: entry.phone,
          email: entry.email,
          notes: entry.notes,
        }])
        .select()
        .single();
      if (error) throw error;
      return toEntry(data as DbEntry);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['waiting_list'] });
      toast.success('Προστέθηκε στη λίστα αναμονής.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('waiting_list').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['waiting_list'] });
      toast.success('Αφαιρέθηκε από τη λίστα αναμονής.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    entries,
    isLoading,
    addEntry: (e: Omit<WaitingListEntry, 'id' | 'createdAt'>) => addMutation.mutateAsync(e),
    deleteEntry: (id: string) => deleteMutation.mutateAsync(id),
  };
}
