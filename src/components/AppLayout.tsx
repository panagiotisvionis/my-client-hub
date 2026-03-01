import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="lg:ml-64 min-h-screen">
        <div className="p-6 lg:p-8 max-w-6xl mx-auto pt-16 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
