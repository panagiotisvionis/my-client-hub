import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { useClients } from '@/hooks/useClients';
import { useSessions } from '@/hooks/useSessions';
import { SessionFormDialog } from '@/components/SessionFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Session } from '@/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const typeLabels: Record<Session['type'], string> = {
  individual: 'Ατομική',
  couple: 'Ζεύγους',
  family: 'Οικογενειακή',
  online: 'Online',
};

export default function SessionsPage() {
  const { clients } = useClients();
  const { sessions, addSession, updateSession, deleteSession } = useSessions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | undefined>();
  const [filterClient, setFilterClient] = useState('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const sorted = [...sessions]
    .filter(s => filterClient === 'all' || s.clientId === filterClient)
    .sort((a, b) => b.date.localeCompare(a.date));

  const handleSubmit = (data: Omit<Session, 'id' | 'createdAt'>) => {
    if (editingSession) {
      updateSession(editingSession.id, data);
    } else {
      addSession(data);
    }
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
          <SelectTrigger className="w-60">
            <SelectValue placeholder="Όλοι οι θεραπευόμενοι" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Όλοι οι θεραπευόμενοι</SelectItem>
            {clients.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.lastName} {c.firstName}</SelectItem>
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
                <th className="text-left p-4 text-muted-foreground font-medium">Θεραπευόμενος</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Τύπος</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Διάρκεια</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Αμοιβή</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Κατάσταση</th>
                <th className="text-right p-4 text-muted-foreground font-medium">Ενέργειες</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {sorted.map(s => {
                  const client = clients.find(c => c.id === s.clientId);
                  return (
                    <motion.tr
                      key={s.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="border-b border-border/50 last:border-0"
                    >
                      <td className="p-4">{new Date(s.date).toLocaleDateString('el-GR')}</td>
                      <td className="p-4 font-medium">{client ? `${client.lastName} ${client.firstName}` : '—'}</td>
                      <td className="p-4">{typeLabels[s.type]}</td>
                      <td className="p-4">{s.duration} λ.</td>
                      <td className="p-4">{s.fee}€</td>
                      <td className="p-4">
                        <button
                          onClick={() => updateSession(s.id, { paid: !s.paid })}
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${s.paid ? 'bg-success/10 text-success hover:bg-success/20' : 'bg-warning/20 text-warning-foreground hover:bg-warning/30'}`}
                        >
                          {s.paid ? 'Εξοφλημένη' : 'Ανεξόφλητη'}
                        </button>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingSession(s); setDialogOpen(true); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(s.id)}>
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
