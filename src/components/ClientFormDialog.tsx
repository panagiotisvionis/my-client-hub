import { useState } from 'react';
import { Client } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<Client, 'id' | 'createdAt'>) => void;
  client?: Client;
}

export function ClientFormDialog({ open, onOpenChange, onSubmit, client }: ClientFormDialogProps) {
  const [form, setForm] = useState({
    firstName: client?.firstName ?? '',
    lastName: client?.lastName ?? '',
    phone: client?.phone ?? '',
    email: client?.email ?? '',
    sessionFee: client?.sessionFee ?? 50,
    description: client?.description ?? '',
    startDate: client?.startDate ?? new Date().toISOString().split('T')[0],
    isActive: client?.isActive ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {client ? 'Επεξεργασία Θεραπευόμενου' : 'Νέος Θεραπευόμενος'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Όνομα</Label>
              <Input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Επώνυμο</Label>
              <Input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Τηλέφωνο</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Κόστος Συνεδρίας (€)</Label>
              <Input type="number" min={0} value={form.sessionFee} onChange={e => setForm(f => ({ ...f, sessionFee: Number(e.target.value) }))} required />
            </div>
            <div className="space-y-2">
              <Label>Ημερομηνία Έναρξης</Label>
              <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Περιγραφή / Σημειώσεις</Label>
            <Textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ιστορικό, διάγνωση, σημειώσεις..." />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
            <Label>Ενεργός θεραπευόμενος</Label>
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
