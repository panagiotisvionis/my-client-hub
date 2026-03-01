import { useState } from 'react';
import { Session } from '@/types';
import { Client } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface SessionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<Session, 'id' | 'createdAt'>) => void;
  clients: Client[];
  session?: Session;
}

const sessionTypes = [
  { value: 'individual', label: 'Ατομική' },
  { value: 'couple', label: 'Ζεύγους' },
  { value: 'family', label: 'Οικογενειακή' },
  { value: 'online', label: 'Online' },
] as const;

export function SessionFormDialog({ open, onOpenChange, onSubmit, clients, session }: SessionFormDialogProps) {
  const [form, setForm] = useState({
    clientId: session?.clientId ?? '',
    date: session?.date ?? new Date().toISOString().split('T')[0],
    fee: session?.fee ?? 0,
    notes: session?.notes ?? '',
    duration: session?.duration ?? 50,
    type: session?.type ?? 'individual' as Session['type'],
    paid: session?.paid ?? false,
  });

  // Auto-fill fee when client changes
  const handleClientChange = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    setForm(f => ({ ...f, clientId, fee: client?.sessionFee ?? f.fee }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
    onOpenChange(false);
  };

  const activeClients = clients.filter(c => c.isActive);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {session ? 'Επεξεργασία Συνεδρίας' : 'Νέα Συνεδρία'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Θεραπευόμενος</Label>
            <Select value={form.clientId} onValueChange={handleClientChange} required>
              <SelectTrigger>
                <SelectValue placeholder="Επιλέξτε θεραπευόμενο" />
              </SelectTrigger>
              <SelectContent>
                {activeClients.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.lastName} {c.firstName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ημερομηνία</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Τύπος</Label>
              <Select value={form.type} onValueChange={(v: Session['type']) => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sessionTypes.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Αμοιβή (€)</Label>
              <Input type="number" min={0} value={form.fee} onChange={e => setForm(f => ({ ...f, fee: Number(e.target.value) }))} required />
            </div>
            <div className="space-y-2">
              <Label>Διάρκεια (λεπτά)</Label>
              <Input type="number" min={0} value={form.duration} onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Σημειώσεις Συνεδρίας</Label>
            <Textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Σημειώσεις για τη συνεδρία..." />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.paid} onCheckedChange={v => setForm(f => ({ ...f, paid: v }))} />
            <Label>Εξοφλημένη</Label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Ακύρωση</Button>
            <Button type="submit">Αποθήκευση</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
