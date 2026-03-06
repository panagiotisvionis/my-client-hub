import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { useClients } from '@/hooks/useClients';
import { useSessions } from '@/hooks/useSessions';
import { ClientFormDialog } from '@/components/ClientFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Pencil, Trash2, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Client } from '@/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function ClientsPage() {
  const { clients, addClient, updateClient, deleteClient } = useClients();
  const { sessions } = useSessions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>();
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = clients.filter(c =>
    `${c.firstName} ${c.lastName} ${c.email} ${c.phone}`.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => a.lastName.localeCompare(b.lastName, 'el'));

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setDialogOpen(true);
  };

  const handleSubmit = (data: Omit<Client, 'id' | 'createdAt'>) => {
    if (editingClient) {
      updateClient(editingClient.id, data);
    } else {
      addClient(data);
    }
    setEditingClient(undefined);
  };

  const getSessionCount = (clientId: string) => sessions.filter(s => s.clientId === clientId).length;

  return (
    <AppLayout>
      <PageHeader
        title="Θεραπευόμενοι"
        subtitle={`${clients.length} θεραπευόμενοι`}
        action={
          <Button onClick={() => { setEditingClient(undefined); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Νέος Θεραπευόμενος
          </Button>
        }
      />

      <div className="mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Αναζήτηση..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence>
          {filtered.map(client => (
            <motion.div
              key={client.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card rounded-xl p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold">{client.lastName} {client.firstName}</h3>
                    <p className="text-xs text-muted-foreground">{getSessionCount(client.id)} συνεδρίες · {client.sessionFee}€/συν.</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${client.isActive ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                  {client.isActive ? 'Ενεργός' : 'Ανενεργός'}
                </span>
              </div>

              {client.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{client.description}</p>
              )}

              {(client.phone || client.email) && (
                <div className="text-xs text-muted-foreground space-y-0.5 mb-3">
                  {client.phone && <p>📞 {client.phone}</p>}
                  {client.email && <p>✉️ {client.email}</p>}
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-border/50">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(client)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Επεξεργασία
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteId(client.id)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Διαγραφή
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>Δεν βρέθηκαν θεραπευόμενοι</p>
        </div>
      )}

      <ClientFormDialog
        key={editingClient?.id ?? 'new'}
        open={dialogOpen}
        onOpenChange={o => { setDialogOpen(o); if (!o) setEditingClient(undefined); }}
        onSubmit={handleSubmit}
        client={editingClient}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Διαγραφή Θεραπευόμενου</AlertDialogTitle>
            <AlertDialogDescription>Είστε σίγουροι; Η ενέργεια δεν αναιρείται.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) deleteClient(deleteId); setDeleteId(null); }}>Διαγραφή</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
