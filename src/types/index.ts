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
  time: string; // HH:MM
  fee: number;
  notes: string;
  duration: number;
  type: 'individual' | 'couple' | 'family' | 'online';
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  paid: boolean;
  // SOAP notes
  soapS: string; // Subjective
  soapO: string; // Objective
  soapA: string; // Assessment
  soapP: string; // Plan
  // Recurring
  recurrenceGroupId?: string;
  // Portal
  portalToken?: string;
  reminderSent?: boolean;
  createdAt: string;
}

export type RecurrenceType = 'none' | 'weekly' | 'biweekly' | 'monthly';

export interface Expense {
  id: string;
  date: string;
  category: 'rent' | 'utilities' | 'supplies' | 'training' | 'insurance' | 'marketing' | 'supervision' | 'other';
  description: string;
  amount: number;
  createdAt: string;
}

export interface WaitingListEntry {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  notes: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  clientId: string;
  invoiceNumber: string;
  date: string;
  sessionIds: string[];
  total: number;
  paid: boolean;
  myDataMark?: string;
  createdAt: string;
}

export interface TherapistProfile {
  name: string;
  profession: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  email: string;
  afm: string;
  doy: string;
  iban: string;
  myDataUserId: string;
  myDataSubscriptionKey: string;
  myDataProduction: boolean;
}

export const SESSION_TYPE_LABELS: Record<Session['type'], string> = {
  individual: 'Ατομική',
  couple: 'Ζεύγους',
  family: 'Οικογενειακή',
  online: 'Online',
};

export const SESSION_STATUS_LABELS: Record<Session['status'], string> = {
  scheduled: 'Προγραμματισμένη',
  completed: 'Ολοκληρώθηκε',
  cancelled: 'Ακυρώθηκε',
  no_show: 'Δεν εμφανίστηκε',
};

export const EXPENSE_CATEGORY_LABELS: Record<Expense['category'], string> = {
  rent: 'Ενοίκιο',
  utilities: 'Λογαριασμοί',
  supplies: 'Αναλώσιμα',
  training: 'Εκπαίδευση',
  insurance: 'Ασφάλεια',
  marketing: 'Διαφήμιση',
  supervision: 'Εποπτεία',
  other: 'Άλλο',
};
