import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { useClients } from '@/hooks/useClients';
import { useSessions } from '@/hooks/useSessions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Euro } from 'lucide-react';
import { motion } from 'framer-motion';

const months = [
  'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος',
  'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος',
];

export default function FinancesPage() {
  const { clients } = useClients();
  const { sessions } = useSessions();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>(String(now.getMonth()));
  const [selectedYear, setSelectedYear] = useState<string>(String(now.getFullYear()));

  const years = useMemo(() => {
    const ySet = new Set(sessions.map(s => new Date(s.date).getFullYear()));
    ySet.add(now.getFullYear());
    return Array.from(ySet).sort((a, b) => b - a);
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const d = new Date(s.date);
      const monthMatch = selectedMonth === 'all' || d.getMonth() === Number(selectedMonth);
      const yearMatch = d.getFullYear() === Number(selectedYear);
      return monthMatch && yearMatch;
    });
  }, [sessions, selectedMonth, selectedYear]);

  const clientFinances = useMemo(() => {
    const map = new Map<string, { total: number; paid: number; unpaid: number; count: number }>();
    filteredSessions.forEach(s => {
      const entry = map.get(s.clientId) || { total: 0, paid: 0, unpaid: 0, count: 0 };
      entry.total += s.fee;
      entry.count += 1;
      if (s.paid) entry.paid += s.fee;
      else entry.unpaid += s.fee;
      map.set(s.clientId, entry);
    });
    return Array.from(map.entries())
      .map(([clientId, data]) => {
        const client = clients.find(c => c.id === clientId);
        return { clientId, client, ...data };
      })
      .sort((a, b) => b.total - a.total);
  }, [filteredSessions, clients]);

  const totals = clientFinances.reduce(
    (acc, c) => ({ total: acc.total + c.total, paid: acc.paid + c.paid, unpaid: acc.unpaid + c.unpaid, count: acc.count + c.count }),
    { total: 0, paid: 0, unpaid: 0, count: 0 }
  );

  return (
    <AppLayout>
      <PageHeader title="Οικονομικά" subtitle="Αναλυτικά έσοδα ανά θεραπευόμενο" />

      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Όλοι οι μήνες</SelectItem>
            {months.map((m, i) => (
              <SelectItem key={i} value={String(i)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-xl p-5 text-center">
          <p className="text-sm text-muted-foreground">Σύνολο Εσόδων</p>
          <p className="text-3xl font-display font-bold text-primary mt-1">{totals.total}€</p>
          <p className="text-xs text-muted-foreground mt-1">{totals.count} συνεδρίες</p>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card rounded-xl p-5 text-center">
          <p className="text-sm text-muted-foreground">Εξοφλημένα</p>
          <p className="text-3xl font-display font-bold text-success mt-1">{totals.paid}€</p>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="glass-card rounded-xl p-5 text-center">
          <p className="text-sm text-muted-foreground">Ανεξόφλητα</p>
          <p className="text-3xl font-display font-bold text-accent mt-1">{totals.unpaid}€</p>
        </motion.div>
      </div>

      {/* Per client breakdown */}
      <div className="glass-card rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-4 text-muted-foreground font-medium">Θεραπευόμενος</th>
              <th className="text-center p-4 text-muted-foreground font-medium">Συνεδρίες</th>
              <th className="text-right p-4 text-muted-foreground font-medium">Σύνολο</th>
              <th className="text-right p-4 text-muted-foreground font-medium">Εξοφλημένα</th>
              <th className="text-right p-4 text-muted-foreground font-medium">Ανεξόφλητα</th>
            </tr>
          </thead>
          <tbody>
            {clientFinances.map(cf => (
              <tr key={cf.clientId} className="border-b border-border/50 last:border-0">
                <td className="p-4 font-medium">
                  {cf.client ? `${cf.client.lastName} ${cf.client.firstName}` : 'Άγνωστος'}
                </td>
                <td className="p-4 text-center">{cf.count}</td>
                <td className="p-4 text-right font-semibold">{cf.total}€</td>
                <td className="p-4 text-right text-success">{cf.paid}€</td>
                <td className="p-4 text-right text-accent">{cf.unpaid}€</td>
              </tr>
            ))}
          </tbody>
        </table>

        {clientFinances.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Euro className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Δεν βρέθηκαν συνεδρίες για αυτή την περίοδο</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
