import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { useClients } from '@/hooks/useClients';
import { useSessions } from '@/hooks/useSessions';
import { useBlockedDates, BlockedDate } from '@/hooks/useBlockedDates';
import { SessionFormDialog } from '@/components/SessionFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ChevronLeft, ChevronRight, Plus, BanIcon, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  format, isSameMonth, isToday, isSameDay, addMonths, subMonths, eachDayOfInterval as eachDay,
  parseISO,
} from 'date-fns';
import { el } from 'date-fns/locale';
import { Session, SESSION_TYPE_LABELS, RecurrenceType } from '@/types';

const TYPE_COLORS: Record<Session['type'], string> = {
  individual: 'bg-primary/15 text-primary border-l-2 border-primary',
  couple: 'bg-accent/20 text-accent-foreground border-l-2 border-accent',
  family: 'bg-blue-100 text-blue-700 border-l-2 border-blue-500 dark:bg-blue-900/30 dark:text-blue-300',
  online: 'bg-purple-100 text-purple-700 border-l-2 border-purple-500 dark:bg-purple-900/30 dark:text-purple-300',
};

const STATUS_DOT: Record<Session['status'], string> = {
  scheduled: 'bg-blue-500',
  completed: 'bg-success',
  cancelled: 'bg-muted-foreground',
  no_show: 'bg-destructive',
};

function HolidayDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { blockedDates, addBlockedDate, deleteBlockedDate } = useBlockedDates();
  const [form, setForm] = useState({ startDate: '', endDate: '', reason: '' });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate) return;
    await addBlockedDate(form);
    setForm({ startDate: '', endDate: '', reason: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Διαχείριση Αδειών / Διακοπών</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleAdd} className="space-y-3 border-b border-border pb-4 mb-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Από</Label>
              <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Έως</Label>
              <Input type="date" value={form.endDate} min={form.startDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} required />
            </div>
          </div>
          <Input placeholder="Αιτία (π.χ. Διακοπές Αυγούστου)" value={form.reason}
            onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
          <Button type="submit" size="sm" className="w-full">Προσθήκη Απουσίας</Button>
        </form>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {blockedDates.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">Δεν υπάρχουν απουσίες.</p>}
          {blockedDates.map(b => (
            <div key={b.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
              <div>
                <p className="text-sm font-medium">{b.reason || 'Απουσία'}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(b.startDate).toLocaleDateString('el-GR')} — {new Date(b.endDate).toLocaleDateString('el-GR')}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(b.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Διαγραφή Απουσίας</AlertDialogTitle>
              <AlertDialogDescription>Είστε σίγουροι;</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
              <AlertDialogAction onClick={() => { if (deleteId) deleteBlockedDate(deleteId); setDeleteId(null); }}>Διαγραφή</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | undefined>();
  const [preselectedDate, setPreselectedDate] = useState('');

  const { clients } = useClients();
  const { sessions, addSession, updateSession } = useSessions();
  const { isDateBlocked } = useBlockedDates();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const weekDays = ['Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ', 'Κυρ'];

  const getSessionsForDay = (day: Date) =>
    sessions.filter(s => isSameDay(new Date(s.date), day))
      .sort((a, b) => a.time.localeCompare(b.time));

  const handleDayClick = (day: Date) => {
    if (!isSameMonth(day, currentDate)) return;
    setEditingSession(undefined);
    setPreselectedDate(format(day, 'yyyy-MM-dd'));
    setDialogOpen(true);
  };

  const handleSessionClick = (e: React.MouseEvent, session: Session) => {
    e.stopPropagation();
    setEditingSession(session);
    setPreselectedDate(session.date);
    setDialogOpen(true);
  };

  const handleSubmit = (data: Omit<Session, 'id' | 'createdAt'>, recurrence?: { type: RecurrenceType; endDate: string }) => {
    if (editingSession) updateSession(editingSession.id, data);
    else addSession(data, recurrence);
    setEditingSession(undefined);
  };

  const monthSessions = sessions.filter(s => {
    const d = new Date(s.date);
    return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
  });

  return (
    <AppLayout>
      <PageHeader
        title="Ημερολόγιο"
        subtitle={`${monthSessions.length} συνεδρίες — ${format(currentDate, 'MMMM yyyy', { locale: el })}`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setHolidayDialogOpen(true)}>
              <BanIcon className="h-4 w-4 mr-1.5" /> Άδειες
            </Button>
            <Button onClick={() => { setEditingSession(undefined); setPreselectedDate(format(new Date(), 'yyyy-MM-dd')); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Νέα Συνεδρία
            </Button>
          </div>
        }
      />

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Button variant="ghost" size="icon" onClick={() => setCurrentDate(d => subMonths(d, 1))}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="font-display font-semibold text-lg capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: el })}
          </h2>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())} className="text-xs">Σήμερα</Button>
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(d => addMonths(d, 1))}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-border">
          {weekDays.map(d => (
            <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const daySessions = getSessionsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const today = isToday(day);
            const dateStr = format(day, 'yyyy-MM-dd');
            const blocked = isDateBlocked(dateStr);

            return (
              <motion.div
                key={idx}
                whileHover={isCurrentMonth && !blocked ? { backgroundColor: 'hsl(var(--muted)/0.4)' } : {}}
                onClick={() => !blocked && handleDayClick(day)}
                className={`
                  min-h-[90px] p-1.5 border-b border-r border-border/50 last:border-r-0 transition-colors
                  ${isCurrentMonth && !blocked ? 'cursor-pointer' : 'cursor-default'}
                  ${!isCurrentMonth ? 'opacity-40' : ''}
                  ${today ? 'bg-primary/5' : ''}
                  ${blocked ? 'bg-destructive/5' : ''}
                `}
              >
                <span className={`inline-flex items-center justify-center w-7 h-7 text-sm font-medium rounded-full mb-1
                  ${today ? 'bg-primary text-primary-foreground' : ''}`}>
                  {format(day, 'd')}
                </span>

                {blocked && (
                  <div className="text-[9px] text-destructive/70 px-1 truncate flex items-center gap-0.5">
                    <BanIcon className="h-2.5 w-2.5 shrink-0" />
                    {blocked.reason || 'Απουσία'}
                  </div>
                )}

                {!blocked && (
                  <div className="space-y-0.5">
                    {daySessions.slice(0, 3).map(s => {
                      const client = clients.find(c => c.id === s.clientId);
                      return (
                        <div key={s.id}
                          onClick={e => handleSessionClick(e, s)}
                          className={`text-[10px] px-1.5 py-0.5 rounded truncate flex items-center gap-1 ${TYPE_COLORS[s.type]} cursor-pointer hover:opacity-80`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[s.status]}`} />
                          <span>{s.time}</span>
                          <span className="truncate">{client?.lastName ?? '—'}</span>
                        </div>
                      );
                    })}
                    {daySessions.length > 3 && (
                      <p className="text-[10px] text-muted-foreground pl-1">+{daySessions.length - 3} ακόμα</p>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
        {(Object.entries(TYPE_COLORS) as [Session['type'], string][]).map(([type, cls]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${cls.split(' ').find(c => c.startsWith('bg-'))}`} />
            {SESSION_TYPE_LABELS[type]}
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-destructive/20" />
          Άδεια / Απουσία
        </div>
      </div>

      <SessionFormDialog
        key={editingSession?.id ?? `new-${preselectedDate}`}
        open={dialogOpen}
        onOpenChange={o => { setDialogOpen(o); if (!o) setEditingSession(undefined); }}
        onSubmit={handleSubmit}
        clients={clients}
        session={editingSession}
        preselectedDate={preselectedDate}
      />

      <HolidayDialog open={holidayDialogOpen} onOpenChange={setHolidayDialogOpen} />
    </AppLayout>
  );
}
