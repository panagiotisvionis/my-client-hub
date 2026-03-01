import { useLocalStorage } from './useLocalStorage';
import { Session } from '@/types';
import { useCallback } from 'react';

export function useSessions() {
  const [sessions, setSessions] = useLocalStorage<Session[]>('therapy-sessions', []);

  const addSession = useCallback((session: Omit<Session, 'id' | 'createdAt'>) => {
    const newSession: Session = {
      ...session,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setSessions(prev => [...prev, newSession]);
    return newSession;
  }, [setSessions]);

  const updateSession = useCallback((id: string, updates: Partial<Session>) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, [setSessions]);

  const deleteSession = useCallback((id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
  }, [setSessions]);

  const getSessionsByClient = useCallback((clientId: string) => {
    return sessions.filter(s => s.clientId === clientId);
  }, [sessions]);

  return { sessions, addSession, updateSession, deleteSession, getSessionsByClient };
}
