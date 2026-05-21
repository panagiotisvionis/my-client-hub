import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { useWaitingList } from '@/hooks/useWaitingList';
import { WaitingListEntry } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Trash2, Clock, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { el } from 'date-fns/locale';

function AddEntryDialog({ open, onOpenChange, onSubmit }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (data: Omit<WaitingListEntry, 'id' | 'createdAt'>) => void;
}) {
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', email: '', notes: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
    onOpenChange(false);
    setForm({ firstName: '', lastName: '', phone: '', email: '', notes: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Νέα Εγγραφή στη Λίστα</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Όνομα *</Label>
              <Input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Επώνυμο *</Label>
              <Input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Τηλέφωνο</Label>
              <Input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Σημειώσεις</Label>
            <Textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Λόγος επικοινωνίας, διαθεσιμότητα..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Ακύρωση</Button>
            <Button type="submit">Προσθήκη</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function WaitingListPage() {
  const { entries, addEntry, deleteEntry, isLoading } = useWaitingList();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  return (
    <AppLayout>
      <PageHeader
        title="Λίστα Αναμονής"
        subtitle={`${entries.length} εγγεγραμμένοι`}
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Νέα Εγγραφή
          </Button>
        }
      />

      {entries.length === 0 && !isLoading ? (
        <div className="text-center py-20 text-muted-foreground">
          <Clock className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="font-display text-lg mb-1">Κενή λίστα αναμονής</p>
          <p className="text-sm">Πρόσθεσε νέους ενδιαφερόμενους που περιμένουν θέση.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {entries.map((entry, idx) => (
              <motion.div
                key={entry.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card rounded-xl p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-accent/20 text-accent-foreground w-9 h-9 flex items-center justify-center text-sm font-semibold font-display">
                      {idx + 1}
                    </div>
                    <div>
                      <h3 className="font-display font-semibold">{entry.lastName} {entry.firstName}</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true, locale: el })}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0"
                    onClick={() => setDeleteId(entry.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground space-y-1 mb-3">
                  {entry.phone && <p>📞 {entry.phone}</p>}
                  {entry.email && <p>✉️ {entry.email}</p>}
                  {entry.notes && (
                    <p className="italic line-clamp-2 text-foreground/60 mt-2">{entry.notes}</p>
                  )}
                </div>

                <Button variant="outline" size="sm" className="w-full text-xs gap-1.5" asChild>
                  <a href={`tel:${entry.phone}`}>
                    <UserPlus className="h-3.5 w-3.5" /> Μετατροπή σε Θεραπευόμενο
                  </a>
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AddEntryDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={addEntry} />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Αφαίρεση από λίστα αναμονής</AlertDialogTitle>
            <AlertDialogDescription>Είστε σίγουροι; Η ενέργεια δεν αναιρείται.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) deleteEntry(deleteId); setDeleteId(null); }}>Αφαίρεση</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
