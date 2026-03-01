import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, CalendarDays, Euro, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BackupRestore } from './BackupRestore';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Επισκόπηση' },
  { to: '/clients', icon: Users, label: 'Θεραπευόμενοι' },
  { to: '/sessions', icon: CalendarDays, label: 'Συνεδρίες' },
  { to: '/finances', icon: Euro, label: 'Οικονομικά' },
];

export function AppSidebar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden rounded-lg bg-primary p-2 text-primary-foreground shadow-lg"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-sidebar text-sidebar-foreground z-50 flex flex-col transition-transform duration-300 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-6 border-b border-sidebar-border">
          <div>
            <h1 className="font-display text-xl font-semibold text-sidebar-primary">TherapyDesk</h1>
            <p className="text-xs text-sidebar-foreground/60 mt-0.5">Διαχείριση Γραφείου</p>
          </div>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden text-sidebar-foreground/60">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-3">
          <BackupRestore />
          <p className="text-xs text-sidebar-foreground/40 text-center">
            Τα δεδομένα αποθηκεύονται τοπικά
          </p>
        </div>
      </aside>
    </>
  );
}
