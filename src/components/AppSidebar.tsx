import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, CalendarDays, Euro, Menu, X,
  Calendar, TrendingUp, FileText, Clock, Settings, BarChart3, CreditCard, ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useUserProfile } from '@/hooks/useUserProfile';

const navGroups = [
  {
    label: 'Κύρια',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Επισκόπηση' },
      { to: '/calendar', icon: Calendar, label: 'Ημερολόγιο' },
      { to: '/clients', icon: Users, label: 'Θεραπευόμενοι' },
      { to: '/sessions', icon: CalendarDays, label: 'Συνεδρίες' },
    ],
  },
  {
    label: 'Οικονομικά',
    items: [
      { to: '/finances', icon: Euro, label: 'Οικονομικά' },
      { to: '/invoices', icon: FileText, label: 'Τιμολόγια' },
      { to: '/expenses', icon: TrendingUp, label: 'Δαπάνες' },
    ],
  },
  {
    label: 'Στατιστικά & Άλλα',
    items: [
      { to: '/analytics', icon: BarChart3, label: 'Αναλυτικά' },
      { to: '/waiting-list', icon: Clock, label: 'Λίστα Αναμονής' },
    ],
  },
];

export function AppSidebar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const { subscription, isActive } = useSubscription();
  const { isAdmin } = useUserProfile();

  const SidebarContent = () => (
    <aside className="h-full w-64 bg-sidebar text-sidebar-foreground flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-sidebar-border">
        <div>
          <h1 className="font-display text-xl font-semibold text-sidebar-primary">TherapyDesk</h1>
          <p className="text-xs text-sidebar-foreground/50 mt-0.5 truncate max-w-[140px]">{user?.email ?? 'Διαχείριση Γραφείου'}</p>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button onClick={() => setMobileOpen(false)} className="lg:hidden text-sidebar-foreground/60 p-1">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navGroups.map(group => (
          <div key={group.label}>
            <p className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 px-3 mb-1.5 font-medium">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const isActive = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-primary'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-0.5">
        {isAdmin && (
          <Link
            to="/admin"
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 w-full',
              location.pathname === '/admin'
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
            )}
          >
            <ShieldCheck className="h-4 w-4 shrink-0" />
            Admin Panel
          </Link>
        )}
        {/* Subscription status */}
        <Link
          to="/subscription"
          onClick={() => setMobileOpen(false)}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 w-full',
            location.pathname === '/subscription'
              ? 'bg-sidebar-accent text-sidebar-primary'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          )}
        >
          <CreditCard className="h-4 w-4 shrink-0" />
          <span className="flex-1">Συνδρομή</span>
          {subscription && (
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full font-semibold',
              isActive
                ? subscription.status === 'trialing'
                  ? 'bg-primary/15 text-primary'
                  : 'bg-success/15 text-success'
                : 'bg-destructive/15 text-destructive',
            )}>
              {subscription.status === 'trialing' ? 'Trial'
                : subscription.status === 'active' ? 'Pro'
                : subscription.status === 'past_due' ? '!'
                : ''}
            </span>
          )}
        </Link>

        <Link
          to="/settings"
          onClick={() => setMobileOpen(false)}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 w-full',
            location.pathname === '/settings'
              ? 'bg-sidebar-accent text-sidebar-primary'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          Ρυθμίσεις
        </Link>
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden rounded-lg bg-primary p-2 text-primary-foreground shadow-lg"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden lg:block fixed top-0 left-0 h-full z-50">
        <SidebarContent />
      </div>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ x: -256 }} animate={{ x: 0 }} exit={{ x: -256 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 left-0 h-full z-50 lg:hidden"
          >
            <SidebarContent />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
