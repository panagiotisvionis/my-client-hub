import { useState } from 'react';
import { Session, SESSION_STATUS_LABELS, RecurrenceType } from '@/types';
import { Client } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { RepeatIcon } from 'lucide-react';

interface SessionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<Session, 'id' | 'createdAt'>, recurrence?: { type: RecurrenceType; endDate: string }) => void;
  clients: Client[];
  session?: Session;
  preselectedDate?: string;
}

export function SessionFormDialog({ open, onOpenChange, onSubmit, clients, session, preselectedDate }: SessionFormDialogProps) {
  const defaultDate = session?.date ?? preselectedDate ?? new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    clientId: session?.clientId ?? '',
    date: defaultDate,
    time: session?.time ?? '09:00',
    fee: session?.fee ?? 0,
    notes: session?.notes ?? '',
    duration: session?.duration ?? 50,
    type: session?.type ?? 'individual' as Session['type'],
    status: session?.status ?? 'scheduled' as Session['status'],
    paid: session?.paid ?? false,
    soapS: session?.soapS ?? '',
    soapO: session?.soapO ?? '',
    soapA: session?.soapA ?? '',
    soapP: session?.soapP ?? '',
    recurrenceGroupId: session?.recurrenceGroupId,
    portalToken: session?.portalToken,
    reminderSent: session?.reminderSent ?? false,
  });

  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('none');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');

  const handleClientChange = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    setForm(f => ({ ...f, clientId, fee: client?.sessionFee ?? f.fee }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId) return;
    const recurrence = recurrenceType !== 'none' && recurrenceEndDate
      ? { type: recurrenceType, endDate: recurrenceEndDate }
      : undefined;
    onSubmit(form, recurrence);
    onOpenChange(false);
  };

  const activeClients = clients.filter(c => c.isActive);
  const isEditing = !!session;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            {isEditing ? 'Επεξεργασία Συνεδρίας' : 'Νέα Συνεδρία'}
            {form.recurrenceGroupId && <Badge variant="secondary" className="text-xs gap-1"><RepeatIcon className="h-3 w-3" />Επαναλαμβανόμενη</Badge>}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic fields */}
          <div className="space-y-2">
            <Label>Θεραπευόμενος *</Label>
            <Select value={form.clientId} onValueChange={handleClientChange} required>
              <SelectTrigger><SelectValue placeholder="Επιλέξτε θεραπευόμενο" /></SelectTrigger>
              <SelectContent>
                {activeClients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.lastName} {c.firstName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label>Ημερομηνία *</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Ώρα</Label>
              <Input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Αμοιβή (€)</Label>
              <Input type="number" min={0} value={form.fee} onChange={e => setForm(f => ({ ...f, fee: Number(e.target.value) }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Διάρκεια (λ.)</Label>
              <Input type="number" min={0} value={form.duration} onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Τύπος</Label>
              <Select value={form.type} onValueChange={(v: Session['type']) => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Ατομική</SelectItem>
                  <SelectItem value="couple">Ζεύγους</SelectItem>
                  <SelectItem value="family">Οικογενειακή</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Κατάσταση</Label>
              <Select value={form.status} onValueChange={(v: Session['status']) => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(SESSION_STATUS_LABELS) as [Session['status'], string][]).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* SOAP Notes */}
          <div className="space-y-2">
            <Label>Σημειώσεις Συνεδρίας</Label>
            <Tabs defaultValue="general">
              <TabsList className="h-8">
                <TabsTrigger value="general" className="text-xs px-3 h-7">Γενικές</TabsTrigger>
                <TabsTrigger value="soap" className="text-xs px-3 h-7">SOAP Notes</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="mt-2">
                <Textarea rows={3} value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Ελεύθερες σημειώσεις για τη συνεδρία..." />
              </TabsContent>

              <TabsContent value="soap" className="mt-2 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-blue-600">S — Subjective (Αναφορά θεραπευόμενου)</Label>
                  <Textarea rows={2} value={form.soapS}
                    onChange={e => setForm(f => ({ ...f, soapS: e.target.value }))}
                    placeholder="Τι περιέγραψε ο θεραπευόμενος..." className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-green-600">O — Objective (Παρατηρήσεις θεραπευτή)</Label>
                  <Textarea rows={2} value={form.soapO}
                    onChange={e => setForm(f => ({ ...f, soapO: e.target.value }))}
                    placeholder="Παρατηρήσιμη συμπεριφορά, affect, εμφάνιση..." className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-purple-600">A — Assessment (Κλινική εκτίμηση)</Label>
                  <Textarea rows={2} value={form.soapA}
                    onChange={e => setForm(f => ({ ...f, soapA: e.target.value }))}
                    placeholder="Ερμηνεία, πρόοδος, αλλαγές στη συνθηκολόγηση..." className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-orange-600">P — Plan (Σχέδιο δράσης)</Label>
                  <Textarea rows={2} value={form.soapP}
                    onChange={e => setForm(f => ({ ...f, soapP: e.target.value }))}
                    placeholder="Επόμενα βήματα, εργασίες για το σπίτι, στόχοι..." className="text-sm" />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={form.paid} onCheckedChange={v => setForm(f => ({ ...f, paid: v }))} />
            <Label>Εξοφλημένη</Label>
          </div>

          {/* Recurrence — only for new sessions */}
          {!isEditing && (
            <div className="border border-border rounded-xl p-4 space-y-3 bg-muted/30">
              <div className="flex items-center gap-2">
                <RepeatIcon className="h-4 w-4 text-muted-foreground" />
                <Label className="font-medium">Επαναλαμβανόμενο Ραντεβού</Label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Επανάληψη</Label>
                  <Select value={recurrenceType} onValueChange={(v: RecurrenceType) => setRecurrenceType(v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Μία φορά</SelectItem>
                      <SelectItem value="weekly">Κάθε εβδομάδα</SelectItem>
                      <SelectItem value="biweekly">Κάθε δύο εβδομάδες</SelectItem>
                      <SelectItem value="monthly">Κάθε μήνα</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {recurrenceType !== 'none' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Έως ημερομηνία</Label>
                    <Input type="date" className="h-9" value={recurrenceEndDate}
                      onChange={e => setRecurrenceEndDate(e.target.value)}
                      min={form.date} required={recurrenceType !== 'none'} />
                  </div>
                )}
              </div>
              {recurrenceType !== 'none' && recurrenceEndDate && (
                <p className="text-xs text-muted-foreground">
                  Θα δημιουργηθούν αυτόματα συνεδρίες μέχρι {new Date(recurrenceEndDate).toLocaleDateString('el-GR')}.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Ακύρωση</Button>
            <Button type="submit">
              {!isEditing && recurrenceType !== 'none' ? 'Δημιουργία σειράς' : 'Αποθήκευση'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
