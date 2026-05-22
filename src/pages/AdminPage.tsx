import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { useAllUserProfiles, useUpdateUserProfile } from '@/hooks/useUserProfile';
import { useInviteCodes } from '@/hooks/useInviteCodes';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Copy, Trash2, Plus, Users, Key, ShieldCheck, ShieldX, UserX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const statusColor: Record<string, string> = {
  active:    'bg-success/15 text-success',
  trial:     'bg-primary/15 text-primary',
  suspended: 'bg-destructive/15 text-destructive',
};
const statusLabel: Record<string, string> = {
  active: 'Ενεργός', trial: 'Trial', suspended: 'Ανασταλμένος',
};

export default function AdminPage() {
  const { isAdmin, isLoading: profileLoading } = useUserProfile();
  const { data: users = [], isLoading: usersLoading } = useAllUserProfiles();
  const { codes, isLoading: codesLoading, createCode, deleteCode } = useInviteCodes();
  const updateProfile = useUpdateUserProfile();
  const [newCodeLabel, setNewCodeLabel] = useState('');

  if (profileLoading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  const handleCreate = async () => {
    if (!newCodeLabel.trim()) { toast.error('Βάλε ετικέτα για τον κωδικό.'); return; }
    await createCode(newCodeLabel.trim());
    setNewCodeLabel('');
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Αντιγράφηκε!');
  };

  const activeUsers = users.filter(u => u.status === 'active').length;
  const trialUsers  = users.filter(u => u.status === 'trial').length;
  const unusedCodes = codes.filter(c => !c.usedBy).length;

  return (
    <AppLayout>
      <PageHeader title="Admin Panel" subtitle="Διαχείριση χρηστών & κωδικών πρόσκλησης" />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Ενεργοί χρήστες', value: activeUsers, icon: Users, color: 'text-success' },
          { label: 'Trial χρήστες',   value: trialUsers,  icon: Users, color: 'text-primary' },
          { label: 'Αχρησιμοποίητοι κωδικοί', value: unusedCodes, icon: Key, color: 'text-accent' },
        ].map(s => (
          <motion.div key={s.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="glass-card rounded-xl p-5 text-center">
            <s.icon className={`h-6 w-6 mx-auto mb-2 ${s.color}`} />
            <p className="text-2xl font-display font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Users */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border font-semibold font-display flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Χρήστες ({users.length})
          </div>
          <div className="divide-y divide-border max-h-96 overflow-y-auto">
            {usersLoading ? (
              <p className="p-4 text-sm text-muted-foreground">Φόρτωση...</p>
            ) : users.map(u => (
              <div key={u.id} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{u.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor[u.status]}`}>
                      {statusLabel[u.status]}
                    </span>
                    {u.role === 'admin' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">Admin</span>
                    )}
                    {u.trialEndsAt && u.status === 'trial' && (
                      <span className="text-[10px] text-muted-foreground">
                        λήγει {new Date(u.trialEndsAt).toLocaleDateString('el-GR')}
                      </span>
                    )}
                  </div>
                </div>
                {u.role !== 'admin' && (
                  <div className="flex gap-1 shrink-0">
                    {u.status !== 'active' && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-success"
                        onClick={() => updateProfile.mutate({ id: u.id, updates: { status: 'active' } })}>
                        <ShieldCheck className="h-3 w-3 mr-1" /> Ενεργός
                      </Button>
                    )}
                    {u.status !== 'trial' && u.status !== 'suspended' && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-primary"
                        onClick={() => updateProfile.mutate({ id: u.id, updates: { status: 'trial' } })}>
                        Trial
                      </Button>
                    )}
                    {u.status !== 'suspended' && (
                      <Button variant="ghost" size="sm" className="h-7 text-destructive"
                        onClick={() => updateProfile.mutate({ id: u.id, updates: { status: 'suspended' } })}>
                        <UserX className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Invite Codes */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border font-semibold font-display flex items-center gap-2">
            <Key className="h-4 w-4 text-primary" /> Κωδικοί Πρόσκλησης
          </div>

          {/* Create new code */}
          <div className="p-4 border-b border-border flex gap-2">
            <Input
              placeholder="π.χ. Για Δρ. Παπαδόπουλο"
              value={newCodeLabel}
              onChange={e => setNewCodeLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              className="text-sm"
            />
            <Button size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-1" /> Δημιούργησε
            </Button>
          </div>

          <div className="divide-y divide-border max-h-80 overflow-y-auto">
            {codesLoading ? (
              <p className="p-4 text-sm text-muted-foreground">Φόρτωση...</p>
            ) : codes.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">Δεν υπάρχουν κωδικοί.</p>
            ) : codes.map(c => (
              <div key={c.id} className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono font-bold tracking-wider">{c.code}</code>
                    {c.usedBy ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Χρησιμοποιήθηκε</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success">Διαθέσιμος</span>
                    )}
                  </div>
                  {c.label && <p className="text-xs text-muted-foreground mt-0.5">{c.label}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  {!c.usedBy && (
                    <Button variant="ghost" size="sm" className="h-7" onClick={() => copyCode(c.code)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-7 text-destructive" onClick={() => deleteCode(c.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
