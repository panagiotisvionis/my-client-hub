import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Client } from '@/types';
import { toast } from 'sonner';

type DbClient = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  session_fee: number;
  description: string;
  start_date: string | null;
  is_active: boolean;
  created_at: string;
};

function toClient(row: DbClient): Client {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone ?? '',
    email: row.email ?? '',
    sessionFee: row.session_fee,
    description: row.description ?? '',
    startDate: row.start_date ?? '',
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function toDbRow(c: Omit<Client, 'id' | 'createdAt'>) {
  return {
    first_name: c.firstName,
    last_name: c.lastName,
    phone: c.phone,
    email: c.email,
    session_fee: c.sessionFee,
    description: c.description,
    start_date: c.startDate || null,
    is_active: c.isActive,
  };
}

export function useClients() {
  const qc = useQueryClient();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('last_name');
      if (error) throw error;
      return (data as DbClient[]).map(toClient);
    },
  });

  const addMutation = useMutation({
    mutationFn: async (client: Omit<Client, 'id' | 'createdAt'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Δεν είστε συνδεδεμένος.');
      const { data, error } = await supabase
        .from('clients')
        .insert([{ ...toDbRow(client), user_id: user.id }])
        .select()
        .single();
      if (error) throw error;
      return toClient(data as DbClient);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Ο θεραπευόμενος προστέθηκε.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Client> }) => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
      if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.sessionFee !== undefined) dbUpdates.session_fee = updates.sessionFee;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate || null;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

      const { error } = await supabase.from('clients').update(dbUpdates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Τα στοιχεία ενημερώθηκαν.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] });
      qc.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('Ο θεραπευόμενος διαγράφηκε.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    clients,
    isLoading,
    addClient: (c: Omit<Client, 'id' | 'createdAt'>) => addMutation.mutateAsync(c),
    updateClient: (id: string, updates: Partial<Client>) => updateMutation.mutateAsync({ id, updates }),
    deleteClient: (id: string) => deleteMutation.mutateAsync(id),
    getClient: (id: string) => clients.find(c => c.id === id),
  };
}
