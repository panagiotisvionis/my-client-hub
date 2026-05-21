import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { useExpenses } from '@/hooks/useExpenses';
import { Expense, EXPENSE_CATEGORY_LABELS } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Receipt, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CATEGORY_COLORS: Record<Expense['category'], string> = {
  rent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  utilities: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  supplies: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  training: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  insurance: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  marketing: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  supervision: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  other: 'bg-muted text-muted-foreground',
};

const CHART_COLORS = ['#2a5a3c', '#c8844a', '#3b82f6', '#8b5cf6', '#22c55e', '#ec4899', '#14b8a6', '#94a3b8'];

function ExpenseFormDialog({
  open, onOpenChange, onSubmit, expense,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (data: Omit<Expense, 'id' | 'createdAt'>) => void;
  expense?: Expense;
}) {
  const [form, setForm] = useState({
    date: expense?.date ?? new Date().toISOString().split('T')[0],
    category: expense?.category ?? 'other' as Expense['category'],
    description: expense?.description ?? '',
    amount: expense?.amount ?? 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{expense ? 'Επεξεργασία Δαπάνης' : 'Νέα Δαπάνη'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ημερομηνία</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Κατηγορία</Label>
              <Select value={form.category} onValueChange={(v: Expense['category']) => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(EXPENSE_CATEGORY_LABELS) as [Expense['category'], string][]).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Περιγραφή</Label>
            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="π.χ. Ενοίκιο Ιανουαρίου" required />
          </div>
          <div className="space-y-2">
            <Label>Ποσό (€)</Label>
            <Input type="number" min={0} step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} required />
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

export default function ExpensesPage() {
  const { expenses, addExpense, updateExpense, deleteExpense } = useExpenses();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
  });

  const filteredExpenses = expenses.filter(e => e.date.startsWith(filterMonth)).sort((a, b) => b.date.localeCompare(a.date));
  const totalMonth = filteredExpenses.reduce((a, e) => a + e.amount, 0);

  // Category breakdown for chart
  const categoryData = (Object.keys(EXPENSE_CATEGORY_LABELS) as Expense['category'][])
    .map(cat => ({
      name: EXPENSE_CATEGORY_LABELS[cat],
      amount: filteredExpenses.filter(e => e.category === cat).reduce((a, e) => a + e.amount, 0),
    }))
    .filter(d => d.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const handleSubmit = (data: Omit<Expense, 'id' | 'createdAt'>) => {
    if (editingExpense) updateExpense(editingExpense.id, data);
    else addExpense(data);
    setEditingExpense(undefined);
  };

  return (
    <AppLayout>
      <PageHeader
        title="Δαπάνες"
        subtitle={`Σύνολο: ${totalMonth.toFixed(2)}€`}
        action={
          <Button onClick={() => { setEditingExpense(undefined); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Νέα Δαπάνη
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Month filter + total */}
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-destructive/10 rounded-lg p-2.5">
              <TrendingDown className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Σύνολο μήνα</p>
              <p className="text-2xl font-display font-semibold">{totalMonth.toFixed(2)}€</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Φίλτρο μήνα</Label>
            <Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} />
          </div>
        </div>

        {/* Category chart */}
        <div className="glass-card rounded-xl p-5 lg:col-span-2">
          <h3 className="font-display font-semibold mb-3 text-sm">Ανά κατηγορία</h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={categoryData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}€`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip formatter={(v: number) => [`${v.toFixed(2)}€`]} />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                  {categoryData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">Δεν υπάρχουν δαπάνες αυτόν τον μήνα</div>
          )}
        </div>
      </div>

      {/* Expenses list */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-muted-foreground font-medium">Ημερομηνία</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Κατηγορία</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Περιγραφή</th>
                <th className="text-right p-4 text-muted-foreground font-medium">Ποσό</th>
                <th className="text-right p-4 text-muted-foreground font-medium">Ενέργειες</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filteredExpenses.map(e => (
                  <motion.tr key={e.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="border-b border-border/50 last:border-0">
                    <td className="p-4">{new Date(e.date).toLocaleDateString('el-GR')}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[e.category]}`}>
                        {EXPENSE_CATEGORY_LABELS[e.category]}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground">{e.description}</td>
                    <td className="p-4 text-right font-medium">{e.amount.toFixed(2)}€</td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingExpense(e); setDialogOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(e.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {filteredExpenses.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Δεν υπάρχουν δαπάνες για αυτόν τον μήνα</p>
          </div>
        )}
      </div>

      <ExpenseFormDialog
        key={editingExpense?.id ?? 'new'}
        open={dialogOpen}
        onOpenChange={o => { setDialogOpen(o); if (!o) setEditingExpense(undefined); }}
        onSubmit={handleSubmit}
        expense={editingExpense}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Διαγραφή Δαπάνης</AlertDialogTitle>
            <AlertDialogDescription>Είστε σίγουροι; Η ενέργεια δεν αναιρείται.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) deleteExpense(deleteId); setDeleteId(null); }}>Διαγραφή</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
