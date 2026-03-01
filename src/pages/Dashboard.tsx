import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { useClients } from '@/hooks/useClients';
import { useSessions } from '@/hooks/useSessions';
import { Users, CalendarDays, Euro, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

function StatCard({ icon: Icon, label, value, color, to }: { icon: any; label: string; value: string | number; color: string; to: string }) {
  return (
    <Link to={to}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
        className="glass-card rounded-xl p-6 cursor-pointer transition-shadow hover:shadow-md"
      >
        <div className="flex items-center gap-4">
          <div className={`rounded-lg p-3 ${color}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-display font-semibold">{value}</p>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

export default function Dashboard() {
  const { clients } = useClients();
  const { sessions } = useSessions();

  const activeClients = clients.filter(c => c.isActive).length;
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthSessions = sessions.filter(s => {
    const d = new Date(s.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const monthRevenue = monthSessions.reduce((sum, s) => sum + s.fee, 0);
  const unpaid = sessions.filter(s => !s.paid).reduce((sum, s) => sum + s.fee, 0);

  const recentSessions = [...sessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  return (
    <AppLayout>
      <PageHeader title="Επισκόπηση" subtitle="Καλώς ήρθατε στο TherapyDesk" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="Ενεργοί Θεραπευόμενοι" value={activeClients} color="bg-primary/10 text-primary" to="/clients" />
        <StatCard icon={CalendarDays} label="Συνεδρίες Μήνα" value={monthSessions.length} color="bg-accent/20 text-accent-foreground" to="/sessions" />
        <StatCard icon={Euro} label="Έσοδα Μήνα" value={`${monthRevenue}€`} color="bg-success/10 text-success" to="/finances" />
        <StatCard icon={TrendingUp} label="Ανεξόφλητα" value={`${unpaid}€`} color="bg-warning/20 text-warning-foreground" to="/finances" />
      </div>

      {recentSessions.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <h2 className="text-lg font-display font-semibold mb-4">Πρόσφατες Συνεδρίες</h2>
          <div className="glass-card rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-muted-foreground font-medium">Ημερομηνία</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Θεραπευόμενος</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Αμοιβή</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Κατάσταση</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map(s => {
                  const client = clients.find(c => c.id === s.clientId);
                  return (
                    <tr key={s.id} className="border-b border-border/50 last:border-0">
                      <td className="p-4">{new Date(s.date).toLocaleDateString('el-GR')}</td>
                      <td className="p-4">{client ? `${client.lastName} ${client.firstName}` : '—'}</td>
                      <td className="p-4">{s.fee}€</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${s.paid ? 'bg-success/10 text-success' : 'bg-warning/20 text-warning-foreground'}`}>
                          {s.paid ? 'Εξοφλημένη' : 'Ανεξόφλητη'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </AppLayout>
  );
}
