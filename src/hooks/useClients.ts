import { useLocalStorage } from './useLocalStorage';
import { Client } from '@/types';
import { useCallback } from 'react';

export function useClients() {
  const [clients, setClients] = useLocalStorage<Client[]>('therapy-clients', []);

  const addClient = useCallback((client: Omit<Client, 'id' | 'createdAt'>) => {
    const newClient: Client = {
      ...client,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setClients(prev => [...prev, newClient]);
    return newClient;
  }, [setClients]);

  const updateClient = useCallback((id: string, updates: Partial<Client>) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, [setClients]);

  const deleteClient = useCallback((id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
  }, [setClients]);

  const getClient = useCallback((id: string) => {
    return clients.find(c => c.id === id);
  }, [clients]);

  return { clients, addClient, updateClient, deleteClient, getClient };
}
