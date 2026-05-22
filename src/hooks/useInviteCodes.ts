import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface InviteCode {
  id: string;
  code: string;
  label: string;
  usedBy: string | null;
  usedAt: string | null;
  expiresAt: string;
  createdAt: string;
}

function toCode(row: Record<string, string>): InviteCode {
  return {
    id: row.id,
    code: row.code,
    label: row.label ?? '',
    usedBy: row.used_by ?? null,
    usedAt: row.used_at ?? null,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 10; i++) {
    if (i === 5) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function useInviteCodes() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: codes = [], isLoading } = useQuery({
    queryKey: ['invite_codes'],
    enabled: isSupabaseConfigured && !!user,
    queryFn: async (): Promise<InviteCode[]> => {
      const { data, error } = await supabase
        .from('invite_codes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as Record<string, string>[]).map(toCode);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (label: string) => {
      const code = generateCode();
      const { error } = await supabase.from('invite_codes').insert([{ code, label }]);
      if (error) throw error;
      return code;
    },
    onSuccess: (code) => {
      qc.invalidateQueries({ queryKey: ['invite_codes'] });
      toast.success(`Κωδικός δημιουργήθηκε: ${code}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('invite_codes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invite_codes'] });
      toast.success('Κωδικός διαγράφηκε.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    codes,
    isLoading,
    createCode: (label: string) => createMutation.mutateAsync(label),
    deleteCode: (id: string) => deleteMutation.mutateAsync(id),
  };
}

// Validate a code during registration (public)
export async function validateInviteCode(code: string): Promise<boolean> {
  const { data } = await supabase
    .from('invite_codes')
    .select('id')
    .eq('code', code.toUpperCase())
    .is('used_by', null)
    .gt('expires_at', new Date().toISOString())
    .single();
  return !!data;
}

// Mark code as used after registration
export async function markCodeUsed(code: string, userId: string): Promise<void> {
  await supabase
    .from('invite_codes')
    .update({ used_by: userId, used_at: new Date().toISOString() })
    .eq('code', code.toUpperCase());
}
