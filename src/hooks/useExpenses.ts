import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Expense } from '@/types';
import { toast } from 'sonner';

type DbExpense = {
  id: string;
  date: string;
  category: Expense['category'];
  description: string;
  amount: number;
  created_at: string;
};

function toExpense(row: DbExpense): Expense {
  return {
    id: row.id,
    date: row.date,
    category: row.category,
    description: row.description,
    amount: row.amount,
    createdAt: row.created_at,
  };
}

export function useExpenses() {
  const qc = useQueryClient();

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return (data as DbExpense[]).map(toExpense);
    },
  });

  const addMutation = useMutation({
    mutationFn: async (expense: Omit<Expense, 'id' | 'createdAt'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Δεν είστε συνδεδεμένος.');
      const { data, error } = await supabase
        .from('expenses')
        .insert([{ date: expense.date, category: expense.category, description: expense.description, amount: expense.amount, user_id: user.id }])
        .select()
        .single();
      if (error) throw error;
      return toExpense(data as DbExpense);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Η δαπάνη καταχωρήθηκε.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Expense> }) => {
      const { error } = await supabase.from('expenses').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Η δαπάνη ενημερώθηκε.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Η δαπάνη διαγράφηκε.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    expenses,
    isLoading,
    addExpense: (e: Omit<Expense, 'id' | 'createdAt'>) => addMutation.mutateAsync(e),
    updateExpense: (id: string, updates: Partial<Expense>) => updateMutation.mutateAsync({ id, updates }),
    deleteExpense: (id: string) => deleteMutation.mutateAsync(id),
  };
}
