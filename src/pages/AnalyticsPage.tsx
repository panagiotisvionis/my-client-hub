import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { useClients } from '@/hooks/useClients';
import { useSessions } from '@/hooks/useSessions';
import { useExpenses } from '@/hooks/useExpenses';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, RadialBarChart, RadialBar,
} from 'recharts';
import { format, subMonths, eachMonthOfInterval, startOfYear, endOfYear, getDay } from 'date-fns';
import { el } from 'date-fns/locale';
import { SESSION_TYPE_LABELS } from '@/types';
import { motion } from 'framer-motion';
import { TrendingUp, Users, CalendarDays, AlertTriangle } from 'lucide-react';

const COLORS = ['hsl(152,25%,36%)', 'hsl(28,60%,65%)', 'hsl(210,60%,55%)', 'hsl(280,45%,55%)', 'hsl(0,60%,50%)', 'hsl(50,80%,50%)'];

function MetricCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`rounded-lg p-2.5 ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      <p className="text-2xl font-display font-semibold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </motion.div>
  );
}

export default function AnalyticsPage() {
  const { clients } = useClients();
  const { sessions } = useSessions();
  const { expenses } = useExpenses();

  const now = new Date();

  // Monthly data for current year
  const yearMonths = eachMonthOfInterval({ start: startOfYear(now), end: endOfYear(now) });
  const monthlyData = yearMonths.map(d => {
    const m = d.getMonth(), y = d.getFullYear();
    const ms = sessions.filter(s => {
      const sd = new Date(s.date);
      return sd.getMonth() === m && sd.getFullYear() === y;
    });
    const rev = ms.filter(s => s.status !== 'cancelled').reduce((a, s) => a + s.fee, 0);
    const paid = ms.filter(s => s.paid).reduce((a, s) => a + s.fee, 0);
    const exp = expenses.filter(e => {
      const ed = new Date(e.date); return ed.getMonth() === m && ed.getFullYear() === y;
    }).reduce((a, e) => a + e.amount, 0);

    return {
      month: format(d, 'MMM', { locale: el }),
      revenue: rev,
      paid,
      expenses: exp,
      net: rev - exp,
      sessions: ms.length,
      noShows: ms.filter(s => s.status === 'no_show').length,
    };
  });

  // Client retention
  const activeClients = clients.filter(c => c.isActive);
  const retentionData = activeClients
    .map(c => {
      const cs = sessions.filter(s => s.clientId === c.id && s.status !== 'cancelled');
      return {
        name: `${c.lastName}`,
        sessions: cs.length,
        revenue: cs.reduce((a, s) => a + s.fee, 0),
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  // Session types
  const typeData = (['individual', 'couple', 'family', 'online'] as const).map(type => ({
    name: SESSION_TYPE_LABELS[type],
    value: sessions.filter(s => s.type === type && s.status !== 'cancelled').length,
  })).filter(d => d.value > 0);

  // Peak day of week
  const dayData = [1, 2, 3, 4, 5, 6, 0].map(dow => {
    const dayNames = ['Κυρ', 'Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ'];
    return {
      day: dayNames[dow],
      sessions: sessions.filter(s => getDay(new Date(s.date)) === dow).length,
    };
  });

  // Key metrics
  const totalRevenue = sessions.filter(s => s.status !== 'cancelled').reduce((a, s) => a + s.fee, 0);
  const totalExpenses = expenses.reduce((a, e) => a + e.amount, 0);
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const noShows = sessions.filter(s => s.status === 'no_show').length;
  const noShowRate = (completedSessions.length + noShows) > 0
    ? Math.round((noShows / (completedSessions.length + noShows)) * 100) : 0;
  const avgSessionsPerClient = activeClients.length > 0
    ? (completedSessions.length / activeClients.length).toFixed(1) : '0';
  const avgFee = completedSessions.length > 0
    ? Math.round(completedSessions.reduce((a, s) => a + s.fee, 0) / completedSessions.length) : 0;

  return (
    <AppLayout>
      <PageHeader title="Αναλυτικά Στατιστικά" subtitle="Πλήρης ανάλυση δεδομένων" />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <MetricCard icon={TrendingUp} label="Συνολικά Έσοδα" value={`${totalRevenue.toFixed(0)}€`}
          sub={`καθαρό: ${(totalRevenue - totalExpenses).toFixed(0)}€`} color="bg-success/10 text-success" />
        <MetricCard icon={Users} label="Ενεργοί Θεραπευόμενοι" value={activeClients.length}
          sub={`σύνολο: ${clients.length}`} color="bg-primary/10 text-primary" />
        <MetricCard icon={CalendarDays} label="Μ.Ο. Συνεδριών/Θεραπευόμενο" value={avgSessionsPerClient}
          sub={`μ.ο. αμοιβή: ${avgFee}€`} color="bg-accent/20 text-accent-foreground" />
        <MetricCard icon={AlertTriangle} label="No-show rate" value={`${noShowRate}%`}
          sub={`${noShows} no-shows σύνολο`} color="bg-destructive/10 text-destructive" />
      </div>

      {/* Revenue trend + Net */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-xl p-5">
          <h2 className="font-display font-semibold mb-4">Έσοδα & Δαπάνες {now.getFullYear()}</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}€`} />
              <Tooltip formatter={(v: number) => [`${v}€`]} contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(var(--border))' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="revenue" name="Έσοδα" fill="hsl(152,25%,36%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="expenses" name="Δαπάνες" fill="hsl(28,60%,65%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="glass-card rounded-xl p-5">
          <h2 className="font-display font-semibold mb-4">Καθαρό Κέρδος {now.getFullYear()}</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(152,25%,36%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(152,25%,36%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}€`} />
              <Tooltip formatter={(v: number) => [`${v}€`, 'Καθαρό']} contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(var(--border))' }} />
              <Area type="monotone" dataKey="net" stroke="hsl(152,25%,36%)" fill="url(#netGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Top clients by revenue */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card rounded-xl p-5 lg:col-span-2">
          <h2 className="font-display font-semibold mb-4">Κορυφαίοι Θεραπευόμενοι (κατά έσοδα)</h2>
          {retentionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={retentionData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}€`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={60} />
                <Tooltip formatter={(v: number) => [`${v}€`]} contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="revenue" name="Έσοδα" fill="hsl(152,25%,36%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Δεν υπάρχουν δεδομένα</div>
          )}
        </motion.div>

        {/* Session types */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="glass-card rounded-xl p-5">
          <h2 className="font-display font-semibold mb-4">Τύποι Συνεδριών</h2>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
                  {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Δεν υπάρχουν δεδομένα</div>
          )}
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sessions per month */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="glass-card rounded-xl p-5">
          <h2 className="font-display font-semibold mb-4">Συνεδρίες & No-shows {now.getFullYear()}</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(var(--border))' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="sessions" name="Συνεδρίες" fill="hsl(152,25%,36%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="noShows" name="No-shows" fill="hsl(0,60%,50%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Peak days */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="glass-card rounded-xl p-5">
          <h2 className="font-display font-semibold mb-4">Ημέρες Αιχμής</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '0.75rem', border: '1px solid hsl(var(--border))' }} />
              <Bar dataKey="sessions" name="Συνεδρίες" radius={[4, 4, 0, 0]}>
                {dayData.map((entry, i) => (
                  <Cell key={i} fill={entry.sessions === Math.max(...dayData.map(d => d.sessions)) ? 'hsl(152,25%,36%)' : 'hsl(152,15%,70%)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </AppLayout>
  );
}
