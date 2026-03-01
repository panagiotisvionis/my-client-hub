export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  sessionFee: number;
  description: string;
  startDate: string;
  isActive: boolean;
  createdAt: string;
}

export interface Session {
  id: string;
  clientId: string;
  date: string;
  fee: number;
  notes: string;
  duration: number; // minutes
  type: 'individual' | 'couple' | 'family' | 'online';
  paid: boolean;
  createdAt: string;
}
