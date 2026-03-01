import { Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRef } from 'react';

export function BackupRestore() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBackup = () => {
    const data: Record<string, unknown> = {};
    const keys = ['therapy-clients', 'therapy-sessions'];
    keys.forEach(key => {
      const val = localStorage.getItem(key);
      if (val) data[key] = JSON.parse(val);
    });

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `therapydesk-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: 'Backup ολοκληρώθηκε', description: 'Το αρχείο κατέβηκε στον υπολογιστή σου.' });
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        const keys = ['therapy-clients', 'therapy-sessions'];
        keys.forEach(key => {
          if (data[key]) localStorage.setItem(key, JSON.stringify(data[key]));
        });
        toast({ title: 'Επαναφορά ολοκληρώθηκε', description: 'Τα δεδομένα φορτώθηκαν. Ανανέωσε τη σελίδα.' });
        setTimeout(() => window.location.reload(), 1000);
      } catch {
        toast({ title: 'Σφάλμα', description: 'Το αρχείο δεν είναι έγκυρο.', variant: 'destructive' });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={handleBackup} className="gap-1.5">
        <Download className="h-4 w-4" />
        Backup
      </Button>
      <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
        <Upload className="h-4 w-4" />
        Επαναφορά
      </Button>
      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleRestore} />
    </div>
  );
}
