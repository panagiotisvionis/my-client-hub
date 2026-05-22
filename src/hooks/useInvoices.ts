import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Invoice } from '@/types';
import { toast } from 'sonner';

type DbInvoice = {
  id: string;
  client_id: string;
  invoice_number: string;
  date: string;
  session_ids: string[];
  total: number;
  paid: boolean;
  mydata_mark: string | null;
  created_at: string;
};

function toInvoice(row: DbInvoice): Invoice {
  return {
    id: row.id,
    clientId: row.client_id,
    invoiceNumber: row.invoice_number,
    date: row.date,
    sessionIds: row.session_ids ?? [],
    total: row.total,
    paid: row.paid,
    myDataMark: row.mydata_mark ?? undefined,
    createdAt: row.created_at,
  };
}

export function useInvoices() {
  const qc = useQueryClient();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return (data as DbInvoice[]).map(toInvoice);
    },
  });

  const addMutation = useMutation({
    mutationFn: async (invoice: Omit<Invoice, 'id' | 'createdAt'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Δεν είστε συνδεδεμένος.');
      const { data, error } = await supabase
        .from('invoices')
        .insert([{
          user_id: user.id,
          client_id: invoice.clientId,
          invoice_number: invoice.invoiceNumber,
          date: invoice.date,
          session_ids: invoice.sessionIds,
          total: invoice.total,
          paid: invoice.paid,
          mydata_mark: invoice.myDataMark ?? null,
        }])
        .select()
        .single();
      if (error) throw error;
      return toInvoice(data as DbInvoice);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Το τιμολόγιο εκδόθηκε.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Invoice> }) => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.paid !== undefined) dbUpdates.paid = updates.paid;
      if (updates.myDataMark !== undefined) dbUpdates.mydata_mark = updates.myDataMark;
      const { error } = await supabase.from('invoices').update(dbUpdates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Το τιμολόγιο διαγράφηκε.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const nextInvoiceNumber = () => {
    if (invoices.length === 0) return '0001';
    const nums = invoices
      .map(i => parseInt(i.invoiceNumber, 10))
      .filter(n => !isNaN(n));
    const max = Math.max(0, ...nums);
    return String(max + 1).padStart(4, '0');
  };

  return {
    invoices,
    isLoading,
    addInvoice: (i: Omit<Invoice, 'id' | 'createdAt'>) => addMutation.mutateAsync(i),
    updateInvoice: (id: string, updates: Partial<Invoice>) => updateMutation.mutateAsync({ id, updates }),
    deleteInvoice: (id: string) => deleteMutation.mutateAsync(id),
    nextInvoiceNumber,
  };
}
