import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { useClients } from '@/hooks/useClients';
import { useSessions } from '@/hooks/useSessions';
import { SessionFormDialog } from '@/components/SessionFormDialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Session, SESSION_TYPE_LABELS, SESSION_STATUS_LABELS } from '@/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const STATUS_COLORS: Record<Session['status'], string> = {
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  completed: 'bg-success/10 text-success',
  cancelled: 'bg-muted text-muted-foreground',
  no_show: 'bg-destructive/10 text-destructive',
};

export default function SessionsPage() {
  const { clients } = useClients();
  const { sessions, addSession, updateSession, deleteSession } = useSessions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | undefined>();
  const [filterClient, setFilterClient] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | Session['status']>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const sorted = [...sessions]
    .filter(s => (filterClient === 'all' || s.clientId === filterClient)
      && (filterStatus === 'all' || s.status === filterStatus))
    .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

  const handleSubmit = (data: Omit<Session, 'id' | 'createdAt'>) => {
    if (editingSession) updateSession(editingSession.id, data);
    else addSession(data);
    setEditingSession(undefined);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Συνεδρίες"
        subtitle={`${sessions.length} συνεδρίες`}
        action={
          <Button onClick={() => { setEditingSession(undefined); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Νέα Συνεδρία
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Όλοι οι θεραπευόμενοι" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Όλοι οι θεραπευόμενοι</SelectItem>
            {clients.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.lastName} {c.firstName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={v => setFilterStatus(v as typeof filterStatus)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Όλες οι καταστάσεις</SelectItem>
            {(Object.entries(SESSION_STATUS_LABELS) as [Session['status'], string][]).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-muted-foreground font-medium">Ημερομηνία</th>
                <th className="text-left p-4 text-muted-foreground font-medium hidden sm:table-cell">Ώρα</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Θεραπευόμενος</th>
                <th className="text-left p-4 text-muted-foreground font-medium hidden md:table-cell">Τύπος</th>
                <th className="text-left p-4 text-muted-foreground font-medium hidden lg:table-cell">Διάρκεια</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Αμοιβή</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Κατάσταση</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Πληρωμή</th>
                <th className="text-right p-4 text-muted-foreground font-medium">Ενέργειες</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {sorted.map(s => {
                  const client = clients.find(c => c.id === s.clientId);
                  return (
                    <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="border-b border-border/50 last:border-0">
                      <td className="p-4">{new Date(s.date).toLocaleDateString('el-GR')}</td>
                      <td className="p-4 hidden sm:table-cell text-muted-foreground">{s.time}</td>
                      <td className="p-4 font-medium">{client ? `${client.lastName} ${client.firstName}` : '—'}</td>
                      <td className="p-4 hidden md:table-cell text-muted-foreground">{SESSION_TYPE_LABELS[s.type]}</td>
                      <td className="p-4 hidden lg:table-cell text-muted-foreground">{s.duration} λ.</td>
                      <td className="p-4">{s.fee}€</td>
                      <td className="p-4">
                        <button
                          onClick={() => {
                            const order: Session['status'][] = ['scheduled', 'completed', 'cancelled', 'no_show'];
                            const next = order[(order.indexOf(s.status) + 1) % order.length];
                            updateSession(s.id, { status: next });
                          }}
                          className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-opacity hover:opacity-80 ${STATUS_COLORS[s.status]}`}
                        >
                          {SESSION_STATUS_LABELS[s.status]}
                        </button>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => updateSession(s.id, { paid: !s.paid })}
                          className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors
                            ${s.paid ? 'bg-success/10 text-success hover:bg-success/20' : 'bg-warning/20 text-warning-foreground hover:bg-warning/30'}`}
                        >
                          {s.paid ? 'Εξοφλημένη' : 'Ανεξόφλητη'}
                        </button>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => { setEditingSession(s); setDialogOpen(true); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteId(s.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {sorted.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Δεν βρέθηκαν συνεδρίες</p>
          </div>
        )}
      </div>

      <SessionFormDialog
        key={editingSession?.id ?? 'new'}
        open={dialogOpen}
        onOpenChange={o => { setDialogOpen(o); if (!o) setEditingSession(undefined); }}
        onSubmit={handleSubmit}
        clients={clients}
        session={editingSession}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Διαγραφή Συνεδρίας</AlertDialogTitle>
            <AlertDialogDescription>Είστε σίγουροι; Η ενέργεια δεν αναιρείται.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) deleteSession(deleteId); setDeleteId(null); }}>Διαγραφή</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
