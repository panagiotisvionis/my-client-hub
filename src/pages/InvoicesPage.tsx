import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { useClients } from '@/hooks/useClients';
import { useSessions } from '@/hooks/useSessions';
import { useInvoices } from '@/hooks/useInvoices';
import { useTherapistProfile } from '@/hooks/useTherapistProfile';
import { Invoice, Session } from '@/types';
import { generateInvoicePDF } from '@/lib/pdf';
import { submitToMyData } from '@/lib/mydata';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Download, Send, Trash2, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

function NewInvoiceDialog({
  open, onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { clients } = useClients();
  const { sessions } = useSessions();
  const { addInvoice, nextInvoiceNumber } = useInvoices();

  const [clientId, setClientId] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);

  const unpaidSessions = sessions.filter(s =>
    s.clientId === clientId && !s.paid && s.status !== 'cancelled'
  ).sort((a, b) => b.date.localeCompare(a.date));

  const total = unpaidSessions
    .filter(s => selectedIds.includes(s.id))
    .reduce((a, s) => a + s.fee, 0);

  const toggleSession = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleClientChange = (id: string) => {
    setClientId(id);
    setSelectedIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || selectedIds.length === 0) {
      toast.error('Επιλέξτε θεραπευόμενο και τουλάχιστον μία συνεδρία.');
      return;
    }
    await addInvoice({
      clientId,
      invoiceNumber: nextInvoiceNumber(),
      date: invoiceDate,
      sessionIds: selectedIds,
      total,
      paid: false,
    });
    onOpenChange(false);
    setClientId('');
    setSelectedIds([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Νέο Τιμολόγιο</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Θεραπευόμενος *</Label>
              <Select value={clientId} onValueChange={handleClientChange}>
                <SelectTrigger><SelectValue placeholder="Επιλέξτε..." /></SelectTrigger>
                <SelectContent>
                  {clients.filter(c => c.isActive).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.lastName} {c.firstName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ημερομηνία</Label>
              <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
            </div>
          </div>

          {clientId && (
            <div className="space-y-2">
              <Label>Ανεξόφλητες Συνεδρίες</Label>
              {unpaidSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Δεν υπάρχουν ανεξόφλητες συνεδρίες.</p>
              ) : (
                <div className="border border-border rounded-lg divide-y divide-border max-h-48 overflow-y-auto">
                  {unpaidSessions.map(s => (
                    <label key={s.id} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/40">
                      <Checkbox
                        checked={selectedIds.includes(s.id)}
                        onCheckedChange={() => toggleSession(s.id)}
                      />
                      <span className="text-sm flex-1">{new Date(s.date).toLocaleDateString('el-GR')}</span>
                      <span className="text-sm text-muted-foreground">{s.duration}λ.</span>
                      <span className="text-sm font-medium">{s.fee}€</span>
                    </label>
                  ))}
                </div>
              )}
              {selectedIds.length > 0 && (
                <div className="flex justify-between text-sm font-medium pt-1">
                  <span>{selectedIds.length} συνεδρίες επιλεγμένες</span>
                  <span>Σύνολο: {total.toFixed(2)}€</span>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Ακύρωση</Button>
            <Button type="submit" disabled={!clientId || selectedIds.length === 0}>
              Έκδοση Τιμολογίου
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function InvoicesPage() {
  const { clients, getClient } = useClients();
  const { sessions } = useSessions();
  const { invoices, updateInvoice, deleteInvoice } = useInvoices();
  const { profile } = useTherapistProfile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sendingMyData, setSendingMyData] = useState<string | null>(null);

  const profileComplete = !!(profile.name && profile.afm);

  const handleDownloadPDF = (invoice: Invoice) => {
    const client = getClient(invoice.clientId);
    if (!client) return toast.error('Δεν βρέθηκε ο θεραπευόμενος.');
    if (!profileComplete) return toast.error('Συμπλήρωσε πρώτα το προφίλ σου στις Ρυθμίσεις.');
    generateInvoicePDF(invoice, client, sessions, profile).catch(e => console.error('PDF error:', e));
  };

  const handleSendMyData = async (invoice: Invoice) => {
    const client = getClient(invoice.clientId);
    if (!client) return;
    if (!profile.myDataUserId || !profile.myDataSubscriptionKey) {
      toast.error('Ρύθμισε τα credentials myDATA στις Ρυθμίσεις.');
      return;
    }
    setSendingMyData(invoice.id);
    const result = await submitToMyData(invoice, client, sessions, profile);
    setSendingMyData(null);
    if (result.success && result.mark) {
      await updateInvoice(invoice.id, { myDataMark: result.mark });
      toast.success(`Εστάλη στο myDATA. MARK: ${result.mark}`);
    } else {
      toast.error(result.error ?? 'Αποτυχία αποστολής.');
    }
  };

  const totalRevenue = invoices.reduce((a, i) => a + i.total, 0);
  const totalPaid = invoices.filter(i => i.paid).reduce((a, i) => a + i.total, 0);

  return (
    <AppLayout>
      <PageHeader
        title="Τιμολόγια"
        subtitle={`${invoices.length} τιμολόγια · ${totalRevenue.toFixed(2)}€ σύνολο`}
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Νέο Τιμολόγιο
          </Button>
        }
      />

      {!profileComplete && (
        <div className="mb-4 p-4 bg-warning/10 border border-warning/30 rounded-xl text-sm flex items-center gap-2">
          <span className="text-warning-foreground">
            Για να εκδίδεις τιμολόγια με τα σωστά στοιχεία, συμπλήρωσε το <Link to="/settings" className="font-medium underline">Προφίλ Θεραπευτή</Link>.
          </span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="glass-card rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Σύνολο</p>
          <p className="text-xl font-display font-semibold">{totalRevenue.toFixed(2)}€</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Εξοφλημένα</p>
          <p className="text-xl font-display font-semibold text-success">{totalPaid.toFixed(2)}€</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Εκκρεμή</p>
          <p className="text-xl font-display font-semibold text-warning-foreground">{(totalRevenue - totalPaid).toFixed(2)}€</p>
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-muted-foreground font-medium">Αρ.</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Ημερομηνία</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Θεραπευόμενος</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Συνεδρίες</th>
                <th className="text-right p-4 text-muted-foreground font-medium">Σύνολο</th>
                <th className="text-left p-4 text-muted-foreground font-medium">myDATA</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Κατάσταση</th>
                <th className="text-right p-4 text-muted-foreground font-medium">Ενέργειες</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {invoices.map(inv => {
                  const client = getClient(inv.clientId);
                  return (
                    <motion.tr key={inv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="border-b border-border/50 last:border-0">
                      <td className="p-4 font-mono font-medium">#{inv.invoiceNumber}</td>
                      <td className="p-4">{new Date(inv.date).toLocaleDateString('el-GR')}</td>
                      <td className="p-4 font-medium">{client ? `${client.lastName} ${client.firstName}` : '—'}</td>
                      <td className="p-4 text-muted-foreground">{inv.sessionIds.length} συν.</td>
                      <td className="p-4 text-right font-semibold">{inv.total.toFixed(2)}€</td>
                      <td className="p-4">
                        {inv.myDataMark ? (
                          <span className="flex items-center gap-1 text-xs text-success">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {inv.myDataMark.substring(0, 8)}…
                          </span>
                        ) : (
                          <Button variant="ghost" size="sm" className="h-7 text-xs"
                            onClick={() => handleSendMyData(inv)}
                            disabled={sendingMyData === inv.id}>
                            {sendingMyData === inv.id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <><Send className="h-3 w-3 mr-1" />myDATA</>}
                          </Button>
                        )}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => updateInvoice(inv.id, { paid: !inv.paid })}
                          className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer
                            ${inv.paid ? 'bg-success/10 text-success' : 'bg-warning/20 text-warning-foreground'}`}>
                          {inv.paid ? 'Εξοφλημένο' : 'Εκκρεμές'}
                        </button>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownloadPDF(inv)}
                            title="Λήψη PDF">
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteId(inv.id)}>
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

        {invoices.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Δεν έχουν εκδοθεί τιμολόγια ακόμα</p>
          </div>
        )}
      </div>

      <NewInvoiceDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Διαγραφή Τιμολογίου</AlertDialogTitle>
            <AlertDialogDescription>Είστε σίγουροι; Αν έχει σταλεί στο myDATA θα χρειαστεί ακύρωση.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) deleteInvoice(deleteId); setDeleteId(null); }}>Διαγραφή</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
