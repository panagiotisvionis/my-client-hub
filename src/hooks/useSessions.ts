import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Session, RecurrenceType } from '@/types';
import { addDays, addWeeks, addMonths } from 'date-fns';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'crypto';

type DbSession = {
  id: string;
  client_id: string;
  date: string;
  time: string;
  fee: number;
  notes: string;
  duration: number;
  type: Session['type'];
  status: Session['status'];
  paid: boolean;
  soap_s: string;
  soap_o: string;
  soap_a: string;
  soap_p: string;
  recurrence_group_id: string | null;
  portal_token: string | null;
  reminder_sent: boolean;
  created_at: string;
};

function toSession(row: DbSession): Session {
  return {
    id: row.id,
    clientId: row.client_id,
    date: row.date,
    time: row.time ?? '09:00',
    fee: row.fee,
    notes: row.notes ?? '',
    duration: row.duration,
    type: row.type,
    status: row.status ?? 'completed',
    paid: row.paid,
    soapS: row.soap_s ?? '',
    soapO: row.soap_o ?? '',
    soapA: row.soap_a ?? '',
    soapP: row.soap_p ?? '',
    recurrenceGroupId: row.recurrence_group_id ?? undefined,
    portalToken: row.portal_token ?? undefined,
    reminderSent: row.reminder_sent ?? false,
    createdAt: row.created_at,
  };
}

function toDbRow(s: Omit<Session, 'id' | 'createdAt'>) {
  return {
    client_id: s.clientId,
    date: s.date,
    time: s.time ?? '09:00',
    fee: s.fee,
    notes: s.notes,
    duration: s.duration,
    type: s.type,
    status: s.status ?? 'completed',
    paid: s.paid,
    soap_s: s.soapS ?? '',
    soap_o: s.soapO ?? '',
    soap_a: s.soapA ?? '',
    soap_p: s.soapP ?? '',
    recurrence_group_id: s.recurrenceGroupId ?? null,
  };
}

function generateRecurringDates(startDate: string, type: RecurrenceType, endDate: string): string[] {
  const dates: string[] = [];
  let current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    if (type === 'weekly') current = addWeeks(current, 1);
    else if (type === 'biweekly') current = addWeeks(current, 2);
    else if (type === 'monthly') current = addMonths(current, 1);
    else break;
  }

  return dates;
}

export function useSessions(clientId?: string) {
  const qc = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions', clientId],
    queryFn: async () => {
      let query = supabase
        .from('sessions')
        .select('*')
        .order('date', { ascending: false })
        .order('time', { ascending: false });

      if (clientId) query = query.eq('client_id', clientId);

      const { data, error } = await query;
      if (error) throw error;
      return (data as DbSession[]).map(toSession);
    },
  });

  const addMutation = useMutation({
    mutationFn: async ({
      session,
      recurrence,
    }: {
      session: Omit<Session, 'id' | 'createdAt'>;
      recurrence?: { type: RecurrenceType; endDate: string };
    }) => {
      if (recurrence && recurrence.type !== 'none') {
        const dates = generateRecurringDates(session.date, recurrence.type, recurrence.endDate);
        const groupId = crypto.randomUUID();
        const rows = dates.map(date => ({
          ...toDbRow({ ...session, date, recurrenceGroupId: groupId }),
          recurrence_group_id: groupId,
        }));
        const { error } = await supabase.from('sessions').insert(rows);
        if (error) throw error;
        return dates.length;
      } else {
        const { data, error } = await supabase
          .from('sessions').insert([toDbRow(session)]).select().single();
        if (error) throw error;
        return toSession(data as DbSession);
      }
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      if (typeof result === 'number') {
        toast.success(`${result} επαναλαμβανόμενες συνεδρίες δημιουργήθηκαν.`);
      } else {
        toast.success('Η συνεδρία προστέθηκε.');
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Session> }) => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.clientId !== undefined) dbUpdates.client_id = updates.clientId;
      if (updates.date !== undefined) dbUpdates.date = updates.date;
      if (updates.time !== undefined) dbUpdates.time = updates.time;
      if (updates.fee !== undefined) dbUpdates.fee = updates.fee;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.duration !== undefined) dbUpdates.duration = updates.duration;
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.paid !== undefined) dbUpdates.paid = updates.paid;
      if (updates.soapS !== undefined) dbUpdates.soap_s = updates.soapS;
      if (updates.soapO !== undefined) dbUpdates.soap_o = updates.soapO;
      if (updates.soapA !== undefined) dbUpdates.soap_a = updates.soapA;
      if (updates.soapP !== undefined) dbUpdates.soap_p = updates.soapP;

      const { error } = await supabase.from('sessions').update(dbUpdates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, deleteGroup }: { id: string; deleteGroup?: boolean }) => {
      if (deleteGroup) {
        const session = sessions.find(s => s.id === id);
        if (session?.recurrenceGroupId) {
          const { error } = await supabase.from('sessions')
            .delete().eq('recurrence_group_id', session.recurrenceGroupId);
          if (error) throw error;
          return;
        }
      }
      const { error } = await supabase.from('sessions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('Η συνεδρία διαγράφηκε.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    sessions,
    isLoading,
    addSession: (s: Omit<Session, 'id' | 'createdAt'>, recurrence?: { type: RecurrenceType; endDate: string }) =>
      addMutation.mutateAsync({ session: s, recurrence }),
    updateSession: (id: string, updates: Partial<Session>) => updateMutation.mutateAsync({ id, updates }),
    deleteSession: (id: string, deleteGroup?: boolean) => deleteMutation.mutateAsync({ id, deleteGroup }),
    getSessionsByClient: (cid: string) => sessions.filter(s => s.clientId === cid),
  };
}
