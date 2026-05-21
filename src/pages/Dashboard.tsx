import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { useClients } from '@/hooks/useClients';
import { useSessions } from '@/hooks/useSessions';
import { useExpenses } from '@/hooks/useExpenses';
import { Users, CalendarDays, Euro, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { el } from 'date-fns/locale';
import { SESSION_TYPE_LABELS } from '@/types';

function StatCard({ icon: Icon, label, value, sub, color, to }: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; color: string; to: string;
}) {
  return (
    <Link to={to}>
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
        className="glass-card rounded-xl p-5 cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className={`rounded-lg p-2.5 ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
        </div>
        <p className="text-2xl font-display font-semibold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </motion.div>
    </Link>
  );
}

const COLORS = ['hsl(152,25%,36%)', 'hsl(28,60%,65%)', 'hsl(210,60%,55%)', 'hsl(280,45%,55%)'];

export default function Dashboard() {
  const { clients } = useClients();
  const { sessions } = useSessions();
  const { expenses } = useExpenses();

  const now = new Date();
  const cm = now.getMonth(), cy = now.getFullYear();

  const monthSessions = sessions.filter(s => {
    const d = new Date(s.date);
    return d.getMonth() === cm && d.getFullYear() === cy;
  });

  const activeClients = clients.filter(c => c.isActive).length;
  const monthRevenue = monthSessions.filter(s => s.status !== 'cancelled').reduce((a, s) => a + s.fee, 0);
  const unpaid = sessions.filter(s => !s.paid && s.status !== 'cancelled').reduce((a, s) => a + s.fee, 0);
  const monthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === cm && d.getFullYear() === cy;
  }).reduce((a, e) => a + e.amount, 0);
  const netProfit = monthRevenue - monthExpenses;

  // Revenue last 7 months
  const revenueData = Array.from({ length: 7 }, (_, i) => {
    const d = subMonths(now, 6 - i);
    const m = d.getMonth(), y = d.getFullYear();
    const rev = sessions
      .filter(s => { const sd = new Date(s.date); return sd.getMonth() === m && sd.getFullYear() === y && s.status !== 'cancelled'; })
      .reduce((a, s) => a + s.fee, 0);
    const exp = expenses
      .filter(e => { const ed = new Date(e.date); return ed.getMonth() === m && ed.getFullYear() === y; })
      .reduce((a, e) => a + e.amount, 0);
    return { month: format(d, 'MMM', { locale: el }), revenue: rev, expenses: exp, net: rev - exp };
  });

  // Session types distribution this month
  const typeData = (['individual', 'couple', 'family', 'online'] as const).map(type => ({
    name: SESSION_TYPE_LABELS[type],
    value: monthSessions.filter(s => s.type === type).length,
  })).filter(d => d.value > 0);

  // No-show rate
  const completedOrNoShow = sessions.filter(s => ['completed', 'no_show'].includes(s.status));
  const noShowRate = completedOrNoShow.length
    ? Math.round((completedOrNoShow.filter(s => s.status === 'no_show').length / completedOrNoShow.length) * 100)
    : 0;

  const recentSessions = [...sessions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);

  const statusColors: Record<string, string> = {
    completed: 'bg-success/10 text-success',
    scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    cancelled: 'bg-muted text-muted-foreground',
    no_show: 'bg-destructive/10 text-destructive',
  };

  return (
    <AppLayout>
      <PageHeader title="Επισκόπηση" subtitle={`${format(now, 'MMMM yyyy', { locale: el })}`} />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        <div className="col-span-2 lg:col-span-1 xl:col-span-1">
          <StatCard icon={Users} label="Ενεργοί" value={activeClients} sub={`από ${clients.length} σύνολο`} color="bg-primary/10 text-primary" to="/clients" />
        </div>
        <div className="col-span-2 lg:col-span-1 xl:col-span-1">
          <StatCard icon={CalendarDays} label="Συνεδρίες μήνα" value={monthSessions.length} sub={`${monthSessions.filter(s => s.status === 'no_show').length} no-shows`} color="bg-accent/20 text-accent-foreground" to="/sessions" />
        </div>
        <div className="col-span-2 lg:col-span-1 xl:col-span-1">
          <StatCard icon={Euro} label="Έσοδα μήνα" value={`${monthRevenue}€`} sub="χωρίς ακυρώσεις" color="bg-success/10 text-success" to="/finances" />
        </div>
        <div className="col-span-2 lg:col-span-1 xl:col-span-1">
          <StatCard icon={TrendingUp} label="Καθαρό κέρδος" value={`${netProfit}€`} sub={`δαπάνες: ${monthExpenses}€`} color={netProfit >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"} to="/expenses" />
        </div>
        <div className="col-span-2 lg:col-span-1 xl:col-span-1">
          <StatCard icon={TrendingDown} label="Ανεξόφλητα" value={`${unpaid}€`} color="bg-warning/20 text-warning-foreground" to="/finances" />
        </div>
        <div className="col-span-2 lg:col-span-1 xl:col-span-1">
          <StatCard icon={Clock} label="No-show rate" value={`${noShowRate}%`} sub="ιστορικό" color="bg-muted text-muted-foreground" to="/analytics" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Revenue / Expenses chart */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="glass-card rounded-xl p-5 lg:col-span-2">
          <h2 className="font-display font-semibold mb-4">Έσοδα & Δαπάνες (7 μήνες)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(152,25%,36%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(152,25%,36%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(28,60%,65%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(28,60%,65%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}€`} />
              <Tooltip formatter={(v: number) => [`${v}€`]} contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(var(--border))' }} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(152,25%,36%)" fill="url(#revGrad)" strokeWidth={2} name="Έσοδα" />
              <Area type="monotone" dataKey="expenses" stroke="hsl(28,60%,65%)" fill="url(#expGrad)" strokeWidth={2} name="Δαπάνες" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Session types pie */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
          className="glass-card rounded-xl p-5">
          <h2 className="font-display font-semibold mb-4">Τύποι Συνεδριών</h2>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                  {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              Δεν υπάρχουν συνεδρίες αυτόν τον μήνα
            </div>
          )}
        </motion.div>
      </div>

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold">Πρόσφατες Συνεδρίες</h2>
            <Link to="/sessions" className="text-sm text-primary hover:underline">Όλες →</Link>
          </div>
          <div className="glass-card rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-muted-foreground font-medium">Ημερομηνία</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Θεραπευόμενος</th>
                  <th className="text-left p-3 text-muted-foreground font-medium hidden sm:table-cell">Τύπος</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Αμοιβή</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Κατάσταση</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map(s => {
                  const client = clients.find(c => c.id === s.clientId);
                  return (
                    <tr key={s.id} className="border-b border-border/50 last:border-0">
                      <td className="p-3">{new Date(s.date).toLocaleDateString('el-GR')}</td>
                      <td className="p-3 font-medium">{client ? `${client.lastName} ${client.firstName}` : '—'}</td>
                      <td className="p-3 hidden sm:table-cell text-muted-foreground">{SESSION_TYPE_LABELS[s.type]}</td>
                      <td className="p-3">{s.fee}€</td>
                      <td className="p-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[s.status] ?? ''}`}>
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
