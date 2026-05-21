import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { useTherapistProfile } from '@/hooks/useTherapistProfile';
import { useClients } from '@/hooks/useClients';
import { useSessions } from '@/hooks/useSessions';
import { useExpenses } from '@/hooks/useExpenses';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { User, Receipt, Shield, LogOut, Download, ExternalLink, CheckCircle2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { TherapistProfile } from '@/types';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-xl p-6 space-y-4">
      <h3 className="font-display font-semibold text-base">{title}</h3>
      {children}
    </div>
  );
}

function FormRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { profile, saveProfile } = useTherapistProfile();
  const { clients } = useClients();
  const { sessions } = useSessions();
  const { expenses } = useExpenses();
  const { signOut } = useAuth();
  const [signOutDialog, setSignOutDialog] = useState(false);
  const [gdprDeleteDialog, setGdprDeleteDialog] = useState(false);

  const [form, setForm] = useState<TherapistProfile>(profile);
  const set = (k: keyof TherapistProfile, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    saveProfile(form);
    toast.success('Οι ρυθμίσεις αποθηκεύτηκαν.');
  };

  // GDPR: export all data as JSON
  const handleExportData = () => {
    const data = { clients, sessions, expenses, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TherapyDesk-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Τα δεδομένα εξήχθησαν.');
  };

  // GDPR: export clients as CSV
  const handleExportCSV = () => {
    const header = 'Επώνυμο,Όνομα,Email,Τηλέφωνο,Ενεργός,Ημ.Εγγραφής\n';
    const rows = clients.map(c =>
      `"${c.lastName}","${c.firstName}","${c.email}","${c.phone}","${c.isActive ? 'Ναι' : 'Όχι'}","${c.startDate}"`
    ).join('\n');
    const blob = new Blob(['﻿' + header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TherapyDesk-clients-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Η λίστα θεραπευομένων εξήχθη σε CSV.');
  };

  const myDataConfigured = !!(form.myDataUserId && form.myDataSubscriptionKey && profile.afm);

  return (
    <AppLayout>
      <PageHeader title="Ρυθμίσεις" subtitle="Διαχείριση προφίλ, ολοκληρώσεις & GDPR" />

      <Tabs defaultValue="profile">
        <TabsList className="mb-6">
          <TabsTrigger value="profile" className="gap-2"><User className="h-4 w-4" />Προφίλ</TabsTrigger>
          <TabsTrigger value="mydata" className="gap-2"><Receipt className="h-4 w-4" />myDATA</TabsTrigger>
          <TabsTrigger value="gdpr" className="gap-2"><Shield className="h-4 w-4" />GDPR & Ασφάλεια</TabsTrigger>
        </TabsList>

        {/* PROFILE TAB */}
        <TabsContent value="profile" className="space-y-4">
          <Section title="Στοιχεία Θεραπευτή">
            <FormRow>
              <Field label="Ονοματεπώνυμο *">
                <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Δρ. Μαρία Παπαδοπούλου" />
              </Field>
              <Field label="Ειδικότητα">
                <Input value={form.profession} onChange={e => set('profession', e.target.value)} placeholder="Ψυχολόγος" />
              </Field>
            </FormRow>
            <FormRow>
              <Field label="Email">
                <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
              </Field>
              <Field label="Τηλέφωνο">
                <Input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} />
              </Field>
            </FormRow>
          </Section>

          <Section title="Διεύθυνση">
            <Field label="Οδός & Αριθμός">
              <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Λεωφ. Αθηνών 100" />
            </Field>
            <FormRow>
              <Field label="Πόλη">
                <Input value={form.city} onChange={e => set('city', e.target.value)} placeholder="Αθήνα" />
              </Field>
              <Field label="Τ.Κ.">
                <Input value={form.postalCode} onChange={e => set('postalCode', e.target.value)} placeholder="12345" />
              </Field>
            </FormRow>
          </Section>

          <Section title="Φορολογικά Στοιχεία">
            <FormRow>
              <Field label="ΑΦΜ *">
                <Input value={form.afm} onChange={e => set('afm', e.target.value)} placeholder="123456789" maxLength={9} />
              </Field>
              <Field label="ΔΟΥ">
                <Input value={form.doy} onChange={e => set('doy', e.target.value)} placeholder="ΔΟΥ Αθηνών" />
              </Field>
            </FormRow>
            <Field label="IBAN">
              <Input value={form.iban} onChange={e => set('iban', e.target.value)} placeholder="GR0000000000000000000000000" />
            </Field>
          </Section>

          <div className="flex justify-end">
            <Button onClick={handleSave} className="gap-2">
              <Save className="h-4 w-4" /> Αποθήκευση
            </Button>
          </div>
        </TabsContent>

        {/* myDATA TAB */}
        <TabsContent value="mydata" className="space-y-4">
          <motion.div
            className={`rounded-xl p-4 border text-sm flex items-start gap-3 ${myDataConfigured ? 'bg-success/10 border-success/30' : 'bg-muted/50 border-border'}`}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            {myDataConfigured
              ? <><CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" /><p className="text-success">Το myDATA είναι ρυθμισμένο και έτοιμο για χρήση.</p></>
              : <><Receipt className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" /><p className="text-muted-foreground">Εγγράψου στο myDATA για ηλεκτρονική τιμολόγηση. Τα credentials λαμβάνονται από το <strong>developer.aade.gr</strong>.</p></>
            }
          </motion.div>

          <Section title="Credentials myDATA (ΑΑΔΕ)">
            <Field label="ΑΑΔΕ User ID (Taxisnet username)">
              <Input value={form.myDataUserId} onChange={e => set('myDataUserId', e.target.value)}
                placeholder="taxisnet_username" autoComplete="off" />
            </Field>
            <Field label="Subscription Key">
              <Input type="password" value={form.myDataSubscriptionKey} onChange={e => set('myDataSubscriptionKey', e.target.value)}
                placeholder="••••••••••••••••" autoComplete="new-password" />
            </Field>
            <div className="flex items-center gap-3 pt-1">
              <Switch checked={form.myDataProduction} onCheckedChange={v => set('myDataProduction', v)} />
              <div>
                <Label>Περιβάλλον παραγωγής</Label>
                <p className="text-xs text-muted-foreground">OFF = δοκιμαστικό περιβάλλον (συνιστάται αρχικά)</p>
              </div>
            </div>
          </Section>

          <Section title="Βήματα Εγγραφής myDATA">
            <ol className="text-sm space-y-2 text-muted-foreground list-decimal list-inside">
              <li>Σύνδεση στο <strong className="text-foreground">mydata.aade.gr</strong> με Taxisnet credentials</li>
              <li>Αποδοχή Όρων Χρήσης myDATA API</li>
              <li>Επίσκεψη στο <strong className="text-foreground">developer.aade.gr</strong> → My Subscriptions</li>
              <li>Εγγραφή στο προϊόν <strong className="text-foreground">"myDATA - Invoice Provider REST API"</strong></li>
              <li>Αντιγραφή Primary Subscription Key</li>
              <li>Ο τύπος τιμολογίου που χρησιμοποιείται είναι <strong className="text-foreground">2.1</strong> (ΑΠΥ - ελεύθερος επαγγελματίας)</li>
            </ol>
            <a href="https://www.aade.gr/mydata" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-2">
              <ExternalLink className="h-3.5 w-3.5" /> Επίσκεψη myDATA
            </a>
          </Section>

          <div className="flex justify-end">
            <Button onClick={handleSave} className="gap-2">
              <Save className="h-4 w-4" /> Αποθήκευση
            </Button>
          </div>
        </TabsContent>

        {/* GDPR TAB */}
        <TabsContent value="gdpr" className="space-y-4">
          <Section title="Εξαγωγή Δεδομένων (GDPR)">
            <p className="text-sm text-muted-foreground">
              Σύμφωνα με τον GDPR (Κανονισμός ΕΕ 2016/679), έχεις δικαίωμα να λάβεις αντίγραφο όλων των δεδομένων σου.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={handleExportData} className="gap-2">
                <Download className="h-4 w-4" /> Εξαγωγή Όλων (JSON)
              </Button>
              <Button variant="outline" onClick={handleExportCSV} className="gap-2">
                <Download className="h-4 w-4" /> Θεραπευόμενοι (CSV)
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Τελευταία εξαγωγή: —
            </p>
          </Section>

          <Section title="Πληροφορίες GDPR για Θεραπευτές">
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong className="text-foreground">Νομική βάση επεξεργασίας:</strong> Άρθρο 6(1)(b) — Σύμβαση, και Άρθρο 9(2)(h) — Υγειονομική περίθαλψη</p>
              <p><strong className="text-foreground">Κατηγορίες δεδομένων:</strong> Στοιχεία ταυτοποίησης, οικονομικά, κλινικές σημειώσεις</p>
              <p><strong className="text-foreground">Περίοδος τήρησης:</strong> Ιατρικά αρχεία: 10 χρόνια. Οικονομικά: 5 χρόνια (φορολογικό)</p>
              <p><strong className="text-foreground">Υπεύθυνος Επεξεργασίας:</strong> Εσύ, ως θεραπευτής</p>
            </div>
          </Section>

          <Section title="Λογαριασμός & Σύνδεση">
            <p className="text-sm text-muted-foreground">
              Αποσύνδεση από τον τρέχοντα λογαριασμό.
            </p>
            <Button variant="destructive" onClick={() => setSignOutDialog(true)} className="gap-2">
              <LogOut className="h-4 w-4" /> Αποσύνδεση
            </Button>
          </Section>
        </TabsContent>
      </Tabs>

      <AlertDialog open={signOutDialog} onOpenChange={setSignOutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Αποσύνδεση</AlertDialogTitle>
            <AlertDialogDescription>Είστε σίγουροι ότι θέλετε να αποσυνδεθείτε;</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
            <AlertDialogAction onClick={signOut}>Αποσύνδεση</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={gdprDeleteDialog} onOpenChange={setGdprDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Διαγραφή Δεδομένων</AlertDialogTitle>
            <AlertDialogDescription>
              Αυτή η ενέργεια είναι μη αναστρέψιμη. Όλα τα δεδομένα θα διαγραφούν οριστικά.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive">Διαγραφή Όλων</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
